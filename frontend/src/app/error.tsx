'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <span className="not-found-icon">⚠️</span>
        <h2 className="not-found-subtitle">Algo deu errado</h2>
        <p className="not-found-description">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        <button className="btn-primary" onClick={reset}>
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
