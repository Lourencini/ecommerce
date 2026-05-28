"use client";

import { useState, useEffect, Fragment } from 'react';
import { API_URL } from '@/lib/api';
import { useAdminToken } from '@/hooks/useAdminToken';

const fmt = (v: unknown) => Number(v ?? 0).toFixed(2).replace('.', ',');

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
  PENDING:   '#f59e0b',
  CONFIRMED: '#3b82f6',
  PRINTING:  '#8b5cf6',
  READY:     '#06b6d4',
  SHIPPED:   '#10b981',
  DELIVERED: '#059669',
  CANCELLED: '#ef4444',
};

interface TrackingModal {
  orderId: string;
  orderNumber: string;
  currentTracking?: string;
}

export default function AdminOrdersPage() {
  const { status, authFetch } = useAdminToken();
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [trackingModal, setTrackingModal] = useState<TrackingModal | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setError('');
    try {
      const res = await authFetch(`${API_URL}/orders?limit=100`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
      setOrders(list);
    } catch (e: any) {
      if (!e.message.includes('Sessão expirada')) setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleStatusChange = async (orderId: string, newStatus: string, order: any) => {
    if (newStatus === 'SHIPPED') {
      setTrackingModal({
        orderId,
        orderNumber: order.orderNumber,
        currentTracking: order.trackingCode || '',
      });
      setTrackingCode(order.trackingCode || '');
      return;
    }
    await applyStatusChange(orderId, newStatus, undefined);
  };

  const applyStatusChange = async (orderId: string, newStatus: string, tracking?: string) => {
    setUpdating(orderId);
    try {
      const statusRes = await authFetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, note: 'Atualizado pelo Painel Admin' }),
      });
      if (!statusRes.ok) {
        const err = await statusRes.json();
        alert(`Erro: ${err.message || 'Falha ao atualizar status'}`);
        return;
      }
      if (tracking) {
        await authFetch(`${API_URL}/orders/${orderId}/tracking`, {
          method: 'PATCH',
          body: JSON.stringify({ trackingCode: tracking }),
        });
      }
      await fetchOrders();
    } catch (e: any) {
      if (!e.message.includes('Sessão expirada')) console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const confirmShipping = async () => {
    if (!trackingModal) return;
    await applyStatusChange(trackingModal.orderId, 'SHIPPED', trackingCode.trim() || undefined);
    setTrackingModal(null);
    setTrackingCode('');
  };

  const handleUpdateTracking = async (orderId: string, tracking: string) => {
    setUpdating(orderId);
    try {
      const res = await authFetch(`${API_URL}/orders/${orderId}/tracking`, {
        method: 'PATCH',
        body: JSON.stringify({ trackingCode: tracking }),
      });
      if (res.ok) await fetchOrders();
    } catch (e: any) {
      if (!e.message.includes('Sessão expirada')) console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  if (status === 'loading' || loading) return (
    <div>
      <div className="skeleton-title" style={{ width: 300, marginBottom: '1.5rem' }} />
      <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );

  if (error) return (
    <div style={{ color: 'var(--danger)', padding: '2rem' }}>
      Erro ao carregar pedidos: {error}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2>Esteira de Produção</h2>
        <button className="btn-secondary" onClick={fetchOrders} style={{ fontSize: '0.85rem' }}>
          ↻ Atualizar
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">Nenhum pedido encontrado.</div>
      ) : (
        <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <th>N. Pedido</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Rastreio</th>
                <th className="align-right">Total</th>
                <th className="align-right">Mover Para</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <Fragment key={o.id}>
                  <tr>
                    <td>
                      <button
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 4px' }}
                        title="Ver itens"
                      >
                        {expandedId === o.id ? '▾' : '▸'}
                      </button>
                    </td>
                    <td><strong>{o.orderNumber}</strong></td>
                    <td>{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {o.customer?.name ?? '—'}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{ background: STATUS_COLORS[o.status] ?? 'var(--primary-color)', color: '#fff' }}
                      >
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td>
                      {o.status === 'SHIPPED' || o.status === 'DELIVERED' ? (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          {o.trackingCode ? (
                            <a
                              href={`https://linketrack.com/track/tracking?token=1&name=${encodeURIComponent(o.customer?.name || '')}&codigo=${o.trackingCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontFamily: 'monospace' }}
                            >
                              {o.trackingCode}
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Sem código</span>
                          )}
                          <button
                            onClick={() => {
                              setTrackingModal({ orderId: o.id, orderNumber: o.orderNumber, currentTracking: o.trackingCode });
                              setTrackingCode(o.trackingCode || '');
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0 2px' }}
                            title="Editar rastreio"
                          >
                            ✏️
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td className="align-right" style={{ fontWeight: 800 }}>
                      R$ {fmt(o.total)}
                    </td>
                    <td className="align-right">
                      <select
                        style={{
                          padding: '0.35rem 0.5rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-color)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value, o)}
                        disabled={updating === o.id || o.status === 'CANCELLED' || o.status === 'DELIVERED'}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>

                  {expandedId === o.id && (
                    <tr style={{ background: 'var(--surface-2, #EBE8E0)' }}>
                      <td colSpan={8} style={{ padding: '0.75rem 1.5rem' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                            Itens do Pedido
                          </strong>
                          {(o.items ?? []).length === 0 ? (
                            <span style={{ color: 'var(--text-3)' }}>Sem itens</span>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  {['Produto','SKU','Qtd','Subtotal'].map(h => (
                                    <th key={h} style={{ textAlign: h === 'Qtd' || h === 'Subtotal' ? 'right' : 'left', paddingRight: '2rem', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: '0.25rem' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(o.items ?? []).map((item: any) => (
                                  <tr key={item.id}>
                                    <td style={{ paddingRight: '2rem', paddingBottom: '0.2rem' }}>{item.productName}</td>
                                    <td style={{ paddingRight: '2rem', fontFamily: 'monospace', color: 'var(--text-muted)', paddingBottom: '0.2rem' }}>{item.productSku}</td>
                                    <td style={{ textAlign: 'right', paddingRight: '2rem', paddingBottom: '0.2rem' }}>×{item.quantity}</td>
                                    <td style={{ textAlign: 'right', paddingBottom: '0.2rem' }}>R$ {fmt(item.totalPrice)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                            <span>Frete: <strong>R$ {fmt(o.totalShipping)}</strong></span>
                            {o.shippingService && <span>Serviço: <strong>{o.shippingService}</strong></span>}
                            {o.paymentMethod && <span>Pagamento: <strong>{o.paymentMethod}</strong></span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {trackingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>
              {orders.find(o => o.id === trackingModal.orderId)?.status === 'SHIPPED'
                ? 'Atualizar Código de Rastreio'
                : 'Confirmar Envio'}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Pedido <strong>{trackingModal.orderNumber}</strong>
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Código de Rastreio (Correios)
              </label>
              <input
                type="text"
                value={trackingCode}
                onChange={e => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="Ex: BR123456789BR"
                style={{
                  width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', padding: '0.75rem', color: 'var(--text-main)',
                  fontFamily: 'monospace', fontSize: '1rem', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => { setTrackingModal(null); setTrackingCode(''); }}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={
                  orders.find(o => o.id === trackingModal.orderId)?.status === 'SHIPPED'
                    ? () => { handleUpdateTracking(trackingModal.orderId, trackingCode); setTrackingModal(null); }
                    : confirmShipping
                }
              >
                {orders.find(o => o.id === trackingModal.orderId)?.status === 'SHIPPED'
                  ? 'Salvar Código'
                  : 'Confirmar Envio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
