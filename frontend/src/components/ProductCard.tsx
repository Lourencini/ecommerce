import Link from 'next/link';

export function ProductCard({ product }: { product: any }) {
    // Converte decimal pra numero para formatar de forma segura
    const price = Number(product.price);
    const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;

    return (
        <div className="product-card">
            <Link href={`/products/${product.id}`} className="card-image-link">
                <div className="image-placeholder">
                    {product.imageUrls?.[0] ? (
                        <img src={product.imageUrls[0]} alt={product.name} />
                    ) : (
                        <span className="no-image">Sem Imagem</span>
                    )}
                </div>
            </Link>

            <div className="card-content">
                <div className="card-header">
                    {product.filamentType && (
                        <span className="badge">{product.filamentType}</span>
                    )}
                    <span className="badge badge-stock">
                        {product.stockQuantity > 0 ? `${product.stockQuantity} em estoque` : 'Esgotado'}
                    </span>
                </div>

                <Link href={`/products/${product.id}`}>
                    <h3 className="product-name">{product.name}</h3>
                </Link>

                <div className="price-container">
                    {compareAt && compareAt > price && (
                        <span className="compare-price">R$ {compareAt.toFixed(2).replace('.', ',')}</span>
                    )}
                    <span className="current-price">R$ {price.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
        </div>
    );
}

export function ProductSkeleton() {
    return (
        <div className="product-card skeleton" aria-hidden="true">
            <div className="skeleton-image"></div>
            <div className="card-content">
                <div className="skeleton-badge"></div>
                <div className="skeleton-title"></div>
                <div className="skeleton-price"></div>
            </div>
        </div>
    );
}
