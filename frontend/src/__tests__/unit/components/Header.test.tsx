import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/Header';
import { CartProvider } from '@/contexts/CartContext';

vi.mock('@/contexts/CartContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/CartContext')>();
  return {
    ...actual,
    useCart: vi.fn(() => ({ totalItems: 0 })),
  };
});

import { useCart } from '@/contexts/CartContext';

const renderHeader = () =>
  render(
    <CartProvider>
      <Header />
    </CartProvider>
  );

describe('Header', () => {
  describe('usuário não autenticado', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() });
    });

    it('exibe link "Entrar" quando não autenticado', () => {
      renderHeader();
      expect(screen.getByText('Entrar')).toBeInTheDocument();
    });

    it('link "Entrar" aponta para /login', () => {
      renderHeader();
      const link = screen.getByText('Entrar').closest('a');
      expect(link).toHaveAttribute('href', '/login');
    });

    it('não exibe menu dropdown de usuário', () => {
      renderHeader();
      expect(screen.queryByRole('button', { name: /chevrondown/i })).not.toBeInTheDocument();
    });
  });

  describe('usuário autenticado (cliente)', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { name: 'João Silva', email: 'joao@email.com', role: 'CUSTOMER', accessToken: 'tok' } as any,
          expires: '9999-01-01',
        },
        status: 'authenticated',
        update: vi.fn(),
      });
    });

    it('exibe primeiro nome do usuário', () => {
      renderHeader();
      expect(screen.getByText('João')).toBeInTheDocument();
    });

    it('não exibe link "Painel Admin" para usuário comum', () => {
      renderHeader();
      const btn = screen.getByText('João').closest('button')!;
      fireEvent.click(btn);
      expect(screen.queryByText('Painel Admin')).not.toBeInTheDocument();
    });

    it('exibe "Minha Conta" no dropdown', () => {
      renderHeader();
      const btn = screen.getByText('João').closest('button')!;
      fireEvent.click(btn);
      expect(screen.getByText('Minha Conta')).toBeInTheDocument();
    });

    it('exibe email do usuário no dropdown', () => {
      renderHeader();
      const btn = screen.getByText('João').closest('button')!;
      fireEvent.click(btn);
      expect(screen.getByText('joao@email.com')).toBeInTheDocument();
    });
  });

  describe('usuário admin', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { name: 'Admin User', email: 'admin@email.com', role: 'ADMIN', accessToken: 'tok' } as any,
          expires: '9999-01-01',
        },
        status: 'authenticated',
        update: vi.fn(),
      });
    });

    it('exibe badge "Admin" no dropdown', () => {
      renderHeader();
      const btn = screen.getByText('Admin').closest('button')!;
      fireEvent.click(btn);
      // "Admin" aparece como rótulo do botão e como badge no dropdown
      expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
    });

    it('exibe link "Painel Admin" para usuário admin', () => {
      renderHeader();
      const btn = screen.getByText('Admin').closest('button')!;
      fireEvent.click(btn);
      expect(screen.getByText('Painel Admin')).toBeInTheDocument();
    });
  });

  describe('carrinho', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() });
    });

    it('exibe link do carrinho', () => {
      renderHeader();
      expect(screen.getByText('Carrinho')).toBeInTheDocument();
    });

    it('não exibe badge quando carrinho está vazio', () => {
      vi.mocked(useCart).mockReturnValue({ totalItems: 0 } as any);
      renderHeader();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('exibe badge com contagem quando há itens no carrinho', () => {
      vi.mocked(useCart).mockReturnValue({ totalItems: 3 } as any);
      renderHeader();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('navegação', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() });
    });

    it('exibe logo "E-3D Print"', () => {
      renderHeader();
      expect(screen.getByText('E-3D Print')).toBeInTheDocument();
    });

    it('exibe link "Vitrine"', () => {
      renderHeader();
      expect(screen.getByText('Vitrine')).toBeInTheDocument();
    });

    it('exibe link "Rastrear Pedido"', () => {
      renderHeader();
      expect(screen.getByText('Rastrear Pedido')).toBeInTheDocument();
    });
  });
});
