import { Router } from 'express';
import { Pool } from 'pg';
import { BeneficiariasRepository } from '../repositories/BeneficiariasRepository';
import { AuthenticatedRequest } from '../middleware/auth';
import { requirePermissions } from '../middleware/permissions';
import { PERMISSIONS } from '../types/permissions';
import { Response } from 'express';
import { loggerService } from '../services/logger';
import { AppError } from '../utils/AppError';

const router = Router();

// Usando o pool de conexões já configurado no app
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias_user',
  password: process.env.POSTGRES_PASSWORD || 'movemarias_password_2025',
});

const beneficiariasRepository = new BeneficiariasRepository(pool);

// GET /:id - Buscar beneficiária por ID
router.get('/:id', requirePermissions([PERMISSIONS.READ_BENEFICIARIA]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const beneficiaria = await beneficiariasRepository.buscarPorId(Number(id));

    // Formatar datas antes de enviar a resposta
    const formatarData = (data: Date) => data.toISOString().split('T')[0];
    const beneficiariaFormatada = {
      ...beneficiaria,
      data_nascimento: formatarData(beneficiaria.data_nascimento),
      data_criacao: formatarData(new Date(beneficiaria.data_criacao)),
      data_atualizacao: formatarData(new Date(beneficiaria.data_atualizacao))
    };

    res.json({
      success: true,
      data: beneficiariaFormatada,
      message: 'Beneficiária carregada com sucesso'
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      loggerService.error('Get beneficiaria error:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar beneficiária'
      });
    }
  }
});

export { router as beneficiariasTypescriptRouter };
