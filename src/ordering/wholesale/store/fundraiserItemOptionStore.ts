// src/ordering/wholesale/store/fundraiserItemOptionStore.ts
import { create } from 'zustand';
import { fundraiserItemOptionService } from '../services/fundraiserItemOptionService';
import { FundraiserOptionGroup } from '../types/optionGroups';

interface FundraiserItemOptionState {
  // Cache for option groups by item ID
  optionGroupsByItemId: Record<number, FundraiserOptionGroup[]>;
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchOptionGroups: (itemId: number, fundraiserId: number) => Promise<void>;
  getOptionGroupsForItem: (itemId: number) => FundraiserOptionGroup[] | undefined;
  clearError: () => void;
}

const useFundraiserItemOptionStore = create<FundraiserItemOptionState>((set, get) => ({
  // Initial state
  optionGroupsByItemId: {},
  isLoading: false,
  error: null,
  
  // Fetch option groups for a specific item and cache them
  fetchOptionGroups: async (itemId: number, fundraiserId: number) => {
    console.log(`[fundraiserItemOptionStore] Fetching option groups for item ${itemId}, fundraiser ${fundraiserId}`);
    set({ isLoading: true, error: null });
    
    if (!fundraiserId) {
      console.error(`[fundraiserItemOptionStore] Missing fundraiserId for item ${itemId}`);
      set({ 
        error: 'Missing fundraiserId parameter',
        isLoading: false 
      });
      return;
    }
    
    try {
      console.log(`[fundraiserItemOptionStore] Calling service.getOptionGroups(${itemId}, ${fundraiserId})`);
      const optionGroups = await fundraiserItemOptionService.getOptionGroups(itemId, fundraiserId);
      console.log(`[fundraiserItemOptionStore] Received option groups:`, optionGroups);
      
      // Update the cache with the fetched option groups
      set((state) => {
        console.log(`[fundraiserItemOptionStore] Updating cache for item ${itemId} with ${optionGroups.length} option groups`);
        return {
          optionGroupsByItemId: {
            ...state.optionGroupsByItemId,
            [itemId]: optionGroups
          },
          isLoading: false
        };
      });
    } catch (error) {
      console.error(`[fundraiserItemOptionStore] Error fetching option groups for item ${itemId}:`, error);
      set({ 
        error: 'Failed to fetch option groups for this item.',
        isLoading: false 
      });
    }
  },
  
  // Get cached option groups for an item
  getOptionGroupsForItem: (itemId: number) => {
    const { optionGroupsByItemId } = get();
    return optionGroupsByItemId[itemId];
  },
  
  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

export default useFundraiserItemOptionStore;
