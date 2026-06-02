'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const params       = useSearchParams();
  const paymentId    = params.get('payment_id');
  const reference    = params.get('external_reference');
  const paymentType  = params.get('payment_type');

  const methodLabel: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    debit_card:  'Cartão de Débito',
    pix:         'Pix',
    bolbradesco: 'Boleto',
    pec:         'Lotérica',
  };

  return (
    <div className="checkout-success">
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(16,185,129,0.12)',
        border: '2px solid rgba(16,185,129,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem', margin: '0 auto 1.5rem',
        boxShadow: '0 0 24px rgba(16,185,129,0.2)',
      }}>
        ✓
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--clay)',
        textShadow: '0 0 16px rgba(201,168,76,0.4)',
        marginBottom: '0.5rem',
      }}>
        Pagamento Confirmado!
      </h2>

      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Seu pedido foi recebido e o pagamento aprovado.
      </p>

      {(paymentId || reference || paymentType) && (
        <div style={{
          background: 'rgba(16,185,129,0.07)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          textAlign: 'left',
          display: 'inline-flex',
          flexDirection: 'column',
          gap: '0.35rem',
          minWidth: 260,
        }}>
          {paymentId && (
            <span style={{ color: 'var(--text-muted)' }}>
              ID do pagamento: <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{paymentId}</strong>
            </span>
          )}
          {paymentType && methodLabel[paymentType] && (
            <span style={{ color: 'var(--text-muted)' }}>
              Método: <strong style={{ color: 'var(--text)' }}>{methodLabel[paymentType]}</strong>
            </span>
          )}
        </div>
      )}

      <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: '2rem' }}>
        Você receberá um e-mail de confirmação com os detalhes do pedido.
      </p>

      <div className="success-actions">
        <Link href="/minha-conta" className="btn-primary">Ver Meus Pedidos</Link>
        <Link href="/" className="btn-secondary">Continuar Comprando</Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="checkout-success">
        <div className="spinner" style={{ margin: '3rem auto' }} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
