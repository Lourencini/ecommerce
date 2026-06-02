'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PendingContent() {
  const params      = useSearchParams();
  const paymentId   = params.get('payment_id');
  const paymentType = params.get('payment_type');

  const isPix     = paymentType === 'pix';
  const isBoleto  = paymentType === 'bolbradesco' || paymentType === 'pec';

  return (
    <div className="checkout-success">
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(245,158,11,0.12)',
        border: '2px solid rgba(245,158,11,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem', margin: '0 auto 1.5rem',
        boxShadow: '0 0 24px rgba(245,158,11,0.18)',
        animation: 'gold-border-pulse 2.5s ease-in-out infinite',
      }}>
        ⏳
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--clay)',
        textShadow: '0 0 16px rgba(201,168,76,0.35)',
        marginBottom: '0.5rem',
      }}>
        Aguardando Pagamento
      </h2>

      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {isPix
          ? 'Seu Pix foi gerado. Pague dentro de 30 minutos para garantir seu pedido.'
          : isBoleto
          ? 'Seu boleto foi gerado. O prazo de compensação é de até 3 dias úteis.'
          : 'Seu pedido está aguardando a confirmação do pagamento.'}
      </p>

      <div style={{
        background: 'rgba(201,168,76,0.06)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.75rem',
        fontSize: '0.875rem',
        color: 'var(--text-muted)',
        maxWidth: 400,
        textAlign: 'left',
      }}>
        {isPix ? (
          <>
            <strong style={{ color: 'var(--clay)', display: 'block', marginBottom: '0.5rem' }}>
              ⚡ Como pagar via Pix
            </strong>
            <ol style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.9 }}>
              <li>Abra o app do seu banco</li>
              <li>Acesse a área Pix e escolha <strong>Pagar com QR Code</strong></li>
              <li>Escaneie o QR Code gerado pelo Mercado Pago</li>
              <li>Confirme o pagamento</li>
            </ol>
          </>
        ) : isBoleto ? (
          <>
            <strong style={{ color: 'var(--clay)', display: 'block', marginBottom: '0.5rem' }}>
              📄 Como pagar o Boleto
            </strong>
            <ol style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.9 }}>
              <li>O boleto foi enviado para o seu e-mail</li>
              <li>Pague em qualquer banco, lotérica ou aplicativo</li>
              <li>A compensação ocorre em até 3 dias úteis</li>
            </ol>
          </>
        ) : (
          <p style={{ margin: 0 }}>
            Assim que o pagamento for confirmado você receberá um e-mail
            e o status do pedido será atualizado automaticamente.
          </p>
        )}
      </div>

      {paymentId && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
          Ref: {paymentId}
        </p>
      )}

      <div className="success-actions">
        <Link href="/minha-conta" className="btn-primary">Acompanhar Pedido</Link>
        <Link href="/" className="btn-secondary">Voltar à Loja</Link>
      </div>
    </div>
  );
}

export default function CheckoutPendingPage() {
  return (
    <Suspense fallback={
      <div className="checkout-success">
        <div className="spinner" style={{ margin: '3rem auto' }} />
      </div>
    }>
      <PendingContent />
    </Suspense>
  );
}
