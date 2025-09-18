import { BaseRepository } from './base.repository';
import { Usuario } from '../models/usuario.model';
import { query } from '../config/database';
import { logger } from '../services/logger';
import bcrypt from 'bcryptjs';

export interface CreateUsuarioDTO extends Omit<Usuario, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> {
  senha: string;
}

export interface UpdateUsuarioDTO extends Partial<CreateUsuarioDTO> {}

export class UsuarioRepository extends BaseRepository<Usuario> {
  constructor() {
    // Habilitamos soft delete para usuários
    super('usuarios', true);
  }

  // Método para criar um novo usuário com senha criptografada
  async create(data: CreateUsuarioDTO): Promise<Usuario> {
    try {
      // Verifica se já existe um usuário com o mesmo email
      const existingUser = await this.findByEmail(data.email);
      if (existingUser) {
        throw new Error('Já existe um usuário com este email');
      }

      // Criptografa a senha
      const hashedPassword = await bcrypt.hash(data.senha, 12);

      // Remove a senha do objeto de retorno
      const { senha, ...usuarioData } = data;

      // Cria o usuário com a senha criptografada
      const usuario = await super.create({
        ...usuarioData,
        senha_hash: hashedPassword
      });

      // Remove o hash da senha do retorno
      const { senha_hash, ...result } = usuario;
      return result as Usuario;
    } catch (error) {
      logger.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  // Método para buscar usuário por email
  async findByEmail(email: string): Promise<Usuario | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE email = $1 AND deleted_at IS NULL
    `;

    try {
      const result = await query<Usuario>(sql, [email]);
      return result[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  }

  // Método para atualizar um usuário
  async update(id: number, data: UpdateUsuarioDTO): Promise<Usuario | null> {
    try {
      // Se estiver atualizando o email, verifica se já existe
      if (data.email) {
        const existingUser = await this.findByEmail(data.email);
        if (existingUser && existingUser.id !== id) {
          throw new Error('Já existe um usuário com este email');
        }
      }

      // Se estiver atualizando a senha, criptografa
      if (data.senha) {
        const { senha, ...rest } = data;
        const senha_hash = await bcrypt.hash(senha, 12);
        return super.update(id, { ...rest, senha_hash });
      }

      // Remove o campo senha se existir
      const { senha, ...updateData } = data;
      return super.update(id, updateData);
    } catch (error) {
      logger.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  // Método para validar credenciais
  async validateCredentials(email: string, senha: string): Promise<Omit<Usuario, 'senha_hash'> | null> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE email = $1 AND deleted_at IS NULL
      `;

      const result = await query<Usuario & { senha_hash: string }>(sql, [email]);
      const usuario = result[0];

      if (!usuario) {
        return null;
      }

      const isValid = await bcrypt.compare(senha, usuario.senha_hash);
      if (!isValid) {
        return null;
      }

      // Remove o hash da senha do retorno
      const { senha_hash, ...usuarioSemSenha } = usuario;
      return usuarioSemSenha;
    } catch (error) {
      logger.error('Erro ao validar credenciais:', error);
      throw error;
    }
  }

  // Método para buscar usuários por perfil
  async findByPerfil(perfil: string): Promise<Usuario[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE perfil = $1 AND deleted_at IS NULL
      ORDER BY nome
    `;

    try {
      return await query<Usuario>(sql, [perfil]);
    } catch (error) {
      logger.error('Erro ao buscar usuários por perfil:', error);
      throw error;
    }
  }

  // Método para buscar usuários ativos
  async findAtivos(): Promise<Usuario[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ativo = true AND deleted_at IS NULL
      ORDER BY nome
    `;

    try {
      return await query<Usuario>(sql);
    } catch (error) {
      logger.error('Erro ao buscar usuários ativos:', error);
      throw error;
    }
  }

  // Método para alterar a senha
  async alterarSenha(id: number, senhaAtual: string, novaSenha: string): Promise<boolean> {
    try {
      // Busca o usuário com a senha atual
      const sql = `
        SELECT senha_hash FROM ${this.tableName}
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await query<{ senha_hash: string }>(sql, [id]);
      const usuario = result[0];

      if (!usuario) {
        throw new Error('Usuário não encontrado');
      }

      // Valida a senha atual
      const isValid = await bcrypt.compare(senhaAtual, usuario.senha_hash);
      if (!isValid) {
        throw new Error('Senha atual incorreta');
      }

      // Criptografa e salva a nova senha
      const novaSenhaHash = await bcrypt.hash(novaSenha, 12);
      await super.update(id, { senha_hash: novaSenhaHash });

      return true;
    } catch (error) {
      logger.error('Erro ao alterar senha:', error);
      throw error;
    }
  }

  // Método para buscar usuários por termo de busca
  async search(termo: string): Promise<Usuario[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE 
        (
          nome ILIKE $1 OR 
          email ILIKE $1 OR 
          cpf LIKE $2 OR
          telefone LIKE $2
        ) 
        AND deleted_at IS NULL
      ORDER BY nome
      LIMIT 50
    `;

    try {
      const searchTerm = `%${termo}%`;
      const exactTerm = termo.replace(/\D/g, ''); // Remove não-dígitos para CPF/telefone
      return await query<Usuario>(sql, [searchTerm, exactTerm]);
    } catch (error) {
      logger.error('Erro ao buscar usuários:', error);
      throw error;
    }
  }

  // Método para atualizar o último login
  async updateLastLogin(id: number): Promise<void> {
    try {
      await super.update(id, { ultimo_login: new Date() });
    } catch (error) {
      logger.error('Erro ao atualizar último login:', error);
      throw error;
    }
  }
}
