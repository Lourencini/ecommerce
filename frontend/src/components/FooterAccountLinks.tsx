'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export function FooterAccountLinks() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  if (status === 'loading') return null;

  if (session) {
    return (
      <>
        <Link href="/minha-conta">Minha conta</Link>
        {isAdmin && <Link href="/admin">Painel Admin</Link>}
      </>
    );
  }

  return (
    <>
      <Link href="/login">Entrar</Link>
      <Link href="/register">Criar conta</Link>
    </>
  );
}
