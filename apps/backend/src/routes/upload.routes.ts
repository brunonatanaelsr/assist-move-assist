import { Router, Response, type RequestHandler } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadAnySingle, UPLOAD_DIR } from '../middleware/upload';
import path from 'path';
import fs from 'fs';
import { errorResponse, successResponse } from '../utils/responseFormatter';

const router = Router();

// GET /upload/test - verificação simples
router.get('/test', (_req, res: Response) => {
  res.json({ ok: true, message: 'Upload endpoint ativo' });
});

// POST /upload - upload genérico de arquivo (imagens e PDFs)
const uploadFileHandler = (fieldName: string): RequestHandler => (
  uploadAnySingle(fieldName) as unknown as RequestHandler
);

router.post(
  '/',
  authenticateToken,
  uploadFileHandler('file'),
  async (req: AuthenticatedRequest & { file?: Express.Multer.File }, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json(errorResponse('Nenhum arquivo enviado'));
        return;
      }

      const file = req.file;
      const url = `/api/upload/files/${encodeURIComponent(file.filename)}`;

      res.status(201).json(successResponse({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        url,
      }));
      return;
    } catch (error) {
      res.status(500).json(errorResponse('Erro ao fazer upload'));
      return;
    }
  }
);

// GET /upload/files/:filename - servir arquivo enviado (autenticado)
router.get('/files/:filename', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { filename } = req.params as any;
    const safe = path.basename(String(filename));
    if (safe !== filename) {
      res.status(400).json(errorResponse('Nome de arquivo inválido'));
      return;
    }

    const filePath = path.join(UPLOAD_DIR, safe);
    if (!fs.existsSync(filePath)) {
      res.status(404).json(errorResponse('Arquivo não encontrado'));
      return;
    }

    res.sendFile(filePath);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao servir arquivo'));
    return;
  }
});

export default router;

