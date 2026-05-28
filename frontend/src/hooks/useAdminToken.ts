'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook para páginas admin.
 * - Extrai o Bearer token de forma segura.
 * - Expõe `authFetch`: wrapper de fetch que redireciona para /login em 401.
 */
export function useAdminToken() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const token: string =
    (session as any)?.accessToken ??
    (session?.user as any)?.accessToken ??
    '';

  const authFetch = useCallback(
    async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
      const res = await fetch(input, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        // Token expirado ou inválido — faz logout e redireciona para login
        await signOut({ redirect: false });
        router.push('/login?redirect=/admin');
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      return res;
    },
    [token, router],
  );

  return { token, status, authFetch, session };
}
