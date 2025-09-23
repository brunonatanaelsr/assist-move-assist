import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { setupTestDatabase, teardownTestDatabase, truncateAllTables } from '../../__tests__/helpers/database';

process.env.NODE_ENV = 'test';
process.env.REDIS_DISABLED = 'true';

const runIntegration = process.env.RUN_INTEGRATION === '1';

let testPool: Pool | null = null;
let app: express.Express | null = null;
let currentUser: any = null;
let adminUserId: number | null = null;
let visitorUserId: number | null = null;

jest.mock('../../config/database', () => {
  const actual = jest.requireActual('../../config/database');
  const proxy = new Proxy({}, {
    get(_target, prop) {
      if (!testPool) {
        throw new Error('Test pool not initialized');
      }
      const value = (testPool as any)[prop];
      if (typeof value === 'function') {
        return value.bind(testPool);
      }
      return value;
    }
  });
  return {
    ...actual,
    pool: proxy
  };
});

jest.mock('../../middleware/auth', () => {
  const actual = jest.requireActual('../../middleware/auth');
  return {
    ...actual,
    authenticateToken: jest.fn((req: any, res: any, next: any) => {
      if (!currentUser) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }
      req.user = currentUser;
      return next();
    })
  };
});

type AuditLogInput = {
  tabela: string;
  operacao: string;
  registroId?: string | number | null;
  usuarioId?: number | null;
  detalhes?: string | null;
  createdAt?: string;
};

async function seedBaseData(): Promise<void> {
  if (!testPool) {
    throw new Error('Test pool not initialized');
  }

  await testPool.query(
    `INSERT INTO permissions (name, description)
     VALUES ('auditoria.ler', 'Visualizar registros de auditoria')
     ON CONFLICT (name) DO NOTHING`
  );

  const adminInsert = await testPool.query<{ id: number }>(
    `INSERT INTO usuarios (email, senha_hash, nome, papel, ativo)
     VALUES ('admin@test.com', 'hash', 'Admin', 'admin', true)
     RETURNING id`
  );
  adminUserId = adminInsert.rows[0]?.id ?? null;

  const visitorInsert = await testPool.query<{ id: number }>(
    `INSERT INTO usuarios (email, senha_hash, nome, papel, ativo)
     VALUES ('visitante@test.com', 'hash', 'Visitante', 'voluntaria', true)
     RETURNING id`
  );
  visitorUserId = visitorInsert.rows[0]?.id ?? null;

  await testPool.query(
    `INSERT INTO role_permissions (role, permission)
     VALUES ('admin', 'auditoria.ler')
     ON CONFLICT (role, permission) DO NOTHING`
  );
}

async function insertAuditLog(entry: AuditLogInput): Promise<void> {
  if (!testPool) {
    throw new Error('Test pool not initialized');
  }

  const {
    tabela,
    operacao,
    registroId = null,
    usuarioId = adminUserId,
    detalhes = null,
    createdAt
  } = entry;

  await testPool.query(
    `INSERT INTO audit_logs (tabela, operacao, registro_id, usuario_id, detalhes, created_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))`,
    [
      tabela,
      operacao,
      registroId === null ? null : String(registroId),
      usuarioId,
      detalhes,
      createdAt ? new Date(createdAt) : null
    ]
  );
}

beforeAll(async () => {
  if (!runIntegration) {
    console.warn('Integration tests disabled. Set RUN_INTEGRATION=1 to enable.');
    return;
  }

  const db = await setupTestDatabase();
  testPool = db.pool;

  const auditoriaRoutes = require('../auditoria.routes').default;
  const expressApp = express();
  expressApp.use(express.json());
  const { authenticateToken, authorize } = require('../../middleware/auth');
  expressApp.use('/auditoria', authenticateToken, authorize('auditoria.ler'), auditoriaRoutes);
  app = expressApp;
});

beforeEach(async () => {
  if (!runIntegration) return;
  if (!testPool) {
    throw new Error('Test pool not initialized');
  }

  await truncateAllTables();
  await seedBaseData();
  currentUser = null;
});

afterAll(async () => {
  if (!runIntegration) return;
  await teardownTestDatabase();
});

const ensureApp = () => {
  if (!app) {
    throw new Error('Express app not initialized');
  }
  return app;
};

describe('Auditoria routes (integration)', () => {
  it('lista registros com paginação e filtros', async () => {
    if (!runIntegration) return;

    await insertAuditLog({
      tabela: 'documentos',
      operacao: 'DELETE',
      registroId: '15',
      detalhes: 'Remoção lógica',
      createdAt: '2024-05-01T10:00:00.000Z'
    });
    await insertAuditLog({
      tabela: 'documentos',
      operacao: 'UPDATE',
      registroId: '16',
      detalhes: 'Atualização de metadados',
      createdAt: '2024-05-02T12:00:00.000Z'
    });
    await insertAuditLog({
      tabela: 'projetos',
      operacao: 'CREATE',
      registroId: '200',
      detalhes: 'Novo projeto',
      createdAt: '2023-12-31T23:59:59.000Z'
    });

    currentUser = {
      id: adminUserId,
      role: 'admin',
      email: 'admin@test.com'
    };

    const response = await request(ensureApp())
      .get('/auditoria')
      .query({
        page: '1',
        limit: '1',
        entidade: 'documentos',
        dataInicio: '2024-05-01T00:00:00.000Z',
        dataFim: '2024-05-31T23:59:59.999Z'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2
    });
    expect(response.body.data.registros).toHaveLength(1);
    expect(response.body.data.registros[0].tabela).toBe('documentos');
    expect(response.body.data.registros[0].operacao).toBe('UPDATE');
  });

  it('bloqueia acesso para usuários sem permissão', async () => {
    if (!runIntegration) return;

    await insertAuditLog({
      tabela: 'documentos',
      operacao: 'DELETE',
      registroId: '15',
      detalhes: 'Remoção lógica',
      createdAt: '2024-05-01T10:00:00.000Z'
    });

    currentUser = {
      id: visitorUserId,
      role: 'voluntaria',
      email: 'visitante@test.com'
    };

    const response = await request(ensureApp())
      .get('/auditoria')
      .query({ page: '1', limit: '10' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Permissão negada');
  });

  it('exporta registros no formato CSV com filtros aplicados', async () => {
    if (!runIntegration) return;

    await insertAuditLog({
      tabela: 'documentos',
      operacao: 'DELETE',
      registroId: '15',
      detalhes: 'Remoção lógica',
      createdAt: '2024-05-01T10:00:00.000Z'
    });
    await insertAuditLog({
      tabela: 'projetos',
      operacao: 'CREATE',
      registroId: '200',
      detalhes: 'Novo projeto',
      createdAt: '2024-05-03T12:00:00.000Z'
    });

    currentUser = {
      id: adminUserId,
      role: 'admin',
      email: 'admin@test.com'
    };

    const response = await request(ensureApp())
      .get('/auditoria/export')
      .query({ entidade: 'documentos' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('auditoria_');

    const lines = response.text.trim().split('\n');
    expect(lines.length).toBe(2); // header + 1 registro filtrado
    expect(lines[0]).toContain('tabela,operacao');
    expect(lines[1]).toContain('documentos');
  });
});
