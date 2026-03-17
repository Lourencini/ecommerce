"use client";

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';

export default function AdminProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchProductsList = async () => {
        try {
            const res = await fetch(`${API_URL}/products?limit=50`);
            const { data } = await res.json();
            setProducts(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductsList();
    }, []);

    const handleSoftDelete = async () => {
        if (!deleteId) return;
        try {
            await fetch(`${API_URL}/products/${deleteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: false })
            });
            fetchProductsList();
            setDeleteId(null);
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="skeleton-title" style={{ width: '200px' }}></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Gerenciar Produtos</h2>
                <button className="btn-primary" onClick={() => alert('Criar produto não implementado no mock.')}>+ Novo Produto</button>
            </div>

            <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Produto</th>
                            <th className="align-right">Preço</th>
                            <th className="align-right">Estoque</th>
                            <th>Status</th>
                            <th className="align-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td><span className="badge badge-stock">{p.sku}</span></td>
                                <td>{p.name}</td>
                                <td className="align-right">R$ {Number(p.price).toFixed(2).replace('.', ',')}</td>
                                <td className="align-right">{p.stockQuantity}</td>
                                <td>
                                    <span className="badge" style={{ background: p.isActive ? 'var(--primary-color)' : 'var(--border-color)' }}>
                                        {p.isActive ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="align-right">
                                    <button
                                        className="btn-remove"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                        onClick={() => setDeleteId(p.id)}
                                        disabled={!p.isActive}
                                    >
                                        Desativar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {deleteId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--bg-color)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Desativar Produto?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Tem certeza que deseja desativar este produto? Ele continuará no banco para histórico de pedidos, mas sairá da vitrine.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
                            <button className="btn-remove" onClick={handleSoftDelete} style={{ background: '#ef4444', color: 'white' }}>Desativar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
