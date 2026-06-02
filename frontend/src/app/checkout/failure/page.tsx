'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function FailureContent() {
  const params    = useSearchParams();
  const paymentId = params.get('payment_id');

  return (
    <div className="checkout-success">
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(139,0,0,0.12)',
        border: '2px solid rgba(139,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem', margin: '0 auto 1.5rem',
        boxShadow: '0 0 24px rgba(139,0,0,0.18)',
      }}>
        ✕
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--crimson, #8B0000)',
        marginBottom: '0.5rem',
      }}>
        Pagamento Recusado
      </h2>

      <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        Não foi possível processar seu pagamento.
        Verifique os dados do cartão ou tente outro método.
      </p>

      {paymentId && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
          Ref: {paymentId}
        </p>
      )}

      <div style={{
        background: 'rgba(245,158,11,0.07)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.5rem',
        marginBottom: '2rem',
        fontSize: '0.875rem',
        color: 'var(--text-muted)',
        textAlign: 'left',
        maxWidth: 360,
      }}>
        <strong style={{ color: 'var(--clay)', display: 'block', marginBottom: '0.5rem' }}>
          Possíveis causas:
        </strong>
        <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.8 }}>
          <li>Saldo insuficiente</li>
          <li>Dados do cartão incorretos</li>
          <li>Cartão não habilitado para compras online</li>
          <li>Limite excedido</li>
        </ul>
      </div>

      <div className="success-actions">
        <Link href="/cart" className="btn-primary">Tentar Novamente</Link>
        <Link href="/" className="btn-secondary">Voltar à Loja</Link>
      </div>
    </div>
  );
}

export default function CheckoutFailurePage() {
  return (
    <Suspense fallback={
      <div className="checkout-success">
        <div className="spinner" style={{ margin: '3rem auto' }} />
      </div>
    }>
      <FailureContent />
    </Suspense>
  );
}
