import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatImageUrl, getAuthHeaders, API_URL } from '@/lib/api';

describe('formatImageUrl', () => {
  it('retorna string vazia para null', () => {
    expect(formatImageUrl(null)).toBe('');
  });

  it('retorna string vazia para undefined', () => {
    expect(formatImageUrl(undefined)).toBe('');
  });

  it('retorna string vazia para string vazia', () => {
    expect(formatImageUrl('')).toBe('');
  });

  it('retorna URL absoluta sem modificação', () => {
    const url = 'https://cdn.exemplo.com/imagem.jpg';
    expect(formatImageUrl(url)).toBe(url);
  });

  it('prepend base URL para caminhos relativos com barra', () => {
    const result = formatImageUrl('/uploads/products/foto.jpg');
    expect(result).toBe(`${API_URL.replace('/api/v1', '')}/uploads/products/foto.jpg`);
  });

  it('prepend base URL com barra para caminhos sem barra inicial', () => {
    const result = formatImageUrl('uploads/products/foto.jpg');
    expect(result).toBe(`${API_URL.replace('/api/v1', '')}/uploads/products/foto.jpg`);
  });

  it('não duplica barra em URL relativa', () => {
    const result = formatImageUrl('/uploads/img.jpg');
    expect(result).not.toContain('//uploads');
  });

  it('mantém URL http://', () => {
    const url = 'http://meusite.com/imagem.jpg';
    expect(formatImageUrl(url)).toBe(url);
  });
});

describe('getAuthHeaders', () => {
  it('retorna headers padrão sem token', () => {
    const headers = getAuthHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('inclui Authorization com Bearer token quando token fornecido', () => {
    const headers = getAuthHeaders('meu-token-jwt');
    expect(headers['Authorization']).toBe('Bearer meu-token-jwt');
  });

  it('retorna headers padrão quando token é string vazia', () => {
    const headers = getAuthHeaders('');
    expect(headers['Authorization']).toBeUndefined();
  });
});

describe('fetchProducts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('retorna paginação vazia em caso de falha de rede', async () => {
    const { fetchProducts } = await import('@/lib/api');
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchProducts();
    expect(result.data).toEqual([]);
    expect(result.items).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.lastPage).toBe(1);
  });

  it('retorna paginação vazia quando API retorna status 500', async () => {
    const { fetchProducts } = await import('@/lib/api');
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: vi.fn(),
    } as any);

    const result = await fetchProducts();
    expect(result.data).toEqual([]);
  });

  it('passa parâmetros de busca corretamente na query string', async () => {
    const { fetchProducts } = await import('@/lib/api');
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], items: [], meta: { total: 0, page: 1, lastPage: 1 } }),
    } as any);

    await fetchProducts(1, 12, { search: 'vaso', categoryId: 2 });

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('search=vaso');
    expect(calledUrl).toContain('categoryId=2');
  });

  it('retorna produtos da resposta da API', async () => {
    const { fetchProducts } = await import('@/lib/api');
    const mockProducts = [{ id: '1', name: 'Produto Teste' }];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockProducts, meta: { total: 1, page: 1, lastPage: 1 } }),
    } as any);

    const result = await fetchProducts();
    expect(result.items).toEqual(mockProducts);
  });
});

describe('fetchProductById', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('retorna null quando produto não encontrado (404)', async () => {
    const { fetchProductById } = await import('@/lib/api');
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: vi.fn(),
    } as any);

    const result = await fetchProductById('id-inexistente');
    expect(result).toBeNull();
  });

  it('retorna produto quando encontrado', async () => {
    const { fetchProductById } = await import('@/lib/api');
    const mockProduct = { id: 'prod-1', name: 'Miniatura RPG' };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    } as any);

    const result = await fetchProductById('prod-1');
    expect(result).toEqual(mockProduct);
  });
});
