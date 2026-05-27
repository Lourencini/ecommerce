'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';
import { API_URL } from '@/lib/api';
import type { ShippingOption, ShippingQuote } from '@/types';
import Link from 'next/link';

type Step = 'address' | 'shipping' | 'payment';

interface AddressForm {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

const EMPTY_ADDRESS: AddressForm = {
  street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '',
};

export default function CheckoutPage() {
  const { data: session } = useSession();
  const { items, subtotal, clearCart } = useCart();

  const [step, setStep] = useState<Step>('address');
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [loadingCep, setLoadingCep] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [savedQuote, setSavedQuote] = useState<ShippingQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const accessToken = (session?.user as any)?.accessToken;

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  // Auto-preencher endereço via ViaCEP
  const handleCepBlur = async () => {
    const cep = address.zipCode.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {
    } finally {
      setLoadingCep(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.zipCode || !address.street || !address.number) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/shipping/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zipCodeDest: address.zipCode.replace(/\D/g, ''),
          products: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            weightGrams: i.weightGrams,
            lengthCm: i.lengthCm,
            widthCm: i.widthCm,
            heightCm: i.heightCm,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao calcular frete');

      setShippingOptions(data);
      setStep('shipping');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao calcular frete');
    } finally {
      setLoading(false);
    }
  };

  const handleShippingSubmit = async () => {
    if (!selectedShipping) return;
    setLoading(true);
    setError('');

    try {
      const totalWeight = items.reduce((acc, i) => acc + i.weightGrams * i.quantity, 0);

      const res = await fetch(`${API_URL}/shipping/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zipCodeDest: address.zipCode.replace(/\D/g, ''),
          weightGrams: totalWeight,
          lengthCm: items[0]?.lengthCm,
          widthCm: items[0]?.widthCm,
          heightCm: items[0]?.heightCm,
          price: selectedShipping.price,
          deadlineDays: selectedShipping.deadlineDays,
          serviceName: selectedShipping.serviceName,
          carrier: selectedShipping.carrier,
        }),
      });

      const quote = await res.json();
      if (!res.ok) throw new Error(quote.message || 'Erro ao salvar cotação');

      setSavedQuote(quote);
      setStep('payment');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cotação');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!savedQuote) return;
    setLoading(true);
    setError('');

    try {
      // 1. Salvar endereço do cliente
      await fetch(`${API_URL}/customers/me/addresses`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...address,
          zipCode: address.zipCode.replace(/\D/g, ''),
          isDefault: true,
        }),
      });

      // 2. Criar o pedido
      const orderRes = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          shippingQuoteId: savedQuote.id,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });

      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.message || 'Erro ao criar pedido');

      // 3. Gerar preferência de pagamento no MercadoPago
      const paymentRes = await fetch(`${API_URL}/payments/create-preference`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ orderId: order.id }),
      });

      if (paymentRes.ok) {
        const { initPoint } = await paymentRes.json();
        clearCart();
        window.location.href = initPoint; // Redireciona para o MP
      } else {
        // Fallback: pedido criado, mas MP ainda não configurado
        clearCart();
        setOrderNumber(order.orderNumber);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pedido');
    } finally {
      setLoading(false);
    }
  };

  // Pedido confirmado
  if (orderNumber) {
    return (
      <div className="checkout-success">
        <span className="success-icon">🎉</span>
        <h2>Pedido realizado!</h2>
        <p>
          Número do pedido: <strong>{orderNumber}</strong>
        </p>
        <p className="text-muted">
          Você receberá um e-mail de confirmação em breve.
        </p>
        <div className="success-actions">
          <Link href="/" className="btn-primary">Continuar Comprando</Link>
          <Link href="/orders/track" className="btn-secondary">Rastrear Pedido</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>Seu carrinho está vazio.</p>
        <Link href="/" className="btn-primary" style={{ marginTop: '1rem' }}>Ver Produtos</Link>
      </div>
    );
  }

  const total = subtotal + (selectedShipping?.price ?? 0);

  return (
    <div className="checkout-page">
      {/* Stepper */}
      <div className="stepper">
        <div className={`stepper-step ${step === 'address' ? 'active' : step !== 'address' ? 'completed' : ''}`}>
          <span className="stepper-dot">1</span>
          <span>Endereço</span>
        </div>
        <div className="stepper-line" />
        <div className={`stepper-step ${step === 'shipping' ? 'active' : step === 'payment' ? 'completed' : ''}`}>
          <span className="stepper-dot">2</span>
          <span>Frete</span>
        </div>
        <div className="stepper-line" />
        <div className={`stepper-step ${step === 'payment' ? 'active' : ''}`}>
          <span className="stepper-dot">3</span>
          <span>Pagamento</span>
        </div>
      </div>

      <div className="checkout-layout">
        {/* Formulário principal */}
        <div className="checkout-main">

          {/* ETAPA 1: Endereço */}
          {step === 'address' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>📍 Endereço de Entrega</h3>
              <form onSubmit={handleAddressSubmit}>
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">CEP *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="00000-000"
                      value={address.zipCode}
                      onChange={(e) => setAddress((p) => ({ ...p, zipCode: e.target.value }))}
                      onBlur={handleCepBlur}
                      maxLength={9}
                      required
                    />
                    {loadingCep && <span className="helper-text">Buscando endereço...</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Rua *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Rua das Flores"
                      value={address.street}
                      onChange={(e) => setAddress((p) => ({ ...p, street: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Número *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="123"
                      value={address.number}
                      onChange={(e) => setAddress((p) => ({ ...p, number: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Complemento</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Apto 4"
                      value={address.complement}
                      onChange={(e) => setAddress((p) => ({ ...p, complement: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bairro *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={address.neighborhood}
                      onChange={(e) => setAddress((p) => ({ ...p, neighborhood: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cidade *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={address.city}
                      onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estado *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="SP"
                      value={address.state}
                      onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
                      maxLength={2}
                      required
                    />
                  </div>
                </div>

                {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

                <button type="submit" className="btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} disabled={loading}>
                  {loading ? 'Calculando frete...' : 'Continuar para Frete →'}
                </button>
              </form>
            </div>
          )}

          {/* ETAPA 2: Frete */}
          {step === 'shipping' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>🚚 Escolha o Frete</h3>
              <div className="shipping-results">
                {shippingOptions.map((opt, i) => (
                  <div
                    key={i}
                    className={`shipping-option ${selectedShipping === opt ? 'selected' : ''}`}
                    onClick={() => setSelectedShipping(opt)}
                  >
                    <span className="carrier">{opt.carrier} — {opt.serviceName}</span>
                    <span className="text-muted text-sm">{opt.deadlineDays} dias úteis</span>
                    <strong className="text-primary">R$ {Number(opt.price).toFixed(2).replace('.', ',')}</strong>
                  </div>
                ))}
              </div>

              {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn-secondary" onClick={() => setStep('address')}>← Voltar</button>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={!selectedShipping || loading}
                  onClick={handleShippingSubmit}
                >
                  {loading ? 'Salvando...' : 'Continuar para Pagamento →'}
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 3: Pagamento */}
          {step === 'payment' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>💳 Pagamento</h3>

              <div className="payment-methods">
                <div className="alert alert-info">
                  Você será redirecionado para o MercadoPago para finalizar o pagamento com segurança.
                </div>
                <div className="payment-icons">
                  <span className="payment-badge">💳 Cartão de Crédito</span>
                  <span className="payment-badge">⚡ Pix</span>
                  <span className="payment-badge">📄 Boleto</span>
                </div>
              </div>

              {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn-secondary" onClick={() => setStep('shipping')}>← Voltar</button>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={loading}
                  onClick={handlePayment}
                >
                  {loading ? 'Processando...' : `Pagar R$ ${total.toFixed(2).replace('.', ',')} →`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resumo do Pedido */}
        <div className="checkout-summary card" style={{ padding: '1.5rem', height: 'fit-content', position: 'sticky', top: 'calc(var(--header-height) + 1rem)' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            Resumo
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {items.map((item) => (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>{item.name} ×{item.quantity}</span>
                <span>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>

          {selectedShipping && (
            <div className="summary-row">
              <span>Frete ({selectedShipping.carrier})</span>
              <span>R$ {Number(selectedShipping.price).toFixed(2).replace('.', ',')}</span>
            </div>
          )}

          <div className="summary-total">
            <span>Total</span>
            <span>R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
