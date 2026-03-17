import { Suspense } from 'react';
import { fetchProducts } from '@/lib/api';
import { ProductCard, ProductSkeleton } from '@/components/ProductCard';

// Componente de UI responsavel pela vitrine
async function ProductGrid() {
    const result = await fetchProducts(1, 12);
    const products = result.data || [];

    if (products.length === 0) {
        return <div className="empty-state">Nenhum produto encontrado.</div>;
    }

    return (
        <div className="product-grid">
            {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
}

// Fallback visual para carregamento com Skeletons (Step 3 Requirement)
function ProductGridSkeleton() {
    return (
        <div className="product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
        </div>
    );
}

export default function Home() {
    return (
        <div className="page-container">
            <header className="page-header">
                <h2>Lançamentos Exclusivos</h2>
                <p>Peças em impressão 3D premium prontas para você.</p>
            </header>

            {/* O Suspense garante que a UI não bloqueie, exibindo o Skeleton nativo do React */}
            <Suspense fallback={<ProductGridSkeleton />}>
                <ProductGrid />
            </Suspense>
        </div>
    );
}
