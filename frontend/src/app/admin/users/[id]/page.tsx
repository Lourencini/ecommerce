"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { useAdminToken } from '@/hooks/useAdminToken';
import { ArrowLeft, Save, MapPin, ShoppingBag } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────
interface Address {
  id: number;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

interface OrderItem { productName: string; quantity: number; totalPrice: any; }

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: any;
  createdAt: string;
  paymentMethod: string | null;
  items: OrderItem[];
}

interface Customer {
  id: string;
  phone: string | null;
  document: string | null;
  addresses: Address[];
  orders: Order[];
  totalSpent: any;
  _count: { orders: number };
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customer: Customer | null;
}

// ── Helpers ───────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente', CONFIRMED: 'Confirmado', PRINTING: 'Imprimindo',
  READY: 'Pronto', SHIPPED: 'Enviado', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#FBB347', CONFIRMED: '#93C5FD', PRINTING: '#C4B5FD',
  READY: '#67E8F9', SHIPPED: '#6BCF8A', DELIVERED: '#34D399', CANCELLED: '#F87171',
};
const fmt = (v: any) => Number(v ?? 0).toFixed(2).replace('.', ',');

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ── Card decorado ─────────────────────────────────────────────
function DecorCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.5rem',
      position: 'relative', overflow: 'hidden', ...style,
    }}>
      <span style={{ position: 'absolute', top: 7, left: 7, width: 12, height: 12, borderTop: '1px solid rgba(201,168,76,0.25)', borderLeft: '1px solid rgba(201,168,76,0.25)', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', bottom: 7, right: 7, width: 12, height: 12, borderBottom: '1px solid rgba(201,168,76,0.25)', borderRight: '1px solid rgba(201,168,76,0.25)', pointerEvents: 'none' }} />
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 700,
      letterSpacing: '2.5px', textTransform: 'uppercase',
      color: 'var(--clay-mid)', textShadow: '0 0 10px rgba(201,168,76,0.3)',
      marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      <span style={{ opacity: 0.6 }}>✦</span> {children}
    </h3>
  );
}

// ── Página ────────────────────────────────────────────────────
export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { status, authFetch } = useAdminToken();

  const [user, setUser]       = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  // Formulário de edição
  const [editName, setEditName]     = useState('');
  const [editRole, setEditRole]     = useState('');
  const [editActive, setEditActive] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/admin/users/${id}`);
      if (!res.ok) throw new Error();
      const data: UserDetail = await res.json();
      setUser(data);
      setEditName(data.name);
      setEditRole(data.role);
      setEditActive(data.isActive);
    } catch { setError('Erro ao carregar usuário.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (status === 'authenticated' && id) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await authFetch(`${API_URL}/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, role: editRole, isActive: editActive }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? 'Erro.'); }
      const updated = await res.json();
      setUser(prev => prev ? { ...prev, ...updated } : null);
      setSuccess('Usuário atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading || !user) {
    return (
      <div>
        <div className="skeleton-title" style={{ width: 200, marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const customer = user.customer;
  const totalOrders = customer?._count.orders ?? 0;
  const totalSpent  = Number(customer?.totalSpent ?? 0);

  return (
    <div style={{ maxWidth: 900 }}>
      {/* ── Voltar + header ──────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/admin/users"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '1rem' }}
        >
          <ArrowLeft size={14} /> Voltar para Usuários
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Avatar grande */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: user.role === 'ADMIN' ? 'rgba(139,0,0,0.2)' : 'rgba(201,168,76,0.12)',
            border: `2px solid ${user.role === 'ADMIN' ? 'rgba(139,0,0,0.5)' : 'rgba(201,168,76,0.35)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)',
            color: user.role === 'ADMIN' ? '#F87171' : '#E2C86A',
          }}>
            {initials(user.name)}
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.5px', margin: 0 }}>
              {user.name}
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{user.email}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{
              padding: '3px 10px', borderRadius: 4, fontSize: '0.68rem',
              fontFamily: 'var(--font-display)', letterSpacing: '0.5px',
              background: user.isActive ? 'rgba(45,106,63,0.15)' : 'rgba(155,28,28,0.15)',
              color:      user.isActive ? '#6BCF8A'              : '#F87171',
              border: `1px solid ${user.isActive ? 'rgba(45,106,63,0.3)' : 'rgba(155,28,28,0.3)'}`,
            }}>
              {user.isActive ? '● Ativo' : '● Inativo'}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total de Pedidos', value: totalOrders, color: 'var(--clay-mid)' },
          { label: 'Total Gasto', value: `R$ ${fmt(totalSpent)}`, color: '#6BCF8A' },
          { label: 'Endereços', value: customer?.addresses.filter(a => a.label !== '[excluído]').length ?? 0, color: '#93C5FD' },
          { label: 'Membro desde', value: new Date(user.createdAt).toLocaleDateString('pt-BR'), color: 'var(--text-2)' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: kpi.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* ── Layout 2 colunas ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Coluna esquerda: editar perfil */}
        <DecorCard>
          <SectionTitle>Editar Perfil</SectionTitle>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="field-label">E-mail</label>
              <input className="field-input field-disabled" value={user.email} disabled />
              <p className="field-hint">O e-mail não pode ser alterado.</p>
            </div>
            <div className="form-group">
              <label className="field-label">Nome completo</label>
              <input className="field-input" value={editName} onChange={e => setEditName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="field-label">Perfil / Role</label>
              <select className="field-input" value={editRole} onChange={e => setEditRole(e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="CUSTOMER">Cliente</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                type="checkbox"
                id="activeCheck"
                checked={editActive}
                onChange={e => setEditActive(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--clay)', cursor: 'pointer' }}
              />
              <label htmlFor="activeCheck" className="field-label" style={{ margin: 0, cursor: 'pointer' }}>Conta ativa</label>
            </div>

            {error   && <p style={{ color: '#F87171', fontSize: '0.82rem' }}>{error}</p>}
            {success && <p style={{ color: '#6BCF8A', fontSize: '0.82rem' }}>{success}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary btn-sm" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 130 }}>
                <Save size={13} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </DecorCard>

        {/* Coluna direita: dados do cliente */}
        <DecorCard>
          <SectionTitle>Dados de Cliente</SectionTitle>
          {!customer ? (
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', fontFamily: 'var(--font-fell)', fontStyle: 'italic' }}>
              Este usuário não possui perfil de cliente vinculado.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-2)' }}>ID Cliente</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-3)' }}>{customer.id.slice(0, 8)}…</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-2)' }}>Telefone</span>
                <span>{customer.phone || '—'}</span>
              </div>
              {customer.document && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-2)' }}>CPF/CNPJ</span>
                  <span>{customer.document}</span>
                </div>
              )}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-2)', fontSize: '0.78rem', marginBottom: '0.6rem' }}>
                  <MapPin size={12} /> Endereços ({customer.addresses.filter(a => a.label !== '[excluído]').length})
                </div>
                {customer.addresses.filter(a => a.label !== '[excluído]').slice(0, 3).map(addr => (
                  <div key={addr.id} style={{
                    padding: '0.6rem 0.75rem', marginBottom: '0.5rem',
                    background: addr.isDefault ? 'rgba(201,168,76,0.06)' : 'var(--surface)',
                    border: `1px solid ${addr.isDefault ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-2)',
                  }}>
                    <strong style={{ color: addr.isDefault ? 'var(--clay-mid)' : 'var(--text)', display: 'block', marginBottom: '0.15rem' }}>
                      {addr.label || 'Endereço'}{addr.isDefault && <span style={{ fontSize: '0.65rem', color: 'var(--clay)', marginLeft: '0.4rem' }}>● padrão</span>}
                    </strong>
                    {addr.street}, {addr.number} — {addr.city}/{addr.state}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DecorCard>
      </div>

      {/* ── Histórico de Pedidos ──────────────────────── */}
      {customer && customer.orders.length > 0 && (
        <DecorCard style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <SectionTitle>Histórico de Pedidos</SectionTitle>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '-1rem' }}>
              {totalOrders} pedido{totalOrders !== 1 ? 's' : ''} no total
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {customer.orders.map((order, i) => (
              <div key={order.id}>
                {/* Linha principal */}
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                    gap: '1rem', alignItems: 'center',
                    padding: '0.85rem 0',
                    borderBottom: i < customer.orders.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <ShoppingBag size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', letterSpacing: '0.5px' }}>
                        {order.orderNumber}
                      </span>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.78rem', fontFamily: 'var(--font-fell)', fontStyle: 'italic' }}>
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem',
                    fontFamily: 'var(--font-display)', letterSpacing: '0.5px',
                    background: `${STATUS_COLOR[order.status]}22`,
                    color: STATUS_COLOR[order.status] ?? 'var(--text-2)',
                    border: `1px solid ${STATUS_COLOR[order.status] ?? 'var(--border)'}44`,
                  }}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <strong style={{ color: 'var(--clay-mid)', fontSize: '0.9rem' }}>
                    R$ {fmt(order.total)}
                  </strong>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
                    {expandedOrder === order.id ? '▾' : '▸'}
                  </span>
                </div>

                {/* Itens expandidos */}
                {expandedOrder === order.id && (
                  <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          {['Produto', 'Qtd', 'Subtotal'].map(h => (
                            <th key={h} style={{ textAlign: h !== 'Produto' ? 'right' : 'left', color: 'var(--text-3)', fontWeight: 600, paddingBottom: '0.4rem', paddingRight: '1rem' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, j) => (
                          <tr key={j}>
                            <td style={{ paddingRight: '1rem', paddingBottom: '0.25rem', color: 'var(--text-2)' }}>{item.productName}</td>
                            <td style={{ textAlign: 'right', paddingRight: '1rem', color: 'var(--text-3)' }}>×{item.quantity}</td>
                            <td style={{ textAlign: 'right', color: 'var(--text)' }}>R$ {fmt(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {order.paymentMethod && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        Pagamento: {order.paymentMethod}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalOrders > 10 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.75rem', fontFamily: 'var(--font-fell)', fontStyle: 'italic' }}>
              Exibindo os 10 pedidos mais recentes de {totalOrders}.
            </p>
          )}
        </DecorCard>
      )}
    </div>
  );
}
