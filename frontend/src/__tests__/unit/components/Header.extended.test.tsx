import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => <a href={href} className={className}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
}));

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut:    vi.fn(),
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: vi.fn(),
}));

import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';
import { Header } from '@/components/Header';

const renderHeader = () => render(<Header />);

const sessionAdmin = {
  data: { user: { name: 'Admin User', email: 'admin@test.com', role: 'ADMIN' }, expires: '' },
  status: 'authenticated',
  update: vi.fn(),
};

describe('Header — extended coverage', () => {
  beforeEach(() => {
    vi.mocked(useCart).mockReturnValue({ totalItems: 0 } as any);
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() });
  });

  it('exibe badge no carrinho quando há itens', () => {
    vi.mocked(useCart).mockReturnValue({ totalItems: 3 } as any);
    renderHeader();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('não exibe badge no carrinho quando está vazio', () => {
    renderHeader();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('exibe botão Entrar quando usuário não está logado', () => {
    renderHeader();
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });

  it('exibe nome do usuário logado no menu', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'João Silva', email: 'j@j.com', role: 'CUSTOMER' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });
    renderHeader();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('abre dropdown ao clicar no botão do usuário', () => {
    vi.mocked(useSession).mockReturnValue(sessionAdmin as any);
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    expect(screen.getByText('Minha Conta')).toBeInTheDocument();
  });

  it('exibe link Painel Admin no dropdown para admin', () => {
    vi.mocked(useSession).mockReturnValue(sessionAdmin as any);
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    expect(screen.getByText('Painel Admin')).toBeInTheDocument();
  });

  it('não exibe link Painel Admin para CUSTOMER', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Cliente', email: 'c@c.com', role: 'CUSTOMER' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /cliente/i }));
    expect(screen.queryByText('Painel Admin')).not.toBeInTheDocument();
  });

  it('exibe badge Admin no dropdown para usuário admin', () => {
    vi.mocked(useSession).mockReturnValue(sessionAdmin as any);
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    // badge-new tem classe específica, diferente do nome no botão
    expect(screen.getByText('Admin', { selector: '.badge-new,.badge' })).toBeInTheDocument();
  });

  it('chama signOut ao clicar em Sair', () => {
    vi.mocked(useSession).mockReturnValue(sessionAdmin as any);
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /admin/i }));
    fireEvent.click(screen.getByText('Sair'));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('exibe hamburger button para acessibilidade mobile', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  it('abre menu mobile ao clicar no hamburger', () => {
    vi.mocked(useSession).mockReturnValue(sessionAdmin as any);
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    expect(screen.getByRole('navigation', { name: /menu mobile/i })).toBeInTheDocument();
  });
});
