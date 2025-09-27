import { request, FullConfig } from '@playwright/test';
import type { StorageState } from '@playwright/test';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import path from 'node:path';

interface TestUserConfig {
  email: string;
  password: string;
  name: string;
  role: string;
}

async function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function ensureTestUser(dbUrl: string, user: TestUserConfig) {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await client.query(
      `
        INSERT INTO usuarios (email, senha_hash, nome, papel, ativo, data_criacao, data_atualizacao)
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE
          SET senha_hash = EXCLUDED.senha_hash,
              nome = EXCLUDED.nome,
              papel = EXCLUDED.papel,
              ativo = true,
              data_atualizacao = NOW()
        RETURNING id
      `,
      [user.email.toLowerCase(), passwordHash, user.name, user.role]
    );
  } finally {
    await client.end();
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default async function globalSetup(_config: FullConfig) {
  const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
  const apiURL = process.env.E2E_API_URL || 'http://127.0.0.1:3000';
  const dbURL =
    process.env.DATABASE_URL ||
    'postgresql://assist_user:assist_pass@127.0.0.1:5432/assist_db';

  const testUser: TestUserConfig = {
    email: process.env.E2E_TEST_EMAIL || 'e2e@assist.local',
    password: process.env.E2E_TEST_PASSWORD || 'e2e_password',
    name: process.env.E2E_TEST_NAME || 'E2E User',
    role: process.env.E2E_TEST_ROLE || 'admin',
  };

  try {
    await ensureTestUser(dbURL, testUser);
  } catch (error) {
    console.warn(
      `[global-setup] Unable to ensure E2E test user in database: ${toErrorMessage(error)}`
    );
  }

  const storageStatePath = path.resolve('tests/.auth/admin.json');
  await ensureDirectory(storageStatePath);

  let storageState: StorageState = { cookies: [], origins: [] };

  const apiContext = await request.newContext({ baseURL: apiURL });
  try {
    const response = await apiContext.post('/api/auth/login', {
      data: { email: testUser.email, password: testUser.password },
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Login failed with status ${response.status()}: ${body || 'no response body'}`
      );
    }

    await response.json().catch(() => null);

    const existingState = await apiContext.storageState();
    storageState = {
      cookies: existingState.cookies ?? [],
      origins: existingState.origins ?? [],
    };
  } catch (error) {
    console.warn(
      `[global-setup] Skipping authenticated storage state: ${toErrorMessage(error)}`
    );
    storageState = { cookies: [], origins: [] };
  } finally {
    await apiContext.dispose();
  }

  await fs.writeFile(storageStatePath, JSON.stringify(storageState, null, 2));
}
