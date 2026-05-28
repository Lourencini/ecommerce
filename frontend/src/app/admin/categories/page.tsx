"use client";

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { useAdminToken } from '@/hooks/useAdminToken';

interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    isActive: boolean;
    _count?: { products: number };
}

export default function AdminCategoriesPage() {
    const { status, authFetch } = useAdminToken();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formIcon, setFormIcon] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const fetchCategories = async () => {
        setError('');
        try {
            const res = await authFetch(`${API_URL}/categories/admin`);
            if (!res.ok) throw new Error(`Erro ${res.status}`);
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch (e: any) {
            if (!e.message.includes('Sessão expirada')) setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetchCategories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const openCreate = () => { setFormName(''); setFormDesc(''); setFormIcon(''); setEditingId(null); setModal('create'); };
    const openEdit = (cat: Category) => { setFormName(cat.name); setFormDesc(cat.description || ''); setFormIcon(cat.icon || ''); setEditingId(cat.id); setModal('edit'); };
    const closeModal = () => { setModal(null); setEditingId(null); setFormName(''); setFormDesc(''); setFormIcon(''); };

    const handleSave = async () => {
        if (!formName.trim()) return;
        setSaving(true);
        try {
            const url = modal === 'edit' && editingId
                ? `${API_URL}/categories/${editingId}`
                : `${API_URL}/categories`;
            const res = await authFetch(url, {
                method: modal === 'edit' ? 'PATCH' : 'POST',
                body: JSON.stringify({
                    name: formName.trim(),
                    description: formDesc.trim() || undefined,
                    icon: formIcon.trim() || undefined
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Erro ao salvar');
            }
            await fetchCategories();
            closeModal();
        } catch (e: any) {
            if (!e.message.includes('Sessão expirada')) alert(`Erro: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (cat: Category) => {
        try {
            await authFetch(`${API_URL}/categories/${cat.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: !cat.isActive }),
            });
            await fetchCategories();
        } catch (e: any) {
            if (!e.message.includes('Sessão expirada')) console.error(e);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await authFetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
            await fetchCategories();
            setDeleteConfirm(null);
        } catch (e: any) {
            if (!e.message.includes('Sessão expirada')) console.error(e);
        }
    };

    if (status === 'loading' || loading) return (
        <div>
            <div className="skeleton-title" style={{ width: 200, marginBottom: '1.5rem' }} />
            <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
        </div>
    );

    if (error) return (
        <div style={{ padding: '2rem' }}>
            <p style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>Erro: {error}</p>
            <button className="btn-secondary" onClick={fetchCategories}>Tentar novamente</button>
        </div>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Gerenciar Categorias</h2>
                <button className="btn-primary" onClick={openCreate}>+ Nova Categoria</button>
            </div>

            {categories.length === 0 ? (
                <div className="empty-state">
                    <p>Nenhuma categoria encontrada.</p>
                    <button className="btn-primary" onClick={openCreate} style={{ marginTop: '1rem' }}>
                        Criar primeira categoria
                    </button>
                </div>
            ) : (
                <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px', textAlign: 'center' }}>Ícone</th>
                                <th>Nome</th>
                                <th>Slug</th>
                                <th>Descrição</th>
                                <th className="align-right">Produtos</th>
                                <th>Status</th>
                                <th className="align-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id}>
                                    <td style={{ fontSize: '1.5rem', textAlign: 'center' }}>{cat.icon || '📦'}</td>
                                    <td><strong>{cat.name}</strong></td>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{cat.slug}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 220 }}>
                                        {cat.description || <span style={{ opacity: 0.4 }}>—</span>}
                                    </td>
                                    <td className="align-right">
                                        <span className="badge badge-neutral">{cat._count?.products ?? 0}</span>
                                    </td>
                                    <td>
                                        <span className="badge" style={{
                                            background: cat.isActive ? 'var(--primary-color)' : 'var(--border-color)',
                                            color: cat.isActive ? '#fff' : 'var(--text-muted)',
                                        }}>
                                            {cat.isActive ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </td>
                                    <td className="align-right">
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => openEdit(cat)}>
                                                Editar
                                            </button>
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: cat.isActive ? '#ef4444' : 'var(--primary-color)', border: `1px solid ${cat.isActive ? '#ef4444' : 'var(--primary-color)'}` }}
                                                onClick={() => handleToggleActive(cat)}
                                            >
                                                {cat.isActive ? 'Desativar' : 'Ativar'}
                                            </button>
                                            {(cat._count?.products ?? 0) === 0 && (
                                                <button
                                                    className="btn-secondary"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#ef4444', border: '1px solid #ef4444' }}
                                                    onClick={() => setDeleteConfirm(cat.id)}
                                                >
                                                    Excluir
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create / Edit Modal */}
            {modal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ background: 'var(--bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>
                            {modal === 'edit' ? 'Editar Categoria' : 'Nova Categoria'}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Nome *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="Ex: Miniaturas, Decoração…"
                                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Ícone (Emoji - opcional)</label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                                    <input
                                        type="text"
                                        value={formIcon}
                                        onChange={e => setFormIcon(e.target.value)}
                                        placeholder="📦"
                                        style={{ width: '60px', textAlign: 'center', fontSize: '1.4rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.4rem', color: 'var(--text-main)', outline: 'none' }}
                                        maxLength={4}
                                    />
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Escolha abaixo ou insira o seu próprio emoji.</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', padding: '0.5rem', background: 'var(--surface-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    {['🏠', '🎮', '⚙️', '💎', '🌱', '✏️', '📦', '🛠️', '🎨', '🧩', '🚀', '🔮', '🧸', '🕶️', '💡', '🎒', '🏆', '👟'].map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setFormIcon(emoji)}
                                            style={{
                                                fontSize: '1.25rem',
                                                background: formIcon === emoji ? 'var(--primary-light)' : 'transparent',
                                                border: formIcon === emoji ? '1px solid var(--primary-color)' : '1px solid transparent',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '0.25rem',
                                                cursor: 'pointer',
                                                width: '36px',
                                                height: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Descrição (opcional)</label>
                                <textarea
                                    value={formDesc}
                                    onChange={e => setFormDesc(e.target.value)}
                                    rows={3}
                                    placeholder="Breve descrição da categoria…"
                                    style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem', color: 'var(--text-main)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancelar</button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving || !formName.trim()}>
                                {saving ? 'Salvando…' : modal === 'edit' ? 'Salvar Alterações' : 'Criar Categoria'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ background: 'var(--bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '380px', width: '90%' }}>
                        <h3 style={{ marginBottom: '0.75rem' }}>Excluir Categoria?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Esta ação não pode ser desfeita.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                            <button className="btn-primary" style={{ background: '#ef4444' }} onClick={() => handleDelete(deleteConfirm)}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
