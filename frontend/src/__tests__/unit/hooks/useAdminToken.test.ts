import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession, signOut } from 'next-auth/react';
import { useAdminToken } from '@/hooks/useAdminToken';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('useAdminToken', () => {
  describe('extração do token', () => {
    it('retorna token vazio quando sessão é null', () => {
      vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() });
      const { result } = renderHook(() => useAdminToken());
      expect(result.current.token).toBe('');
    });

    it('extrai token de session.accessToken (raiz)', () => {
      vi.mocked(useSession).mockReturnValue({
        data: { accessToken: 'token-raiz', user: { name: 'Admin' }, expires: '9999' } as any,
        status: 'authenticated',
        update: vi.fn(),
      });
      const { result } = renderHook(() => useAdminToken());
      expect(result.current.token).toBe('token-raiz');
    });

    it('extrai token de session.user.accessToken quando raiz não existe', () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { accessToken: 'token-user', name: 'Admin' }, expires: '9999' } as any,
        status: 'authenticated',
        update: vi.fn(),
      });
      const { result } = renderHook(() => useAdminToken());
      expect(result.current.token).toBe('token-user');
    });

    it('expõe status da sessão', () => {
      vi.mocked(useSession).mockReturnValue({ data: null, status: 'loading', update: vi.fn() });
      const { result } = renderHook(() => useAdminToken());
      expect(result.current.status).toBe('loading');
    });
  });

  describe('authFetch — comportamento em 401', () => {
    beforeEach(() => {
      vi.mocked(useSession).mockReturnValue({
        data: { accessToken: 'valid-token', user: {}, expires: '9999' } as any,
        status: 'authenticated',
        update: vi.fn(),
      });
      vi.stubGlobal('fetch', vi.fn());
    });

    it('redireciona para /login e chama signOut em resposta 401', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ status: 401 } as any);
      const { result } = renderHook(() => useAdminToken());

      await expect(result.current.authFetch('http://localhost:3001/api/v1/orders')).rejects.toThrow('Sessão expirada');
      expect(signOut).toHaveBeenCalledWith({ redirect: false });
      expect(mockPush).toHaveBeenCalledWith('/login?redirect=/admin');
    });

    it('injeta header Authorization com Bearer token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ status: 200 } as any);
      const { result } = renderHook(() => useAdminToken());

      await result.current.authFetch('http://localhost:3001/api/v1/orders');

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const init = callArgs[1] as RequestInit;
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer valid-token');
    });

    it('retorna resposta quando status não é 401', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ status: 200, ok: true } as any);
      const { result } = renderHook(() => useAdminToken());

      const res = await result.current.authFetch('http://localhost:3001/api/v1/orders');
      expect(res.status).toBe(200);
    });

    it('adiciona Content-Type: application/json por padrão', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ status: 200 } as any);
      const { result } = renderHook(() => useAdminToken());

      await result.current.authFetch('http://localhost:3001/api/v1/test');
      const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });
});
