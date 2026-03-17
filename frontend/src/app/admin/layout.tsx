import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <h3 style={{ padding: '0 1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>Menu</h3>
                <Link href="/admin">Dashboard Overview</Link>
                <Link href="/admin/products">Produtos</Link>
                <Link href="/admin/orders">Pedidos (Esteira)</Link>
            </aside>
            <section className="admin-content">
                {children}
            </section>
        </div>
    );
}
