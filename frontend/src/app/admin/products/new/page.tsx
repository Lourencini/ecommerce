"use client";

import { useState, useEffect } from 'react';
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

export default function NewProductPage() {
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ProductFormData>({
        defaultValues: {
            material: 'PLA',
            weightGrams: 0,
            lengthCm: 0,
            widthCm: 0,
            heightCm: 0,
            stockQuantity: 0,
            imageUrls: []
        }
    });
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [serverError, setServerError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        fetch(`${API_URL}/categories`, { headers: TUNNEL_HEADERS })
            .then(res => res.json())
            .then(data => setCategories(data || []))
            .catch(err => console.error('Erro ao buscar categorias:', err));
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setSelectedFiles((prev) => [...prev, ...filesArray]);

            const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
            setPreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async (): Promise<string[]> => {
        if (selectedFiles.length === 0) return [];

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
        return urls;
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        setServerError(null);
        setUploadProgress(10);
        try {
            // 1. Upload das imagens primeiro
            setUploadProgress(30);
            const uploadedUrls = await uploadImages();
            setUploadProgress(70);

            // 2. Criar o produto com as URLs retornadas
            const payload = {
                ...data,
                categoryId: Number(data.categoryId),
                imageUrls: uploadedUrls,
            };

            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...TUNNEL_HEADERS 
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Falha ao cadastrar produto');
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

    return (
        <div style={{ maxWidth: '800px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Cadastrar Novo Produto (3D Print)</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ padding: '2rem' }}>
                {uploadProgress > 0 && uploadProgress < 100 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--primary-color)' }}>Processando... {uploadProgress}%</div>
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
                            placeholder="Ex: Vaso Articulado Low Poly"
                        />
                        {errors.name && <span className="error-text">{errors.name.message}</span>}
                    </div>

                    <div className="form-group">
                        <label>SKU (Único)</label>
                        <input 
                            {...register('sku', { required: 'SKU é obrigatório' })}
                            className={errors.sku ? 'input-error' : ''}
                            placeholder="Ex: 3D-VASO-001"
                        />
                        {errors.sku && <span className="error-text">{errors.sku.message}</span>}
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Descrição Técnica</label>
                        <textarea 
                            {...register('description')}
                            rows={4}
                            placeholder="Descreva detalhes da impressão, resolução e acabamento..."
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
                                placeholder="0,00"
                            />
                        </div>
                        {errors.price && <span className="error-text">{errors.price.message}</span>}
                    </div>

                    <div className="form-group">
                        <label>Material de Impressão</label>
                        <select {...register('material')}>
                            <option value="PLA">PLA (Biodegradável)</option>
                            <option value="ABS">ABS (Resistente)</option>
                            <option value="PETG">PETG (Versátil)</option>
                            <option value="RESIN">Resina (Alta Definição)</option>
                            <option value="TPU">TPU (Flexível)</option>
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
                        {errors.categoryId && <span className="error-text">{errors.categoryId.message}</span>}
                    </div>

                    <div className="form-group">
                        <label>Estoque Inicial</label>
                        <input 
                            type="number"
                            {...register('stockQuantity', { valueAsNumber: true, min: 0 })}
                            placeholder="0"
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
                                        onClick={() => removeFile(index)}
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
                                transition: 'border-color 0.2s',
                                color: 'var(--text-muted)'
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>+</span>
                                <span style={{ fontSize: '0.7rem' }}>Foto</span>
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                        <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Dados de Logística (Frete)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Peso (g)</label>
                                <input 
                                    type="number" 
                                    {...register('weightGrams', { valueAsNumber: true, min: { value: 1, message: '> 0' } })}
                                    className={errors.weightGrams ? 'input-error' : ''}
                                />
                                {errors.weightGrams && <span className="error-text">{errors.weightGrams.message}</span>}
                            </div>
                            <div className="form-group">
                                <label>Comp. (cm)</label>
                                <input 
                                    type="number" 
                                    {...register('lengthCm', { valueAsNumber: true, min: { value: 1, message: '> 0' } })}
                                    className={errors.lengthCm ? 'input-error' : ''}
                                />
                            </div>
                            <div className="form-group">
                                <label>Larg. (cm)</label>
                                <input 
                                    type="number" 
                                    {...register('widthCm', { valueAsNumber: true, min: { value: 1, message: '> 0' } })}
                                    className={errors.widthCm ? 'input-error' : ''}
                                />
                            </div>
                            <div className="form-group">
                                <label>Alt. (cm)</label>
                                <input 
                                    type="number" 
                                    {...register('heightCm', { valueAsNumber: true, min: { value: 1, message: '> 0' } })}
                                    className={errors.heightCm ? 'input-error' : ''}
                                />
                            </div>
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
                        {loading ? 'Salvando...' : 'Cadastrar Produto'}
                    </button>
                </div>
            </form>

            <style jsx>{`
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                input, textarea, select {
                    background: var(--bg-color);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: 0.75rem;
                    color: var(--text-main);
                    outline: none;
                    transition: border-color 0.2s;
                }
                input:focus, textarea:focus, select:focus {
                    border-color: var(--primary-color);
                }
                .input-error {
                    border-color: #ef4444 !important;
                }
                .error-text {
                    color: #ef4444;
                    font-size: 0.75rem;
                    margin-top: -0.25rem;
                }
            `}</style>
        </div>
    );
}
