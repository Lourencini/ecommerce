import { Suspense } from 'react';
import { fetchProductById } from '@/lib/api';
import { ProductClientDisplay } from './ProductClientDisplay';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await fetchProductById(id);
    if (!product) return { title: 'Produto Não Encontrado' };
    return { title: `${product.name} | E-3D Print`, description: product.description };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await fetchProductById(id);

    if (!product) {
        notFound();
    }

    return (
        <div className="page-container">
            <Suspense fallback={<div className="product-card skeleton" style={{ height: '600px' }}></div>}>
                <ProductClientDisplay product={product} />
            </Suspense>
        </div>
    );
}
