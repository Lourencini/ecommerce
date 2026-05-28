'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('E-mail ou senha incorretos.');
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label className="form-label" htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          className="form-input"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          className="form-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <button type="submit" className="btn-primary btn-full" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span
            className="logo"
            style={{ justifyContent: 'center', display: 'flex', marginBottom: '0.5rem' }}
          >
            E-3D Print
          </span>
          <h1 className="auth-title">Entrar na conta</h1>
          <p className="auth-subtitle">Bem-vindo de volta!</p>
        </div>

        <Suspense fallback={<div className="page-spinner"><div className="spinner" /></div>}>
          <LoginForm />
        </Suspense>

        <p className="auth-footer">
          Não tem conta?{' '}
          <Link href="/register" className="auth-link">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
