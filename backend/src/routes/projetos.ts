import { Router, Response } from 'express';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { formatArrayDates, formatObjectDates } from '../utils/dateFormatter';
import { authenticateToken, requireGestor, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';

const router = Router();

// ====== INTERFACES ======

interface ProjetoData {
  id: number;
  nome: string;
  descricao?: string;
  data_inicio: Date;
  data_fim_prevista?: Date;
  data_fim_real?: Date;
  status: 'planejamento' | 'em_andamento' | 'concluido' | 'cancelado';
  responsavel_id: number;
  responsavel_nome?: string;
  orcamento?: number;
  local_execucao?: string;
  ativo: boolean;
  data_criacao: Date;
  data_atualizacao?: Date;
  total_oficinas?: number;
}

interface ProjetoInput {
  nome: string;
  descricao?: string;
  data_inicio: string;
  data_fim_prevista?: string;
  status?: 'planejamento' | 'em_andamento' | 'concluido' | 'cancelado';
  orcamento?: number;
  localizacao?: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
  status?: 'planejamento' | 'em_andamento' | 'concluido' | 'cancelado';
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
}

// Listar projetos
router.get('/', authenticateToken, async (req: AuthenticatedRequest<{}, {}, {}, PaginationQuery>, res: Response): Promise<Response> => {
  try {
    console.log('Buscando projetos...');
    const { page = '1', limit = '50', status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE p.ativo = true';
    let params: any[] = [];
    
    if (status) {
      whereClause += ' AND p.status = $1';
      params.push(status);
    }

    const result = await pool.query<ProjetoData>(
      `SELECT p.*, u.nome as responsavel_nome, 
              COUNT(o.id) as total_oficinas
       FROM projetos p
       LEFT JOIN usuarios u ON p.responsavel_id = u.id
       LEFT JOIN oficinas o ON p.id = o.projeto_id AND o.ativo = true
       ${whereClause}
       GROUP BY p.id, u.nome
       ORDER BY p.data_criacao DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );

    console.log(`Encontrados ${result.rows.length} projetos`);

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM projetos p ${whereClause}`,
      params
    );

    const projetosFormatados = formatArrayDates(result.rows, ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

    return res.json(successResponse(projetosFormatados, "Projetos carregados com sucesso", {
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].count)
      } as PaginationInfo
    }));

  } catch (error) {
    console.error("Get projetos error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json(errorResponse("Erro ao buscar projetos: " + errorMessage));
  }
});

// Buscar projeto por ID
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    
    const result = await pool.query<ProjetoData>(
      `SELECT p.*, u.nome as responsavel_nome 
       FROM projetos p
       LEFT JOIN usuarios u ON p.responsavel_id = u.id
       WHERE p.id = $1 AND p.ativo = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Projeto não encontrado"));
    }

    const projetoFormatado = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim', 'data_criacao', 'data_atualizacao']);

    return res.json(successResponse(projetoFormatado, "Projeto carregado com sucesso"));

  } catch (error) {
    console.error("Get projeto error:", error);
    return res.status(500).json(errorResponse("Erro ao buscar projeto"));
  }
});

// Criar projeto
router.post('/', authenticateToken, requireGestor, async (req: AuthenticatedRequest<{}, {}, ProjetoInput>, res: Response): Promise<Response> => {
  try {
    const { nome, descricao, data_inicio, data_fim_prevista, status, orcamento, localizacao } = req.body;

    if (!nome || !data_inicio) {
      return res.status(400).json(errorResponse("Nome e data de início são obrigatórios"));
    }

    const result = await pool.query<ProjetoData>(
      `INSERT INTO projetos (nome, descricao, data_inicio, data_fim_prevista, status, responsavel_id, orcamento, local_execucao, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
      [
        nome, 
        descricao, 
        data_inicio, 
        data_fim_prevista || null, 
        status || 'planejamento', 
        req.user!.id, 
        orcamento || null, 
        localizacao || null
      ]
    );

    console.log(`Novo projeto criado: ${nome} por ${req.user!.email}`);

    const projetoFormatado = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim_prevista', 'data_fim_real', 'data_criacao', 'data_atualizacao']);

    return res.status(201).json(successResponse(projetoFormatado, "Projeto criado com sucesso"));

  } catch (error) {
    console.error("Create projeto error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json(errorResponse("Erro ao criar projeto: " + errorMessage));
  }
});

// Atualizar projeto
router.put('/:id', authenticateToken, requireGestor, async (req: AuthenticatedRequest<{ id: string }, {}, ProjetoInput>, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { nome, descricao, data_inicio, data_fim_prevista, status, orcamento, localizacao } = req.body;

    if (!nome || !data_inicio) {
      return res.status(400).json(errorResponse("Nome e data de início são obrigatórios"));
    }

    const result = await pool.query<ProjetoData>(
      `UPDATE projetos 
       SET nome = $1, descricao = $2, data_inicio = $3, data_fim_prevista = $4, 
           status = $5, orcamento = $6, local_execucao = $7, data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = $8 AND ativo = true 
       RETURNING *`,
      [
        nome, 
        descricao, 
        data_inicio, 
        data_fim_prevista || null, 
        status || 'planejamento', 
        orcamento || null, 
        localizacao || null, 
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Projeto não encontrado"));
    }

    console.log(`Projeto atualizado: ${nome} por ${req.user!.email}`);

    const projetoFormatado = formatObjectDates(result.rows[0], ['data_inicio', 'data_fim_prevista', 'data_fim_real', 'data_criacao', 'data_atualizacao']);

    return res.json(successResponse(projetoFormatado, "Projeto atualizado com sucesso"));

  } catch (error) {
    console.error("Update projeto error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json(errorResponse("Erro ao atualizar projeto: " + errorMessage));
  }
});

// Deletar projeto (soft delete)
router.delete('/:id', authenticateToken, requireGestor, async (req: AuthenticatedRequest<{ id: string }>, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const result = await pool.query<ProjetoData>(
      'UPDATE projetos SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1 AND ativo = true RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse("Projeto não encontrado"));
    }

    console.log(`Projeto desativado: ${result.rows[0].nome} por ${req.user!.email}`);

    return res.json(successResponse(null, "Projeto removido com sucesso"));

  } catch (error) {
    console.error("Delete projeto error:", error);
    return res.status(500).json(errorResponse("Erro ao remover projeto"));
  }
});

export default router;
