"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

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
    categoryId: number;
};

export default function NewProductPage() {
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ProductFormData>({
        defaultValues: {
            material: 'PLA',
            categoryId: 1,
            weightGrams: 0,
            lengthCm: 0,
            widthCm: 0,
            heightCm: 0
        }
    });
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const onSubmit = async (data: any) => {
        setLoading(true);
        setServerError(null);
        try {
            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Falha ao cadastrar produto');
            }

            router.push('/admin/products');
        } catch (e: any) {
            setServerError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Cadastrar Novo Produto (3D Print)</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ padding: '2rem' }}>
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
                    <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
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
