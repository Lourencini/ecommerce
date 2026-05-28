import { test, expect } from '@playwright/test';

const CUSTOMER_EMAIL = 'cliente@email.com';
const CUSTOMER_PASSWORD = 'senha123';
const ADMIN_EMAIL = 'admin@3dprint.com';
const ADMIN_PASSWORD = 'admin123';

test.describe('Autenticação', () => {
  test.describe('Login', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('deve exibir formulário de login', async ({ page }) => {
      await expect(page.getByLabel(/e-mail/i)).toBeVisible();
      await expect(page.getByLabel(/senha/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
    });

    test('deve exibir erro com credenciais inválidas', async ({ page }) => {
      await page.getByLabel(/e-mail/i).fill('errado@email.com');
      await page.getByLabel(/senha/i).fill('senhaerrada');
      await page.getByRole('button', { name: /entrar/i }).click();

      await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible({ timeout: 5000 });
    });

    test('cliente faz login com sucesso e vai para home', async ({ page }) => {
      await page.getByLabel(/e-mail/i).fill(CUSTOMER_EMAIL);
      await page.getByLabel(/senha/i).fill(CUSTOMER_PASSWORD);
      await page.getByRole('button', { name: /entrar/i }).click();

      await expect(page).toHaveURL('/', { timeout: 8000 });
    });

    test('admin faz login e é redirecionado para home (não /admin direto)', async ({ page }) => {
      await page.getByLabel(/e-mail/i).fill(ADMIN_EMAIL);
      await page.getByLabel(/senha/i).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /entrar/i }).click();

      await expect(page).toHaveURL('/', { timeout: 8000 });
    });

    test('deve redirecionar para URL de redirect após login', async ({ page }) => {
      await page.goto('/login?redirect=/checkout');
      await page.getByLabel(/e-mail/i).fill(CUSTOMER_EMAIL);
      await page.getByLabel(/senha/i).fill(CUSTOMER_PASSWORD);
      await page.getByRole('button', { name: /entrar/i }).click();

      await expect(page).toHaveURL('/checkout', { timeout: 8000 });
    });

    test('botão fica desabilitado durante o envio', async ({ page }) => {
      await page.getByLabel(/e-mail/i).fill(CUSTOMER_EMAIL);
      await page.getByLabel(/senha/i).fill(CUSTOMER_PASSWORD);
      await page.getByRole('button', { name: /entrar/i }).click();

      await expect(page.getByRole('button', { name: /entrando/i })).toBeDisabled();
    });

    test('link "Criar conta" aponta para /register', async ({ page }) => {
      await expect(page.getByRole('link', { name: /criar conta/i })).toHaveAttribute('href', '/register');
    });
  });

  test.describe('Registro', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register');
    });

    test('deve exibir formulário de cadastro', async ({ page }) => {
      await expect(page.getByLabel(/nome/i)).toBeVisible();
      await expect(page.getByLabel(/e-mail/i)).toBeVisible();
      await expect(page.getByLabel(/senha/i)).toBeVisible();
    });

    test('deve exibir erro de validação para campos vazios', async ({ page }) => {
      await page.getByRole('button', { name: /cadastrar|criar/i }).click();
      await expect(page.getByText(/obrigatório|preencha/i)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Logout', () => {
    test('usuário autenticado consegue fazer logout', async ({ page }) => {
      // Login primeiro
      await page.goto('/login');
      await page.getByLabel(/e-mail/i).fill(CUSTOMER_EMAIL);
      await page.getByLabel(/senha/i).fill(CUSTOMER_PASSWORD);
      await page.getByRole('button', { name: /entrar/i }).click();
      await expect(page).toHaveURL('/', { timeout: 8000 });

      // Logout via header
      await page.getByRole('button', { name: /sair|logout/i }).click();
      await expect(page.getByRole('link', { name: /entrar/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Proteção de rota admin', () => {
    test('acesso a /admin sem login redireciona para /login', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test('cliente autenticado não acessa /admin', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/e-mail/i).fill(CUSTOMER_EMAIL);
      await page.getByLabel(/senha/i).fill(CUSTOMER_PASSWORD);
      await page.getByRole('button', { name: /entrar/i }).click();
      await expect(page).toHaveURL('/', { timeout: 8000 });

      await page.goto('/admin');
      await expect(page).not.toHaveURL('/admin', { timeout: 5000 });
    });
  });
});
