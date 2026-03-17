export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function fetchProducts(page = 1, limit = 12) {
    try {
        const res = await fetch(`${API_URL}/products?page=${page}&limit=${limit}`, {
            next: { revalidate: 30 }, // ISR: Cache por 30 segundos
        });
        if (!res.ok) throw new Error('Falha ao buscar produtos');
        return await res.json();
    } catch (error) {
        console.error(error);
        return { data: [], meta: { total: 0 } };
    }
}

export async function fetchProductById(id: string) {
    try {
        const res = await fetch(`${API_URL}/products/${id}`, {
            cache: 'no-store' // SSR always fresh 
        });
        if (!res.ok) throw new Error('Produto não encontrado');
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}
