import { Request, Response } from 'express';
import { DocumentoService } from '../services/DocumentoService';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class DocumentoController {
  constructor(private service: DocumentoService) {}

  async upload(req: Request, res: Response) {
    try {
      const { beneficiariaId } = req.params;
      const { tipo, categoria } = req.body;
      const file = req.file;
      const userId = req.user.id;

      if (!file) {
        throw new AppError('Nenhum arquivo enviado', 400);
      }

      const documento = await this.service.upload({
        file,
        beneficiariaId: Number(beneficiariaId),
        tipo,
        categoria,
        uploadedBy: userId,
        metadata: req.body.metadata
      });

      res.status(201).json(documento);
    } catch (error) {
      logger.error('Erro no upload:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { documentoId } = req.params;
      const { motivoModificacao } = req.body;
      const file = req.file;
      const userId = req.user.id;

      if (!file) {
        throw new AppError('Nenhum arquivo enviado', 400);
      }

      if (!motivoModificacao) {
        throw new AppError('Motivo da modificação é obrigatório', 400);
      }

      const versao = await this.service.atualizar({
        documentoId: Number(documentoId),
        file,
        motivoModificacao,
        usuarioId: userId,
        metadata: req.body.metadata
      });

      res.json(versao);
    } catch (error) {
      logger.error('Erro na atualização:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async download(req: Request, res: Response) {
    try {
      const { documentoId } = req.params;
      const userId = req.user.id;

      const { path: filePath, filename, mimetype } = await this.service.download(
        Number(documentoId),
        userId
      );

      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);
    } catch (error) {
      logger.error('Erro no download:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async excluir(req: Request, res: Response) {
    try {
      const { documentoId } = req.params;
      const userId = req.user.id;

      await this.service.excluir(Number(documentoId), userId);
      res.status(204).end();
    } catch (error) {
      logger.error('Erro na exclusão:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async listarPorBeneficiaria(req: Request, res: Response) {
    try {
      const { beneficiariaId } = req.params;
      const documentos = await this.service.repository.findByBeneficiaria(
        Number(beneficiariaId)
      );
      res.json(documentos);
    } catch (error) {
      logger.error('Erro ao listar documentos:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async obterVersoes(req: Request, res: Response) {
    try {
      const { documentoId } = req.params;
      const versoes = await this.service.repository.getVersions(
        Number(documentoId)
      );
      res.json(versoes);
    } catch (error) {
      logger.error('Erro ao obter versões:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }
}
