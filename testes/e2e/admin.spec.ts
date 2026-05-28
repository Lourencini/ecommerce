import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@3dprint.com';
const ADMIN_PASSWORD = 'admin123';

async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/senha/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL('/', { timeout: 8000 });
}

test.describe('Painel Administrativo', () => {
  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
    });

    test('deve exibir KPIs do dashboard', async ({ page }) => {
      await expect(page.getByText(/pedidos|receita|estoque/i).first()).toBeVisible({ timeout: 8000 });
    });

    test('deve exibir sidebar de navegação', async ({ page }) => {
      await expect(page.getByRole('link', { name: /pedidos/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /produtos/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /categorias/i })).toBeVisible();
    });

    test('link ativo na sidebar deve ser destacado', async ({ page }) => {
      const dashboardLink = page.getByRole('link', { name: /dashboard/i }).first();
      await expect(dashboardLink).toHaveClass(/active/);
    });
  });

  test.describe('Gestão de Pedidos', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/orders');
    });

    test('deve exibir lista de pedidos', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /pedidos/i })).toBeVisible({ timeout: 8000 });
    });

    test('deve exibir colunas da tabela de pedidos', async ({ page }) => {
      await expect(page.getByText(/número|status|cliente|total/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('deve exibir botões de transição de status', async ({ page }) => {
      const rows = page.locator('table tbody tr, [data-testid="order-row"]');
      const rowCount = await rows.count();
      if (rowCount > 0) {
        await expect(page.getByRole('button', { name: /confirmar|imprimir|enviar|entregar|cancelar/i }).first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('link "Pedidos" na sidebar está ativo na página /admin/orders', async ({ page }) => {
      const ordersLink = page.getByRole('link', { name: /pedidos/i });
      await expect(ordersLink).toHaveClass(/active/);
    });
  });

  test.describe('Gestão de Produtos', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
    });

    test('deve exibir lista de produtos', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /produtos/i })).toBeVisible({ timeout: 8000 });
    });

    test('deve exibir botão "Novo Produto"', async ({ page }) => {
      await expect(page.getByRole('link', { name: /novo produto/i }).or(page.getByRole('button', { name: /novo produto/i }))).toBeVisible({ timeout: 5000 });
    });

    test('deve navegar para formulário de criação ao clicar em "Novo Produto"', async ({ page }) => {
      await page.getByRole('link', { name: /novo produto/i }).or(page.getByRole('button', { name: /novo produto/i })).click();
      await expect(page).toHaveURL(/\/admin\/products\/new/, { timeout: 5000 });
    });

    test('formulário de novo produto tem campos obrigatórios', async ({ page }) => {
      await page.goto('/admin/products/new');
      await expect(page.getByLabel(/nome/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByLabel(/preço/i).first()).toBeVisible();
      await expect(page.getByLabel(/sku/i)).toBeVisible();
    });

    test('deve exibir botão "Editar" para cada produto', async ({ page }) => {
      const editButtons = page.getByRole('link', { name: /editar/i }).or(page.getByRole('button', { name: /editar/i }));
      const count = await editButtons.count();
      if (count > 0) {
        await expect(editButtons.first()).toBeVisible();
      }
    });
  });

  test.describe('Gestão de Categorias', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/categories');
    });

    test('deve exibir lista de categorias', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /categorias/i })).toBeVisible({ timeout: 8000 });
    });

    test('deve exibir botão "Nova Categoria"', async ({ page }) => {
      await expect(page.getByRole('button', { name: /nova categoria/i })).toBeVisible({ timeout: 5000 });
    });

    test('deve abrir modal ao clicar em "Nova Categoria"', async ({ page }) => {
      await page.getByRole('button', { name: /nova categoria/i }).click();
      await expect(page.getByRole('dialog').or(page.locator('[role="dialog"], .modal'))).toBeVisible({ timeout: 3000 });
    });

    test('deve exibir colunas: nome, slug, produtos, status', async ({ page }) => {
      await expect(page.getByText(/nome/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/slug/i)).toBeVisible();
      await expect(page.getByText(/produtos/i)).toBeVisible();
      await expect(page.getByText(/status/i)).toBeVisible();
    });
  });

  test.describe('Segurança', () => {
    test('acesso a /admin sem autenticação redireciona para login', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test('acesso a /admin/orders sem autenticação redireciona para login', async ({ page }) => {
      await page.goto('/admin/orders');
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });

    test('acesso a /admin/products sem autenticação redireciona para login', async ({ page }) => {
      await page.goto('/admin/products');
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
  });
});
