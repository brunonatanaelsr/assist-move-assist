import { Router, type RequestHandler } from 'express';
import { loggerService } from '../services/logger';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { uploadAnySingle } from '../middleware/upload';
import { catchAsync } from '../middleware/errorHandler';
import path from 'path';
import fs from 'fs';

const router = Router();

// GET /documentos/:beneficiariaId - listar documentos da beneficiária
router.get('/:beneficiariaId', authenticateToken, catchAsync(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { beneficiariaId } = authReq.params as any;
    const result = await pool.query(
      `SELECT id, beneficiaria_id, nome_arquivo, caminho_arquivo, tamanho, mime_type, tipo_documento as tipo, categoria, status, uploaded_by, data_upload 
       FROM documentos 
       WHERE beneficiaria_id = $1 AND (status IS NULL OR status <> 'removido')
       ORDER BY data_upload DESC`,
      [beneficiariaId]
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    loggerService.error('Erro ao listar documentos', { error });
    res.status(500).json(errorResponse('Erro ao listar documentos'));
  }
}));

// POST /documentos/:beneficiariaId/upload - upload de documento
const uploadFileMiddleware = (fieldName: string): RequestHandler => (
  uploadAnySingle(fieldName) as unknown as RequestHandler
);

router.post('/:beneficiariaId/upload', authenticateToken, uploadFileMiddleware('file'), catchAsync(async (req, res): Promise<void> => {
  const authReq = req as AuthenticatedRequest & { file?: Express.Multer.File };
  try {
    const { beneficiariaId } = authReq.params as any;
    const { tipo, categoria, metadata } = (authReq.body ?? {}) as Record<string, any>;
    const file = authReq.file!;
    const userId = Number(authReq.user!.id);

    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
    const dest = path.join(uploadsRoot, String(beneficiariaId));
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const finalPath = path.join(dest, file.filename);
    await fs.promises.rename(file.path, finalPath);

    const result = await pool.query(
      `INSERT INTO documentos (beneficiaria_id, nome_arquivo, caminho_arquivo, tamanho, mime_type, tipo_documento, categoria, status, uploaded_by, data_upload, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ativo',$8,NOW(),$9::jsonb)
       RETURNING id, beneficiaria_id, nome_arquivo, caminho_arquivo, tamanho, mime_type, tipo_documento as tipo, categoria, status, uploaded_by, data_upload`,
      [beneficiariaId, file.originalname, finalPath, file.size, file.mimetype, tipo || null, categoria || null, userId, JSON.stringify(metadata || {})]
    );
    res.status(201).json(result.rows[0]);
    return;
  } catch (error) {
    loggerService.error('Erro ao fazer upload de documento', { error });
    // rollback do arquivo movido
    try {
      if (authReq.file) {
        const uploadsRoot = path.resolve(process.cwd(), 'uploads');
        const dest = path.join(uploadsRoot, String((authReq.params as any).beneficiariaId));
        const finalPath = path.join(dest, authReq.file.filename);
        await fs.promises.unlink(finalPath).catch(() => {});
      }
    } catch {}
    res.status(500).json(errorResponse('Erro ao fazer upload'));
    return;
  }
}));

// PUT /documentos/:documentoId - nova versão
router.put('/:documentoId', authenticateToken, uploadFileMiddleware('file'), catchAsync(async (req, res): Promise<void> => {
  const authReq = req as AuthenticatedRequest & { file?: Express.Multer.File };
  try {
    const { documentoId } = authReq.params as any;
    const { motivoModificacao, metadata } = (authReq.body ?? {}) as Record<string, any>;
    const file = authReq.file!;
    const userId = Number(authReq.user!.id);

    const doc = await pool.query('SELECT * FROM documentos WHERE id = $1', [documentoId]);
    if (doc.rowCount === 0) { res.status(404).json(errorResponse('Documento não encontrado')); return; }

    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const dest = path.join(uploadsRoot, String(doc.rows[0].beneficiaria_id));
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const finalPath = path.join(dest, file.filename);
    await fs.promises.rename(file.path, finalPath);

    // calcular número de versão
    const last = await pool.query('SELECT COALESCE(MAX(numero_versao),0)+1 as next FROM documento_versoes WHERE documento_id = $1', [documentoId]);
    const numero = last.rows[0].next || 1;
    await pool.query(
      `INSERT INTO documento_versoes (documento_id, numero_versao, caminho_arquivo, tamanho, modificado_por, motivo_modificacao, data_modificacao, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7::jsonb)`,
      [documentoId, numero, finalPath, file.size, userId, motivoModificacao || 'Atualização', JSON.stringify(metadata || {})]
    );

    // atualiza caminho atual no documentos
    await pool.query('UPDATE documentos SET caminho_arquivo = $1, tamanho = $2, mime_type = $3 WHERE id = $4', [finalPath, file.size, file.mimetype, documentoId]);
    res.json(successResponse({ id: documentoId, numero_versao: numero }));
    return;
  } catch (error) {
    loggerService.error('Erro ao versionar documento', { error });
    // rollback do arquivo movido
    try {
      if (authReq.file) {
        const { documentoId } = authReq.params as any;
        const doc = await pool.query('SELECT beneficiaria_id FROM documentos WHERE id = $1', [documentoId]);
        const beneficiariaId = doc.rows[0]?.beneficiaria_id || 'unknown';
        const uploadsRoot = path.resolve(process.cwd(), 'uploads');
        const dest = path.join(uploadsRoot, String(beneficiariaId));
        const finalPath = path.join(dest, authReq.file.filename);
        await fs.promises.unlink(finalPath).catch(() => {});
      }
    } catch {}
    res.status(500).json(errorResponse('Erro ao versionar documento'));
    return;
  }
}));

// GET /documentos/:documentoId/download
router.get('/:documentoId/download', authenticateToken, catchAsync(async (req, res): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { documentoId } = authReq.params as any;
    const result = await pool.query('SELECT nome_arquivo, caminho_arquivo, mime_type FROM documentos WHERE id = $1', [documentoId]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Documento não encontrado')); return; }
    const { nome_arquivo, caminho_arquivo, mime_type } = result.rows[0];
    res.setHeader('Content-Type', mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${nome_arquivo}"`);
    res.sendFile(path.resolve(caminho_arquivo));
    return;
  } catch (error) {
    loggerService.error('Erro no download de documento', { error });
    res.status(500).json(errorResponse('Erro no download'));
    return;
  }
}));

// DELETE /documentos/:documentoId
router.delete('/:documentoId', authenticateToken, catchAsync(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { documentoId } = authReq.params as any;
    await pool.query('UPDATE documentos SET status = $1 WHERE id = $2', ['removido', documentoId]);
    res.status(204).end();
  } catch (error) {
    loggerService.error('Erro ao excluir documento', { error });
    res.status(500).json(errorResponse('Erro ao excluir documento'));
  }
}));

// GET /documentos/:beneficiariaId/versoes
router.get('/:beneficiariaId/versoes', authenticateToken, catchAsync(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { beneficiariaId } = authReq.params as any;
    const result = await pool.query(
      `SELECT v.* FROM documento_versoes v 
       JOIN documentos d ON d.id = v.documento_id 
       WHERE d.beneficiaria_id = $1
       ORDER BY v.data_modificacao DESC`,
      [beneficiariaId]
    );
    res.json(result.rows);
  } catch (error) {
    loggerService.error('Erro ao listar versões de documento', { error });
    res.status(500).json(errorResponse('Erro ao listar versões'));
  }
}));

export default router;
