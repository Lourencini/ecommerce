'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useSession, signOut } from 'next-auth/react';
import { User, LogOut, Settings, ChevronDown, LogIn } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function Header() {
  const { totalItems } = useCart();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);

  const userName = session?.user?.name ?? 'Usuário';
  const isAdmin  = (session?.user as any)?.role === 'ADMIN';

  // Fecha dropdown de usuário ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fecha menu mobile ao mudar de rota
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Bloqueia scroll quando menu mobile está aberto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav className="navbar">
        <div className="container">
          {/* Hamburger — visível só em mobile */}
          <button
            className={`hamburger${mobileOpen ? ' open' : ''}`}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {/* Logo */}
          <Link href="/" className="logo">WB Maker</Link>

          {/* Links centrais — ocultos em mobile */}
          <ul className="nav-links">
            <li><Link href="/"              style={isActive('/')              ? { color: 'var(--clay-mid)' } : {}}>Vitrine</Link></li>
            <li><Link href="/produtos"      style={isActive('/produtos')      ? { color: 'var(--clay-mid)' } : {}}>Catálogo</Link></li>
            <li><Link href="/orders/track"  style={isActive('/orders/track')  ? { color: 'var(--clay-mid)' } : {}}>Rastrear Pedido</Link></li>
          </ul>

          {/* Direita: carrinho + usuário */}
          <div className="nav-right">
            <Link href="/cart" className="nav-cart-btn">
              Carrinho
              {totalItems > 0 && (
                <span className="cart-badge">{totalItems}</span>
              )}
            </Link>

            <li style={{ position: 'relative', listStyle: 'none' }} ref={menuRef}>
              {status === 'loading' ? (
                <span className="user-menu-btn" style={{ opacity: 0.4 }}><User size={16} /></span>
              ) : session ? (
                <>
                  <button
                    className="user-menu-btn"
                    onClick={() => setMenuOpen(v => !v)}
                    aria-expanded={menuOpen}
                  >
                    <User size={15} />
                    <span className="user-menu-name">{userName.split(' ')[0]}</span>
                    <ChevronDown size={13} style={{ transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>

                  {menuOpen && (
                    <div className="user-dropdown">
                      <div className="user-dropdown-header">
                        <strong>{userName}</strong>
                        <span className="user-dropdown-email">{session.user?.email}</span>
                        {isAdmin && (
                          <span className="badge badge-new" style={{ marginTop: '0.3rem', alignSelf: 'flex-start' }}>Admin</span>
                        )}
                      </div>
                      <div className="user-dropdown-items">
                        <Link href="/minha-conta" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                          <Settings size={14} /> Minha Conta
                        </Link>
                        {isAdmin && (
                          <Link href="/admin" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                            <Settings size={14} /> Painel Admin
                          </Link>
                        )}
                        <button
                          className="user-dropdown-item user-dropdown-signout"
                          onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                        >
                          <LogOut size={14} /> Sair
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

      {/* Mobile drawer backdrop */}
      <div
        className={`mobile-nav-backdrop${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Menu mobile">
          <div className="mobile-nav-header">
            <span className="logo" style={{ fontSize: '0.85rem' }}>WB Maker</span>
            <button className="mobile-nav-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">✕</button>
          </div>

          <Link href="/">Vitrine</Link>
          <Link href="/produtos">Catálogo</Link>
          <Link href="/orders/track">Rastrear Pedido</Link>
          <Link href="/cart">
            Carrinho {totalItems > 0 && `(${totalItems})`}
          </Link>

          <div className="mobile-nav-divider" />

          {session ? (
            <>
              <Link href="/minha-conta">Minha Conta</Link>
              {isAdmin && <Link href="/admin">Painel Admin</Link>}
              <button
                className="mobile-nav-item"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut size={14} /> Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Entrar</Link>
              <Link href="/register">Criar conta</Link>
            </>
          )}
        </nav>
      )}
    </>
  );
}
