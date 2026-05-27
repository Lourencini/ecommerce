import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { formatImageUrl } from '@/lib/api';

export function ProductCard({ product }: { product: Product }) {
  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const imageUrl = product.imageUrls?.[0] ? formatImageUrl(product.imageUrls[0]) : null;
  const inStock = product.stockQuantity > 0;

  return (
    <article className="product-card">
      <Link href={`/products/${product.id}`} className="card-image-link">
        <div className="image-placeholder">
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
        <div className="card-header">
          {product.filamentType && (
            <span className="badge">{product.filamentType}</span>
          )}
          <span className={`badge ${inStock ? 'badge-stock' : 'badge-danger'}`}>
            {inStock ? `${product.stockQuantity} em estoque` : 'Esgotado'}
          </span>
        </div>

        <Link href={`/products/${product.id}`}>
          <h3 className="product-name">{product.name}</h3>
        </Link>

        <div className="price-container">
          {compareAt && compareAt > price && (
            <span className="compare-price">
              R$ {compareAt.toFixed(2).replace('.', ',')}
            </span>
          )}
          <span className="current-price">
            R$ {price.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>
    </article>
  );
}

export function ProductSkeleton() {
  return (
    <div className="product-card skeleton" aria-hidden="true">
      <div className="skeleton-image" />
      <div className="card-content">
        <div className="skeleton-badge" />
        <div className="skeleton-title" />
        <div className="skeleton-price" />
      </div>
    </div>
  );
}
