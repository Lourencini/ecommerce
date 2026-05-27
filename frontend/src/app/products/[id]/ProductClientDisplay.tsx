"use client";

import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { API_URL, formatImageUrl, TUNNEL_HEADERS } from '@/lib/api';

export function ProductClientDisplay({ product }: { product: any }) {
    const { addToCart } = useCart();
    const [zipCode, setZipCode] = useState('');
    const [shippingOptions, setShippingOptions] = useState<any[]>([]);
    const [loadingShipping, setLoadingShipping] = useState(false);
    const [shippingError, setShippingError] = useState('');
    const [added, setAdded] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const imageUrls = product.imageUrls || [];
    const price = Number(product.price);

    const handleAddToCart = () => {
        addToCart({
            productId: product.id,
            sku: product.sku,
            name: product.name,
            price: price,
            quantity: 1,
            weightGrams: product.weightGrams,
            lengthCm: Number(product.lengthCm),
            widthCm: Number(product.widthCm),
            heightCm: Number(product.heightCm),
            imageUrl: imageUrls[activeImageIndex] ? formatImageUrl(imageUrls[activeImageIndex]) : '',
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    const calculateShipping = async () => {
        if (zipCode.replace(/\D/g, '').length !== 8) {
            setShippingError('CEP deve ter 8 números.');
            return;
        }

        setLoadingShipping(true);
        setShippingError('');
        setShippingOptions([]);

        try {
            const res = await fetch(`${API_URL}/shipping/calculate`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...TUNNEL_HEADERS
                },
                body: JSON.stringify({
                    zipCodeDest: zipCode.replace(/\D/g, ''),
                    products: [{
                        productId: product.id,
                        quantity: 1,
                        weightGrams: product.weightGrams,
                        lengthCm: Number(product.lengthCm),
                        widthCm: Number(product.widthCm),
                        heightCm: Number(product.heightCm),
                    }]
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || data.message || 'Erro ao calcular frete');
            }

            setShippingOptions(data);
        } catch (err: any) {
            setShippingError(err.message);
        } finally {
            setLoadingShipping(false);
        }
    };

    return (
        <div className="product-details-grid">
            <div className="product-gallery">
                <div className="image-placeholder main-image">
                    {imageUrls.length > 0 ? (
                        <img src={formatImageUrl(imageUrls[activeImageIndex])} alt={product.name} />
                    ) : (
                        <span>Sem Imagem</span>
                    )}
                </div>
                
                {imageUrls.length > 1 && (
                    <div className="thumbnails-list" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {imageUrls.map((url: string, index: number) => (
                            <div 
                                key={index} 
                                onClick={() => setActiveImageIndex(index)}
                                style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    borderRadius: 'var(--radius-md)', 
                                    overflow: 'hidden', 
                                    border: activeImageIndex === index ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    opacity: activeImageIndex === index ? 1 : 0.6,
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}
                            >
                                <img src={formatImageUrl(url)} alt={`Thumbnail ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="product-info-panel">
                <h1 className="product-title">{product.name}</h1>
                <p className="product-sku">SKU: {product.sku}</p>

                <div className="price-huge">
                    R$ {price.toFixed(2).replace('.', ',')}
                </div>

                <p className="product-description">{product.description}</p>

                <div className="specs">
                    <h3>Especificações</h3>
                    <ul>
                        <li><strong>Material:</strong> {product.filamentType || 'Resina Standard'}</li>
                        <li><strong>Cor:</strong> {product.filamentColor || 'Cinza'}</li>
                        <li><strong>Peso:</strong> {product.weightGrams}g</li>
                        <li><strong>Dimensões:</strong> {product.lengthCm}x{product.widthCm}x{product.heightCm} cm</li>
                    </ul>
                </div>

                <div className="actions">
                    <button
                        className="btn-primary"
                        onClick={handleAddToCart}
                        disabled={product.stockQuantity < 1}
                    >
                        {product.stockQuantity < 1 ? 'Esgotado' : added ? 'Adicionado!' : 'Adicionar ao Carrinho'}
                    </button>
                </div>

                <div className="shipping-calculator">
                    <h3>Calcular Frete</h3>
                    <div className="shipping-input-group">
                        <input
                            type="text"
                            placeholder="00000-000"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            maxLength={9}
                        />
                        <button className="btn-secondary" onClick={calculateShipping} disabled={loadingShipping}>
                            {loadingShipping ? '...' : 'Calcular'}
                        </button>
                    </div>

                    {shippingError && <p className="error-text">{shippingError}</p>}

                    {shippingOptions.length > 0 && (
                        <div className="shipping-results">
                            {shippingOptions.map((opt, i) => (
                                <div key={i} className="shipping-option">
                                    <span className="carrier">{opt.carrier} {opt.serviceName}</span>
                                    <span className="price">R$ {opt.price.toFixed(2).replace('.', ',')}</span>
                                    <span className="deadline">{opt.deadlineDays} dias Úteis</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
