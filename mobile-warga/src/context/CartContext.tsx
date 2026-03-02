import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, VariantOption } from '../screens/ProductDetailScreen';

export interface CartItem extends Product {
  quantity: number;
  selected?: boolean;
  selectedVariants?: Record<string, VariantOption[]>;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedVariants?: Record<string, VariantOption[]>) => void;
  removeFromCart: (productId: number, selectedVariants?: Record<string, VariantOption[]>) => void;
  updateQuantity: (productId: number, quantity: number, selectedVariants?: Record<string, VariantOption[]>) => void;
  toggleSelection: (productId: number, selectedVariants?: Record<string, VariantOption[]>) => void;
  toggleAllSelection: (selected: boolean) => void;
  clearCart: () => void;
  removeSelectedItems: () => void;
  cartTotal: number;
  itemCount: number;
  selectedItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from storage on mount
  useEffect(() => {
    loadCart();
  }, []);

  // Save cart to storage whenever it changes
  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const loadCart = async () => {
    try {
      const storedCart = await AsyncStorage.getItem('user_cart');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error('Failed to load cart', error);
    }
  };

  const saveCart = async (newCart: CartItem[]) => {
    try {
      await AsyncStorage.setItem('user_cart', JSON.stringify(newCart));
    } catch (error) {
      console.error('Failed to save cart', error);
    }
  };

  const addToCart = (product: Product, quantity = 1, selectedVariants?: Record<string, VariantOption[]>) => {
    setCart(prevCart => {
      // Create a unique key for comparison based on ID and variants
      const getVariantKey = (pVariants?: Record<string, VariantOption[]>) => {
        if (!pVariants) return '';
        return JSON.stringify(pVariants);
      };

      const currentVariantKey = getVariantKey(selectedVariants);

      const existingItemIndex = prevCart.findIndex(item => 
        item.id === product.id && getVariantKey(item.selectedVariants) === currentVariantKey
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + quantity,
          selected: true
        };
        return newCart;
      }

      // Add new item
      return [...prevCart, { ...product, quantity, selected: true, selectedVariants }];
    });
  };

  const removeFromCart = (productId: number, selectedVariants?: Record<string, VariantOption[]>) => {
    setCart(prevCart => {
       const getVariantKey = (pVariants?: Record<string, VariantOption[]>) => {
        if (!pVariants) return '';
        return JSON.stringify(pVariants);
      };
      const targetVariantKey = getVariantKey(selectedVariants);
      
      return prevCart.filter(item => 
        !(item.id === productId && getVariantKey(item.selectedVariants) === targetVariantKey)
      );
    });
  };

  const updateQuantity = (productId: number, quantity: number, selectedVariants?: Record<string, VariantOption[]>) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedVariants);
      return;
    }
    setCart(prevCart => {
      const getVariantKey = (pVariants?: Record<string, VariantOption[]>) => {
        if (!pVariants) return '';
        return JSON.stringify(pVariants);
      };
      const targetVariantKey = getVariantKey(selectedVariants);

      return prevCart.map(item =>
        (item.id === productId && getVariantKey(item.selectedVariants) === targetVariantKey)
          ? { ...item, quantity } 
          : item
      );
    });
  };

  const toggleSelection = (productId: number, selectedVariants?: Record<string, VariantOption[]>) => {
    setCart(prevCart => {
      const getVariantKey = (pVariants?: Record<string, VariantOption[]>) => {
        if (!pVariants) return '';
        return JSON.stringify(pVariants);
      };
      const targetVariantKey = getVariantKey(selectedVariants);

      return prevCart.map(item =>
        (item.id === productId && getVariantKey(item.selectedVariants) === targetVariantKey)
          ? { ...item, selected: !item.selected } 
          : item
      );
    });
  };

  const toggleAllSelection = (selected: boolean) => {
    setCart(prevCart =>
      prevCart.map(item => ({ ...item, selected }))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const removeSelectedItems = () => {
    setCart(prevCart => prevCart.filter(item => !item.selected));
  };

  const cartTotal = cart.reduce((total, item) => {
    if (!item.selected) return total;
    let price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    
    // Add variant prices
    if (item.selectedVariants) {
      Object.values(item.selectedVariants).forEach(options => {
        options.forEach(opt => {
          price += (opt.price || 0);
        });
      });
    }

    return total + (price || 0) * item.quantity;
  }, 0);

  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const selectedItemCount = cart.reduce((count, item) => item.selected ? count + item.quantity : count, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleSelection,
        toggleAllSelection,
        clearCart,
        removeSelectedItems,
        cartTotal,
        itemCount,
        selectedItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
