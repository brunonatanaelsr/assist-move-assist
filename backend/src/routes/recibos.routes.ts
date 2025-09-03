import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { loggerService } from '../services/logger';

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

// EXPORT PDF DO RECIBO (Placeholder)
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

    // Por enquanto, retornar um PDF simulado
    const recibo = result.rows[0];
    const pdfContent = `
      RECIBO DE ${recibo.tipo.toUpperCase()}
      
      Beneficiária: ${recibo.beneficiaria_nome}
      CPF: ${recibo.cpf}
      
      RECONHEÇO que recebi de ${recibo.responsavel_entrega}:
      
      Descrição: ${recibo.descricao}
      Valor: R$ ${parseFloat(recibo.valor).toFixed(2)}
      Data do Recebimento: ${recibo.data_recebimento}
      Período de Referência: ${recibo.periodo_referencia}
      
      Observações: ${recibo.observacoes || 'Nenhuma'}
      
      Por ser expressão da verdade, firmo o presente.
      
      ________________________________
      ${recibo.beneficiaria_nome}
      CPF: ${recibo.cpf}
    `;

    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="recibo_${id}.pdf"`);
    res.send(pdfContent);
    return;
  } catch (error) {
    loggerService.error('Erro ao gerar PDF:', error);
    res.status(500).json(errorResponse('Erro ao gerar PDF'));
    return;
  }
});

export default router;
