import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Suspense } from 'react';

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

// searchParams configurável por teste
const mockGet = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
}));

import CheckoutSuccessPage  from '@/app/checkout/success/page';
import CheckoutFailurePage  from '@/app/checkout/failure/page';
import CheckoutPendingPage  from '@/app/checkout/pending/page';

const wrap = (ui: React.ReactElement) =>
  render(<Suspense fallback={<div>loading</div>}>{ui}</Suspense>);

// ── Success ──────────────────────────────────────────────────────────────────
describe('/checkout/success', () => {
  beforeEach(() => mockGet.mockReturnValue(null));

  it('exibe título de pagamento confirmado', async () => {
    wrap(<CheckoutSuccessPage />);
    expect(await screen.findByText(/Pagamento Confirmado/i)).toBeInTheDocument();
  });

  it('exibe link Ver Meus Pedidos', async () => {
    wrap(<CheckoutSuccessPage />);
    expect(await screen.findByText(/Ver Meus Pedidos/i)).toBeInTheDocument();
  });

  it('exibe payment_id quando presente nos params', async () => {
    mockGet.mockImplementation((k: string) =>
      k === 'payment_id' ? '12345' : null,
    );
    wrap(<CheckoutSuccessPage />);
    expect(await screen.findByText('12345')).toBeInTheDocument();
  });

  it('exibe método Pix quando payment_type=pix', async () => {
    mockGet.mockImplementation((k: string) =>
      k === 'payment_type' ? 'pix' : null,
    );
    wrap(<CheckoutSuccessPage />);
    expect(await screen.findByText('Pix')).toBeInTheDocument();
  });
});

// ── Failure ──────────────────────────────────────────────────────────────────
describe('/checkout/failure', () => {
  beforeEach(() => mockGet.mockReturnValue(null));

  it('exibe título de pagamento recusado', async () => {
    wrap(<CheckoutFailurePage />);
    expect(await screen.findByText(/Pagamento Recusado/i)).toBeInTheDocument();
  });

  it('exibe link Tentar Novamente', async () => {
    wrap(<CheckoutFailurePage />);
    expect(await screen.findByText(/Tentar Novamente/i)).toBeInTheDocument();
  });

  it('exibe link Voltar à Loja', async () => {
    wrap(<CheckoutFailurePage />);
    expect(await screen.findByText(/Voltar à Loja/i)).toBeInTheDocument();
  });

  it('exibe possíveis causas do erro', async () => {
    wrap(<CheckoutFailurePage />);
    expect(await screen.findByText(/Saldo insuficiente/i)).toBeInTheDocument();
  });
});

// ── Pending ──────────────────────────────────────────────────────────────────
describe('/checkout/pending', () => {
  beforeEach(() => mockGet.mockReturnValue(null));

  it('exibe título de aguardando pagamento', async () => {
    wrap(<CheckoutPendingPage />);
    expect(await screen.findByText(/Aguardando Pagamento/i)).toBeInTheDocument();
  });

  it('exibe instruções de Pix quando payment_type=pix', async () => {
    mockGet.mockImplementation((k: string) =>
      k === 'payment_type' ? 'pix' : null,
    );
    wrap(<CheckoutPendingPage />);
    expect(await screen.findByText(/Pix foi gerado/i)).toBeInTheDocument();
  });

  it('exibe instruções de Boleto quando payment_type=bolbradesco', async () => {
    mockGet.mockImplementation((k: string) =>
      k === 'payment_type' ? 'bolbradesco' : null,
    );
    wrap(<CheckoutPendingPage />);
    expect(await screen.findByText(/boleto foi gerado/i)).toBeInTheDocument();
  });

  it('exibe link Acompanhar Pedido', async () => {
    wrap(<CheckoutPendingPage />);
    expect(await screen.findByText(/Acompanhar Pedido/i)).toBeInTheDocument();
  });
});
