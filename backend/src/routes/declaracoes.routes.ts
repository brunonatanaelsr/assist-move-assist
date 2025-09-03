import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { loggerService } from '../services/logger';

const router = Router();

// GERAR DECLARAÇÃO
router.post('/gerar', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tipo,
      beneficiaria_id,
      data_inicio,
      data_fim,
      carga_horaria,
      atividades_participadas,
      frequencia_percentual,
      observacoes,
      finalidade,
      responsavel_emissao,
      data_emissao
    } = req.body;

    const userId = Number((req as any).user!.id);
    
    // Se data_emissao não for fornecida, usar a data atual
    const dataEmissaoFinal = data_emissao || new Date().toISOString().split('T')[0];

    // Inserir declaração no banco
    const result = await pool.query(
      `INSERT INTO declaracoes (
        tipo, beneficiaria_id, data_inicio, data_fim, carga_horaria,
        atividades_participadas, frequencia_percentual, observacoes,
        finalidade, responsavel_emissao, data_emissao, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        tipo, beneficiaria_id, data_inicio, data_fim, carga_horaria,
        atividades_participadas, frequencia_percentual, observacoes,
        finalidade, responsavel_emissao, dataEmissaoFinal, userId
      ]
    );

    const declaracao = result.rows[0];

    // Simular geração de PDF (por enquanto retornar dados)
    res.status(201).json(successResponse({
      declaracao,
      url: `/api/declaracoes/${declaracao.id}/pdf`,
      message: 'Declaração gerada com sucesso'
    }));
    return;
  } catch (error) {
    loggerService.error('Erro ao gerar declaração:', error);
    res.status(500).json(errorResponse('Erro ao gerar declaração'));
    return;
  }
});

// LISTAR DECLARAÇÕES DE UMA BENEFICIÁRIA
router.get('/beneficiaria/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT d.*, b.nome_completo as beneficiaria_nome
       FROM declaracoes d
       LEFT JOIN beneficiarias b ON d.beneficiaria_id = b.id
       WHERE d.beneficiaria_id = $1
       ORDER BY d.created_at DESC`,
      [id]
    );

    res.json(successResponse(result.rows));
    return;
  } catch (error) {
    loggerService.error('Erro ao listar declarações:', error);
    res.status(500).json(errorResponse('Erro ao listar declarações'));
    return;
  }
});

// OBTER DECLARAÇÃO POR ID
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT d.*, b.nome_completo as beneficiaria_nome, b.cpf
       FROM declaracoes d
       LEFT JOIN beneficiarias b ON d.beneficiaria_id = b.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json(errorResponse('Declaração não encontrada'));
      return;
    }

    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    loggerService.error('Erro ao obter declaração:', error);
    res.status(500).json(errorResponse('Erro ao obter declaração'));
    return;
  }
});

// EXPORT PDF DA DECLARAÇÃO (Placeholder)
router.get('/:id/pdf', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT d.*, b.nome_completo as beneficiaria_nome, b.cpf
       FROM declaracoes d
       LEFT JOIN beneficiarias b ON d.beneficiaria_id = b.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json(errorResponse('Declaração não encontrada'));
      return;
    }

    // Por enquanto, retornar um PDF simulado
    const declaracao = result.rows[0];
    const pdfContent = `
      DECLARAÇÃO DE ${declaracao.tipo.toUpperCase()}
      
      Beneficiária: ${declaracao.beneficiaria_nome}
      CPF: ${declaracao.cpf}
      
      Declaramos que a beneficiária acima participou das seguintes atividades:
      ${declaracao.atividades_participadas}
      
      Período: ${declaracao.data_inicio} ${declaracao.data_fim ? `até ${declaracao.data_fim}` : ''}
      ${declaracao.carga_horaria ? `Carga Horária: ${declaracao.carga_horaria}h` : ''}
      ${declaracao.frequencia_percentual ? `Frequência: ${declaracao.frequencia_percentual}%` : ''}
      
      Finalidade: ${declaracao.finalidade}
      
      Observações: ${declaracao.observacoes || 'Nenhuma'}
      
      Data de Emissão: ${declaracao.data_emissao}
      Responsável: ${declaracao.responsavel_emissao}
    `;

    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="declaracao_${id}.pdf"`);
    res.send(pdfContent);
    return;
  } catch (error) {
    loggerService.error('Erro ao gerar PDF:', error);
    res.status(500).json(errorResponse('Erro ao gerar PDF'));
    return;
  }
});

export default router;
