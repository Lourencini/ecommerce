import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { FooterAccountLinks } from '@/components/FooterAccountLinks';

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import { useSession } from 'next-auth/react';

describe('FooterAccountLinks', () => {
  it('exibe Entrar e Criar conta quando deslogado', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() });
    render(<FooterAccountLinks />);
    expect(screen.getByText('Entrar')).toBeInTheDocument();
    expect(screen.getByText('Criar conta')).toBeInTheDocument();
    expect(screen.queryByText('Minha conta')).not.toBeInTheDocument();
  });

  it('exibe Minha conta quando logado como cliente', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'João', email: 'j@j.com', role: 'CUSTOMER' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });
    render(<FooterAccountLinks />);
    expect(screen.getByText('Minha conta')).toBeInTheDocument();
    expect(screen.queryByText('Entrar')).not.toBeInTheDocument();
    expect(screen.queryByText('Criar conta')).not.toBeInTheDocument();
    expect(screen.queryByText('Painel Admin')).not.toBeInTheDocument();
  });

  it('exibe Minha conta e Painel Admin quando logado como admin', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Admin', email: 'a@a.com', role: 'ADMIN' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });
    render(<FooterAccountLinks />);
    expect(screen.getByText('Minha conta')).toBeInTheDocument();
    expect(screen.getByText('Painel Admin')).toBeInTheDocument();
    expect(screen.queryByText('Entrar')).not.toBeInTheDocument();
  });

  it('não renderiza nada enquanto sessão está carregando', () => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'loading', update: vi.fn() });
    const { container } = render(<FooterAccountLinks />);
    expect(container).toBeEmptyDOMElement();
  });
});
