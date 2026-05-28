import { Suspense } from 'react';
import { StorefrontFilters } from '@/components/StorefrontFilters';
import { ProductCard, ProductSkeleton } from '@/components/ProductCard';
import { fetchProducts } from '@/lib/api';
import type { Product } from '@/types';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    page?: string;
    sort?: string;
  }>;
}

async function ProductGrid({
  search,
  categoryId,
  page,
}: {
  search?: string;
  categoryId?: number;
  page: number;
}) {
  const result = await fetchProducts(page, 12, { search, categoryId, isActive: true });

  const products: Product[] = result.data || result.items || [];
  const meta = result.meta;

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhum produto encontrado para esses filtros.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="results-count">
        Exibindo {products.length} de {meta.total} produto
        {meta.total !== 1 ? 's' : ''}
      </p>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {meta.lastPage > 1 && (
        <div className="pagination">
          {Array.from({ length: meta.lastPage }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?page=${p}${search ? `&search=${search}` : ''}${
                categoryId ? `&categoryId=${categoryId}` : ''
              }`}
              className={`pagination-btn ${p === page ? 'active' : ''}`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="product-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function ProductsCatalogPage({ searchParams }: PageProps) {
  const params     = await searchParams;
  const search     = params.search;
  const categoryId = params.categoryId ? parseInt(params.categoryId) : undefined;
  const page       = params.page ? parseInt(params.page) : 1;

  return (
    <div className="page-container">
      <div className="page-header">
        <span className="section-eyebrow">Catálogo Completo</span>
        <h2>Nossos Produtos</h2>
        <p>Explore toda a nossa variedade de peças impressas em 3D de alta qualidade.</p>
      </div>

      <StorefrontFilters
        currentSearch={search}
        currentCategoryId={categoryId}
      />

      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid search={search} categoryId={categoryId} page={page} />
      </Suspense>
    </div>
  );
}
