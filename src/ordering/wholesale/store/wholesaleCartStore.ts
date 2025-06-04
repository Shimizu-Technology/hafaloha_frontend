// src/ordering/wholesale/store/wholesaleCartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../../store/orderStore';
import { GENERAL_SUPPORT_ID } from '../components/ParticipantSelector';
import { SelectedOptionGroup } from '../types/optionGroups';

/** WholesaleCartItem extends CartItem and adds fundraiser fields */
export interface WholesaleCartItem extends Omit<CartItem, 'customizations'> {
  fundraiserId: number;
  participantId?: number;
  selectedOptions?: SelectedOptionGroup[];
  customizations?: Record<string, string[]>;
  // Optional pricing information for customizations
  customizationPrices?: Record<string, number>;
  // Base price before customizations
  basePrice?: number;
}

/** Interface for mapping fundraisers to selected participants */
export interface FundraiserParticipantMapping {
  [fundraiserId: number]: number;
}

/** Interface for the wholesale cart store state and actions */
export interface WholesaleCartStore {
  // State
  cartItems: WholesaleCartItem[];
  loading: boolean;
  error: string | null;
  participantSelections: FundraiserParticipantMapping;

  // Core cart operations (reused from orderStore)
  _getItemKey: (item: WholesaleCartItem) => string;
  addToCart: (item: WholesaleCartItem & { quantity?: number }, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  setCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setCartItemNotes: (itemId: string, notes: string) => void;

  // Fundraiser-specific operations
  setParticipant: (itemId: string, participantId: number) => void;
  
  // New fundraiser-participant operations
  setFundraiserParticipant: (fundraiserId: number, participantId: number) => void;
  getFundraiserParticipant: (fundraiserId: number) => number | undefined;
  getUniqueFundraisers: () => number[];
  getFundraiserItems: (fundraiserId: number) => WholesaleCartItem[];

  // Option selection operations
  setItemOptions: (itemId: string, selectedOptions: SelectedOptionGroup[]) => void;
  calculateItemPrice: (item: WholesaleCartItem) => number;
  calculateItemTotalPrice: (item: WholesaleCartItem) => number;
}

/** Create the wholesale cart store with persistence */
export const useWholesaleCartStore = create<WholesaleCartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      cartItems: [],
      loading: false,
      error: null,
      participantSelections: {},

      // Core cart operations
      _getItemKey: (item) => {
        if (!item) return '';
        // Include fundraiserId in the key to prevent conflicts
        return `${item.id}-${item.fundraiserId}${item.participantId ? `-${item.participantId}` : ''}`;
      },

      addToCart: (item, quantity = 1) => {
        set((state) => {
          const getItemKey = get()._getItemKey;
          // Create a new object without the quantity property
          const { quantity: _, ...itemWithoutQuantity } = item;
          
          const itemKey = getItemKey(itemWithoutQuantity as WholesaleCartItem);
          const existing = state.cartItems.find(ci => getItemKey(ci) === itemKey);

          if (existing) {
            return {
              cartItems: state.cartItems.map(ci =>
                getItemKey(ci) === itemKey
                  ? { ...ci, quantity: ci.quantity + quantity }
                  : ci
              )
            };
          }
          return { 
            cartItems: [...state.cartItems, { 
              ...itemWithoutQuantity, 
              quantity,
              fundraiserId: item.fundraiserId
            } as WholesaleCartItem] 
          };
        });
      },

      removeFromCart: (itemId) => {
        set((state) => {
          const itemToRemove = state.cartItems.find(ci =>
            ci.id === itemId || get()._getItemKey(ci) === itemId
          );
          if (!itemToRemove) return state;
          const fullKey = get()._getItemKey(itemToRemove);
          return {
            cartItems: state.cartItems.filter(ci => get()._getItemKey(ci) !== fullKey)
          };
        });
      },

      setCartQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId);
        } else {
          set((state) => {
            const itemToUpdate = state.cartItems.find(ci =>
              ci.id === itemId || get()._getItemKey(ci) === itemId
            );
            if (!itemToUpdate) return state;
            const fullKey = get()._getItemKey(itemToUpdate);
            return {
              cartItems: state.cartItems.map(ci =>
                get()._getItemKey(ci) === fullKey
                  ? { ...ci, quantity }
                  : ci
              )
            };
          });
        }
      },

      clearCart: () => {
        // Clear cart items and reset participant selections to general support when applicable
        set({ 
          cartItems: [],
          participantSelections: {}
        });
      },

      setCartItemNotes: (itemId, notes) => {
        set((state) => {
          const itemToUpdate = state.cartItems.find(ci =>
            ci.id === itemId || get()._getItemKey(ci) === itemId
          );
          if (!itemToUpdate) return state;
          const fullKey = get()._getItemKey(itemToUpdate);
          return {
            cartItems: state.cartItems.map(ci =>
              get()._getItemKey(ci) === fullKey
                ? { ...ci, notes }
                : ci
            )
          };
        });
      },

      // Fundraiser-specific operations
      setParticipant: (itemId, participantId) => {
        set((state) => {
          const itemToUpdate = state.cartItems.find(ci =>
            ci.id === itemId || get()._getItemKey(ci) === itemId
          );
          if (!itemToUpdate) return state;
          const fullKey = get()._getItemKey(itemToUpdate);
          return {
            cartItems: state.cartItems.map(ci =>
              get()._getItemKey(ci) === fullKey
                ? { ...ci, participantId }
                : ci
            )
          };
        });
      },
      
      // New fundraiser-participant mapping operations
      setFundraiserParticipant: (fundraiserId, participantId) => {
        // Validate the participantId - use GENERAL_SUPPORT_ID if value is invalid
        const validParticipantId = participantId || GENERAL_SUPPORT_ID;
        
        set((state) => ({
          participantSelections: {
            ...state.participantSelections,
            [fundraiserId]: validParticipantId
          }
        }));
      },
      
      getFundraiserParticipant: (fundraiserId) => {
        return get().participantSelections[fundraiserId];
      },
      
      getUniqueFundraisers: () => {
        const fundraiserIds = new Set<number>();
        get().cartItems.forEach(item => {
          if (item.fundraiserId) fundraiserIds.add(item.fundraiserId);
        });
        return Array.from(fundraiserIds);
      },
      
      getFundraiserItems: (fundraiserId) => {
        return get().cartItems.filter(item => item.fundraiserId === fundraiserId);
      },

      // Option selection operations
      setItemOptions: (itemId, selectedOptions) => {
        set(state => ({
          cartItems: state.cartItems.map(item => {
            if (get()._getItemKey(item) === itemId) {
              return { ...item, selectedOptions };
            }
            return item;
          })
        }));
      },

      calculateItemPrice: (item) => {
        // Base price
        let price = item.price || 0;
        
        // Add option prices
        if (item.selectedOptions) {
          item.selectedOptions.forEach(group => {
            group.options.forEach(option => {
              price += option.additional_price || 0;
            });
          });
        }

        return price;
      },

      calculateItemTotalPrice: (item) => {
        const unitPrice = get().calculateItemPrice(item);
        return unitPrice * (item.quantity || 1);
      },
    }),
    {
      name: 'wholesale-cart-storage',
      partialize: (state) => ({
        cartItems: state.cartItems,
      }),
    }
  )
);
