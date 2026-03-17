"use client";

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${API_URL}/orders`);
            const data = await res.json();
            setOrders(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        setUpdating(orderId);
        try {
            const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, note: 'Atualizado pelo Painel Admin' })
            });

            if (!res.ok) {
                const errorData = await res.json();
                alert(`Erro: ${errorData.detail || 'Falha ao atualizar status'}`);
            } else {
                fetchOrders();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="skeleton-title" style={{ width: '200px' }}></div>;

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem' }}>Esteira de Produção (Logística)</h2>

            <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nº Pedido</th>
                            <th>Data</th>
                            <th>Status Atual</th>
                            <th className="align-right">Qtd Produtos</th>
                            <th className="align-right">Custo de Frete</th>
                            <th className="align-right">Total Transação</th>
                            <th className="align-right">Mover Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(o => (
                            <tr key={o.id}>
                                <td><strong>{o.orderNumber}</strong></td>
                                <td>{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td>
                                    <span className="badge" style={{
                                        background: o.status === 'SHIPPED' || o.status === 'DELIVERED' ? '#10b981' :
                                            o.status === 'PRINTING' ? '#3b82f6' : 'var(--primary-color)'
                                    }}>
                                        {o.status}
                                    </span>
                                </td>
                                <td className="align-right">R$ {Number(o.totalProducts).toFixed(2).replace('.', ',')}</td>
                                <td className="align-right" style={{ color: 'var(--text-muted)' }}>R$ {Number(o.totalShipping).toFixed(2).replace('.', ',')}</td>
                                <td className="align-right" style={{ fontWeight: 800 }}>R$ {Number(o.total).toFixed(2).replace('.', ',')}</td>
                                <td className="align-right">
                                    <select
                                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none' }}
                                        value={o.status}
                                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                                        disabled={updating === o.id}
                                    >
                                        <option value="PENDING">PENDING</option>
                                        <option value="CONFIRMED">CONFIRMED</option>
                                        <option value="PRINTING">PRINTING</option>
                                        <option value="READY">READY</option>
                                        <option value="SHIPPED">SHIPPED</option>
                                        <option value="DELIVERED">DELIVERED</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
