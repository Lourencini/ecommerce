"use client";

import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import { formatImageUrl } from '@/lib/api';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, totalItems, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2>Seu carrinho está vazio</h2>
          <p>Adicione produtos da vitrine para continuar.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
            Ver Produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header" style={{ textAlign: 'left' }}>
        <h2>Seu Carrinho</h2>
        <p>{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
      </header>

      <div className="cart-layout">
        {/* Lista de itens */}
        <div className="cart-items">
          {items.map(item => (
            <div key={item.productId} className="cart-item">
              <div className="cart-item-img">
                {item.imageUrl ? (
                  <Image
                    src={formatImageUrl(item.imageUrl)}
                    alt={item.name}
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                  />
                ) : (
                  <div className="no-image" style={{ width: 80, height: 80 }} />
                )}
              </div>

              <div className="cart-item-details">
                <h3>{item.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>SKU: {item.sku}</p>
                <p style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                  R$ {item.price.toFixed(2).replace('.', ',')}
                </p>
              </div>

              <div className="cart-item-qty" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '1rem' }}
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  −
                </button>
                <span style={{ minWidth: '1.5rem', textAlign: 'center' }}>{item.quantity}</span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '1rem' }}
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              <div className="cart-item-price">
                <strong>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</strong>
              </div>

              <button
                className="btn btn-danger"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => removeFromCart(item.productId)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="cart-summary">
          <h3>Resumo do Pedido</h3>

          <div className="summary-row">
            <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'itens'})</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>

          <div className="summary-row" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span>Frete</span>
            <span>Calculado no checkout</span>
          </div>

          <div className="summary-total">
            <span>Total estimado</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>

          <Link
            href="/checkout"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', display: 'block', textAlign: 'center' }}
          >
            Ir para o Checkout →
          </Link>

          <Link
            href="/"
            style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}
          >
            ← Continuar comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
