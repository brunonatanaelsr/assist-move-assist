import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { loggerService } from '../services/logger';
import { gerarPDFRecibo } from '../utils/pdfGen';

const router = Router();

// GERAR RECIBO
router.post('/gerar', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tipo,
      beneficiaria_id,
      descricao,
      valor,
      data_recebimento,
      periodo_referencia,
      observacoes,
      responsavel_entrega
    } = req.body;

    const userId = Number((req as any).user!.id);

    // Inserir recibo no banco
    const result = await pool.query(
      `INSERT INTO recibos (
        tipo, beneficiaria_id, descricao, valor, data_recebimento,
        periodo_referencia, observacoes, responsavel_entrega, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        tipo, beneficiaria_id, descricao, valor, data_recebimento,
        periodo_referencia, observacoes, responsavel_entrega, userId
      ]
    );

    const recibo = result.rows[0];

    // Simular geração de PDF (por enquanto retornar dados)
    res.status(201).json(successResponse({
      recibo,
      url: `/api/recibos/${recibo.id}/pdf`,
      message: 'Recibo gerado com sucesso'
    }));
    return;
  } catch (error) {
    loggerService.error('Erro ao gerar recibo:', error);
    res.status(500).json(errorResponse('Erro ao gerar recibo'));
    return;
  }
});

// LISTAR RECIBOS DE UMA BENEFICIÁRIA
router.get('/beneficiaria/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, b.nome_completo as beneficiaria_nome
       FROM recibos r
       LEFT JOIN beneficiarias b ON r.beneficiaria_id = b.id
       WHERE r.beneficiaria_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    res.json(successResponse(result.rows));
    return;
  } catch (error) {
    loggerService.error('Erro ao listar recibos:', error);
    res.status(500).json(errorResponse('Erro ao listar recibos'));
    return;
  }
});

// OBTER RECIBO POR ID
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, b.nome_completo as beneficiaria_nome, b.cpf
       FROM recibos r
       LEFT JOIN beneficiarias b ON r.beneficiaria_id = b.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json(errorResponse('Recibo não encontrado'));
      return;
    }

    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    loggerService.error('Erro ao obter recibo:', error);
    res.status(500).json(errorResponse('Erro ao obter recibo'));
    return;
  }
});

// EXPORT PDF DO RECIBO
router.get('/:id/pdf', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, b.nome_completo as beneficiaria_nome, b.cpf
       FROM recibos r
       LEFT JOIN beneficiarias b ON r.beneficiaria_id = b.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json(errorResponse('Recibo não encontrado'));
      return;
    }

    const recibo = result.rows[0];
    
    // Gerar PDF real usando pdf-lib
    const pdfBytes = await gerarPDFRecibo(recibo);

    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="recibo_${id}.pdf"`);
    
    // Converter Uint8Array para Array regular para evitar problemas de serialização
    const pdfArray = Array.from(pdfBytes);
    const pdfBuffer = Buffer.from(pdfArray);
    
    res.send(pdfBuffer);
    return;
  } catch (error) {
    loggerService.error('Erro ao gerar PDF:', error);
    res.status(500).json(errorResponse('Erro ao gerar PDF'));
    return;
  }
});

export default router;
