"use client";

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<{ averageHours: number }>({ averageHours: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/orders/metrics/cycle-time`)
            .then(res => res.json())
            .then(data => setMetrics(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Dashboard Administrativo</h2>
            <div className="product-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="specs" style={{ textAlign: 'center' }}>
                    <h3>KPI: Cycle Time Médio</h3>
                    {loading ? (
                        <div className="skeleton" style={{ height: '40px', width: '100px', margin: '1rem auto' }}></div>
                    ) : (
                        <p className="price-huge" style={{ color: 'var(--text-main)' }}>
                            {metrics.averageHours}h
                        </p>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pedido → Envio</p>
                </div>
                <div className="specs" style={{ textAlign: 'center' }}>
                    <h3>Status: Produção</h3>
                    <p className="price-huge" style={{ color: '#3b82f6' }}>8</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Peças em impressão</p>
                </div>
                <div className="specs" style={{ textAlign: 'center' }}>
                    <h3>Status: Logística</h3>
                    <p className="price-huge" style={{ color: '#10b981' }}>14</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pronto para envio / Enviados</p>
                </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <h3>Métricas de Eficiência</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    O Cycle Time médio reflete a eficiência da nossa esteira de impressão 3D, 
                    considerando desde a confirmação do pedido até a entrega ao transportador.
                </p>
            </div>
        </div>
    );
}
