import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ProjetoService } from '../services/projeto.service';
import pool from '../config/database';
import redis from '../config/redis';

interface CustomRequest extends ExpressRequest {
  query: {
    page?: string;
    limit?: string;
    status?: string;
    search?: string;
  };
  params: {
    id?: string;
  };
  body: any;
  user?: {
    id: number;
    email: string;
  };
}

interface CustomResponse extends ExpressResponse {
  status(code: number): CustomResponse;
  json(data: any): CustomResponse;
  send(): CustomResponse;
}

const projetoService = new ProjetoService(pool, redis);

export const listarProjetos = async (req: CustomRequest, res: CustomResponse) => {
  try {
    const result = await projetoService.listarProjetos({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      search: req.query.search
    });

    return res.json({
      success: true,
      data: result.data,
      message: "Projetos carregados com sucesso",
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Erro no controller ao listar projetos:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar projetos'
    });
  }
};

export const buscarProjeto = async (req: CustomRequest, res: CustomResponse) => {
  try {
    const { id } = req.params;
    const projeto = await projetoService.buscarProjeto(Number(id));
    
    return res.json({
      success: true,
      data: projeto,
      message: "Projeto carregado com sucesso"
    });
  } catch (error: any) {
    console.error('Erro no controller ao buscar projeto:', error);
    if (error.message === 'Projeto não encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar projeto'
    });
  }
};

export const criarProjeto = async (req: CustomRequest, res: CustomResponse) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const projetoData = {
      ...req.body,
      responsavel_id: req.user.id
    };

    const projeto = await projetoService.criarProjeto(projetoData);
    
    console.log(`Novo projeto criado: ${projeto.nome} por ${req.user.email}`);

    return res.status(201).json({
      success: true,
      data: projeto,
      message: "Projeto criado com sucesso"
    });
  } catch (error: any) {
    console.error('Erro no controller ao criar projeto:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao criar projeto'
    });
  }
};

export const atualizarProjeto = async (req: CustomRequest, res: CustomResponse) => {
  try {
    const { id } = req.params;
    const projeto = await projetoService.atualizarProjeto(Number(id), req.body);
    
    console.log(`Projeto atualizado: ${projeto.nome} por ${req.user?.email}`);

    return res.json({
      success: true,
      data: projeto,
      message: "Projeto atualizado com sucesso"
    });
  } catch (error: any) {
    console.error('Erro no controller ao atualizar projeto:', error);
    if (error.message === 'Projeto não encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.errors
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao atualizar projeto'
    });
  }
};

export const excluirProjeto = async (req: CustomRequest, res: CustomResponse) => {
  try {
    const { id } = req.params;
    await projetoService.excluirProjeto(Number(id));
    
    console.log(`Projeto desativado: ID ${id} por ${req.user?.email}`);

    return res.json({
      success: true,
      message: "Projeto removido com sucesso"
    });
  } catch (error: any) {
    console.error('Erro no controller ao excluir projeto:', error);
    if (error.message === 'Projeto não encontrado') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    if (error.message.includes('oficinas ativas')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao excluir projeto'
    });
  }
};
