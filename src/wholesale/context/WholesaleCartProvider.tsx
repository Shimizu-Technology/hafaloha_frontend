// src/wholesale/context/WholesaleCartProvider.tsx
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useWholesaleCartStore, WholesaleCartItem, WholesaleFundraiser } from '../store/wholesaleCartStore';

interface WholesaleCartContextValue {
  // Cart state
  items: WholesaleCartItem[];
  fundraiser: WholesaleFundraiser | null;
  loading: boolean;
  error: string | null;
  websocketConnected: boolean;
  
  // Cart actions
  addToCart: (item: Omit<WholesaleCartItem, 'quantity' | 'addedAt' | 'updatedAt'>, quantity?: number) => boolean;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  
  // Cart calculations
  getCartTotal: () => number;
  getCartTotalCents: () => number;
  getItemCount: () => number;
  getTotalQuantity: () => number;
  
  // Fundraiser management
  setFundraiser: (fundraiser: WholesaleFundraiser) => void;
  
  // Validation
  validateCart: () => Promise<boolean>;
  
    // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Cart cleanup
  removeUnavailableItems: () => Promise<void>;

  // WebSocket methods
  startWebSocketConnection: () => boolean;
  stopWebSocketConnection: () => void;
}

const WholesaleCartContext = createContext<WholesaleCartContextValue | undefined>(undefined);

export function WholesaleCartProvider({ children }: { children: ReactNode }) {
  const {
    items,
    fundraiser,
    loading,
    error,
    websocketConnected,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartTotalCents,
    getItemCount,
    getTotalQuantity,
    setFundraiser,
    validateCart,
    setLoading,
    setError,
    removeUnavailableItems,
    startWebSocketConnection,
    stopWebSocketConnection
  } = useWholesaleCartStore();

  // Start WebSocket connection when provider mounts
  useEffect(() => {
    console.log('[WholesaleCartProvider] Starting WebSocket connection...');
    startWebSocketConnection();

    // Cleanup on unmount
    return () => {
      console.log('[WholesaleCartProvider] Stopping WebSocket connection...');
      stopWebSocketConnection();
    };
  }, [startWebSocketConnection, stopWebSocketConnection]);

  const contextValue: WholesaleCartContextValue = {
    items,
    fundraiser,
    loading,
    error,
    websocketConnected,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartTotalCents,
    getItemCount,
    getTotalQuantity,
    setFundraiser,
    validateCart,
    setLoading,
    setError,
    removeUnavailableItems,
    startWebSocketConnection,
    stopWebSocketConnection
  };

  return (
    <WholesaleCartContext.Provider value={contextValue}>
      {children}
    </WholesaleCartContext.Provider>
  );
}

export function useWholesaleCart() {
  const context = useContext(WholesaleCartContext);
  if (context === undefined) {
    throw new Error('useWholesaleCart must be used within a WholesaleCartProvider');
  }
  return context;
}