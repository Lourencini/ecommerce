"use client";
import React from 'react';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart } from 'lucide-react';

export function Header() {
    const { totalItems } = useCart();

    return (
        <nav className="navbar">
            <div className="container">
                <h1 className="logo"><a href="/">E-3D Print</a></h1>
                <ul className="nav-links">
                    <li><a href="/">Vitrine</a></li>
                    <li><a href="/admin">Painel Admin</a></li>
                    <li>
                        <a href="/cart" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShoppingCart size={20} />
                            {totalItems > 0 && (
                                <span style={{
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    padding: '2px 8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold'
                                }}>{totalItems}</span>
                            )}
                        </a>
                    </li>
                </ul>
            </div>
        </nav>
    );
}
