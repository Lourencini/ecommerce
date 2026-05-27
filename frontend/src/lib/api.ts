import type { Product, PaginatedResponse } from '@/types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Headers padrão para todas as requisições
const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

export function getAuthHeaders(token?: string): Record<string, string> {
  if (!token) return defaultHeaders;
  return { ...defaultHeaders, Authorization: `Bearer ${token}` };
}

// ── Produtos ──────────────────────────────────────────────────

export async function fetchProducts(
  page = 1,
  limit = 12,
  params?: {
    search?: string;
    categoryId?: number;
    isActive?: boolean;
    isFeatured?: boolean;
  },
): Promise<PaginatedResponse<Product>> {
  try {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (params?.search) query.set('search', params.search);
    if (params?.categoryId) query.set('categoryId', String(params.categoryId));
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    if (params?.isFeatured !== undefined) query.set('isFeatured', String(params.isFeatured));

    const res = await fetch(`${API_URL}/products?${query}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) throw new Error('Falha ao buscar produtos');
    return await res.json();
  } catch (error) {
    console.error('[fetchProducts]', error);
    return { data: [], items: [], meta: { total: 0, page: 1, lastPage: 1 } };
  }
}

export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_URL}/products/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Produto não encontrado');
    return await res.json();
  } catch (error) {
    console.error('[fetchProductById]', error);
    return null;
  }
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products?isFeatured=true&limit=6`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: PaginatedResponse<Product> = await res.json();
    return data.data || data.items || [];
  } catch {
    return [];
  }
}

// ── Imagens ───────────────────────────────────────────────────

export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;

  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  const baseUrl = API_URL.replace('/api/v1', '').replace(/\/$/, '');
  return `${baseUrl}${normalizedUrl}`;
}
