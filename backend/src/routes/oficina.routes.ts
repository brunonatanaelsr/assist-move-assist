import express from 'express';
import Redis from 'ioredis';
import { OficinaService } from '../services/oficina.service';
import { authenticateToken, requireGestor } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { oficinaFilterSchema, createOficinaSchema, updateOficinaSchema } from '../validators/oficina.validator';
import { pool } from '../config/database';

const router = express.Router();

// Inicialização do Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0
});

const oficinaService = new OficinaService(pool, redis);

// Listar oficinas (público)
router.get('/', async (req, res): Promise<void> => {
  try {
    const filters = oficinaFilterSchema.parse(req.query);
    const result = await oficinaService.listarOficinas(filters);
    
    res.json(successResponse(
      { items: result.data, pagination: result.pagination },
      "Oficinas carregadas com sucesso"
    ));
    return;
  } catch (error: any) {
    console.error("Get oficinas error:", error);

    if (error.name === 'ZodError') {
      res.status(400).json(errorResponse("Parâmetros de filtro inválidos"));
      return;
    }

    res.status(500).json(errorResponse("Erro ao buscar oficinas"));
    return;
  }
});

// Obter oficina específica
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const oficina = await oficinaService.buscarOficina(id);
    
    res.json(successResponse(oficina, "Oficina carregada com sucesso"));
    return;
  } catch (error: any) {
    console.error("Get oficina error:", error);

    if (error.message === "Oficina não encontrada") {
      res.status(404).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao buscar oficina"));
    return;
  }
});

// Criar oficina
router.post('/', authenticateToken, requireGestor, async (req, res): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse('Não autenticado'));
      return;
    }
    const oficina = await oficinaService.criarOficina(req.body, Number(user.id));
    res.status(201).json(successResponse(oficina, "Oficina criada com sucesso"));
    return;
  } catch (error: any) {
    console.error("Create oficina error:", error);

    if (error.name === 'ZodError') {
      res.status(400).json(errorResponse("Dados inválidos para criar oficina"));
      return;
    }

    if (error.message === "Projeto não encontrado") {
      res.status(400).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao criar oficina"));
    return;
  }
});

// Atualizar oficina
router.put('/:id', authenticateToken, requireGestor, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse('Não autenticado'));
      return;
    }
    const oficina = await oficinaService.atualizarOficina(
      id, 
      req.body,
      Number(user.id),
      String(user.role)
    );
    
    res.json(successResponse(oficina, "Oficina atualizada com sucesso"));
    return;
  } catch (error: any) {
    console.error("Update oficina error:", error);

    if (error.name === 'ZodError') {
      res.status(400).json(errorResponse("Dados inválidos para atualizar oficina"));
      return;
    }

    if (error.message === "Oficina não encontrada") {
      res.status(404).json(errorResponse(error.message));
      return;
    }

    if (error.message === "Projeto não encontrado") {
      res.status(400).json(errorResponse(error.message));
      return;
    }

    if (error.message === "Sem permissão para editar esta oficina") {
      res.status(403).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao atualizar oficina"));
    return;
  }
});

// Excluir oficina (soft delete)
router.delete('/:id', authenticateToken, requireGestor, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse('Não autenticado'));
      return;
    }
    await oficinaService.excluirOficina(id, Number(user.id), String(user.role));
    
    res.json(successResponse(null, "Oficina excluída com sucesso"));
    return;
  } catch (error: any) {
    console.error("Delete oficina error:", error);

    if (error.message === "Oficina não encontrada") {
      res.status(404).json(errorResponse(error.message));
      return;
    }

    if (error.message === "Sem permissão para excluir esta oficina") {
      res.status(403).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao excluir oficina"));
    return;
  }
});

// Obter participantes de uma oficina
router.get('/:id/participantes', authenticateToken, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const participantes = await oficinaService.listarParticipantes(id);
    
    res.json(successResponse(participantes, "Participantes carregados com sucesso"));
    return;
  } catch (error: any) {
    console.error("Get participantes error:", error);

    if (error.message === "Oficina não encontrada") {
      res.status(404).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao buscar participantes"));
    return;
  }
});

export default router;
