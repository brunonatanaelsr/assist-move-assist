import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import sharp from 'sharp';
import { DocumentoRepository } from '../repositories/DocumentoRepository';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { moveUploadedFile } from '../config/upload';

interface UploadDocumentoParams {
  file: Express.Multer.File;
  beneficiariaId: number;
  tipo: string;
  categoria: string;
  uploadedBy: number;
  metadata?: Record<string, any>;
}

interface AtualizarDocumentoParams {
  documentoId: number;
  file: Express.Multer.File;
  motivoModificacao: string;
  usuarioId: number;
  metadata?: Record<string, any>;
}

export class DocumentoService {
  constructor(
    private repository: DocumentoRepository,
    private uploadDir: string
  ) {}

  async upload({
    file,
    beneficiariaId,
    tipo,
    categoria,
    uploadedBy,
    metadata
  }: UploadDocumentoParams) {
    try {
      // Processar arquivo se for imagem
      if (file.mimetype.startsWith('image/')) {
        await this.processImage(file.path);
      }

      // Calcular hash do arquivo
      const hash = await this.calculateFileHash(file.path);

      // Mover para localização final
      const finalPath = await moveUploadedFile(
        file.path,
        beneficiariaId,
        path.basename(file.path)
      );

      // Salvar no banco
      const documento = await this.repository.create({
        beneficiaria_id: beneficiariaId,
        nome_arquivo: file.originalname,
        tipo_documento: tipo,
        categoria,
        caminho_arquivo: finalPath,
        tamanho: file.size,
        mime_type: file.mimetype,
        hash_arquivo: hash,
        metadata,
        uploaded_by: uploadedBy
      });

      // Registrar acesso
      await this.repository.registrarAcesso(
        documento.id,
        uploadedBy,
        'modificacao'
      );

      return documento;
    } catch (error) {
      // Limpar arquivo em caso de erro
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        logger.error('Erro ao limpar arquivo temporário:', unlinkError);
      }

      logger.error('Erro ao processar upload:', error);
      throw error instanceof AppError ? error : new AppError('Erro ao processar upload', 500);
    }
  }

  async atualizar({
    documentoId,
    file,
    motivoModificacao,
    usuarioId,
    metadata
  }: AtualizarDocumentoParams) {
    try {
      // Verificar se documento existe
      const documento = await this.repository.findById(documentoId);
      if (!documento) {
        throw new AppError('Documento não encontrado', 404);
      }

      // Processar arquivo se for imagem
      if (file.mimetype.startsWith('image/')) {
        await this.processImage(file.path);
      }

      // Calcular hash do arquivo
      const hash = await this.calculateFileHash(file.path);

      // Mover para localização final
      const finalPath = await moveUploadedFile(
        file.path,
        documento.beneficiaria_id,
        path.basename(file.path)
      );

      // Criar nova versão
      const versao = await this.repository.createVersion({
        documento_id: documentoId,
        caminho_arquivo: finalPath,
        tamanho: file.size,
        hash_arquivo: hash,
        modificado_por: usuarioId,
        motivo_modificacao,
        metadata
      });

      // Registrar acesso
      await this.repository.registrarAcesso(
        documentoId,
        usuarioId,
        'modificacao'
      );

      return versao;
    } catch (error) {
      // Limpar arquivo em caso de erro
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        logger.error('Erro ao limpar arquivo temporário:', unlinkError);
      }

      logger.error('Erro ao atualizar documento:', error);
      throw error instanceof AppError ? error : new AppError('Erro ao atualizar documento', 500);
    }
  }

  async download(documentoId: number, usuarioId: number) {
    try {
      const documento = await this.repository.findById(documentoId);
      if (!documento) {
        throw new AppError('Documento não encontrado', 404);
      }

      // Verificar se arquivo existe
      try {
        await fs.access(documento.caminho_arquivo);
      } catch {
        throw new AppError('Arquivo não encontrado no sistema', 404);
      }

      // Registrar acesso
      await this.repository.registrarAcesso(
        documentoId,
        usuarioId,
        'download'
      );

      return {
        path: documento.caminho_arquivo,
        filename: documento.nome_arquivo,
        mimetype: documento.mime_type
      };
    } catch (error) {
      logger.error('Erro ao processar download:', error);
      throw error instanceof AppError ? error : new AppError('Erro ao processar download', 500);
    }
  }

  async excluir(documentoId: number, usuarioId: number) {
    try {
      await this.repository.softDelete(documentoId, usuarioId);
    } catch (error) {
      logger.error('Erro ao excluir documento:', error);
      throw error instanceof AppError ? error : new AppError('Erro ao excluir documento', 500);
    }
  }

  private async processImage(filePath: string): Promise<void> {
    try {
      await sharp(filePath)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(filePath + '.processed');

      await fs.rename(filePath + '.processed', filePath);
    } catch (error) {
      logger.error('Erro ao processar imagem:', error);
      throw new AppError('Erro ao processar imagem', 500);
    }
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      return createHash('sha256').update(buffer).digest('hex');
    } catch (error) {
      logger.error('Erro ao calcular hash:', error);
      throw new AppError('Erro ao processar arquivo', 500);
    }
  }
}
