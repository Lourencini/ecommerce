import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <p
          style={{
            padding: '0 0.5rem',
            marginBottom: '1rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
          }}
        >
          Admin
        </p>

        <Link href="/admin" className="admin-nav-link">
          📊 Dashboard
        </Link>
        <Link href="/admin/orders" className="admin-nav-link">
          📦 Pedidos
        </Link>
        <Link href="/admin/products" className="admin-nav-link">
          🖨️ Produtos
        </Link>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <Link href="/" className="admin-nav-link" style={{ fontSize: '0.85rem' }}>
            ← Ver loja
          </Link>
        </div>
      </aside>

      <section className="admin-content">{children}</section>
    </div>
  );
}
