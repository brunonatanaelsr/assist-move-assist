import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, LoginRequest, LoginResponse, UserProfile, JWTPayload } from '../types/auth';
import { loginSchema } from '../validators/auth.validator';
import { DatabaseError, AuthenticationError, NotFoundError } from '../utils/errors';

export class AuthService {
  constructor(private readonly pool: Pool) {}

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Validar dados de entrada
    const validatedData = loginSchema.parse(credentials);

    // Buscar usuário
    const query = "SELECT * FROM usuarios WHERE email = $1 AND ativo = true";
    const result = await this.pool.query<User>(query, [validatedData.email]);

    if (result.rows.length === 0) {
      throw new AuthenticationError('Credenciais inválidas');
    }

    const user = result.rows[0];

    // Verificar senha
    const passwordMatch = await bcrypt.compare(validatedData.password, user.senha_hash);
    if (!passwordMatch) {
      throw new AuthenticationError('Credenciais inválidas');
    }

    // Atualizar último login
    try {
      await this.pool.query(
        "UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1",
        [user.id]
      );
    } catch (error) {
      console.error('Erro ao atualizar último login:', error);
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.papel 
      } as JWTPayload,
      process.env.JWT_SECRET || 'movemarias_jwt_secret_key_2025_production',
      { expiresIn: "24h" }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.nome,
        email: user.email,
        role: user.papel
      }
    };
  }

  async getUserProfile(userId: number): Promise<UserProfile> {
    const query = `
      SELECT id, nome, email, papel, telefone 
      FROM usuarios 
      WHERE id = $1 AND ativo = true
    `;

    const result = await this.pool.query<User>(query, [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const user = result.rows[0];
    
    return {
      id: user.id,
      name: user.nome,
      email: user.email,
      role: user.papel,
      phone: user.telefone
    };
  }

  async validateToken(token: string): Promise<JWTPayload> {
    try {
      return jwt.verify(
        token, 
        process.env.JWT_SECRET || 'movemarias_jwt_secret_key_2025_production'
      ) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Token inválido ou expirado');
    }
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    // Buscar usuário
    const query = "SELECT senha_hash FROM usuarios WHERE id = $1 AND ativo = true";
    const result = await this.pool.query<Pick<User, 'senha_hash'>>(query, [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Verificar senha atual
    const passwordMatch = await bcrypt.compare(currentPassword, result.rows[0].senha_hash);
    if (!passwordMatch) {
      throw new AuthenticationError('Senha atual incorreta');
    }

    // Gerar hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Atualizar senha
    const updateQuery = `
      UPDATE usuarios 
      SET senha_hash = $1, 
          data_atualizacao = NOW() 
      WHERE id = $2
    `;

    try {
      await this.pool.query(updateQuery, [newPasswordHash, userId]);
    } catch (error) {
      throw new DatabaseError('Erro ao atualizar senha');
    }
  }
}
