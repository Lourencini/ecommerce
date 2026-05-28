'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin',            icon: '📊', label: 'Dashboard' },
  { href: '/admin/orders',     icon: '📦', label: 'Pedidos' },
  { href: '/admin/products',   icon: '🖨️',  label: 'Produtos' },
  { href: '/admin/categories', icon: '🏷️',  label: 'Categorias' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

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

        {NAV_ITEMS.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`admin-nav-link${isActive(href) ? ' active' : ''}`}
          >
            {icon} {label}
          </Link>
        ))}

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
