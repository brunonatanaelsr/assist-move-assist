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
router.get('/', async (req, res) => {
  try {
    const filters = oficinaFilterSchema.parse(req.query);
    const result = await oficinaService.listarOficinas(filters);
    
    res.json(successResponse(
      result.data,
      "Oficinas carregadas com sucesso",
      { pagination: result.pagination }
    ));
  } catch (error: any) {
    console.error("Get oficinas error:", error);

    if (error.name === 'ZodError') {
      return res.status(400).json(errorResponse("Parâmetros de filtro inválidos"));
    }

    res.status(500).json(errorResponse("Erro ao buscar oficinas"));
  }
});

// Obter oficina específica
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const oficina = await oficinaService.buscarOficina(id);
    
    res.json(successResponse(oficina, "Oficina carregada com sucesso"));
  } catch (error: any) {
    console.error("Get oficina error:", error);

    if (error.message === "Oficina não encontrada") {
      return res.status(404).json(errorResponse(error.message));
    }

    res.status(500).json(errorResponse("Erro ao buscar oficina"));
  }
});

// Criar oficina
router.post('/', authenticateToken, requireGestor, async (req, res) => {
  try {
    const oficina = await oficinaService.criarOficina(req.body, req.user.id);
    res.status(201).json(successResponse(oficina, "Oficina criada com sucesso"));
  } catch (error: any) {
    console.error("Create oficina error:", error);

    if (error.name === 'ZodError') {
      return res.status(400).json(errorResponse("Dados inválidos para criar oficina"));
    }

    if (error.message === "Projeto não encontrado") {
      return res.status(400).json(errorResponse(error.message));
    }

    res.status(500).json(errorResponse("Erro ao criar oficina"));
  }
});

// Atualizar oficina
router.put('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const oficina = await oficinaService.atualizarOficina(
      id, 
      req.body,
      req.user.id,
      req.user.role
    );
    
    res.json(successResponse(oficina, "Oficina atualizada com sucesso"));
  } catch (error: any) {
    console.error("Update oficina error:", error);

    if (error.name === 'ZodError') {
      return res.status(400).json(errorResponse("Dados inválidos para atualizar oficina"));
    }

    if (error.message === "Oficina não encontrada") {
      return res.status(404).json(errorResponse(error.message));
    }

    if (error.message === "Projeto não encontrado") {
      return res.status(400).json(errorResponse(error.message));
    }

    if (error.message === "Sem permissão para editar esta oficina") {
      return res.status(403).json(errorResponse(error.message));
    }

    res.status(500).json(errorResponse("Erro ao atualizar oficina"));
  }
});

// Excluir oficina (soft delete)
router.delete('/:id', authenticateToken, requireGestor, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await oficinaService.excluirOficina(id, req.user.id, req.user.role);
    
    res.json(successResponse(null, "Oficina excluída com sucesso"));
  } catch (error: any) {
    console.error("Delete oficina error:", error);

    if (error.message === "Oficina não encontrada") {
      return res.status(404).json(errorResponse(error.message));
    }

    if (error.message === "Sem permissão para excluir esta oficina") {
      return res.status(403).json(errorResponse(error.message));
    }

    res.status(500).json(errorResponse("Erro ao excluir oficina"));
  }
});

// Obter participantes de uma oficina
router.get('/:id/participantes', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const participantes = await oficinaService.listarParticipantes(id);
    
    res.json(successResponse(participantes, "Participantes carregados com sucesso"));
  } catch (error: any) {
    console.error("Get participantes error:", error);

    if (error.message === "Oficina não encontrada") {
      return res.status(404).json(errorResponse(error.message));
    }

    res.status(500).json(errorResponse("Erro ao buscar participantes"));
  }
});

export default router;
