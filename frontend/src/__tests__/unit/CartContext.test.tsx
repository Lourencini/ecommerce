import { describe, it, expect, beforeEach } from 'vitest';
import { render, act, renderHook } from '@testing-library/react';
import { CartProvider, useCart } from '@/contexts/CartContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

const makeItem = (overrides = {}) => ({
  productId: 'prod-001',
  sku: 'SKU-001',
  name: 'Vaso 3D',
  price: 49.9,
  quantity: 1,
  weightGrams: 200,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 15,
  imageUrl: '',
  ...overrides,
});

describe('CartContext', () => {
  describe('estado inicial', () => {
    it('inicia com carrinho vazio', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.subtotal).toBe(0);
    });

    it('carrega itens do localStorage ao inicializar', () => {
      const stored = [makeItem({ quantity: 2 })];
      localStorage.setItem('e3d_cart', JSON.stringify(stored));

      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.items).toHaveLength(1);
      expect(result.current.totalItems).toBe(2);
    });

    it('ignora localStorage corrompido sem lançar erro', () => {
      localStorage.setItem('e3d_cart', 'INVALID_JSON{{{');
      expect(() => renderHook(() => useCart(), { wrapper })).not.toThrow();
    });
  });

  describe('addToCart', () => {
    it('adiciona item novo ao carrinho', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem()));
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe('Vaso 3D');
    });

    it('soma quantidade quando produto já existe no carrinho', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem({ quantity: 1 })));
      act(() => result.current.addToCart(makeItem({ quantity: 2 })));
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
    });

    it('adiciona produtos diferentes como itens separados', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem({ productId: 'prod-001' })));
      act(() => result.current.addToCart(makeItem({ productId: 'prod-002', sku: 'SKU-002' })));
      expect(result.current.items).toHaveLength(2);
    });
  });

  describe('removeFromCart', () => {
    it('remove item pelo productId', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem()));
      act(() => result.current.removeFromCart('prod-001'));
      expect(result.current.items).toHaveLength(0);
    });

    it('não afeta outros itens ao remover um', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem({ productId: 'prod-001' })));
      act(() => result.current.addToCart(makeItem({ productId: 'prod-002', sku: 'SKU-002' })));
      act(() => result.current.removeFromCart('prod-001'));
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].productId).toBe('prod-002');
    });
  });

  describe('updateQuantity', () => {
    it('atualiza quantidade do item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem()));
      act(() => result.current.updateQuantity('prod-001', 5));
      expect(result.current.items[0].quantity).toBe(5);
    });

    it('remove item quando quantidade é zero', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem()));
      act(() => result.current.updateQuantity('prod-001', 0));
      expect(result.current.items).toHaveLength(0);
    });

    it('remove item quando quantidade é negativa', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem()));
      act(() => result.current.updateQuantity('prod-001', -1));
      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('remove todos os itens', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem({ productId: 'p1' })));
      act(() => result.current.addToCart(makeItem({ productId: 'p2', sku: 'S2' })));
      act(() => result.current.clearCart());
      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.subtotal).toBe(0);
    });
  });

  describe('computed values', () => {
    it('calcula totalItems somando todas as quantidades', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem({ productId: 'p1', quantity: 3 })));
      act(() => result.current.addToCart(makeItem({ productId: 'p2', sku: 'S2', quantity: 2 })));
      expect(result.current.totalItems).toBe(5);
    });

    it('calcula subtotal corretamente (preço × quantidade)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem({ price: 50, quantity: 2 })));
      expect(result.current.subtotal).toBe(100);
    });

    it('subtotal com múltiplos produtos diferentes', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem({ productId: 'p1', price: 30, quantity: 1 })));
      act(() => result.current.addToCart(makeItem({ productId: 'p2', sku: 'S2', price: 20, quantity: 3 })));
      expect(result.current.subtotal).toBe(90);
    });
  });

  describe('persistência localStorage', () => {
    it('persiste no localStorage após adicionar item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem()));
      const stored = JSON.parse(localStorage.getItem('e3d_cart') ?? '[]');
      expect(stored).toHaveLength(1);
    });

    it('atualiza localStorage ao remover item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      act(() => result.current.addToCart(makeItem()));
      act(() => result.current.removeFromCart('prod-001'));
      const stored = JSON.parse(localStorage.getItem('e3d_cart') ?? '[]');
      expect(stored).toHaveLength(0);
    });
  });
});
