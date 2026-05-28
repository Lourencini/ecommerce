import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartProvider } from '@/contexts/CartContext';
import CartPage from '@/app/cart/page';
import { useSession } from 'next-auth/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/cart',
  useSearchParams: () => new URLSearchParams(),
}));

const seedCart = (items: object[]) => {
  localStorage.setItem('e3d_cart', JSON.stringify(items));
};

const baseItem = {
  productId: 'prod-001',
  sku: 'SKU-001',
  name: 'Vaso Articulado',
  price: 79.9,
  quantity: 2,
  weightGrams: 200,
  lengthCm: 12,
  widthCm: 12,
  heightCm: 18,
  imageUrl: '',
};

const renderCart = () =>
  render(
    <CartProvider>
      <CartPage />
    </CartProvider>
  );

describe('CartPage — integração', () => {
  beforeEach(() => {
    mockPush.mockReset();
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() });
  });

  describe('carrinho vazio', () => {
    it('exibe mensagem de carrinho vazio', () => {
      renderCart();
      expect(screen.getByText(/carrinho está vazio/i)).toBeInTheDocument();
    });

    it('exibe link para ver produtos', () => {
      renderCart();
      expect(screen.getByRole('link', { name: /ver produtos/i })).toBeInTheDocument();
    });
  });

  describe('carrinho com itens', () => {
    beforeEach(() => seedCart([baseItem]));

    it('exibe nome do produto', () => {
      renderCart();
      expect(screen.getByText('Vaso Articulado')).toBeInTheDocument();
    });

    it('exibe preço unitário formatado', () => {
      renderCart();
      expect(screen.getByText(/79,90/)).toBeInTheDocument();
    });

    it('exibe quantidade atual', () => {
      renderCart();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('exibe subtotal total formatado', () => {
      renderCart();
      // 79.90 × 2 = 159.80 — aparece em múltiplos lugares (item total + resumo)
      expect(screen.getAllByText(/159,80/).length).toBeGreaterThan(0);
    });

    it('exibe link "Ir para o Checkout"', () => {
      renderCart();
      expect(screen.getByRole('link', { name: /ir para o checkout/i })).toBeInTheDocument();
    });

    it('link de checkout aponta para /checkout', () => {
      renderCart();
      expect(screen.getByRole('link', { name: /ir para o checkout/i })).toHaveAttribute('href', '/checkout');
    });
  });

  describe('múltiplos itens', () => {
    beforeEach(() => {
      seedCart([
        baseItem,
        { ...baseItem, productId: 'prod-002', sku: 'SKU-002', name: 'Dragão RPG', price: 120, quantity: 1 },
      ]);
    });

    it('exibe todos os produtos', () => {
      renderCart();
      expect(screen.getByText('Vaso Articulado')).toBeInTheDocument();
      expect(screen.getByText('Dragão RPG')).toBeInTheDocument();
    });

    it('calcula subtotal corretamente para múltiplos itens', () => {
      renderCart();
      // 79.90*2 + 120*1 = 279.80
      expect(screen.getAllByText(/279,80/).length).toBeGreaterThan(0);
    });
  });

  describe('interações', () => {
    beforeEach(() => seedCart([baseItem]));

    it('botão remover exibe texto "Remover"', () => {
      renderCart();
      expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
    });

    it('clicar em remover limpa o carrinho', () => {
      renderCart();
      fireEvent.click(screen.getByRole('button', { name: /remover/i }));
      expect(screen.getByText(/carrinho está vazio/i)).toBeInTheDocument();
    });

    it('exibe botões de incremento e decremento', () => {
      renderCart();
      expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '−' })).toBeInTheDocument();
    });
  });
});
