// src/ordering/wholesale/store/cartStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FundraiserItem } from '../services/fundraiserService';

export interface CartItem {
  item: FundraiserItem;
  quantity: number;
  participantId: number;
  participantName: string;
}

interface CartState {
  // Cart items
  items: CartItem[];
  
  // Selected participant (for adding new items)
  selectedParticipantId: number | null;
  selectedParticipantName: string | null;
  
  // Cart operations
  addItem: (item: FundraiserItem, participantId: number, participantName: string) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  removeItem: (itemId: number) => void;
  clearCart: () => void;
  
  // Participant selection
  setSelectedParticipant: (participantId: number | null, participantName: string | null) => void;
  
  // Cart calculations
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getTotalItems: () => number;
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      selectedParticipantId: null,
      selectedParticipantName: null,
      
      // Add item to cart
      addItem: (item: FundraiserItem, participantId: number, participantName: string) => {
        const { items } = get();
        
        // Check if item already exists for the same participant
        const existingItemIndex = items.findIndex(
          cartItem => cartItem.item.id === item.id && cartItem.participantId === participantId
        );
        
        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += 1;
          set({ items: updatedItems });
        } else {
          // Add new item
          set({
            items: [
              ...items,
              {
                item,
                quantity: 1,
                participantId,
                participantName
              }
            ]
          });
        }
      },
      
      // Update item quantity
      updateQuantity: (itemId: number, quantity: number) => {
        const { items } = get();
        
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          set({
            items: items.filter(item => item.item.id !== itemId)
          });
        } else {
          // Update quantity
          set({
            items: items.map(item => 
              item.item.id === itemId
                ? { ...item, quantity }
                : item
            )
          });
        }
      },
      
      // Remove item from cart
      removeItem: (itemId: number) => {
        const { items } = get();
        set({
          items: items.filter(item => item.item.id !== itemId)
        });
      },
      
      // Clear cart
      clearCart: () => {
        set({
          items: []
        });
      },
      
      // Set selected participant
      setSelectedParticipant: (participantId: number | null, participantName: string | null) => {
        set({
          selectedParticipantId: participantId,
          selectedParticipantName: participantName
        });
      },
      
      // Calculate subtotal
      getSubtotal: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + (item.item.price * item.quantity),
          0
        );
      },
      
      // Calculate tax (assuming 8.5% tax rate)
      getTax: () => {
        const subtotal = get().getSubtotal();
        return subtotal * 0.085;
      },
      
      // Calculate total
      getTotal: () => {
        const subtotal = get().getSubtotal();
        const tax = get().getTax();
        return subtotal + tax;
      },
      
      // Get total number of items
      getTotalItems: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + item.quantity,
          0
        );
      }
    }),
    {
      name: 'wholesale-cart-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useCartStore;
