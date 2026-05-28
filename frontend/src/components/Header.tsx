'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useSession, signOut } from 'next-auth/react';
import { User, LogOut, Settings, ChevronDown, LogIn } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const { totalItems } = useCart();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = session?.user?.name ?? 'Usuário';
  const isAdmin  = (session?.user as any)?.role === 'ADMIN';

  return (
    <nav className="navbar">
      <div className="container">
        {/* Logo */}
        <Link href="/" className="logo">WB Maker</Link>

        {/* Links centrais */}
        <ul className="nav-links">
          <li><Link href="/">Vitrine</Link></li>
          <li><Link href="/produtos">Catálogo</Link></li>
          <li><Link href="/orders/track">Rastrear Pedido</Link></li>
        </ul>

        {/* Direita: carrinho + usuário */}
        <div className="nav-right">
          {/* Carrinho */}
          <Link href="/cart" className="nav-cart-btn">
            Carrinho
            {totalItems > 0 && (
              <span className="cart-badge">{totalItems}</span>
            )}
          </Link>

          {/* Menu do usuário */}
          <li style={{ position: 'relative', listStyle: 'none' }} ref={menuRef}>
            {status === 'loading' ? (
              <span className="user-menu-btn" style={{ opacity: 0.4 }}>
                <User size={16} />
              </span>
            ) : session ? (
              <>
                <button
                  className="user-menu-btn"
                  onClick={() => setMenuOpen(v => !v)}
                  aria-expanded={menuOpen}
                >
                  <User size={15} />
                  <span className="user-menu-name">{userName.split(' ')[0]}</span>
                  <ChevronDown
                    size={13}
                    style={{
                      transition: 'transform 0.2s',
                      transform: menuOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>

                {menuOpen && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <strong>{userName}</strong>
                      <span className="user-dropdown-email">{session.user?.email}</span>
                      {isAdmin && (
                        <span
                          className="badge badge-new"
                          style={{ marginTop: '0.3rem', alignSelf: 'flex-start' }}
                        >
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="user-dropdown-items">
                      <Link
                        href="/minha-conta"
                        className="user-dropdown-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Settings size={14} />
                        Minha Conta
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="user-dropdown-item"
                          onClick={() => setMenuOpen(false)}
                        >
                          <Settings size={14} />
                          Painel Admin
                        </Link>
                      )}

                      <button
                        className="user-dropdown-item user-dropdown-signout"
                        onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                      >
                        <LogOut size={14} />
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link href="/login" className="user-menu-btn user-menu-login">
                <LogIn size={15} />
                <span className="user-menu-name">Entrar</span>
              </Link>
            )}
          </li>
        </div>
      </div>
    </nav>
  );
}
