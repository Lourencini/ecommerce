export default function AdminDashboard() {
    return (
        <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Dashboard Administrativo</h2>
            <div className="product-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="specs" style={{ textAlign: 'center' }}>
                    <h3>KPI: Falhas de Frete</h3>
                    <p className="price-huge" style={{ color: 'var(--text-main)' }}>0%</p>
                </div>
                <div className="specs" style={{ textAlign: 'center' }}>
                    <h3>Pedidos Pendentes</h3>
                    <p className="price-huge" style={{ color: '#eab308' }}>14</p>
                </div>
                <div className="specs" style={{ textAlign: 'center' }}>
                    <h3>Peças em Impressão</h3>
                    <p className="price-huge" style={{ color: '#3b82f6' }}>8</p>
                </div>
            </div>
        </div>
    );
}
