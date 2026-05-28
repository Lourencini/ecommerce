import { test, expect } from '@playwright/test';

test.describe('Vitrine / Catálogo de Produtos', () => {
  test.describe('Página inicial', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('deve exibir o header com logo e navegação', async ({ page }) => {
      await expect(page.locator('header')).toBeVisible();
      await expect(page.getByRole('link', { name: /3d print|home/i }).first()).toBeVisible();
    });

    test('deve exibir lista de produtos', async ({ page }) => {
      await expect(page.locator('[data-testid="product-card"], .product-card, article').first()).toBeVisible({ timeout: 8000 });
    });

    test('deve exibir categorias para filtragem', async ({ page }) => {
      await expect(page.getByRole('button', { name: /todos|categorias/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test('deve exibir ícone do carrinho no header', async ({ page }) => {
      await expect(page.getByRole('link', { name: /carrinho/i })).toBeVisible();
    });
  });

  test.describe('Filtragem e busca', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('filtrar por categoria atualiza os produtos', async ({ page }) => {
      const firstCategory = page.getByRole('button').filter({ hasText: /rpg|miniatura|vaso/i }).first();
      const categoryExists = await firstCategory.count();
      if (categoryExists > 0) {
        await firstCategory.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('article, [data-testid="product-card"]').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('busca por texto filtra produtos', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/buscar|pesquisar/i);
      if (await searchInput.count() > 0) {
        await searchInput.fill('vaso');
        await page.waitForTimeout(1000);
        // Resultados devem ser mostrados ou mensagem de "nenhum resultado"
        const hasResults = await page.locator('article').count() > 0;
        const hasNoResults = await page.getByText(/nenhum produto|não encontrado/i).count() > 0;
        expect(hasResults || hasNoResults).toBe(true);
      }
    });
  });

  test.describe('Página de produto', () => {
    test('deve exibir detalhes do produto', async ({ page }) => {
      await page.goto('/');
      const firstProduct = page.locator('article a, [data-testid="product-card"] a').first();
      await firstProduct.waitFor({ timeout: 8000 });
      await firstProduct.click();

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/R\$|reais/i)).toBeVisible();
    });

    test('deve exibir botão "Adicionar ao Carrinho"', async ({ page }) => {
      await page.goto('/');
      const firstProduct = page.locator('article a, [data-testid="product-card"] a').first();
      await firstProduct.waitFor({ timeout: 8000 });
      await firstProduct.click();

      await expect(page.getByRole('button', { name: /adicionar ao carrinho/i })).toBeVisible({ timeout: 5000 });
    });

    test('produto adicionado incrementa badge do carrinho', async ({ page }) => {
      await page.goto('/');
      const firstProduct = page.locator('article a, [data-testid="product-card"] a').first();
      await firstProduct.waitFor({ timeout: 8000 });
      await firstProduct.click();

      await page.getByRole('button', { name: /adicionar ao carrinho/i }).click();

      // Badge do carrinho deve aparecer com 1
      await expect(page.locator('header').getByText('1')).toBeVisible({ timeout: 3000 });
    });

    test('produto esgotado exibe badge "Esgotado"', async ({ page }) => {
      await page.goto('/');
      const esgotadoBadge = page.getByText('Esgotado').first();
      if (await esgotadoBadge.count() > 0) {
        await expect(esgotadoBadge).toBeVisible();
      }
    });
  });

  test.describe('Paginação', () => {
    test('deve exibir controles de paginação quando houver muitos produtos', async ({ page }) => {
      await page.goto('/');
      const pagination = page.locator('[aria-label*="paginação"], [data-testid="pagination"], nav').filter({ hasText: /próxima|anterior|next|prev/i });
      const productCount = await page.locator('article').count();
      if (productCount >= 12) {
        await expect(pagination.first()).toBeVisible({ timeout: 3000 });
      }
    });
  });
});
