import { Pool } from 'pg';
import { logger } from '../services/logger';
import { AppError } from '../utils';

interface Documento {
  id: number;
  beneficiaria_id: number;
  nome_arquivo: string;
  tipo_documento: string;
  categoria: string;
  caminho_arquivo: string;
  tamanho: number;
  mime_type: string;
  hash_arquivo: string;
  metadata?: Record<string, any>;
  status: 'ativo' | 'removido';
  uploaded_by: number;
  data_upload: Date;
  data_remocao?: Date;
}

interface DocumentoVersao {
  id: number;
  documento_id: number;
  numero_versao: number;
  caminho_arquivo: string;
  tamanho: number;
  hash_arquivo: string;
  modificado_por: number;
  data_modificacao: Date;
  motivo_modificacao?: string;
  metadata?: Record<string, any>;
}

export class DocumentoRepository {
  constructor(private pool: Pool) {}

  async create(data: Partial<Documento>): Promise<Documento> {
    try {
      const query = `
        INSERT INTO documentos (
          beneficiaria_id, nome_arquivo, tipo_documento, 
          categoria, caminho_arquivo, tamanho, 
          mime_type, hash_arquivo, metadata,
          uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        data.beneficiaria_id,
        data.nome_arquivo,
        data.tipo_documento,
        data.categoria,
        data.caminho_arquivo,
        data.tamanho,
        data.mime_type,
        data.hash_arquivo,
        data.metadata || {},
        data.uploaded_by
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Erro ao criar documento:', error);
      throw new AppError('Erro ao salvar documento', 500);
    }
  }

  async findByBeneficiaria(beneficiariaId: number): Promise<Documento[]> {
    try {
      const query = `
        SELECT d.*, u.nome as uploaded_by_nome
        FROM documentos d
        JOIN usuarios u ON d.uploaded_by = u.id
        WHERE d.beneficiaria_id = $1 
          AND d.status = 'ativo'
        ORDER BY d.data_upload DESC
      `;

      const result = await this.pool.query(query, [beneficiariaId]);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar documentos:', error);
      throw new AppError('Erro ao buscar documentos', 500);
    }
  }

  async findById(id: number): Promise<Documento | null> {
    try {
      const query = `
        SELECT d.*, u.nome as uploaded_by_nome
        FROM documentos d
        JOIN usuarios u ON d.uploaded_by = u.id
        WHERE d.id = $1 AND d.status = 'ativo'
      `;

      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Erro ao buscar documento:', error);
      throw new AppError('Erro ao buscar documento', 500);
    }
  }

  async createVersion(data: Partial<DocumentoVersao>): Promise<DocumentoVersao> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Buscar última versão
      const versionQuery = `
        SELECT COALESCE(MAX(numero_versao), 0) as ultima_versao
        FROM documento_versoes
        WHERE documento_id = $1
      `;
      const versionResult = await client.query(versionQuery, [data.documento_id]);
      const novaVersao = versionResult.rows[0].ultima_versao + 1;

      // Inserir nova versão
      const query = `
        INSERT INTO documento_versoes (
          documento_id, numero_versao, caminho_arquivo,
          tamanho, hash_arquivo, modificado_por,
          motivo_modificacao, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        data.documento_id,
        novaVersao,
        data.caminho_arquivo,
        data.tamanho,
        data.hash_arquivo,
        data.modificado_por,
        data.motivo_modificacao,
        data.metadata || {}
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Erro ao criar versão:', error);
      throw new AppError('Erro ao criar versão do documento', 500);
    } finally {
      client.release();
    }
  }

  async getVersions(documentoId: number): Promise<DocumentoVersao[]> {
    try {
      const query = `
        SELECT v.*, u.nome as modificado_por_nome
        FROM documento_versoes v
        JOIN usuarios u ON v.modificado_por = u.id
        WHERE v.documento_id = $1
        ORDER BY v.numero_versao DESC
      `;

      const result = await this.pool.query(query, [documentoId]);
      return result.rows;
    } catch (error) {
      logger.error('Erro ao buscar versões:', error);
      throw new AppError('Erro ao buscar versões do documento', 500);
    }
  }

  async softDelete(id: number, userId: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Atualizar status do documento
      const updateQuery = `
        UPDATE documentos
        SET status = 'removido',
            data_remocao = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'ativo'
      `;

      const result = await client.query(updateQuery, [id]);

      if (result.rowCount === 0) {
        throw new AppError('Documento não encontrado', 404);
      }

      // Registrar no log de auditoria
      const logQuery = `
        INSERT INTO audit_logs (
          tabela,
          operacao,
          registro_id,
          usuario_id,
          detalhes
        ) VALUES (
          'documentos',
          'DELETE',
          $1,
          $2,
          'Remoção lógica de documento'
        )
      `;

      await client.query(logQuery, [id, userId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Erro ao remover documento:', error);
      throw error instanceof AppError ? error : new AppError('Erro ao remover documento', 500);
    } finally {
      client.release();
    }
  }

  async registrarAcesso(
    documentoId: number,
    usuarioId: number,
    tipoAcesso: 'visualizacao' | 'download' | 'modificacao',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const query = `
        SELECT registrar_acesso_documento($1, $2, $3, $4, $5)
      `;

      await this.pool.query(query, [
        documentoId,
        usuarioId,
        tipoAcesso,
        ipAddress,
        userAgent
      ]);
    } catch (error) {
      logger.error('Erro ao registrar acesso:', error);
      // Não lançar erro para não impactar a operação principal
    }
  }
}
