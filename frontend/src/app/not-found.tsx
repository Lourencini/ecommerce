import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <span className="not-found-icon">🖨️</span>
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Página não encontrada</h2>
        <p className="not-found-description">
          Parece que esta peça não existe no nosso catálogo ainda.
        </p>
        <Link href="/" className="btn-primary">
          Voltar para a Vitrine
        </Link>
      </div>
    </div>
  );
}
