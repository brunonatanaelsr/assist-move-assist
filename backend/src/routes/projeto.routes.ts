import express from 'express';
import { authenticateToken, requireGestor, authorize } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { createProjetoSchema, updateProjetoSchema, projetoFilterSchema } from '../validators/projeto.validator';
import { ProjetoService } from '../services/projeto.service';
import { pool } from '../config/database';

const router = express.Router();
import redis from '../lib/redis';
import { catchAsync } from '../middleware/errorHandler';
const projetoService = new ProjetoService(pool, redis as any);

router.use(authenticateToken);

router.get('/', authorize('projetos.ler'), catchAsync(async (req, res): Promise<void> => {
  try {
    const filters = projetoFilterSchema.parse(req.query);
    const result = await projetoService.listarProjetos(filters) as any;
    res.json(successResponse(result.data, 'Projetos carregados com sucesso'));
    return;
  } catch (error: any) {
    if (error.name === 'ZodError') { res.status(400).json(errorResponse('Parâmetros inválidos')); return; }
    res.status(500).json(errorResponse('Erro ao buscar projetos'));
    return;
  }
}));

router.get('/:id', authorize('projetos.ler'), catchAsync(async (req, res): Promise<void> => {
  try {
    const projeto = await projetoService.buscarProjeto(Number(req.params.id));
    res.json(successResponse(projeto, 'Projeto carregado com sucesso'));
    return;
  } catch (error: any) {
    if (error.message === 'Projeto não encontrado') { res.status(404).json(errorResponse(error.message)); return; }
    res.status(500).json(errorResponse('Erro ao buscar projeto'));
    return;
  }
}));

router.post('/', authorize('projetos.criar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const user = (req as any).user;
    const data = createProjetoSchema.parse({ ...req.body, responsavel_id: Number(user?.id) });
    const projeto = await projetoService.criarProjeto(data);
    res.status(201).json(successResponse(projeto, 'Projeto criado com sucesso'));
    return;
  } catch (error: any) {
    if (error.name === 'ZodError') { res.status(400).json(errorResponse('Dados inválidos')); return; }
    res.status(500).json(errorResponse('Erro ao criar projeto'));
    return;
  }
}));

router.put('/:id', authorize('projetos.editar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const data = updateProjetoSchema.parse(req.body);
    const projeto = await projetoService.atualizarProjeto(Number(req.params.id), data);
    res.json(successResponse(projeto, 'Projeto atualizado com sucesso'));
    return;
  } catch (error: any) {
    if (error.name === 'ZodError') { res.status(400).json(errorResponse('Dados inválidos')); return; }
    if (error.message === 'Projeto não encontrado') { res.status(404).json(errorResponse(error.message)); return; }
    res.status(500).json(errorResponse('Erro ao atualizar projeto'));
    return;
  }
}));

router.delete('/:id', authorize('projetos.excluir'), catchAsync(async (req, res): Promise<void> => {
  try {
    await projetoService.excluirProjeto(Number(req.params.id));
    res.json(successResponse(null, 'Projeto removido com sucesso'));
    return;
  } catch (error: any) {
    if (error.message.includes('não encontrado') || error.message.includes('oficinas ativas')) {
      res.status(400).json(errorResponse(error.message));
      return;
    }
    res.status(500).json(errorResponse('Erro ao excluir projeto'));
    return;
  }
}));

export default router;
