"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import { useAdminToken } from '@/hooks/useAdminToken';
import { Search, UserPlus, ChevronLeft, ChevronRight, X } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  isActive: boolean;
  createdAt: string;
  customer: {
    id: string;
    phone: string | null;
    _count: { orders: number };
  } | null;
}

interface PagedResponse {
  data: UserRow[];
  total: number;
  page: number;
  pages: number;
}

// ── Helpers ───────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', CUSTOMER: 'Cliente' };
const ROLE_COLOR: Record<string, string> = {
  ADMIN:    'rgba(139,0,0,0.2)',
  CUSTOMER: 'rgba(201,168,76,0.12)',
};
const ROLE_TEXT: Record<string, string> = {
  ADMIN:    '#F87171',
  CUSTOMER: '#E2C86A',
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ── Modal: novo usuário ────────────────────────────────────────
function NewUserModal({
  onClose,
  onCreated,
  authFetch,
}: {
  onClose: () => void;
  onCreated: () => void;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await authFetch(`${API_URL}/admin/users`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message ?? 'Erro ao criar usuário.');
      }
      onCreated();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg), var(--glow-gold)', position: 'relative' }}>
        {/* header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--clay-mid)', textShadow: '0 0 10px rgba(201,168,76,0.3)', margin: 0 }}>
            ✦ &nbsp;Novo Usuário
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <form onSubmit={handle} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="field-label">Nome completo</label>
            <input className="field-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="João da Silva" />
          </div>
          <div className="form-group">
            <label className="field-label">E-mail</label>
            <input className="field-input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@exemplo.com" />
          </div>
          <div className="form-group">
            <label className="field-label">Senha</label>
            <input className="field-input" type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="form-group">
            <label className="field-label">Perfil</label>
            <select
              className="field-input"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={{ cursor: 'pointer' }}
            >
              <option value="CUSTOMER">Cliente</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {error && <p style={{ color: '#F87171', fontSize: '0.82rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving} style={{ minWidth: 130 }}>
              {saving ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { status, authFetch } = useAdminToken();

  const [data, setData]         = useState<PagedResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search)       params.set('search',   search);
      if (roleFilter)   params.set('role',     roleFilter);
      if (statusFilter) params.set('isActive', statusFilter);

      const res = await authFetch(`${API_URL}/admin/users?${params}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleFilter, statusFilter, status]);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [load, status]);

  const handleToggleActive = async (user: UserRow) => {
    await authFetch(`${API_URL}/admin/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    load();
  };

  // ── Skeleton ──────────────────────────────────────────────
  if (status === 'loading' || (loading && !data)) {
    return (
      <div>
        <div className="skeleton-title" style={{ width: 240, marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: 480, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const users = data?.data ?? [];

  return (
    <div>
      {/* ── Cabeçalho ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--clay-mid)', marginBottom: '0.4rem', textShadow: '0 0 10px rgba(201,168,76,0.3)' }}>
            ✦ &nbsp;ERP — Gestão
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.5px', margin: 0 }}>
            Usuários
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {data?.total ?? 0} usuários cadastrados
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => setShowModal(true)}
        >
          <UserPlus size={15} /> Novo Usuário
        </button>
      </div>

      {/* ── Filtros ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: '1', minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input
            className="field-input"
            style={{ paddingLeft: '2.2rem' }}
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Role */}
        <select
          className="field-input"
          style={{ width: 'auto', cursor: 'pointer' }}
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">Todos os perfis</option>
          <option value="ADMIN">Admin</option>
          <option value="CUSTOMER">Cliente</option>
        </select>

        {/* Status */}
        <select
          className="field-input"
          style={{ width: 'auto', cursor: 'pointer' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Todos os status</option>
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>

        {(search || roleFilter || statusFilter) && (
          <button
            className="btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-2)' }}
            onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setPage(1); }}
          >
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {/* ── Tabela ───────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(201,168,76,0.05)', borderBottom: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--clay)', fontFamily: 'var(--font-fell)', fontStyle: 'italic' }}>
            Atualizando...
          </div>
        )}

        {users.length === 0 && !loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-2)', fontFamily: 'var(--font-fell)', fontStyle: 'italic' }}>
            Nenhum usuário encontrado.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Status</th>
                <th className="align-right">Pedidos</th>
                <th>Cadastro</th>
                <th className="align-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  {/* Avatar + nome/email */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: u.role === 'ADMIN' ? 'rgba(139,0,0,0.25)' : 'rgba(201,168,76,0.15)',
                        border: `1px solid ${u.role === 'ADMIN' ? 'rgba(139,0,0,0.5)' : 'rgba(201,168,76,0.3)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700,
                        color: u.role === 'ADMIN' ? '#F87171' : '#E2C86A',
                        fontFamily: 'var(--font-display)',
                      }}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <Link href={`/admin/users/${u.id}`} style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', textDecoration: 'none' }}
                          onMouseOver={e => (e.currentTarget.style.color = 'var(--clay-mid)')}
                          onMouseOut={e  => (e.currentTarget.style.color = 'var(--text)')}
                        >
                          {u.name}
                        </Link>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '1px' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role badge */}
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '0.5px',
                      background: ROLE_COLOR[u.role],
                      color: ROLE_TEXT[u.role],
                      border: `1px solid ${ROLE_TEXT[u.role]}33`,
                    }}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem',
                      background: u.isActive ? 'rgba(45,106,63,0.15)' : 'rgba(155,28,28,0.15)',
                      color:      u.isActive ? '#6BCF8A'              : '#F87171',
                      border: `1px solid ${u.isActive ? 'rgba(45,106,63,0.3)' : 'rgba(155,28,28,0.3)'}`,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      {u.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  {/* Pedidos */}
                  <td className="align-right" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {u.customer?._count.orders ?? '—'}
                  </td>

                  {/* Data */}
                  <td style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>
                    {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                  </td>

                  {/* Ações */}
                  <td className="align-right">
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Link href={`/admin/users/${u.id}`} className="btn-secondary btn-sm">
                        Ver
                      </Link>
                      <button
                        className="btn-ghost btn-sm"
                        style={{ color: u.isActive ? '#F87171' : '#6BCF8A', border: `1px solid ${u.isActive ? 'rgba(155,28,28,0.35)' : 'rgba(45,106,63,0.35)'}` }}
                        onClick={() => handleToggleActive(u)}
                        title={u.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {u.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Paginação ────────────────────────────────── */}
      {data && data.pages > 1 && (
        <div className="pagination" style={{ marginTop: '1.5rem' }}>
          <button
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <ChevronLeft size={14} /> Anterior
          </button>

          {Array.from({ length: data.pages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === data.pages || Math.abs(p - page) <= 1)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && (arr[i - 1] as number) < p - 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...'
                ? <span key={`e${i}`} style={{ padding: '0 0.25rem', color: 'var(--text-3)' }}>…</span>
                : <button key={p} className={`pagination-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p as number)}>{p}</button>
            )}

          <button
            className="pagination-btn"
            disabled={page >= data.pages}
            onClick={() => setPage(p => p + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            Próxima <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Modal novo usuário ───────────────────────── */}
      {showModal && (
        <NewUserModal
          authFetch={authFetch}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
