"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type CartItem = {
    productId: string;
    sku: string;
    name: string;
    price: number;
    quantity: number;
    weightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    imageUrl: string;
};

interface CartContextProps {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;
}

const CartContext = createContext<CartContextProps>({} as CartContextProps);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>([]);

    // Load from local storage
    useEffect(() => {
        const stored = localStorage.getItem('e3d_cart');
        if (stored) {
            try {
                setItems(JSON.parse(stored));
            } catch (e) { }
        }
    }, []);

    // Sync to local storage
    useEffect(() => {
        localStorage.setItem('e3d_cart', JSON.stringify(items));
    }, [items]);

    const addToCart = (newItem: CartItem) => {
        setItems((prev) => {
            const existing = prev.find((item) => item.productId === newItem.productId);
            if (existing) {
                return prev.map((item) =>
                    item.productId === newItem.productId
                        ? { ...item, quantity: item.quantity + newItem.quantity }
                        : item
                );
            }
            return [...prev, newItem];
        });
    };

    const removeFromCart = (productId: string) => {
        setItems((prev) => prev.filter((item) => item.productId !== productId));
    };

    const clearCart = () => setItems([]);

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, totalItems, subtotal }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
