'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL } from '@/lib/api';
import type { Category } from '@/types';
import { Search } from 'lucide-react';

interface StorefrontFiltersProps {
  currentSearch?: string;
  currentCategoryId?: number;
}

export function StorefrontFilters({
  currentSearch = '',
  currentCategoryId,
}: StorefrontFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const applyFilters = (newSearch: string, newCategoryId?: number) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newCategoryId) params.set('categoryId', String(newCategoryId));
    params.set('page', '1');

    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(search, currentCategoryId);
  };

  const handleCategoryChange = (catId?: number) => {
    applyFilters(search, catId);
  };

  const clearFilters = () => {
    setSearch('');
    router.push('/');
  };

  const hasActiveFilters = currentSearch || currentCategoryId;

  return (
    <div className="storefront-filters">
      {/* Barra de busca */}
      <form onSubmit={handleSearchSubmit} className="search-bar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="search"
            className="form-input search-input"
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary btn-sm">
          Buscar
        </button>
      </form>

      {/* Filtro de categorias */}
      {categories.length > 0 && (
        <div className="category-filters">
          <button
            className={`category-chip ${!currentCategoryId ? 'active' : ''}`}
            onClick={() => handleCategoryChange(undefined)}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-chip ${currentCategoryId === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button className="btn-ghost btn-sm clear-filters" onClick={clearFilters}>
          ✕ Limpar filtros
        </button>
      )}
    </div>
  );
}
