import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool, PoolConfig } from 'pg';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { faker } from '@faker-js/faker';
import { factory } from 'factory-girl';

interface TestDatabase {
  pool: Pool;
  container: StartedTestContainer;
}

let testDb: TestDatabase | null = null;

export async function setupTestDatabase(): Promise<TestDatabase> {
  if (testDb) return testDb;

  // Iniciar container PostgreSQL
  const container = await new GenericContainer('postgres:14-alpine')
    .withEnv('POSTGRES_USER', 'test_user')
    .withEnv('POSTGRES_PASSWORD', 'test_password')
    .withEnv('POSTGRES_DB', 'test_db')
    .withExposedPorts(5432)
    .start();

  const config: PoolConfig = {
    host: container.getHost(),
    port: container.getMappedPort(5432),
    user: 'test_user',
    password: 'test_password',
    database: 'test_db'
  };

  const pool = new Pool(config);

  // Executar migrations
  const migrationsPath = path.resolve(__dirname, '../../database/migrations');
  const migrationFiles = fs.readdirSync(migrationsPath)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const migration = fs.readFileSync(
      path.join(migrationsPath, file),
      'utf-8'
    );
    await pool.query(migration);
  }

  // Executar setup de teste
  const testSetup = fs.readFileSync(
    path.resolve(__dirname, '../../database/test/setup.sql'),
    'utf-8'
  );
  await pool.query(testSetup);

  testDb = { pool, container };
  return testDb;
}

export async function teardownTestDatabase(): Promise<void> {
  if (!testDb) return;

  await testDb.pool.end();
  await testDb.container.stop();
  testDb = null;
}

export async function truncateAllTables(): Promise<void> {
  if (!testDb) throw new Error('Database not initialized');

  await testDb.pool.query('SELECT truncate_all_tables()');
  await testDb.pool.query('SELECT reset_all_sequences()');
}

// Factories para dados de teste
factory.define('beneficiaria', Object, {
  nome_completo: () => faker.person.fullName(),
  cpf: () => faker.string.numeric(11),
  data_nascimento: () => faker.date.past(),
  telefone: () => faker.phone.number('##9########'),
  email: () => faker.internet.email(),
  endereco: () => faker.location.streetAddress(),
  numero: () => faker.string.numeric(3),
  complemento: () => faker.location.secondaryAddress(),
  bairro: () => faker.location.county(),
  cidade: () => faker.location.city(),
  estado: () => faker.location.state({ abbreviated: true }),
  cep: () => faker.location.zipCode('########'),
  created_at: () => new Date()
});

factory.define('oficina', Object, {
  titulo: () => faker.company.catchPhrase(),
  descricao: () => faker.lorem.paragraph(),
  data: () => faker.date.future(),
  vagas: () => faker.number.int({ min: 5, max: 30 }),
  local: () => faker.location.streetAddress(),
  duracao_horas: () => faker.number.int({ min: 1, max: 4 }),
  responsavel_id: factory.assoc('user', 'id'),
  created_at: () => new Date()
});

factory.define('user', Object, {
  nome: () => faker.person.fullName(),
  email: () => faker.internet.email(),
  senha: () => faker.internet.password(),
  role: () => faker.helpers.arrayElement(['admin', 'coordenador', 'tecnico']),
  created_at: () => new Date()
});

// Helpers para assertions
export const dbAssertions = {
  async countRows(table: string): Promise<number> {
    if (!testDb) throw new Error('Database not initialized');
    const result = await testDb.pool.query(`SELECT COUNT(*) FROM ${table}`);
    return parseInt(result.rows[0].count);
  },

  async recordExists(table: string, conditions: Record<string, any>): Promise<boolean> {
    if (!testDb) throw new Error('Database not initialized');
    
    const entries = Object.entries(conditions);
    const whereClause = entries
      .map(([key], index) => `${key} = $${index + 1}`)
      .join(' AND ');
    
    const values = entries.map(([, value]) => value);
    
    const result = await testDb.pool.query(
      `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${whereClause})`,
      values
    );
    
    return result.rows[0].exists;
  },

  async getRecord(table: string, conditions: Record<string, any>): Promise<any> {
    if (!testDb) throw new Error('Database not initialized');
    
    const entries = Object.entries(conditions);
    const whereClause = entries
      .map(([key], index) => `${key} = $${index + 1}`)
      .join(' AND ');
    
    const values = entries.map(([, value]) => value);
    
    const result = await testDb.pool.query(
      `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`,
      values
    );
    
    return result.rows[0];
  }
};

// Helper para testes de performance
export async function measureQueryPerformance(
  query: string,
  params: any[] = [],
  iterations: number = 1
): Promise<{
  averageTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
}> {
  if (!testDb) throw new Error('Database not initialized');

  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime();
    await testDb.pool.query(query, params);
    const [seconds, nanoseconds] = process.hrtime(start);
    times.push(seconds * 1000 + nanoseconds / 1000000);
  }

  return {
    averageTime: times.reduce((a, b) => a + b) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    totalTime: times.reduce((a, b) => a + b)
  };
}

// Helper para testes de concorrência
export async function testConcurrency(
  operation: () => Promise<any>,
  numConcurrent: number
): Promise<{
  successful: number;
  failed: number;
  errors: Error[];
}> {
  const results = await Promise.allSettled(
    Array(numConcurrent).fill(null).map(operation)
  );

  return {
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    errors: results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason)
  };
}
