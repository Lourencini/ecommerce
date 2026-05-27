'use client';

import { useState } from 'react';
import { API_URL } from '@/lib/api';
import type { Order, OrderStatus } from '@/types';
import { OrderStatusBadge } from '@/components/ui/Badge';

const STATUS_STEPS: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PRINTING', 'READY', 'SHIPPED', 'DELIVERED',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pedido Recebido',
  CONFIRMED: 'Confirmado',
  PRINTING: 'Em Impressão',
  READY: 'Pronto para Envio',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

const STATUS_ICONS: Record<OrderStatus, string> = {
  PENDING: '📋',
  CONFIRMED: '✅',
  PRINTING: '🖨️',
  READY: '📦',
  SHIPPED: '🚚',
  DELIVERED: '🎉',
  CANCELLED: '❌',
  REFUNDED: '↩️',
};

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setOrder(null);

    try {
      const res = await fetch(
        `${API_URL}/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Pedido não encontrado.');
      setOrder(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Pedido não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = order
    ? STATUS_STEPS.indexOf(order.status as OrderStatus)
    : -1;

  const isCancelled = order?.status === 'CANCELLED' || order?.status === 'REFUNDED';

  return (
    <div className="page-container" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <header className="page-header">
        <h2>Rastrear Pedido</h2>
        <p>Acompanhe o status da sua impressão 3D</p>
      </header>

      <div className="card" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Número do Pedido</label>
              <input
                type="text"
                className="form-input"
                placeholder="#2026-00001"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail utilizado na compra</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Buscando...' : 'Rastrear Pedido'}
            </button>
          </div>
        </form>
      </div>

      {order && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{order.orderNumber}</h3>
              <p className="text-muted text-sm">
                Realizado em {new Date(order.orderedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <OrderStatusBadge status={order.status as OrderStatus} />
          </div>

          {/* Timeline de status */}
          {!isCancelled && (
            <div className="timeline" style={{ marginBottom: '1.5rem' }}>
              {STATUS_STEPS.map((status, index) => {
                const isDone = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={status} className={`timeline-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="timeline-connector">
                      <div className="timeline-dot" />
                      {index < STATUS_STEPS.length - 1 && <div className="timeline-line" />}
                    </div>
                    <div className="timeline-content">
                      <p style={{ fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--primary-color)' : isDone ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {STATUS_ICONS[status]} {STATUS_LABELS[status]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Código de rastreio */}
          {order.trackingCode && (
            <div className="alert alert-success">
              <div>
                <p style={{ fontWeight: 600 }}>Código de Rastreio</p>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '2px' }}>
                  {order.trackingCode}
                </p>
                <a
                  href={`https://www.linketrack.com/track/${order.trackingCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="auth-link"
                  style={{ fontSize: '0.85rem' }}
                >
                  Rastrear nos Correios →
                </a>
              </div>
            </div>
          )}

          {/* Itens */}
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Itens</h4>
            {order.items?.map((item) => (
              <div key={item.id} className="summary-row" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span>{item.productName} ×{item.quantity}</span>
                <span>R$ {Number(item.totalPrice).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
            <div className="summary-total" style={{ marginTop: '0.75rem', fontSize: '1.1rem' }}>
              <span>Total</span>
              <span>R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
