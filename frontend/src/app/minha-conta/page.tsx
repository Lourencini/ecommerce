"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { MapPin, Plus, Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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

// ── Endereço em branco ────────────────────────────────────────
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

// ── Componente principal ──────────────────────────────────────
export default function MinhaContaPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  const [customer, setCustomer]     = useState<CustomerData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');

  // Perfil
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');

  // Endereços
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

  // ── Definir padrão ────────────────────────────────────────
  const handleSetDefault = async (id: number) => {
    await fetch(`${API_URL}/customers/me/addresses/${id}/default`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    await loadCustomer();
  };

  // ── Excluir ───────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este endereço?')) return;
    await fetch(`${API_URL}/customers/me/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    await loadCustomer();
  };

  // ── Loading ───────────────────────────────────────────────
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
    <div className="page-container" style={{ maxWidth: 640 }}>
      <header className="page-header" style={{ textAlign: 'left' }}>
        <h2>Minha Conta</h2>
        <p>Dados pessoais, endereços e pedidos</p>
      </header>

      {/* ── Dados Pessoais ─────────────────────────────── */}
      <section className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Dados Pessoais</h3>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="field-label">E-mail</label>
            <input
              value={customer?.email ?? session?.user?.email ?? ''}
              disabled
              className="field-input field-disabled"
            />
            <p className="field-hint">O e-mail não pode ser alterado.</p>
          </div>

          <div>
            <label className="field-label">Nome completo</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required minLength={2} maxLength={100}
              placeholder="Seu nome completo"
              className="field-input"
            />
          </div>

          <div>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 140 }}>
              {saving ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Endereços ──────────────────────────────────── */}
      <section className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Endereços</h3>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setShowAddrForm(v => !v)}
          >
            {showAddrForm ? <ChevronUp size={14} /> : <Plus size={14} />}
            {showAddrForm ? 'Cancelar' : 'Novo Endereço'}
          </button>
        </div>

        {/* Lista de endereços */}
        {addresses.length === 0 && !showAddrForm && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Nenhum endereço cadastrado. Adicione um para agilizar o checkout.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: showAddrForm ? '1.5rem' : 0 }}>
          {addresses.map(addr => (
            <div
              key={addr.id}
              style={{
                border: `1px solid ${addr.isDefault ? 'var(--primary-color)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1rem',
                background: addr.isDefault ? 'color-mix(in srgb, var(--primary-color) 5%, transparent)' : 'transparent',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <MapPin size={16} style={{ marginTop: 2, color: addr.isDefault ? 'var(--primary-color)' : 'var(--text-muted)', flexShrink: 0 }} />

              <div style={{ flex: 1, fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <strong>{addr.label || 'Endereço'}</strong>
                  {addr.isDefault && (
                    <span style={{ fontSize: '0.7rem', background: 'var(--primary-color)', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>
                      Padrão
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--text-muted)' }}>
                  {addr.street}, {addr.number}
                  {addr.complement ? `, ${addr.complement}` : ''} — {addr.neighborhood}<br />
                  {addr.city}/{addr.state} — CEP {addr.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                {!addr.isDefault && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => handleSetDefault(addr.id)}
                    title="Definir como padrão"
                  >
                    <Star size={12} /> Padrão
                  </button>
                )}
                {(!addr.isDefault || addresses.length === 1) && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => handleDelete(addr.id)}
                    title="Excluir endereço"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Formulário de novo endereço */}
        {showAddrForm && (
          <form onSubmit={handleSaveAddress} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Novo Endereço</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Rótulo */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="field-label">Rótulo (opcional)</label>
                <input
                  value={addrForm.label}
                  onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}
                  placeholder='Ex: "Casa", "Trabalho"'
                  className="field-input"
                />
              </div>

              {/* CEP */}
              <div>
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
                    style={{ paddingRight: cepLoading ? '2.5rem' : undefined }}
                  />
                  {cepLoading && (
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      buscando...
                    </span>
                  )}
                </div>
              </div>

              {/* Número */}
              <div>
                <label className="field-label">Número *</label>
                <input
                  value={addrForm.number}
                  onChange={e => setAddrForm(f => ({ ...f, number: e.target.value }))}
                  placeholder="123"
                  required
                  className="field-input"
                />
              </div>

              {/* Rua */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="field-label">Rua / Logradouro *</label>
                <input
                  value={addrForm.street}
                  onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))}
                  placeholder="Preenchido automaticamente pelo CEP"
                  required
                  className="field-input"
                />
              </div>

              {/* Complemento */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="field-label">Complemento</label>
                <input
                  value={addrForm.complement}
                  onChange={e => setAddrForm(f => ({ ...f, complement: e.target.value }))}
                  placeholder="Apto, bloco, casa..."
                  className="field-input"
                />
              </div>

              {/* Bairro */}
              <div>
                <label className="field-label">Bairro *</label>
                <input
                  value={addrForm.neighborhood}
                  onChange={e => setAddrForm(f => ({ ...f, neighborhood: e.target.value }))}
                  required
                  className="field-input"
                />
              </div>

              {/* Cidade */}
              <div>
                <label className="field-label">Cidade *</label>
                <input
                  value={addrForm.city}
                  onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))}
                  required
                  className="field-input"
                />
              </div>

              {/* Estado */}
              <div>
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

              {/* Padrão */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addrForm.isDefault}
                  onChange={e => setAddrForm(f => ({ ...f, isDefault: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary-color)' }}
                />
                <label htmlFor="isDefault" className="field-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Definir como padrão
                </label>
              </div>
            </div>

            {addrError && <div className="feedback-error" style={{ marginTop: '0.75rem' }}>{addrError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowAddrForm(false); setAddrForm(EMPTY_ADDR); }}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingAddr} style={{ minWidth: 140 }}>
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
    <section className="card" style={{ padding: '1.75rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Pedidos Recentes</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {orders.map(o => (
          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <strong style={{ fontSize: '0.9rem' }}>{o.orderNumber}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginLeft: '0.6rem' }}>
                {new Date(o.orderedAt ?? o.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>R$ {Number(o.total).toFixed(2).replace('.', ',')}</span>
              <span className="badge" style={{ background: 'var(--primary-color)', color: '#fff', fontSize: '0.72rem' }}>{o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
