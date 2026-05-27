'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart } from 'lucide-react';

export function Header() {
  const { totalItems } = useCart();

  return (
    <nav className="navbar">
      <div className="container">
        <Link href="/" className="logo">
          E-3D Print
        </Link>

        <ul className="nav-links">
          <li>
            <Link href="/">Vitrine</Link>
          </li>
          <li>
            <Link href="/orders/track">Rastrear Pedido</Link>
          </li>
          <li>
            <Link href="/cart" className="cart-link">
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="cart-badge">{totalItems}</span>
              )}
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
