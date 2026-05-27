import { Suspense } from 'react';
import { fetchProductById, formatImageUrl } from '@/lib/api';
import { ProductClientDisplay } from './ProductClientDisplay';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) return { title: 'Produto não encontrado' };

  const image = product.imageUrls?.[0] ? formatImageUrl(product.imageUrls[0]) : undefined;

  return {
    title: product.name,
    description: product.description || `${product.name} — impressão 3D premium. Material: ${product.filamentType || product.material}. Compre agora na E-3D Print.`,
    openGraph: {
      title: product.name,
      description: product.description || '',
      images: image ? [{ url: image, alt: product.name }] : [],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) notFound();

  return (
    <div className="page-container">
      <Suspense
        fallback={
          <div className="product-card skeleton" style={{ height: '600px' }} />
        }
      >
        <ProductClientDisplay product={product!} />
      </Suspense>
    </div>
  );
}
