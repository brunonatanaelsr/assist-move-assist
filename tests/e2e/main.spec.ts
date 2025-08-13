import { test, expect } from '@playwright/test';

test.describe('Assist Move Assist - E2E Tests', () => {
  // Sempre navega utilizando o baseURL configurado no playwright.config.ts
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve carregar página inicial', async ({ page }) => {
    await expect(page).toHaveTitle(/Assist Move/);
    await expect(page.locator('h1')).toContainText('Assist Move');
  });

  test('deve fazer login do super administrador', async ({ page }) => {
    // Ir para página de login
    await page.click('[data-testid="login-button"]');
    
    // Preencher credenciais do super admin
    await page.fill('input[name="email"]', 'bruno@move.com');
    await page.fill('input[name="password"]', '15002031');
    
    // Fazer login
    await page.click('button[type="submit"]');
    
    // Verificar redirecionamento para dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Bruno');
  });

  test('deve rejeitar login com credenciais inválidas', async ({ page }) => {
    await page.click('[data-testid="login-button"]');
    
    await page.fill('input[name="email"]', 'wrong@email.com');
    await page.fill('input[name="password"]', 'wrong-password');
    
    await page.click('button[type="submit"]');
    
    // Verificar mensagem de erro
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/credenciais inválidas/i);
  });

  test('fluxo completo de cadastro de beneficiária', async ({ page }) => {
    // Login como admin
    await page.click('[data-testid="login-button"]');
    await page.fill('input[name="email"]', 'bruno@move.com');
    await page.fill('input[name="password"]', '15002031');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard carregar
    await page.waitForURL(/.*dashboard/);
    
    // Navegar para cadastro de beneficiárias
    await page.click('[data-testid="menu-beneficiarias"]');
    await page.click('[data-testid="cadastrar-beneficiaria"]');
    
    // Verificar página de cadastro
    await expect(page.locator('h1')).toContainText(/cadastrar beneficiária/i);
    
    // Preencher formulário
    await page.fill('input[name="nome_completo"]', 'Maria da Silva Santos E2E');
    await page.fill('input[name="cpf"]', '123.456.789-01');
    await page.fill('input[name="data_nascimento"]', '01/01/1990');
    await page.fill('input[name="telefone"]', '(11) 98765-4321');
    await page.fill('input[name="endereco"]', 'Rua das Flores, 123');
    await page.fill('input[name="cidade"]', 'São Paulo');
    await page.selectOption('select[name="estado"]', 'SP');
    
    // Submeter formulário
    await page.click('button[type="submit"]');
    
    // Verificar sucesso
    await expect(page.locator('[data-testid="success-message"]')).toContainText(/cadastrada com sucesso/i);
    
    // Verificar se beneficiária aparece na lista
    await page.click('[data-testid="voltar-lista"]');
    await expect(page.locator('[data-testid="beneficiaria-lista"]')).toContainText('Maria da Silva Santos E2E');
  });

  test('deve validar campos obrigatórios no cadastro', async ({ page }) => {
    // Login e navegação (reutilizar steps do teste anterior)
    await page.click('[data-testid="login-button"]');
    await page.fill('input[name="email"]', 'bruno@move.com');
    await page.fill('input[name="password"]', '15002031');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    await page.click('[data-testid="menu-beneficiarias"]');
    await page.click('[data-testid="cadastrar-beneficiaria"]');
    
    // Tentar submeter sem preencher
    await page.click('button[type="submit"]');
    
    // Verificar mensagens de validação
    await expect(page.locator('[data-testid="error-nome"]')).toContainText(/nome completo é obrigatório/i);
    await expect(page.locator('[data-testid="error-cpf"]')).toContainText(/cpf é obrigatório/i);
  });

  test('deve pesquisar beneficiárias', async ({ page }) => {
    // Login
    await page.click('[data-testid="login-button"]');
    await page.fill('input[name="email"]', 'bruno@move.com');
    await page.fill('input[name="password"]', '15002031');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    
    // Ir para lista de beneficiárias
    await page.click('[data-testid="menu-beneficiarias"]');
    
    // Verificar que há beneficiárias listadas
    await expect(page.locator('[data-testid="beneficiaria-lista"] tr')).toHaveCount.greaterThan(0);
    
    // Fazer busca
    await page.fill('input[data-testid="search-input"]', 'Maria');
    await page.click('[data-testid="search-button"]');
    
    // Verificar resultados filtrados
    await expect(page.locator('[data-testid="beneficiaria-item"]')).toContainText(/Maria/i);
  });

  test('deve navegar pelo sistema usando menu', async ({ page }) => {
    // Login
    await page.click('[data-testid="login-button"]');
    await page.fill('input[name="email"]', 'bruno@move.com');
    await page.fill('input[name="password"]', '15002031');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    
    // Testar navegação principal
    const menuItems = [
      { selector: '[data-testid="menu-dashboard"]', expectedUrl: /.*dashboard/, expectedText: 'Dashboard' },
      { selector: '[data-testid="menu-beneficiarias"]', expectedUrl: /.*beneficiarias/, expectedText: 'Beneficiárias' },
      { selector: '[data-testid="menu-oficinas"]', expectedUrl: /.*oficinas/, expectedText: 'Oficinas' },
      { selector: '[data-testid="menu-projetos"]', expectedUrl: /.*projetos/, expectedText: 'Projetos' },
      { selector: '[data-testid="menu-feed"]', expectedUrl: /.*feed/, expectedText: 'Feed' },
      { selector: '[data-testid="menu-relatorios"]', expectedUrl: /.*relatorios/, expectedText: 'Relatórios' }
    ];
    
    for (const item of menuItems) {
      await page.click(item.selector);
      await page.waitForURL(item.expectedUrl);
      await expect(page.locator('h1')).toContainText(item.expectedText);
    }
  });

  test('deve fazer logout corretamente', async ({ page }) => {
    // Login
    await page.click('[data-testid="login-button"]');
    await page.fill('input[name="email"]', 'bruno@move.com');
    await page.fill('input[name="password"]', '15002031');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    
    // Verificar que está logado
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Fazer logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Verificar redirecionamento para login
    await expect(page).toHaveURL(/.*auth/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('deve responder adequadamente em mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Teste apenas para mobile');
    
    // Login em mobile
    await page.click('[data-testid="mobile-menu-toggle"]');
    await page.click('[data-testid="login-button"]');
    
    await page.fill('input[name="email"]', 'bruno@move.com');
    await page.fill('input[name="password"]', '15002031');
    await page.click('button[type="submit"]');
    
    // Verificar layout mobile
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
  });

  test('deve carregar dashboard com estatísticas', async ({ page }) => {
    // Login
    await page.click('[data-testid="login-button"]');
    await page.fill('input[name="email"]', 'bruno@move.com');
    await page.fill('input[name="password"]', '15002031');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    
    // Verificar widgets de estatísticas
    await expect(page.locator('[data-testid="stats-beneficiarias"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-oficinas"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-usuarios"]')).toBeVisible();
    
    // Verificar se há números nas estatísticas
    const statsBeneficiarias = await page.locator('[data-testid="stats-beneficiarias-count"]').textContent();
    expect(parseInt(statsBeneficiarias || '0')).toBeGreaterThanOrEqual(0);
  });

  test('deve mostrar notificações em tempo real', async ({ page }) => {
    // Login
    await page.click('[data-testid="login-button"]');
    await page.fill('input[name="email"]', 'bruno@move.com');
    await page.fill('input[name="password"]', '15002031');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);
    
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
    test.skip(baseURL?.startsWith('http://'), 'SSL não disponível em ambiente local');

    const response = await page.goto('/');
    const headers = response?.headers();

    expect(headers?.['strict-transport-security']).toBeTruthy();
    expect(headers?.['x-content-type-options']).toBe('nosniff');
    expect(headers?.['x-frame-options']).toBeTruthy();
  });
});
