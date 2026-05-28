"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import { useAdminToken } from '@/hooks/useAdminToken';

const fmt = (v: unknown) => Number(v ?? 0).toFixed(2).replace('.', ',');

export default function AdminProductsPage() {
    const { status, authFetch } = useAdminToken();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchProductsList = async () => {
        try {
            const res = await authFetch(`${API_URL}/products?limit=100`);
            const data = await res.json();
            setProducts(data?.items ?? data?.data ?? (Array.isArray(data) ? data : []));
        } catch (e: any) {
            if (!e.message.includes('Sessão expirada')) console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetchProductsList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const handleToggleStatus = async () => {
        if (!deleteId) return;
        const product = products.find(p => p.id === deleteId);
        if (!product) return;
        try {
            await authFetch(`${API_URL}/products/${deleteId}`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: !product.isActive }),
            });
            fetchProductsList();
            setDeleteId(null);
        } catch (e: any) {
            if (!e.message.includes('Sessão expirada')) console.error(e);
        }
    };

    if (loading) return <div className="skeleton-title" style={{ width: '200px' }}></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Gerenciar Produtos</h2>
                <Link href="/admin/products/new" className="btn-primary" style={{ textDecoration: 'none' }}>+ Novo Produto</Link>
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
                                <td className="align-right">R$ {fmt(p.price)}</td>
                                <td className="align-right">{p.stockQuantity}</td>
                                <td>
                                    <span className="badge" style={{ background: p.isActive ? 'var(--primary-color)' : 'var(--border-color)' }}>
                                        {p.isActive ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="align-right">
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <Link 
                                            href={`/admin/products/${p.id}/edit`}
                                            className="btn-secondary"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', textDecoration: 'none' }}
                                        >
                                            Editar
                                        </Link>
                                        <button
                                            className={p.isActive ? "btn-remove" : "btn-secondary"}
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', minWidth: '85px', color: p.isActive ? '#ef4444' : 'var(--primary-color)', border: `1px solid ${p.isActive ? '#ef4444' : 'var(--primary-color)'}` }}
                                            onClick={() => setDeleteId(p.id)}
                                        >
                                            {p.isActive ? 'Desativar' : 'Ativar'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {deleteId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--bg-color)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>
                            {products.find(p => p.id === deleteId)?.isActive ? 'Desativar Produto?' : 'Ativar Produto?'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            {products.find(p => p.id === deleteId)?.isActive 
                                ? 'Tem certeza que deseja desativar este produto? Ele sairá da vitrine imediatamente.' 
                                : 'Deseja reativar este produto? Ele voltará a aparecer na vitrine para os clientes.'}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
                            <button 
                                className="btn-primary" 
                                onClick={handleToggleStatus} 
                                style={{ background: products.find(p => p.id === deleteId)?.isActive ? '#ef4444' : 'var(--primary-color)', color: 'white' }}
                            >
                                {products.find(p => p.id === deleteId)?.isActive ? 'Confirmar Desativação' : 'Confirmar Ativação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
