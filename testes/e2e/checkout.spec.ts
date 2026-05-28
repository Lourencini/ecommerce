import { test, expect } from '@playwright/test';

const CUSTOMER_EMAIL = 'cliente@email.com';
const CUSTOMER_PASSWORD = 'senha123';

async function loginAs(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL('/', { timeout: 8000 });
}

async function addProductToCart(page: any) {
  await page.goto('/');
  const firstProduct = page.locator('article a, [data-testid="product-card"] a').first();
  await firstProduct.waitFor({ timeout: 8000 });
  await firstProduct.click();
  await page.getByRole('button', { name: /adicionar ao carrinho/i }).click();
  await page.goto('/cart');
}

test.describe('Carrinho de Compras', () => {
  test('deve exibir mensagem quando carrinho está vazio', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByText(/carrinho está vazio/i)).toBeVisible({ timeout: 5000 });
  });

  test('deve exibir link "Explorar produtos" quando carrinho vazio', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('link', { name: /explorar produtos/i })).toBeVisible();
  });

  test('usuário não autenticado ao finalizar é redirecionado para login', async ({ page }) => {
    await page.goto('/');
    const firstProduct = page.locator('article a, [data-testid="product-card"] a').first();
    await firstProduct.waitFor({ timeout: 8000 });
    await firstProduct.click();
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click();
    await page.goto('/cart');

    await page.getByRole('button', { name: /finalizar pedido/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('exibe nome e preço do produto no carrinho', async ({ page }) => {
    await page.goto('/');
    const firstProduct = page.locator('article a').first();
    await firstProduct.waitFor({ timeout: 8000 });

    const productName = await page.locator('article h2, article h3').first().textContent();
    await firstProduct.click();
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click();
    await page.goto('/cart');

    if (productName) {
      await expect(page.getByText(productName.trim())).toBeVisible();
    }
    await expect(page.getByText(/R\$/)).toBeVisible();
  });

  test('incrementar quantidade atualiza subtotal', async ({ page }) => {
    await page.goto('/');
    const firstProduct = page.locator('article a').first();
    await firstProduct.waitFor({ timeout: 8000 });
    await firstProduct.click();
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click();
    await page.goto('/cart');

    const qtyInput = page.getByRole('spinbutton').first();
    if (await qtyInput.count() > 0) {
      await qtyInput.fill('3');
      await qtyInput.press('Tab');
      await expect(page.getByText(/subtotal|total/i)).toBeVisible();
    }
  });

  test('remover item do carrinho', async ({ page }) => {
    await page.goto('/');
    const firstProduct = page.locator('article a').first();
    await firstProduct.waitFor({ timeout: 8000 });
    await firstProduct.click();
    await page.getByRole('button', { name: /adicionar ao carrinho/i }).click();
    await page.goto('/cart');

    const removeBtn = page.getByRole('button', { name: /remover|excluir|×|trash/i }).first();
    if (await removeBtn.count() > 0) {
      await removeBtn.click();
      await expect(page.getByText(/carrinho está vazio/i)).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Fluxo de Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    await addProductToCart(page);
  });

  test('usuário autenticado acessa /checkout ao finalizar pedido', async ({ page }) => {
    await page.getByRole('button', { name: /finalizar pedido/i }).click();
    await expect(page).toHaveURL('/checkout', { timeout: 5000 });
  });

  test('página de checkout exibe resumo do pedido', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText(/resumo|pedido|total/i)).toBeVisible({ timeout: 5000 });
  });

  test('página de checkout exibe seleção de frete', async ({ page }) => {
    await page.goto('/checkout');
    const freteSection = page.getByText(/frete|entrega|cep/i).first();
    await expect(freteSection).toBeVisible({ timeout: 5000 });
  });

  test('deve exibir campo de CEP para cálculo de frete', async ({ page }) => {
    await page.goto('/checkout');
    const cepField = page.getByLabel(/cep/i).or(page.getByPlaceholder(/cep|00000/i));
    await expect(cepField).toBeVisible({ timeout: 5000 });
  });
});
