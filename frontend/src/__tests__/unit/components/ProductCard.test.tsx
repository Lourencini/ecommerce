import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/types';

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-001',
  sku: 'SKU-001',
  name: 'Dragão Articulado',
  slug: 'dragao-articulado',
  description: 'Miniatura impressa em resina',
  price: 89.9,
  compareAtPrice: undefined,
  weightGrams: 150,
  lengthCm: 10,
  widthCm: 8,
  heightCm: 12,
  stockQuantity: 5,
  isActive: true,
  isFeatured: false,
  material: 'RESIN',
  filamentType: 'Resina UV',
  filamentColor: 'Cinza',
  imageUrls: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('ProductCard', () => {
  it('renderiza nome do produto', () => {
    render(<ProductCard product={makeProduct()} />);
    expect(screen.getByText('Dragão Articulado')).toBeInTheDocument();
  });

  it('exibe preço formatado em BRL', () => {
    render(<ProductCard product={makeProduct({ price: 89.9 })} />);
    expect(screen.getByText('R$ 89,90')).toBeInTheDocument();
  });

  it('exibe material/filamento como categoria', () => {
    render(<ProductCard product={makeProduct({ filamentType: 'PLA Silk' })} />);
    expect(screen.getByText('PLA Silk')).toBeInTheDocument();
  });

  it('usa material quando filamentType é undefined', () => {
    render(<ProductCard product={makeProduct({ filamentType: undefined, material: 'ABS' })} />);
    expect(screen.getByText('ABS')).toBeInTheDocument();
  });

  it('usa fallback "Impressão 3D" quando material e filamentType são undefined', () => {
    render(<ProductCard product={makeProduct({ filamentType: undefined, material: undefined })} />);
    expect(screen.getByText('Impressão 3D')).toBeInTheDocument();
  });

  it('exibe badge "Esgotado" quando sem estoque', () => {
    render(<ProductCard product={makeProduct({ stockQuantity: 0 })} />);
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });

  it('não exibe badge "Esgotado" quando há estoque', () => {
    render(<ProductCard product={makeProduct({ stockQuantity: 5 })} />);
    expect(screen.queryByText('Esgotado')).not.toBeInTheDocument();
  });

  it('exibe badge de desconto quando compareAtPrice > price', () => {
    render(<ProductCard product={makeProduct({ price: 80, compareAtPrice: 100 })} />);
    expect(screen.getByText('-20%')).toBeInTheDocument();
  });

  it('exibe preço "De" riscado quando há desconto', () => {
    render(<ProductCard product={makeProduct({ price: 80, compareAtPrice: 100 })} />);
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
  });

  it('não exibe badge de desconto quando compareAtPrice é undefined', () => {
    render(<ProductCard product={makeProduct({ compareAtPrice: undefined })} />);
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it('não exibe badge de desconto quando compareAtPrice <= price', () => {
    render(<ProductCard product={makeProduct({ price: 100, compareAtPrice: 80 })} />);
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it('exibe link "Ver produto" para a página do produto', () => {
    render(<ProductCard product={makeProduct({ id: 'prod-abc' })} />);
    const links = screen.getAllByRole('link');
    expect(links.some(l => l.getAttribute('href') === '/products/prod-abc')).toBe(true);
  });

  it('exibe texto "Sem Imagem" quando imageUrls está vazio', () => {
    render(<ProductCard product={makeProduct({ imageUrls: [] })} />);
    expect(screen.getByText('Sem Imagem')).toBeInTheDocument();
  });

  it('renderiza imagem quando imageUrls tem URL', () => {
    render(<ProductCard product={makeProduct({ imageUrls: ['/uploads/products/test.jpg'] })} />);
    const img = screen.getByRole('img', { name: 'Dragão Articulado' });
    expect(img).toBeInTheDocument();
  });

  it('exibe descrição quando presente', () => {
    render(<ProductCard product={makeProduct({ description: 'Detalhes do produto' })} />);
    expect(screen.getByText('Detalhes do produto')).toBeInTheDocument();
  });
});
