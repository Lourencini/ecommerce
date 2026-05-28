import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { formatImageUrl } from '@/lib/api';

export function ProductCard({ product }: { product: Product }) {
  const price      = Number(product.price);
  const compareAt  = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const imageUrl   = product.imageUrls?.[0] ? formatImageUrl(product.imageUrls[0]) : null;
  const inStock    = product.stockQuantity > 0;
  const hasDiscount = compareAt && compareAt > price;

  return (
    <article className="product-card">
      <Link href={`/products/${product.id}`} className="card-image-link">
        <div className="image-placeholder">
          {hasDiscount && (
            <span className="badge badge-success" style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
              -{Math.round((1 - price / compareAt!) * 100)}%
            </span>
          )}
          {!inStock && (
            <span className="badge badge-neutral" style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
              Esgotado
            </span>
          )}
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="card-img"
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <span className="no-image-text">Sem Imagem</span>
          )}
        </div>
      </Link>

      <div className="card-content">
        {/* Categoria / material */}
        <div className="p-cat">
          {product.filamentType || product.material || 'Impressão 3D'}
        </div>

        <Link href={`/products/${product.id}`}>
          <h3 className="product-name">{product.name}</h3>
        </Link>

        {product.description && (
          <p className="p-desc">{product.description}</p>
        )}

        <div className="price-container">
          <div>
            {hasDiscount && (
              <span className="compare-price">
                R$ {compareAt!.toFixed(2).replace('.', ',')}
              </span>
            )}
            <div className="current-price">
              R$ {price.toFixed(2).replace('.', ',')}
            </div>
          </div>

          <Link href={`/products/${product.id}`} className="add-cart-link">
            Ver produto →
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProductSkeleton() {
  return (
    <div className="product-card skeleton" aria-hidden="true">
      <div className="skeleton-image" />
      <div className="card-content" style={{ gap: '0.5rem' }}>
        <div className="skeleton-badge" />
        <div className="skeleton-title" />
        <div className="skeleton-title" style={{ width: '55%' }} />
        <div className="skeleton-price" />
      </div>
    </div>
  );
}
