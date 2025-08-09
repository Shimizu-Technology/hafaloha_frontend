// src/wholesale/hooks/useCartConflict.ts
import { useState, useCallback } from 'react';
import { useWholesaleCart } from '../context/WholesaleCartProvider';

export interface CartConflictState {
  isModalOpen: boolean;
  conflictData: {
    currentFundraiser: string;
    newFundraiser: string;
    itemCount: number;
  } | null;
  pendingAction: (() => void) | null;
}

export function useCartConflict() {
  const { items, fundraiser, clearCart, setFundraiser } = useWholesaleCart();
  const [conflictState, setConflictState] = useState<CartConflictState>({
    isModalOpen: false,
    conflictData: null,
    pendingAction: null
  });

  const checkCartConflict = useCallback((
    newFundraiser: { id: number; name: string; slug: string },
    onSuccess: () => void
  ): boolean => {
    // No conflict if cart is empty or same fundraiser
    if (items.length === 0 || !fundraiser || fundraiser.id === newFundraiser.id) {
      onSuccess();
      return true;
    }

    // Conflict detected - show modal
    setConflictState({
      isModalOpen: true,
      conflictData: {
        currentFundraiser: fundraiser.name,
        newFundraiser: newFundraiser.name,
        itemCount: items.length
      },
      pendingAction: () => {
        setFundraiser(newFundraiser);
        onSuccess();
      }
    });

    return false;
  }, [items.length, fundraiser, setFundraiser]);

  const handleClearAndContinue = useCallback(() => {
    if (conflictState.pendingAction) {
      clearCart();
      conflictState.pendingAction();
    }
    setConflictState({
      isModalOpen: false,
      conflictData: null,
      pendingAction: null
    });
  }, [conflictState.pendingAction, clearCart]);

  const handleCancelAndStay = useCallback(() => {
    setConflictState({
      isModalOpen: false,
      conflictData: null,
      pendingAction: null
    });
  }, []);

  const closeModal = useCallback(() => {
    setConflictState({
      isModalOpen: false,
      conflictData: null,
      pendingAction: null
    });
  }, []);

  const hasCartItems = items.length > 0;
  const currentFundraiserId = fundraiser?.id || (items.length > 0 ? items[0].fundraiserId : null);

  return {
    // State
    isModalOpen: conflictState.isModalOpen,
    conflictData: conflictState.conflictData,
    hasCartItems,
    currentFundraiserId,
    
    // Actions
    checkCartConflict,
    handleClearAndContinue,
    handleCancelAndStay,
    closeModal
  };
}