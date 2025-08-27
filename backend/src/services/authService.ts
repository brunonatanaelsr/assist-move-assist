import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export interface User {
  id: number;
  email: string;
  nome_completo: string;
  senha_hash: string;
  cargo?: string;
  departamento?: string;
  telefone?: string;
  foto_url?: string;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
}

export class AuthService {
  constructor(private pool: Pool) {}

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private generateToken(userId: number): string {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
  }

  async login(email: string, password: string): Promise<{ token: string; user: Omit<User, 'senha_hash'> }> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
        [email]
      );

      const user = result.rows[0];

      if (!user) {
        throw new AuthenticationError('Usuário não encontrado ou inativo');
      }

      const isPasswordValid = await this.comparePasswords(password, user.senha_hash);

      if (!isPasswordValid) {
        throw new AuthenticationError('Senha incorreta');
      }

      const token = this.generateToken(user.id);

      // Não enviar a senha hash para o cliente
      const { senha_hash, ...userWithoutPassword } = user;

      return {
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Erro ao realizar login');
    }
  }

  async register(userData: {
    email: string;
    senha: string;
    nome_completo: string;
    cargo?: string;
    departamento?: string;
    telefone?: string;
  }): Promise<Omit<User, 'senha_hash'>> {
    try {
      // Verificar se o email já existe
      const existingUser = await this.pool.query(
        'SELECT id FROM usuarios WHERE email = $1',
        [userData.email]
      );

      if (existingUser.rows.length > 0) {
        throw new ConflictError('Email já cadastrado');
      }

      const senhaHash = await this.hashPassword(userData.senha);

      const result = await this.pool.query(
        `INSERT INTO usuarios (
          email, senha_hash, nome_completo, cargo, departamento, telefone, ativo
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING id, email, nome_completo, cargo, departamento, telefone, ativo, created_at, updated_at`,
        [
          userData.email,
          senhaHash,
          userData.nome_completo,
          userData.cargo,
          userData.departamento,
          userData.telefone
        ]
      );

      return result.rows[0];
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new ValidationError('Erro ao criar usuário');
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT senha_hash FROM usuarios WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Usuário não encontrado');
      }

      const user = result.rows[0];
      const isPasswordValid = await this.comparePasswords(currentPassword, user.senha_hash);

      if (!isPasswordValid) {
        throw new AuthenticationError('Senha atual incorreta');
      }

      const newPasswordHash = await this.hashPassword(newPassword);

      await this.pool.query(
        'UPDATE usuarios SET senha_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );
    } catch (error) {
      if (error instanceof (NotFoundError || AuthenticationError)) {
        throw error;
      }
      throw new ValidationError('Erro ao alterar senha');
    }
  }

  async updateProfile(userId: number, profileData: Partial<Omit<User, 'id' | 'senha_hash' | 'email'>>): Promise<Omit<User, 'senha_hash'>> {
    try {
      const fields = Object.keys(profileData).filter(key => profileData[key] !== undefined);
      const values = fields.map(field => profileData[field]);
      
      if (fields.length === 0) {
        throw new ValidationError('Nenhum dado para atualizar');
      }

      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const query = `
        UPDATE usuarios 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${fields.length + 1}
        RETURNING id, email, nome_completo, cargo, departamento, telefone, foto_url, ativo, created_at, updated_at
      `;

      const result = await this.pool.query(query, [...values, userId]);

      if (result.rows.length === 0) {
        throw new DatabaseError('Usuário não encontrado', 'USER_NOT_FOUND');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao atualizar perfil', 'PROFILE_UPDATE_ERROR');
    }
  }

  async verifyToken(token: string): Promise<{ userId: number }> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: number };
      return { userId: decoded.userId };
    } catch (error) {
      throw new DatabaseError('Token inválido ou expirado', 'INVALID_TOKEN');
    }
  }

  async getUserById(userId: number): Promise<Omit<User, 'senha_hash'>> {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, email, nome_completo, cargo, departamento, 
          telefone, foto_url, ativo, created_at, updated_at
        FROM usuarios 
        WHERE id = $1 AND ativo = true`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new DatabaseError('Usuário não encontrado', 'USER_NOT_FOUND');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Erro ao buscar usuário', 'USER_FETCH_ERROR');
    }
  }
}
