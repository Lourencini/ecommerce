"use client";

import { useState, useEffect, use } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { API_URL } from '@/lib/api';

type ProductFormData = {
    name: string;
    sku: string;
    description: string;
    price: string;
    compareAtPrice: string;
    weightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    material: string;
    filamentType: string;
    filamentColor: string;
    categoryId: string;
    stockQuantity: number;
    isFeatured: boolean;
    imageUrls: string[];
};

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();
    const authToken = (session as any)?.accessToken ?? (session?.user as any)?.accessToken ?? '';
    const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ProductFormData>();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [serverError, setServerError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [existingUrls, setExistingUrls] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [catsRes, prodRes] = await Promise.all([
                    fetch(`${API_URL}/categories`),
                    fetch(`${API_URL}/products/${id}`),
                ]);
                const cats = await catsRes.json();
                const prod = await prodRes.json();

                setCategories(cats || []);

                const existUrls: string[] = prod.imageUrls || [];
                setExistingUrls(existUrls);
                setPreviews(existUrls.map((url: string) =>
                    url.startsWith('/') ? `${API_URL.replace('/api/v1', '')}${url}` : url
                ));

                reset({
                    name: prod.name,
                    sku: prod.sku,
                    description: prod.description || '',
                    price: prod.price.toString().replace('.', ','),
                    compareAtPrice: prod.compareAtPrice ? prod.compareAtPrice.toString().replace('.', ',') : '',
                    weightGrams: prod.weightGrams || 0,
                    lengthCm: Number(prod.lengthCm) || 0,
                    widthCm: Number(prod.widthCm) || 0,
                    heightCm: Number(prod.heightCm) || 0,
                    material: prod.material || 'PLA',
                    filamentType: prod.filamentType || '',
                    filamentColor: prod.filamentColor || '',
                    categoryId: prod.categoryId?.toString() || '',
                    stockQuantity: prod.stockQuantity || 0,
                    isFeatured: prod.isFeatured || false,
                    imageUrls: existUrls,
                });
            } catch (e) {
                console.error(e);
            } finally {
                setFetching(false);
            }
        };
        loadInitialData();
    }, [id, reset]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setSelectedFiles((prev) => [...prev, ...filesArray]);
            const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
            setPreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        setPreviews((prev) => prev.filter((_, i) => i !== index));
        if (index < existingUrls.length) {
            const updated = existingUrls.filter((_, i) => i !== index);
            setExistingUrls(updated);
            setValue('imageUrls', updated);
        } else {
            const fileIndex = index - existingUrls.length;
            setSelectedFiles((prev) => prev.filter((_, i) => i !== fileIndex));
        }
    };

    const uploadImages = async (): Promise<string[]> => {
        if (selectedFiles.length === 0) return existingUrls;
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('files', file));
        const res = await fetch(`${API_URL}/uploads`, {
            method: 'POST',
            body: formData,
            headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) throw new Error('Falha no upload das imagens');
        const { urls } = await res.json();
        return [...existingUrls, ...urls];
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        setServerError(null);
        setUploadProgress(10);
        try {
            setUploadProgress(30);
            const finalImageUrls = await uploadImages();
            setUploadProgress(70);

            const payload: any = {
                ...data,
                categoryId: Number(data.categoryId) || undefined,
                imageUrls: finalImageUrls,
                isFeatured: Boolean(data.isFeatured),
            };

            if (typeof payload.price === 'string') {
                payload.price = parseFloat(payload.price.replace(',', '.'));
            }
            if (payload.compareAtPrice) {
                const parsed = parseFloat(String(payload.compareAtPrice).replace(',', '.'));
                payload.compareAtPrice = isNaN(parsed) ? null : parsed;
            } else {
                payload.compareAtPrice = null;
            }
            if (!payload.filamentType) delete payload.filamentType;
            if (!payload.filamentColor) delete payload.filamentColor;

            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                const details = Array.isArray(err.errors) ? err.errors.join(' | ') : null;
                throw new Error(details || err.detail || err.message || 'Falha ao atualizar produto');
            }

            setUploadProgress(100);
            router.push('/admin/products');
        } catch (e: any) {
            setServerError(e.message);
            setUploadProgress(0);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div className="card" style={{ padding: '2rem' }}>
            <div className="skeleton-title" style={{ width: '50%' }} />
        </div>
    );

    return (
        <div style={{ maxWidth: '860px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Produto</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ padding: '2rem' }}>
                {uploadProgress > 0 && uploadProgress < 100 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--primary-color)' }}>
                            Salvando… {uploadProgress}%
                        </div>
                        <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--primary-color)', width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
                        </div>
                    </div>
                )}

                {/* ── Informações Básicas ── */}
                <SectionTitle>Informações Básicas</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label>Nome do Produto *</label>
                        <input {...register('name', { required: 'Nome é obrigatório' })} className={errors.name ? 'input-error' : ''} />
                        {errors.name && <span className="error-text">{errors.name.message}</span>}
                    </div>
                    <div className="form-group">
                        <label>SKU *</label>
                        <input {...register('sku', { required: 'SKU é obrigatório' })} className={errors.sku ? 'input-error' : ''} />
                        {errors.sku && <span className="error-text">{errors.sku.message}</span>}
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Descrição</label>
                        <textarea {...register('description')} rows={3} />
                    </div>
                </div>

                {/* ── Preço e Estoque ── */}
                <SectionTitle>Preço e Estoque</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label>Preço de Venda *</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>R$</span>
                            <input
                                {...register('price', { required: 'Preço é obrigatório', pattern: { value: /^[0-9]+([,.][0-9]{1,2})?$/, message: 'Formato inválido' } })}
                                style={{ paddingLeft: '35px' }}
                                className={errors.price ? 'input-error' : ''}
                            />
                        </div>
                        {errors.price && <span className="error-text">{errors.price.message}</span>}
                    </div>

                    <div className="form-group">
                        <label>
                            Preço "De" — original{' '}
                            <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                (deve ser maior que o Preço de Venda)
                            </span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>R$</span>
                            <input
                                {...register('compareAtPrice', {
                                    validate: (val) => {
                                        if (!val) return true;
                                        const cat = parseFloat(String(val).replace(',', '.'));
                                        const prc = parseFloat(String(watch('price') || '0').replace(',', '.'));
                                        if (isNaN(cat) || isNaN(prc)) return true;
                                        return cat > prc || 'O Preço "De" deve ser maior que o Preço de Venda para exibir desconto.';
                                    },
                                })}
                                style={{ paddingLeft: '35px' }}
                                placeholder="0,00"
                            />
                        </div>
                        {errors.compareAtPrice ? (
                            <span className="error-text">{errors.compareAtPrice.message}</span>
                        ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Aparece riscado no card. Ex.: "De&nbsp;R$&nbsp;45,00&nbsp;por&nbsp;R$&nbsp;32,50"
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Estoque</label>
                        <input type="number" {...register('stockQuantity', { valueAsNumber: true, min: 0 })} />
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', paddingBottom: '0.65rem' }}>
                            <input
                                type="checkbox"
                                {...register('isFeatured')}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                            />
                            <span>⭐ Destaque na Home</span>
                        </label>
                    </div>
                </div>

                {/* ── Categorização ── */}
                <SectionTitle>Categorização</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label>Categoria</label>
                        <select {...register('categoryId')}>
                            <option value="">Selecione…</option>
                            {Array.isArray(categories) && categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Material</label>
                        <select {...register('material')}>
                            <option value="PLA">PLA (Biodegradável)</option>
                            <option value="ABS">ABS (Resistente)</option>
                            <option value="PETG">PETG (Versátil)</option>
                            <option value="RESIN">Resina (Alta Definição)</option>
                            <option value="TPU">TPU (Flexível)</option>
                            <option value="NYLON">Nylon</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Tipo de Filamento</label>
                        <input {...register('filamentType')} placeholder="Ex: PLA+, Silk…" />
                    </div>
                    <div className="form-group">
                        <label>Cor do Filamento</label>
                        <input {...register('filamentColor')} placeholder="Ex: Preto, Azul…" />
                    </div>
                </div>

                {/* ── Fotos ── */}
                <SectionTitle>Fotos do Produto</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {previews.map((src, index) => (
                        <div key={index} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px', lineHeight: 1 }}
                            >✕</button>
                        </div>
                    ))}
                    <label style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        aspectRatio: '1/1', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
                        cursor: 'pointer', color: 'var(--text-muted)', gap: '0.25rem',
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>+</span>
                        <span style={{ fontSize: '0.7rem' }}>Adicionar</span>
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                </div>

                {/* ── Logística ── */}
                <SectionTitle>Dados de Logística (Frete)</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label>Peso (g)</label>
                        <input type="number" {...register('weightGrams', { valueAsNumber: true, min: 0 })} />
                    </div>
                    <div className="form-group">
                        <label>Comprimento (cm)</label>
                        <input type="number" {...register('lengthCm', { valueAsNumber: true, min: 0 })} />
                    </div>
                    <div className="form-group">
                        <label>Largura (cm)</label>
                        <input type="number" {...register('widthCm', { valueAsNumber: true, min: 0 })} />
                    </div>
                    <div className="form-group">
                        <label>Altura (cm)</label>
                        <input type="number" {...register('heightCm', { valueAsNumber: true, min: 0 })} />
                    </div>
                </div>

                {serverError && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                        ⚠️ {serverError}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={loading}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: '180px' }}>
                        {loading ? 'Salvando…' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>

            <style jsx>{`
                .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
                label { font-size: 0.82rem; font-weight: 600; color: var(--text-muted); }
                input, textarea, select {
                    background: var(--bg-color); border: 1px solid var(--border-color);
                    border-radius: var(--radius-md); padding: 0.65rem 0.75rem;
                    color: var(--text-main); outline: none; transition: border-color 0.2s;
                    width: 100%; box-sizing: border-box;
                }
                input:focus, textarea:focus, select:focus { border-color: var(--primary-color); }
                .input-error { border-color: #ef4444 !important; }
                .error-text { color: #ef4444; font-size: 0.75rem; }
            `}</style>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h4 style={{
            marginBottom: '1rem',
            marginTop: '0.25rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
        }}>
            {children}
        </h4>
    );
}
