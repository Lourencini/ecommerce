"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { MapPin, Plus, Star, Trash2, ChevronUp } from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────
type Address = {
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
};

type CustomerData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  addresses: Address[];
};

const EMPTY_ADDR = {
  label: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  isDefault: false,
};

// ── Estilos compartilhados ────────────────────────────────────
const sectionCard: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.75rem',
  marginBottom: '1.5rem',
  position: 'relative',
  overflow: 'hidden',
};

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '2.5px',
  textTransform: 'uppercase',
  color: 'var(--clay-mid)',
  textShadow: '0 0 12px rgba(201,168,76,0.35)',
  marginBottom: '1.5rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
};

// ── Componente principal ──────────────────────────────────────
export default function MinhaContaPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  const [customer, setCustomer]     = useState<CustomerData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');

  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');

  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm]         = useState(EMPTY_ADDR);
  const [cepLoading, setCepLoading]     = useState(false);
  const [savingAddr, setSavingAddr]     = useState(false);
  const [addrError, setAddrError]       = useState('');

  const getToken = () =>
    (session as any)?.accessToken ??
    (session?.user as any)?.accessToken ??
    '';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=/minha-conta');
  }, [status, router]);

  const loadCustomer = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/customers/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: CustomerData = await res.json();
      setCustomer(data);
      setName(data.name  ?? '');
      setPhone(data.phone ?? '');
    } catch {
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomer(); /* eslint-disable-next-line */ }, [session]);

  // ── Salvar perfil ─────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_URL}/customers/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: name.trim(), phone: phone.replace(/\D/g, '') || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? 'Erro ao salvar.'); }
      const updated = await res.json();
      setCustomer(prev => prev ? { ...prev, ...updated } : null);
      setName(updated.name);
      await updateSession({ name: updated.name });
      setSuccess('Dados atualizados com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  // ── ViaCEP ────────────────────────────────────────────────
  const handleCepBlur = async () => {
    const cep = addrForm.zipCode.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddrForm(f => ({
          ...f,
          street:       data.logradouro ?? f.street,
          neighborhood: data.bairro     ?? f.neighborhood,
          city:         data.localidade ?? f.city,
          state:        data.uf         ?? f.state,
        }));
      }
    } catch {}
    finally { setCepLoading(false); }
  };

  // ── Adicionar endereço ────────────────────────────────────
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddr(true); setAddrError('');
    try {
      const payload = {
        ...addrForm,
        zipCode: addrForm.zipCode.replace(/\D/g, ''),
        label: addrForm.label || undefined,
        complement: addrForm.complement || undefined,
      };
      const res = await fetch(`${API_URL}/customers/me/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? 'Erro ao salvar endereço.'); }
      await loadCustomer();
      setAddrForm(EMPTY_ADDR);
      setShowAddrForm(false);
      setSuccess('Endereço adicionado!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setAddrError(err.message); }
    finally { setSavingAddr(false); }
  };

  const handleSetDefault = async (id: number) => {
    await fetch(`${API_URL}/customers/me/addresses/${id}/default`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    await loadCustomer();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este endereço?')) return;
    await fetch(`${API_URL}/customers/me/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    await loadCustomer();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="page-container">
        <div className="skeleton-title" style={{ width: 250, marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const addresses = (customer?.addresses ?? []).filter(a => a.label !== '[excluído]');

  return (
    <div className="page-container" style={{ maxWidth: 660 }}>
      {/* ── Cabeçalho ─────────────────────────────────── */}
      <header style={{ marginBottom: '0.25rem' }}>
        <div style={{ fontSize: '0.58rem', fontFamily: 'var(--font-display)', letterSpacing: '3.5px', textTransform: 'uppercase', color: 'var(--clay-mid)', marginBottom: '0.6rem', textShadow: '0 0 12px rgba(201,168,76,0.4)' }}>
          ✦ &nbsp;Portal do Feiticeiro
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, letterSpacing: '1px', textShadow: '0 0 20px rgba(201,168,76,0.2), 2px 2px 0 rgba(0,0,0,0.5)', marginBottom: '0.35rem' }}>
          Minha Conta
        </h2>
        <p style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', color: 'var(--text-2)', fontSize: '0.95rem' }}>
          Dados pessoais, endereços e histórico de pedidos
        </p>
      </header>

      {/* ── Dados Pessoais ─────────────────────────────── */}
      <section style={sectionCard}>
        {/* canto decorativo */}
        <span style={{ position: 'absolute', top: 8, left: 8, width: 14, height: 14, borderTop: '1px solid rgba(201,168,76,0.25)', borderLeft: '1px solid rgba(201,168,76,0.25)', borderRadius: '1px', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderBottom: '1px solid rgba(201,168,76,0.25)', borderRight: '1px solid rgba(201,168,76,0.25)', borderRadius: '1px', pointerEvents: 'none' }} />

        <h3 style={sectionTitle}>
          <span style={{ opacity: 0.6 }}>✦</span> Dados Pessoais
        </h3>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div className="form-group">
            <label className="field-label">E-mail</label>
            <input
              value={customer?.email ?? session?.user?.email ?? ''}
              disabled
              className="field-input field-disabled"
            />
            <p className="field-hint">O e-mail não pode ser alterado.</p>
          </div>

          <div className="form-group">
            <label className="field-label">Nome completo</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required minLength={2} maxLength={100}
              placeholder="Seu nome completo"
              className="field-input"
            />
          </div>

          <div className="form-group">
            <label className="field-label">Telefone / WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(11) 99999-0000"
              maxLength={15}
              className="field-input"
            />
          </div>

          {error   && <div className="feedback-error">{error}</div>}
          {success && <div className="feedback-success">{success}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ minWidth: 160 }}>
              {saving ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Endereços ──────────────────────────────────── */}
      <section style={sectionCard}>
        <span style={{ position: 'absolute', top: 8, left: 8, width: 14, height: 14, borderTop: '1px solid rgba(201,168,76,0.25)', borderLeft: '1px solid rgba(201,168,76,0.25)', borderRadius: '1px', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderBottom: '1px solid rgba(201,168,76,0.25)', borderRight: '1px solid rgba(201,168,76,0.25)', borderRadius: '1px', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>
            <span style={{ opacity: 0.6 }}>✦</span> Endereços
          </h3>
          <button
            className="btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setShowAddrForm(v => !v)}
          >
            {showAddrForm ? <ChevronUp size={14} /> : <Plus size={14} />}
            {showAddrForm ? 'Cancelar' : 'Novo Endereço'}
          </button>
        </div>

        {addresses.length === 0 && !showAddrForm && (
          <p style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', color: 'var(--text-2)', fontSize: '0.9rem' }}>
            Nenhum endereço cadastrado. Adicione um para agilizar o checkout.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: showAddrForm && addresses.length > 0 ? '1.5rem' : 0 }}>
          {addresses.map(addr => (
            <div
              key={addr.id}
              style={{
                border: `1px solid ${addr.isDefault ? 'rgba(201,168,76,0.5)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1rem',
                background: addr.isDefault ? 'rgba(201,168,76,0.06)' : 'var(--surface)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                boxShadow: addr.isDefault ? '0 0 14px rgba(201,168,76,0.10)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <MapPin size={16} style={{ marginTop: 2, color: addr.isDefault ? 'var(--clay-mid)' : 'var(--text-2)', flexShrink: 0 }} />

              <div style={{ flex: 1, fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <strong style={{ color: addr.isDefault ? 'var(--clay-mid)' : 'var(--text)' }}>
                    {addr.label || 'Endereço'}
                  </strong>
                  {addr.isDefault && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '1px',
                      background: 'rgba(201,168,76,0.15)',
                      color: 'var(--clay-mid)',
                      border: '1px solid rgba(201,168,76,0.35)',
                      padding: '1px 7px',
                      borderRadius: 4,
                    }}>
                      Padrão
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
                  {addr.street}, {addr.number}
                  {addr.complement ? `, ${addr.complement}` : ''} — {addr.neighborhood}<br />
                  {addr.city}/{addr.state} — CEP {addr.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 }}>
                {!addr.isDefault && (
                  <button
                    className="btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--clay)' }}
                    onClick={() => handleSetDefault(addr.id)}
                    title="Definir como padrão"
                  >
                    <Star size={11} /> Padrão
                  </button>
                )}
                {(!addr.isDefault || addresses.length === 1) && (
                  <button
                    className="btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#F87171' }}
                    onClick={() => handleDelete(addr.id)}
                    title="Excluir endereço"
                  >
                    <Trash2 size={11} /> Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Formulário de novo endereço */}
        {showAddrForm && (
          <form onSubmit={handleSaveAddress} style={{ borderTop: addresses.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: addresses.length > 0 ? '1.5rem' : 0 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '1.25rem' }}>
              Novo Endereço
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div style={{ gridColumn: 'span 2' }} className="form-group">
                <label className="field-label">Rótulo (opcional)</label>
                <input
                  value={addrForm.label}
                  onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}
                  placeholder='Ex: "Casa", "Trabalho"'
                  className="field-input"
                />
              </div>

              <div className="form-group">
                <label className="field-label">CEP *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={addrForm.zipCode}
                    onChange={e => setAddrForm(f => ({ ...f, zipCode: e.target.value }))}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    required
                    className="field-input"
                    style={{ paddingRight: cepLoading ? '5.5rem' : undefined }}
                  />
                  {cepLoading && (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--clay)', fontFamily: 'var(--font-fell)', fontStyle: 'italic' }}>
                      buscando...
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">Número *</label>
                <input
                  value={addrForm.number}
                  onChange={e => setAddrForm(f => ({ ...f, number: e.target.value }))}
                  placeholder="123"
                  required
                  className="field-input"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }} className="form-group">
                <label className="field-label">Rua / Logradouro *</label>
                <input
                  value={addrForm.street}
                  onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))}
                  placeholder="Preenchido automaticamente pelo CEP"
                  required
                  className="field-input"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }} className="form-group">
                <label className="field-label">Complemento</label>
                <input
                  value={addrForm.complement}
                  onChange={e => setAddrForm(f => ({ ...f, complement: e.target.value }))}
                  placeholder="Apto, bloco, casa..."
                  className="field-input"
                />
              </div>

              <div className="form-group">
                <label className="field-label">Bairro *</label>
                <input
                  value={addrForm.neighborhood}
                  onChange={e => setAddrForm(f => ({ ...f, neighborhood: e.target.value }))}
                  required
                  className="field-input"
                />
              </div>

              <div className="form-group">
                <label className="field-label">Cidade *</label>
                <input
                  value={addrForm.city}
                  onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))}
                  required
                  className="field-input"
                />
              </div>

              <div className="form-group">
                <label className="field-label">Estado *</label>
                <input
                  value={addrForm.state}
                  onChange={e => setAddrForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
                  maxLength={2}
                  placeholder="SP"
                  required
                  className="field-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addrForm.isDefault}
                  onChange={e => setAddrForm(f => ({ ...f, isDefault: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--clay)', cursor: 'pointer' }}
                />
                <label htmlFor="isDefault" className="field-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Definir como padrão
                </label>
              </div>
            </div>

            {addrError && <div className="feedback-error" style={{ marginTop: '0.75rem' }}>{addrError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => { setShowAddrForm(false); setAddrForm(EMPTY_ADDR); }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={savingAddr} style={{ minWidth: 160 }}>
                {savingAddr ? 'Salvando...' : 'Salvar Endereço'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Pedidos recentes ───────────────────────────── */}
      <RecentOrders token={getToken()} />
    </div>
  );
}

// ── Pedidos recentes ──────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  PENDING:   'Pendente',
  CONFIRMED: 'Confirmado',
  PRINTING:  'Imprimindo',
  READY:     'Pronto',
  SHIPPED:   'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'rgba(180,83,9,0.18)',
  CONFIRMED: 'rgba(30,58,95,0.18)',
  PRINTING:  'rgba(107,33,168,0.18)',
  READY:     'rgba(6,182,212,0.18)',
  SHIPPED:   'rgba(16,185,129,0.18)',
  DELIVERED: 'rgba(5,150,105,0.18)',
  CANCELLED: 'rgba(155,28,28,0.18)',
};

const STATUS_TEXT: Record<string, string> = {
  PENDING:   '#FBB347',
  CONFIRMED: '#93C5FD',
  PRINTING:  '#C4B5FD',
  READY:     '#67E8F9',
  SHIPPED:   '#6BCF8A',
  DELIVERED: '#34D399',
  CANCELLED: '#F87171',
};

function RecentOrders({ token }: { token: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/customers/me/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading || orders.length === 0) return null;

  return (
    <section style={{
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.75rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <span style={{ position: 'absolute', top: 8, left: 8, width: 14, height: 14, borderTop: '1px solid rgba(201,168,76,0.25)', borderLeft: '1px solid rgba(201,168,76,0.25)', borderRadius: '1px', pointerEvents: 'none' }} />
      <span style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderBottom: '1px solid rgba(201,168,76,0.25)', borderRight: '1px solid rgba(201,168,76,0.25)', borderRadius: '1px', pointerEvents: 'none' }} />

      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        color: 'var(--clay-mid)',
        textShadow: '0 0 12px rgba(201,168,76,0.35)',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
      }}>
        <span style={{ opacity: 0.6 }}>✦</span> Pedidos Recentes
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {orders.map((o, i) => (
          <div key={o.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 0',
            borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div>
              <strong style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.5px', fontSize: '0.8rem' }}>
                {o.orderNumber}
              </strong>
              <span style={{ color: 'var(--text-2)', fontSize: '0.82rem', marginLeft: '0.65rem', fontFamily: 'var(--font-fell)', fontStyle: 'italic' }}>
                {new Date(o.orderedAt ?? o.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--clay-mid)' }}>
                R$ {Number(o.total).toFixed(2).replace('.', ',')}
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.5px',
                padding: '2px 8px',
                borderRadius: 4,
                background: STATUS_COLORS[o.status] ?? 'rgba(107,33,168,0.18)',
                color: STATUS_TEXT[o.status]   ?? '#C4B5FD',
                border: `1px solid ${STATUS_TEXT[o.status] ?? '#C4B5FD'}22`,
              }}>
                {STATUS_LABELS[o.status] ?? o.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
