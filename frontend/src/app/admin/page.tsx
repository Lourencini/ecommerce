'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { useAdminToken } from '@/hooks/useAdminToken';

interface SummaryMetrics {
  totalOrders: number;
  pendingOrders: number;
  monthlyRevenue: number;
  lowStockProducts: number;
  cycleTimeAvgHours: number;
}

function KpiCard({
  title,
  value,
  sub,
  color = 'var(--primary-color)',
  loading,
}: {
  title: string;
  value: string | number;
  sub: string;
  color?: string;
  loading: boolean;
}) {
  return (
    <div className="specs" style={{ textAlign: 'center' }}>
      <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{title}</h3>
      {loading ? (
        <div className="skeleton-price" style={{ margin: '0.5rem auto', width: '80px' }} />
      ) : (
        <p className="price-huge" style={{ color, fontSize: '2rem' }}>{value}</p>
      )}
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { status, authFetch } = useAdminToken();
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;

    authFetch(`${API_URL}/orders/metrics/summary`)
      .then((r) => r.json())
      .then((data: SummaryMetrics) => setMetrics(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>
        Dashboard
      </h2>

      <div
        className="product-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginBottom: '2rem' }}
      >
        <KpiCard
          title="Pedidos Pendentes"
          value={metrics?.pendingOrders ?? 0}
          sub="Aguardando confirmação"
          color="var(--warning-color)"
          loading={loading}
        />
        <KpiCard
          title="Receita do Mês"
          value={metrics ? `R$ ${Number(metrics.monthlyRevenue ?? 0).toFixed(0)}` : '—'}
          sub="Pagamentos aprovados"
          color="var(--success-color)"
          loading={loading}
        />
        <KpiCard
          title="Total de Pedidos"
          value={metrics?.totalOrders ?? 0}
          sub="Todos os tempos"
          loading={loading}
        />
        <KpiCard
          title="Cycle Time Médio"
          value={metrics ? `${Number(metrics.cycleTimeAvgHours ?? 0).toFixed(1)}h` : '—'}
          sub="Pedido → Envio"
          color="var(--info-color)"
          loading={loading}
        />
        <KpiCard
          title="Estoque Crítico"
          value={metrics?.lowStockProducts ?? 0}
          sub="Produtos com ≤5 unidades"
          color={metrics?.lowStockProducts ? 'var(--danger-color)' : 'var(--success-color)'}
          loading={loading}
        />
      </div>

      <div
        style={{
          padding: '1.5rem',
          background: 'var(--surface-color)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 style={{ marginBottom: '0.5rem' }}>📌 Ações Rápidas</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <a href="/admin/orders" className="btn-secondary">
            Ver Pedidos Pendentes
          </a>
          <a href="/admin/products/new" className="btn-primary">
            + Novo Produto
          </a>
          <a href="/admin/products" className="btn-secondary">
            Gerenciar Estoque
          </a>
        </div>
      </div>
    </div>
  );
}
