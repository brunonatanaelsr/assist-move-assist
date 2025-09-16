import { request, expect, FullConfig, chromium } from '@playwright/test';
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

  await ensureTestUser(dbURL, testUser);

  const apiContext = await request.newContext({ baseURL: apiURL });
  try {
    const response = await apiContext.post('/api/auth/login', {
      data: { email: testUser.email, password: testUser.password },
    });

    expect(response.status(), await response.text()).toBe(200);

    const payload = await response.json();
    const token: string | undefined = payload?.token;
    const user = payload?.user ?? {
      email: testUser.email,
      nome: testUser.name,
      papel: testUser.role,
    };

    if (!token) {
      throw new Error('Login response did not include a token.');
    }

    const storageStatePath = path.resolve('tests/.auth/admin.json');
    const existingState = await apiContext.storageState();

    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({
        baseURL,
        storageState: existingState,
      });
      const page = await context.newPage();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.evaluate(
        ({ authToken, authUser }) => {
          localStorage.setItem('auth_token', authToken);
          localStorage.setItem('token', authToken);
          localStorage.setItem('user', JSON.stringify(authUser));
        },
        { authToken: token, authUser: user }
      );

      await ensureDirectory(storageStatePath);
      await context.storageState({ path: storageStatePath });
      await context.close();
    } finally {
      await browser.close();
    }
  } finally {
    await apiContext.dispose();
  }
}
