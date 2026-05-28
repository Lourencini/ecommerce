'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_GROUPS = [
  {
    label: 'Operação',
    items: [
      { href: '/admin',            icon: '📊', label: 'Dashboard' },
      { href: '/admin/orders',     icon: '📦', label: 'Pedidos' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { href: '/admin/products',   icon: '🖨️',  label: 'Produtos' },
      { href: '/admin/categories', icon: '🏷️',  label: 'Categorias' },
    ],
  },
  {
    label: 'ERP',
    items: [
      { href: '/admin/users', icon: '👥', label: 'Usuários' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div style={{ padding: '0 0.5rem', marginBottom: '1.25rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2.5px', color: 'var(--clay-mid)', textShadow: '0 0 8px rgba(201,168,76,0.3)' }}>
            ✦ Painel
          </span>
        </div>

        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: '1rem' }}>
            <p style={{
              padding: '0 0.75rem',
              marginBottom: '0.4rem',
              fontSize: '0.6rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--text-3)',
            }}>
              {group.label}
            </p>
            {group.items.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`admin-nav-link${isActive(href) ? ' active' : ''}`}
              >
                {icon} {label}
              </Link>
            ))}
          </div>
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
