import { Suspense } from 'react';
import { fetchProducts, fetchFeaturedProducts, formatImageUrl, API_URL } from '@/lib/api';
import { HeroActions } from '@/components/HeroActions';
import Link from 'next/link';
import type { Product, Category } from '@/types';

/* ── Hero: produtos em destaque no lado direito ── */
async function HeroProducts() {
  const featured = await fetchFeaturedProducts();
  if (featured.length === 0) return <HeroPlaceholder />;

  const [first, second, third] = featured;

  const imgOf = (p: Product) =>
    p.imageUrls?.[0] ? formatImageUrl(p.imageUrls[0]) : null;

  const discountOf = (p: Product) => {
    const price     = Number(p.price);
    const compareAt = p.compareAtPrice ? Number(p.compareAtPrice) : null;
    return compareAt && compareAt > price ? compareAt : null;
  };

  return (
    <>
      {/* Card grande */}
      <Link href={`/products/${first.id}`} className="hero-featured-card">
        <div className="hero-featured-img" style={{ position: 'relative' }}>
          {discountOf(first) && (
            <span className="badge badge-success" style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
              -{Math.round((1 - Number(first.price) / discountOf(first)!) * 100)}%
            </span>
          )}
          {imgOf(first) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgOf(first)!} alt={first.name} />
          ) : (
            <div className="hero-mini-placeholder" style={{ width: 100, height: 100 }} />
          )}
        </div>
        <div className="hero-featured-info">
          <div>
            <div className="hero-featured-name">{first.name}</div>
            <div className="hero-featured-cat">{first.filamentType || 'Impressão 3D'}</div>
          </div>
          <div>
            {discountOf(first) && (
              <div className="compare-price" style={{ fontSize: '0.8rem' }}>
                R$ {discountOf(first)!.toFixed(2).replace('.', ',')}
              </div>
            )}
            <div className="hero-featured-price">
              R$ {Number(first.price).toFixed(2).replace('.', ',')}
            </div>
          </div>
        </div>
      </Link>

      {/* Cards mini */}
      {second && third && (
        <div className="hero-mini-row">
          {[second, third].map((p) => (
            <Link key={p.id} href={`/products/${p.id}`} className="hero-mini-card">
              <div className="hero-mini-img" style={{ position: 'relative' }}>
                {discountOf(p) && (
                  <span className="badge badge-success" style={{ position: 'absolute', top: 4, left: 4, zIndex: 1, fontSize: '0.65rem', padding: '1px 5px' }}>
                    -{Math.round((1 - Number(p.price) / discountOf(p)!) * 100)}%
                  </span>
                )}
                {imgOf(p) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgOf(p)!} alt={p.name} />
                ) : (
                  <div className="hero-mini-placeholder" />
                )}
              </div>
              <div className="hero-mini-name">{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                {discountOf(p) && (
                  <span className="compare-price" style={{ fontSize: '0.7rem' }}>
                    R$ {discountOf(p)!.toFixed(2).replace('.', ',')}
                  </span>
                )}
                <div className="hero-mini-price">
                  R$ {Number(p.price).toFixed(2).replace('.', ',')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function HeroPlaceholder() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        color: 'var(--text-2)',
        padding: '2rem',
        background: 'var(--white)',
        borderRadius: 'var(--radius)',
        border: '1px dashed var(--border-dark)',
      }}
    >
      <div style={{ fontSize: '3rem' }}>🖨️</div>
      <p style={{ fontSize: '0.9rem', textAlign: 'center', maxWidth: 200 }}>
        Adicione produtos em destaque para exibi-los aqui.
      </p>
      <Link href="/admin/products/new" className="btn-hero btn-hero-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
        Adicionar produto →
      </Link>
    </div>
  );
}

function HeroProductsSkeleton() {
  return (
    <>
      <div className="hero-featured-card skeleton" style={{ flex: 1 }}>
        <div className="skeleton-image" style={{ flex: 1, minHeight: 140 }} />
        <div style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
          <div className="skeleton-title" style={{ flex: 1 }} />
          <div className="skeleton-price" style={{ width: 60 }} />
        </div>
      </div>
      <div className="hero-mini-row">
        <div className="hero-mini-card skeleton" style={{ height: 100 }} />
        <div className="hero-mini-card skeleton" style={{ height: 100 }} />
      </div>
    </>
  );
}

/* ── Produtos em Destaque ── */
async function FeaturedProductsSection() {
  let featured = await fetchFeaturedProducts();

  if (featured.length === 0) {
    const fallback = await fetchProducts(1, 4, { isActive: true });
    featured = fallback.data || fallback.items || [];
  }

  if (featured.length === 0) return null;

  const products = featured.slice(0, 4);

  return (
    <section className="section" id="destaques" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
      <div className="section-header-row section-header reveal visible">
        <div>
          <div className="section-eyebrow">Mais vendidos</div>
          <h2 className="section-title">Produtos em destaque</h2>
        </div>
        <Link href="/produtos" className="link-more">Ver todos os produtos →</Link>
      </div>
      <div className="products-grid">
        {products.map((product, i) => {
          const price       = Number(product.price);
          const compareAt   = product.compareAtPrice ? Number(product.compareAtPrice) : null;
          const hasDiscount = compareAt && compareAt > price;
          const discountPct = hasDiscount ? Math.round((1 - price / compareAt!) * 100) : 0;
          const isNew       = (Date.now() - new Date(product.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000;
          const imageUrl    = product.imageUrls?.[0] ? formatImageUrl(product.imageUrls[0]) : null;
          const catName     = product.category?.name || product.filamentType || 'Impressão 3D';
          const [reais, cents] = price.toFixed(2).split('.');

          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="product-card reveal visible"
              style={{ textDecoration: 'none', color: 'inherit', transitionDelay: `${i * 0.07}s` }}
            >
              <div className="product-img">
                {hasDiscount ? (
                  <span className="p-badge badge-off">-{discountPct}%</span>
                ) : isNew ? (
                  <span className="p-badge badge-new">Novo</span>
                ) : null}
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Sem imagem</span>
                )}
              </div>
              <div className="product-body">
                <div className="p-cat">{catName}</div>
                <div className="p-name">{product.name}</div>
                {product.description && (
                  <div className="p-desc">{product.description}</div>
                )}
                <div className="product-footer">
                  <div className="p-price">R$ {reais}<small>,{cents}</small></div>
                  <span className="add-cart">Ver produto →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FeaturedProductsSkeleton() {
  return (
    <section className="section" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <div className="skeleton-badge" style={{ width: 80, marginBottom: 8 }} />
          <div className="skeleton-title" style={{ width: 220 }} />
        </div>
        <div className="skeleton-badge" style={{ width: 120 }} />
      </div>
      <div className="products-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="product-card skeleton">
            <div className="skeleton-image" style={{ aspectRatio: '4/3', width: '100%', borderRadius: 0 }} />
            <div className="product-body" style={{ gap: '0.5rem' }}>
              <div className="skeleton-badge" style={{ width: 60 }} />
              <div className="skeleton-title" />
              <div className="skeleton-title" style={{ width: '70%' }} />
              <div className="skeleton-price" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Página ── */
export default async function Home() {
  let categories: Category[] = [];
  try {
    const res = await fetch(`${API_URL}/categories`, { cache: 'no-store' });
    if (res.ok) categories = await res.json();
  } catch {
    // categorias opcionais na home
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-left">
          <span className="hero-eyebrow">
            <span className="hero-eyebrow-line" />
            Impressão 3D artesanal
          </span>
          <h1 className="hero-title">
            Objetos feitos<br />
            <em>para você</em>
          </h1>
          <p className="hero-desc">
            Peças únicas com acabamento de qualidade, criadas camada por camada.
            Do design ao detalhe, cada produto é feito com cuidado.
          </p>
          <HeroActions />
        </div>

        <div className="hero-right">
          <div className="hero-label">Em destaque esta semana</div>
          <Suspense fallback={<HeroProductsSkeleton />}>
            <HeroProducts />
          </Suspense>
        </div>
      </section>

      {/* ── Trust Bar ────────────────────────────── */}
      <div className="trust-bar" style={{ display: 'none' }}>
        <div className="trust-item">
          <span className="trust-icon">🚚</span>
          Frete grátis acima de R$&nbsp;150
        </div>
        <div className="trust-item">
          <span className="trust-icon">⚡</span>
          Produção em até 48h
        </div>
        <div className="trust-item">
          <span className="trust-icon">🎨</span>
          +480 modelos disponíveis
        </div>
        <div className="trust-item">
          <span className="trust-icon">🔄</span>
          Troca garantida em 7 dias
        </div>
      </div>

      {/* ── Navegue por tema ────────────────────────── */}
      {categories.length > 0 && (
        <section className="section categories" id="categorias">
          <div className="section-header reveal visible" style={{ marginBottom: '2.5rem' }}>
            <div className="section-eyebrow">Navegue por tema</div>
            <h2 className="section-title">O que você procura?</h2>
          </div>
          <div className="cat-grid reveal visible">
            {categories.map((cat) => {
              const count = cat._count?.products ?? 0;
              return (
                <Link
                  key={cat.id}
                  href={`/produtos?categoryId=${cat.id}`}
                  className="cat-pill"
                >
                  <div className="cat-emoji">{cat.icon || '📦'}</div>
                  <div className="cat-pill-name">{cat.name}</div>
                  <div className="cat-pill-count">
                    {count} {count === 1 ? 'item' : 'itens'}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Produtos em Destaque ─────────────────────── */}
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProductsSection />
      </Suspense>

      {/* ── Depoimentos ──────────────────────────────── */}
      <section className="section testimonials">
        <div className="section-header reveal visible">
          <div className="section-eyebrow">Quem já comprou</div>
          <h2 className="section-title">O que estão dizendo</h2>
        </div>
        <div className="testimonials-grid reveal visible">
          <div className="testimonial">
            <div className="t-stars">★★★★★</div>
            <div className="t-text">"Qualidade absurda. O vaso chegou melhor do que eu esperava, as camadas são imperceptíveis de tão finas."</div>
            <div className="t-author">
              <div className="t-avatar">ML</div>
              <div>
                <div className="t-name">Mariana Lima</div>
                <div className="t-location">São Paulo, SP</div>
              </div>
            </div>
          </div>
          <div className="testimonial">
            <div className="t-stars">★★★★★</div>
            <div className="t-text">"Pedi uma peça personalizada pra presente e superou minha expectativa. Entrega rápida e embalagem muito bem feita."</div>
            <div className="t-author">
              <div className="t-avatar">RC</div>
              <div>
                <div className="t-name">Rafael Costa</div>
                <div className="t-location">Curitiba, PR</div>
              </div>
            </div>
          </div>
          <div className="testimonial">
            <div className="t-stars">★★★★☆</div>
            <div className="t-text">"Site fácil de usar, processo claro e produto com ótimo acabamento. Voltarei com certeza para próximos pedidos."</div>
            <div className="t-author">
              <div className="t-avatar">CA</div>
              <div>
                <div className="t-name">Camila Alves</div>
                <div className="t-location">Belo Horizonte, MG</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
