import express from 'express';
import { db } from '../services/db';
import { authenticateToken, requireProfissional, AuthenticatedRequest } from '../middleware/auth';
import { loggerService } from '../services/logger';

const router = express.Router();

// GET /beneficiarias - Listar beneficiárias
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { search, status, page = '1', limit = '10' } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    const filters = {
      search: search as string,
      status: status as string,
      limit: Number(limit),
      offset
    };

    const beneficiarias = await db.getBeneficiarias(filters);
    
    // Contar total para paginação
    let countQuery = 'SELECT COUNT(*) as total FROM beneficiarias WHERE 1=1';
    const countParams: any[] = [];

    if (filters.search) {
      countParams.push(`%${filters.search}%`);
      countQuery += ` AND (nome_completo ILIKE $${countParams.length} OR cpf ILIKE $${countParams.length})`;
    }

    if (filters.status) {
      countParams.push(filters.status);
      countQuery += ` AND status = $${countParams.length}`;
    }

    const totalResult = await db.query(countQuery, countParams);
    const total = Number(totalResult[0].total);

    res.json({
      beneficiarias,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    loggerService.error('Erro ao listar beneficiárias:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /beneficiarias/:id - Buscar beneficiária por ID
router.get('/:id', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    
    const beneficiaria = await db.findById('beneficiarias', id);
    
    if (!beneficiaria) {
      return res.status(404).json({
        error: 'Beneficiária não encontrada'
      });
    }

    res.json({ beneficiaria });
  } catch (error) {
    loggerService.error('Erro ao buscar beneficiária:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// POST /beneficiarias - Criar nova beneficiária
router.post('/', authenticateToken, requireProfissional, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const {
      nome_completo,
      cpf,
      rg,
      data_nascimento,
      telefone,
      endereco,
      cep,
      cidade,
      estado,
      status = 'ativa'
    } = req.body;

    // Validações básicas
    if (!nome_completo || !cpf) {
      return res.status(400).json({
        error: 'Nome completo e CPF são obrigatórios'
      });
    }

    // Verificar se CPF já existe
    const existingBeneficiaria = await db.query(
      'SELECT id FROM beneficiarias WHERE cpf = $1',
      [cpf]
    );

    if (existingBeneficiaria.length > 0) {
      return res.status(409).json({
        error: 'CPF já cadastrado'
      });
    }

    const beneficiariaData = {
      nome_completo,
      cpf,
      rg,
      data_nascimento: data_nascimento ? new Date(data_nascimento) : null,
      telefone,
      endereco,
      cep,
      cidade,
      estado,
      status,
      created_by: req.user!.id,
      created_at: new Date(),
      updated_at: new Date()
    };

    const beneficiaria = await db.insert('beneficiarias', beneficiariaData);

    loggerService.audit('BENEFICIARIA_CREATED', req.user!.id, { 
      beneficiaria_id: beneficiaria.id,
      nome_completo 
    });

    res.status(201).json({
      message: 'Beneficiária cadastrada com sucesso',
      beneficiaria
    });
  } catch (error) {
    loggerService.error('Erro ao criar beneficiária:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// PUT /beneficiarias/:id - Atualizar beneficiária
router.put('/:id', authenticateToken, requireProfissional, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remover campos que não devem ser atualizados diretamente
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.created_by;

    // Verificar se beneficiária existe
    const existingBeneficiaria = await db.findById('beneficiarias', id);
    if (!existingBeneficiaria) {
      return res.status(404).json({
        error: 'Beneficiária não encontrada'
      });
    }

    // Se atualizando CPF, verificar duplicatas
    if (updateData.cpf && updateData.cpf !== existingBeneficiaria.cpf) {
      const cpfExists = await db.query(
        'SELECT id FROM beneficiarias WHERE cpf = $1 AND id != $2',
        [updateData.cpf, id]
      );

      if (cpfExists.length > 0) {
        return res.status(409).json({
          error: 'CPF já está em uso por outra beneficiária'
        });
      }
    }

    // Converter data_nascimento se fornecida
    if (updateData.data_nascimento) {
      updateData.data_nascimento = new Date(updateData.data_nascimento);
    }

    const beneficiaria = await db.update('beneficiarias', id, updateData);

    loggerService.audit('BENEFICIARIA_UPDATED', req.user!.id, { 
      beneficiaria_id: id,
      changes: Object.keys(updateData)
    });

    res.json({
      message: 'Beneficiária atualizada com sucesso',
      beneficiaria
    });
  } catch (error) {
    loggerService.error('Erro ao atualizar beneficiária:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// DELETE /beneficiarias/:id - Excluir beneficiária (soft delete)
router.delete('/:id', authenticateToken, requireProfissional, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    // Verificar se beneficiária existe
    const beneficiaria = await db.findById('beneficiarias', id);
    if (!beneficiaria) {
      return res.status(404).json({
        error: 'Beneficiária não encontrada'
      });
    }

    // Soft delete - marcar como inativa
    await db.update('beneficiarias', id, {
      status: 'inativa',
      deleted_at: new Date()
    });

    loggerService.audit('BENEFICIARIA_DELETED', req.user!.id, { 
      beneficiaria_id: id,
      nome_completo: beneficiaria.nome_completo
    });

    res.json({
      message: 'Beneficiária removida com sucesso'
    });
  } catch (error) {
    loggerService.error('Erro ao remover beneficiária:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /beneficiarias/:id/anamneses - Buscar anamneses da beneficiária
router.get('/:id/anamneses', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const anamneses = await db.query(
      `SELECT * FROM anamneses_social 
       WHERE beneficiaria_id = $1 
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({ anamneses });
  } catch (error) {
    loggerService.error('Erro ao buscar anamneses:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /beneficiarias/:id/declaracoes - Buscar declarações da beneficiária
router.get('/:id/declaracoes', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    const declaracoes = await db.query(
      `SELECT * FROM declaracoes_comparecimento 
       WHERE beneficiaria_id = $1 
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({ declaracoes });
  } catch (error) {
    loggerService.error('Erro ao buscar declarações:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

export default router;
