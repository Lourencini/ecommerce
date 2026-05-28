import { Suspense } from 'react';
import { fetchProducts } from '@/lib/api';
import { ProductCard, ProductSkeleton } from '@/components/ProductCard';
import { StorefrontFilters } from '@/components/StorefrontFilters';
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
              href={`/produtos?page=${p}${search ? `&search=${search}` : ''}${
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

export default async function CatalogPage({ searchParams }: PageProps) {
  const params     = await searchParams;
  const search     = params.search;
  const categoryId = params.categoryId ? parseInt(params.categoryId) : undefined;
  const page       = params.page ? parseInt(params.page) : 1;
  const hasFilters = !!(search || categoryId);

  return (
    <section
      className="section"
      id="produtos"
      style={{ background: 'var(--bg)', minHeight: '60vh' }}
    >
      {hasFilters ? (
        <div className="section-header-row">
          <div>
            <span className="section-eyebrow">Resultados</span>
            <h2 className="section-title">
              {search ? `"${search}"` : 'Todos os Produtos'}
            </h2>
          </div>
        </div>
      ) : (
        <div className="section-header-row section-header reveal visible">
          <div>
            <div className="section-eyebrow">Catálogo</div>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Todos os Produtos</h2>
          </div>
        </div>
      )}

      <StorefrontFilters
        currentSearch={search}
        currentCategoryId={categoryId}
      />

      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid search={search} categoryId={categoryId} page={page} />
      </Suspense>
    </section>
  );
}
