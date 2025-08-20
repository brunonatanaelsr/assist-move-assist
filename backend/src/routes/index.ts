import { Router } from 'express';
import { validatePayload } from '../middleware/security.middleware';

// Schemas de validação
import { 
    createBeneficiariaSchema,
    updateBeneficiariaSchema,
    createOficinaSchema,
    updateOficinaSchema,
    createProjetoSchema,
    updateProjetoSchema
} from '../validation/schemas';

/**
 * Rotas de Beneficiárias
 * Base: /api/beneficiarias
 */
export const beneficiariasRouter = Router();

// GET /api/beneficiarias
// Lista todas as beneficiárias
beneficiariasRouter.get('/', /* authMiddleware, */ async (req, res) => {});

// GET /api/beneficiarias/:id
// Obtém detalhes de uma beneficiária
beneficiariasRouter.get('/:id', /* authMiddleware, */ async (req, res) => {});

// POST /api/beneficiarias
// Cria nova beneficiária
beneficiariasRouter.post('/', 
    /* authMiddleware, */
    validatePayload(createBeneficiariaSchema),
    async (req, res) => {}
);

// PUT /api/beneficiarias/:id
// Atualiza beneficiária existente
beneficiariasRouter.put('/:id',
    /* authMiddleware, */
    validatePayload(updateBeneficiariaSchema),
    async (req, res) => {}
);

/**
 * Rotas de Oficinas
 * Base: /api/oficinas
 */
export const oficinasRouter = Router();

// GET /api/oficinas
// Lista todas as oficinas
oficinasRouter.get('/', /* authMiddleware, */ async (req, res) => {});

// GET /api/oficinas/:id
// Obtém detalhes de uma oficina
oficinasRouter.get('/:id', /* authMiddleware, */ async (req, res) => {});

// POST /api/oficinas
// Cria nova oficina
oficinasRouter.post('/',
    /* authMiddleware, */
    validatePayload(createOficinaSchema),
    async (req, res) => {}
);

// PUT /api/oficinas/:id
// Atualiza oficina existente
oficinasRouter.put('/:id',
    /* authMiddleware, */
    validatePayload(updateOficinaSchema),
    async (req, res) => {}
);

/**
 * Rotas de Projetos
 * Base: /api/projetos
 */
export const projetosRouter = Router();

// GET /api/projetos
// Lista todos os projetos
projetosRouter.get('/', /* authMiddleware, */ async (req, res) => {});

// GET /api/projetos/:id
// Obtém detalhes de um projeto
projetosRouter.get('/:id', /* authMiddleware, */ async (req, res) => {});

// POST /api/projetos
// Cria novo projeto
projetosRouter.post('/',
    /* authMiddleware, */
    validatePayload(createProjetoSchema),
    async (req, res) => {}
);

// PUT /api/projetos/:id
// Atualiza projeto existente
projetosRouter.put('/:id',
    /* authMiddleware, */
    validatePayload(updateProjetoSchema),
    async (req, res) => {}
);
