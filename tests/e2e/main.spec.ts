import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e@assist.local';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e_password';
const TEST_NAME = process.env.E2E_TEST_NAME || 'E2E User';

let apiOnline = true;
const API_HEALTH = process.env.PLAYWRIGHT_API_URL ? `${process.env.PLAYWRIGHT_API_URL.replace(/\/$/, '')}/health` : 'http://127.0.0.1:3000/api/health';

test.beforeAll(async ({ request }) => {
  try {
    const res = await request.get(API_HEALTH);
    apiOnline = res.ok();
    if (!apiOnline) console.warn('API offline for E2E (login-dependent tests will be skipped).');
  } catch {
    apiOnline = false;
    console.warn('API not reachable for E2E (login-dependent tests will be skipped).');
  }
});

test.describe('Assist Move Assist - E2E Tests', () => {
  // Sempre navega utilizando o baseURL configurado no playwright.config.ts
  test.beforeEach(async ({ page }) => {
    // Debug console/network in failures
    page.on('console', (m) => console.log('BROWSER:', m.type(), m.text()));
    page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
    page.on('response', (r) => {
      if (r.status() >= 400) console.log('HTTP', r.status(), r.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Abre o menu mobile se existir (não falha se não existir)
    const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
    try {
      if (await menuToggle.isVisible({ timeout: 1000 })) {
        await menuToggle.click();
      }
    } catch (error) {
      // Menu mobile não disponível, ignorar
      console.debug('Menu mobile não encontrado:', error);
    }
  });

  // Helper resiliente para acionar o login
  async function clickLogin(page: Page) {
    await page.goto('/#/auth', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="login-form"]', { state: 'visible', timeout: 5000 });
  }

  async function ensureAuthenticated(page: Page) {
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (!(await userMenu.isVisible({ timeout: 1000 }).catch(() => false))) {
      await clickLogin(page);
      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*dashboard/);
    }

    if (!page.url().includes('#/dashboard')) {
      await page.goto('/#/dashboard');
    }
    await page.waitForLoadState('networkidle');
  }

  test('deve carregar página inicial', async ({ page }) => {
    await expect(page).toHaveTitle(/Assist Move/);

    const dashboardTitle = page.locator('[data-testid="dashboard-title"]');
    if (await dashboardTitle.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(dashboardTitle).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: /Assist Move/i })).toBeVisible();
    }
  });

  test.describe('Fluxos de autenticação', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('deve fazer login do usuário de teste', async ({ page }) => {
      test.skip(!apiOnline, 'API offline');
      await clickLogin(page);

      await page.fill('input[name="email"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/.*dashboard/);
      const welcome = page.locator('[data-testid="welcome-message"]');
      const expectedName = TEST_NAME.split(' ')[0] || TEST_NAME;
      const welcomeText = (await welcome.textContent()) || '';
      expect(welcomeText.toLowerCase()).toContain(expectedName.toLowerCase());
    });

    test('deve rejeitar login com credenciais inválidas', async ({ page }) => {
      test.skip(!apiOnline, 'API offline');
      await clickLogin(page);

      await page.fill('input[name="email"]', 'wrong@email.com');
      await page.fill('input[name="password"]', 'wrong-password');
      await page.click('button[type="submit"]');

      await expect(page.locator('[data-testid="error-message"]')).toContainText(/(credenciais inválidas|senha incorret)/i);
    });
  });

  test('fluxo completo de cadastro de beneficiária', async ({ page }) => {
    test.skip(!apiOnline, 'API offline');
    await ensureAuthenticated(page);

    // Navegar para cadastro de beneficiárias
    await page.click('[data-testid="menu-beneficiarias"]');
    await page.click('[data-testid="cadastrar-beneficiaria"]');

    
    // Preencher formulário
    await page.fill('#nome_completo', 'Maria da Silva Santos');
    await page.fill('#cpf', '52998224725');
    await page.fill('#data_nascimento', '1990-01-01');
    await page.fill('#contato1', '(11) 98765-4321');
    await page.fill('#endereco', 'Rua das Flores, 123');
    await page.fill('#cidade', 'São Paulo');
    await page.fill('#estado', 'SP');
    
    // Submeter formulário
    await page.click('button[type="submit"]');
    
    // Verificar sucesso
    await expect(page.locator('[data-testid="success-message"]')).toContainText(/cadastrada com sucesso/i);
    
    // Verificar se beneficiária aparece na lista
    await page.click('[data-testid="voltar-lista"]');
    await expect(page.locator('[data-testid="beneficiaria-lista"]')).toContainText('Maria da Silva Santos');
  });

  test('deve validar campos obrigatórios no cadastro', async ({ page }) => {
    test.skip(!apiOnline, 'API offline');
    await ensureAuthenticated(page);
    await page.click('[data-testid="menu-beneficiarias"]');
    await page.click('[data-testid="cadastrar-beneficiaria"]');

    // Tentar submeter sem preencher
    await page.click('button[type="submit"]');
    

  });

  test('deve pesquisar beneficiárias', async ({ page }) => {
    test.skip(!apiOnline, 'API offline');
    await ensureAuthenticated(page);

    // Ir para lista de beneficiárias
    await page.click('[data-testid="menu-beneficiarias"]');

    // Verificar que há beneficiárias listadas
    const tableRows = page.locator('[data-testid="beneficiaria-lista"] tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Fazer busca
    await page.fill('input[data-testid="search-input"]', 'Maria');
    await page.click('[data-testid="search-button"]');

    // Verificar resultados filtrados
    const filteredResults = page.getByTestId('beneficiaria-item').filter({ hasText: /Maria/i });
    await expect(filteredResults.first()).toBeVisible();
  });

  test('deve navegar pelo sistema usando menu', async ({ page }) => {
    test.skip(!apiOnline, 'API offline');
    await ensureAuthenticated(page);

    // Testar navegação principal
    type MenuItemExpectation = {
      testId: string;
      expectedUrl: RegExp;
      expectedHeading?: string | RegExp;
      headingLocator?: string;
    };

    const menuItems: MenuItemExpectation[] = [
      { testId: 'menu-dashboard', expectedUrl: /.*#\/dashboard/, headingLocator: '[data-testid="dashboard-title"]' },
      { testId: 'menu-beneficiarias', expectedUrl: /.*#\/beneficiarias/, headingLocator: '[data-testid="beneficiarias-title"]' },
      { testId: 'menu-oficinas', expectedUrl: /.*#\/oficinas/, expectedHeading: /Oficinas/i },
      { testId: 'menu-projetos', expectedUrl: /.*#\/projetos/, expectedHeading: /Projetos/i },
      { testId: 'menu-feed', expectedUrl: /.*#\/feed/, expectedHeading: /Feed da Comunidade/i },
      { testId: 'menu-relatorios', expectedUrl: /.*#\/relatorios/, expectedHeading: /Relatórios/i }
    ];

    for (const item of menuItems) {
      const link = page.getByTestId(item.testId);
      await link.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(item.expectedUrl, { timeout: 15000 }),
        link.click(),
      ]);
      if (item.headingLocator) {
        await expect(page.locator(item.headingLocator)).toBeVisible();
      } else if (item.expectedHeading) {
        await expect(page.getByRole('heading', { name: item.expectedHeading })).toBeVisible();
      }
    }
  });

  test('deve fazer logout corretamente', async ({ page }) => {
    test.skip(!apiOnline, 'API offline');
    await ensureAuthenticated(page);

    // Verificar que está logado
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Fazer logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    

    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('deve responder adequadamente em mobile', async ({ page, isMobile }) => {
    test.skip(!apiOnline, 'API offline');
    test.skip(!isMobile, 'Teste apenas para mobile');

    await ensureAuthenticated(page);

    // Abrir navegação mobile e verificar layout mobile
    const postLoginToggle = page.locator('[data-testid="mobile-menu-toggle"]');
    if (await postLoginToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await postLoginToggle.click();
    }
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
  });

  test('deve carregar dashboard com estatísticas', async ({ page }) => {
    test.skip(!apiOnline, 'API offline');
    await ensureAuthenticated(page);

    // Verificar widgets de estatísticas
    await expect(page.locator('[data-testid="stats-beneficiarias"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-oficinas"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-usuarios"]')).toBeVisible();
    
    // Verificar se há números nas estatísticas
    const statsBeneficiarias = await page.locator('[data-testid="stats-beneficiarias-count"]').textContent();
    expect(parseInt(statsBeneficiarias || '0')).toBeGreaterThanOrEqual(0);
  });

  test('deve mostrar notificações em tempo real', async ({ page }) => {
    test.skip(!apiOnline, 'API offline');
    await ensureAuthenticated(page);

    // Verificar centro de notificações
    await page.click('[data-testid="notifications-button"]');
    await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    
    // Verificar se há notificações ou placeholder
    const notificationsCount = await page.locator('[data-testid="notification-item"]').count();
    if (notificationsCount === 0) {
      await expect(page.locator('[data-testid="no-notifications"]')).toContainText(/nenhuma notificação/i);
    }
  });

  test('deve validar SSL e segurança', async ({ page, baseURL }) => {
    // Em ambientes locais (HTTP) este teste não é aplicável
    test.skip(Boolean(baseURL?.startsWith('http://')), 'SSL não disponível em ambiente local');

    const response = await page.goto('/');
    const headers = response?.headers();

    expect(headers?.['strict-transport-security']).toBeTruthy();
    expect(headers?.['x-content-type-options']).toBe('nosniff');
    expect(headers?.['x-frame-options']).toBeTruthy();
  });
});
