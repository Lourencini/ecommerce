import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';

// LoginForm is rendered inside Suspense in LoginPage — import the wrapper
// We render it directly since LoginForm reads useSearchParams inside Suspense
import LoginPage from '@/app/login/page';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginPage — integração', () => {
  beforeEach(() => {
    vi.mocked(signIn).mockReset();
    mockPush.mockReset();
  });

  it('renderiza campos de email e senha', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('renderiza botão "Entrar"', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('exibe título da página', () => {
    render(<LoginPage />);
    expect(screen.getByText('Entrar na conta')).toBeInTheDocument();
  });

  it('exibe link para cadastro', () => {
    render(<LoginPage />);
    expect(screen.getByText('Criar conta grátis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /criar conta/i })).toHaveAttribute('href', '/register');
  });

  it('chama signIn com credentials ao submeter formulário', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ error: null, ok: true, status: 200, url: '/' });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'usuario@email.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'senha123');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'usuario@email.com',
        password: 'senha123',
        redirect: false,
      });
    });
  });

  it('exibe mensagem de erro quando credenciais estão incorretas', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ error: 'CredentialsSignin', ok: false, status: 401, url: null });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'errado@email.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'senhaerrada');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/e-mail ou senha incorretos/i)).toBeInTheDocument();
    });
  });

  it('redireciona para "/" após login bem-sucedido (sem mensagem de erro)', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ error: null, ok: true, status: 200, url: '/' });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'admin@email.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'senha123');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({ email: 'admin@email.com' }));
      expect(screen.queryByText(/e-mail ou senha incorretos/i)).not.toBeInTheDocument();
    });
  });

  it('botão fica desabilitado durante o carregamento', async () => {
    vi.mocked(signIn).mockImplementationOnce(() => new Promise(() => {})); // nunca resolve
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '123456');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();
    });
  });

  it('redireciona para URL de redirect quando fornecida', async () => {
    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
      usePathname: () => '/login',
      useSearchParams: () => new URLSearchParams('redirect=/checkout'),
    }));

    vi.mocked(signIn).mockResolvedValueOnce({ error: null, ok: true, status: 200, url: '/' });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/senha/i), '123456');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });
});
