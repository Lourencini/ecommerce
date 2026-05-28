'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export function HeroActions() {
  const { data: session } = useSession();

  return (
    <div className="hero-actions">
      <a href="#produtos" className="btn-hero btn-hero-dark">
        Explorar produtos
      </a>
      {!session && (
        <Link href="/register" className="btn-hero btn-hero-outline">
          Criar conta
        </Link>
      )}
    </div>
  );
}
