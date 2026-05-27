"use client";

import { useState, useEffect, use } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { API_URL, TUNNEL_HEADERS } from '@/lib/api';

type ProductFormData = {
    name: string;
    sku: string;
    description: string;
    price: string;
    weightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    material: string;
    categoryId: string;
    stockQuantity: number;
    imageUrls: string[];
};

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ProductFormData>();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [serverError, setServerError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [catsRes, prodRes] = await Promise.all([
                    fetch(`${API_URL}/categories`, { headers: TUNNEL_HEADERS }),
                    fetch(`${API_URL}/products/${id}`, { headers: TUNNEL_HEADERS })
                ]);

                const cats = await catsRes.json();
                const prod = await prodRes.json();

                setCategories(cats || []);
                
                // Formatar dados para o formulário
                reset({
                    name: prod.name,
                    sku: prod.sku,
                    description: prod.description || '',
                    price: prod.price.toString().replace('.', ','),
                    weightGrams: prod.weightGrams,
                    lengthCm: Number(prod.lengthCm),
                    widthCm: Number(prod.widthCm),
                    heightCm: Number(prod.heightCm),
                    material: prod.material,
                    categoryId: prod.categoryId?.toString() || '',
                    stockQuantity: prod.stockQuantity || 0,
                    imageUrls: prod.imageUrls || []
                });

                if (prod.imageUrls) {
                    setPreviews(prod.imageUrls.map((url: string) => url.startsWith('/') ? `${API_URL.replace('/api/v1', '')}${url}` : url));
                }
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
        // Se for uma imagem já existente (string na lista de imageUrls original)
        // Precisamos gerenciar isso. Para simplificar no MVP, as novas imagens são adicionadas.
        setPreviews((prev) => prev.filter((_, i) => i !== index));
        // Se for um arquivo selecionado agora
        const currentImageUrlsCount = watch('imageUrls')?.length || 0;
        if (index < currentImageUrlsCount) {
             const current = watch('imageUrls');
             setValue('imageUrls', current.filter((_, i) => i !== index));
        } else {
            setSelectedFiles((prev) => prev.filter((_, i) => i !== (index - currentImageUrlsCount)));
        }
    };

    const uploadImages = async (): Promise<string[]> => {
        if (selectedFiles.length === 0) return watch('imageUrls') || [];

        const formData = new FormData();
        selectedFiles.forEach((file) => {
            formData.append('files', file);
        });

        const res = await fetch(`${API_URL}/uploads`, {
            method: 'POST',
            body: formData,
            headers: TUNNEL_HEADERS,
        });

        if (!res.ok) throw new Error('Falha no upload das imagens');

        const { urls } = await res.json();
        return [...(watch('imageUrls') || []), ...urls];
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        setServerError(null);
        setUploadProgress(10);
        try {
            setUploadProgress(30);
            const finalImageUrls = await uploadImages();
            setUploadProgress(70);

            const payload = {
                ...data,
                categoryId: Number(data.categoryId),
                imageUrls: finalImageUrls,
            };

            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    ...TUNNEL_HEADERS
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Falha ao atualizar produto');
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

    if (fetching) return <div className="card" style={{ padding: '2rem' }}><div className="skeleton-title" style={{ width: '50%' }}></div></div>;

    return (
        <div style={{ maxWidth: '800px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Produto</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ padding: '2rem' }}>
                {uploadProgress > 0 && uploadProgress < 100 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--primary-color)' }}>Salvando... {uploadProgress}%</div>
                        <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--primary-color)', width: `${uploadProgress}%`, transition: 'width 0.3s' }}></div>
                        </div>
                    </div>
                )}

                <div className="product-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    
                    <div className="form-group">
                        <label>Nome do Produto</label>
                        <input 
                            {...register('name', { required: 'Nome é obrigatório' })}
                            className={errors.name ? 'input-error' : ''}
                        />
                        {errors.name && <span className="error-text">{errors.name.message}</span>}
                    </div>

                    <div className="form-group">
                        <label>SKU</label>
                        <input 
                            {...register('sku', { required: 'SKU é obrigatório' })}
                            className={errors.sku ? 'input-error' : ''}
                        />
                        {errors.sku && <span className="error-text">{errors.sku.message}</span>}
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Descrição Técnica</label>
                        <textarea 
                            {...register('description')}
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <label>Preço Sugerido</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>R$</span>
                            <input 
                                {...register('price', { 
                                    required: 'Preço é obrigatório',
                                    pattern: { value: /^[0-9]+([,.][0-9]{1,2})?$/, message: 'Formato inválido' }
                                })}
                                style={{ paddingLeft: '35px', textAlign: 'right' }}
                                className={errors.price ? 'input-error' : ''}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Material</label>
                        <select {...register('material')}>
                            <option value="PLA">PLA</option>
                            <option value="ABS">ABS</option>
                            <option value="PETG">PETG</option>
                            <option value="RESIN">Resina</option>
                            <option value="TPU">TPU</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Categoria</label>
                        <select {...register('categoryId', { required: 'Categoria é obrigatória' })}>
                            <option value="">Selecione...</option>
                            {Array.isArray(categories) && categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Estoque Atual</label>
                        <input 
                            type="number"
                            {...register('stockQuantity', { valueAsNumber: true, min: 0 })}
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                        <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Fotos do Produto</h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            {previews.map((src, index) => (
                                <div key={index} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button 
                                        type="button" 
                                        onClick={() => removeImage(index)}
                                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <label style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                aspectRatio: '1/1', 
                                border: '2px dashed var(--border-color)', 
                                borderRadius: 'var(--radius-md)', 
                                cursor: 'pointer',
                                color: 'var(--text-muted)'
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>+</span>
                                <span style={{ fontSize: '0.7rem' }}>Adicionar</span>
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>
                </div>

                {serverError && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                        ⚠️ {serverError}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
                    <button type="button" onClick={() => router.back()} className="btn-secondary" disabled={loading}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: '180px' }}>
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>

            <style jsx>{`
                .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
                label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
                input, textarea, select {
                    background: var(--bg-color); border: 1px solid var(--border-color);
                    border-radius: var(--radius-md); padding: 0.75rem; color: var(--text-main);
                    outline: none; transition: border-color 0.2s;
                }
                input:focus, textarea:focus, select:focus { border-color: var(--primary-color); }
                .input-error { border-color: #ef4444 !important; }
                .error-text { color: #ef4444; font-size: 0.75rem; margin-top: -0.25rem; }
            `}</style>
        </div>
    );
}
