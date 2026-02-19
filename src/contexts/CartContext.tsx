import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CartItem, MenuItem } from '@/data/menu';

interface CartContextType {
  cart: CartItem[];
  addItem: (item: MenuItem) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
  cartCount: () => number;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addItem = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: number) => {
    setCart(prev => {
      const item = prev.find(c => c.id === id);
      if (!item) return prev;
      if (item.qty > 1) return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c);
      return prev.filter(c => c.id !== id);
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);
  const cartTotal = useCallback(() => cart.reduce((a, i) => a + i.price * i.qty, 0), [cart]);
  const cartCount = useCallback(() => cart.reduce((a, i) => a + i.qty, 0), [cart]);

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};
