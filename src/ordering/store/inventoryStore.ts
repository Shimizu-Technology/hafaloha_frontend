import { create } from 'zustand';
import { api } from '../lib/api';
import type { InventoryStatus } from '../types/inventory';
import { optionGroupsApi } from '../../shared/api/endpoints/optionGroups';
import { optionsApi } from '../../shared/api/endpoints/options';
import { handleApiError } from '../../shared/utils/errorHandler';

// FE-019: Option inventory types
interface OptionInventoryStatus {
  optionId: number;
  optionName: string;
  stock_quantity: number;
  damaged_quantity: number;
  available_quantity: number;
  low_stock_threshold?: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

interface OptionGroupInventoryStatus {
  optionGroupId: number;
  optionGroupName: string;
  menuItemId: string;
  menuItemName: string;
  has_inventory_tracking: boolean;
  options: OptionInventoryStatus[];
  total_stock: number;
  total_damaged: number;
  total_available: number;
}

interface InventoryStore {
  inventory: Record<string, InventoryStatus>;
  loading: boolean;
  error: string | null;
  
  // FE-019: Option inventory state
  optionGroupInventory: Record<string, OptionGroupInventoryStatus>; // key: `${menuItemId}-${optionGroupId}`
  optionInventoryLoading: boolean;
  optionInventoryError: string | null;
  
  // Original methods
  fetchInventory: () => Promise<void>;
  updateInventoryStatus: (itemId: string, status: Partial<InventoryStatus>) => Promise<void>;
  
  // FE-019: Option inventory methods
  fetchOptionGroupInventory: (menuItemId: string, optionGroupId: number) => Promise<OptionGroupInventoryStatus | null>;
  fetchAllOptionInventoryForAdmin: () => Promise<void>;
  updateOptionInventory: (optionId: number, updates: { stock_quantity?: number; damaged_quantity?: number }) => Promise<boolean>;
  updateOptionGroupInventoryTracking: (optionGroupId: number, enabled: boolean) => Promise<boolean>;
  
  // FE-019: Bulk option inventory operations
  bulkUpdateOptionInventory: (updates: Array<{ optionId: number; stock_quantity?: number; damaged_quantity?: number }>) => Promise<boolean>;
  
  // FE-019: Option inventory utility methods
  getOptionInventoryByMenuItem: (menuItemId: string) => OptionGroupInventoryStatus[];
  getOptionInventoryStatus: (optionId: number) => OptionInventoryStatus | null;
  isOptionLowStock: (optionId: number) => boolean;
  isOptionOutOfStock: (optionId: number) => boolean;
}

// Example shape from Rails: [{ itemId: 'aloha-poke', inStock: true, lowStock: false, quantity: 20 }, ...]

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  inventory: {},
  loading: false,
  error: null,
  
  // FE-019: Option inventory initial state
  optionGroupInventory: {},
  optionInventoryLoading: false,
  optionInventoryError: null,

  // GET /inventory_status
  fetchInventory: async () => {
    set({ loading: true, error: null });
    try {
      // Suppose your rails endpoint returns an array of inventory statuses
      const list: InventoryStatus[] = await api.get('/inventory_status');
      const record: Record<string, InventoryStatus> = {};
      list.forEach((inv) => {
        record[inv.itemId] = inv;
      });
      set({ inventory: record, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  // PATCH /inventory_status/:itemId
  updateInventoryStatus: async (itemId, status) => {
    set({ loading: true, error: null });
    try {
      // Usually we'd pass the updated fields in a JSON body, e.g.
      const updated = await api.patch(`/inventory_status/${itemId}`, status);
      // Merge updated into local store
      set((state) => ({
        loading: false,
        inventory: {
          ...state.inventory,
          [itemId]: { ...(state.inventory[itemId] || {}), ...(updated || {}) }
        }
      }));
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  // FE-019: Option inventory methods implementation
  fetchOptionGroupInventory: async (menuItemId: string, optionGroupId: number) => {
    set({ optionInventoryLoading: true, optionInventoryError: null });
    try {
      // Fetch option group inventory status using the available API
      const inventoryStatus = await optionGroupsApi.getInventoryStatus(optionGroupId);
      
      if (!inventoryStatus) {
        throw new Error('Option group inventory not found');
      }

              // Transform the data to our expected format
        const optionGroupInventory: OptionGroupInventoryStatus = {
          optionGroupId: inventoryStatus.option_group.id,
          optionGroupName: inventoryStatus.option_group.name,
          menuItemId,
          menuItemName: (inventoryStatus.option_group as any).menu_item_name || 'Unknown Item',
          has_inventory_tracking: (inventoryStatus.option_group as any).has_inventory_tracking || false,
        options: inventoryStatus.options_summary?.map((option: any) => ({
          optionId: option.option_id,
          optionName: option.name,
          stock_quantity: option.stock_quantity || 0,
          damaged_quantity: option.damaged_quantity || 0,
          available_quantity: option.available_quantity || 0,
          low_stock_threshold: option.low_stock_threshold,
          is_low_stock: option.available_quantity <= (option.low_stock_threshold || 10) && option.available_quantity > 0,
          is_out_of_stock: option.available_quantity === 0,
        })) || [],
        total_stock: inventoryStatus.total_stock || 0,
        total_damaged: inventoryStatus.total_damaged || 0,
        total_available: inventoryStatus.total_stock - inventoryStatus.total_damaged,
      };

      // Store in state
      const key = `${menuItemId}-${optionGroupId}`;
      set((state) => ({
        optionInventoryLoading: false,
        optionGroupInventory: {
          ...state.optionGroupInventory,
          [key]: optionGroupInventory
        }
      }));

      return optionGroupInventory;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ optionInventoryLoading: false, optionInventoryError: errorMessage });
      return null;
    }
  },

  fetchAllOptionInventoryForAdmin: async () => {
    set({ optionInventoryLoading: true, optionInventoryError: null });
    try {
      // Since there's no getAll method, we'll need to implement this differently
      // For now, we'll just clear the error and set loading to false
      // This method would need to be implemented based on available backend endpoints
      console.warn('[InventoryStore] fetchAllOptionInventoryForAdmin not fully implemented - needs backend support');
      
      set({ 
        optionInventoryLoading: false, 
        optionInventoryError: 'Method not yet implemented - requires backend support'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ optionInventoryLoading: false, optionInventoryError: errorMessage });
    }
  },

  updateOptionInventory: async (optionId: number, updates: { stock_quantity?: number; damaged_quantity?: number }) => {
    set({ optionInventoryLoading: true, optionInventoryError: null });
    try {
      // Use the available updateStock method for stock_quantity updates
      if (updates.stock_quantity !== undefined) {
        await optionsApi.updateStock(optionId, {
          stock_quantity: updates.stock_quantity,
          reason: 'Admin inventory update'
        });
      }
      
      // Use markDamaged for damaged_quantity updates
      if (updates.damaged_quantity !== undefined) {
        // Note: This might need adjustment based on the exact API behavior
        await optionsApi.markDamaged(optionId, {
          quantity: updates.damaged_quantity,
          reason: 'Admin inventory update'
        });
      }
      
      // Update local state
      set((state) => {
        const updatedInventory = { ...state.optionGroupInventory };
        
        // Find and update the option in all option groups
        Object.keys(updatedInventory).forEach((key) => {
          const optionGroup = updatedInventory[key];
          const optionIndex = optionGroup.options.findIndex(opt => opt.optionId === optionId);
          
          if (optionIndex !== -1) {
            const updatedOptions = [...optionGroup.options];
            const currentOption = updatedOptions[optionIndex];
            
            // Update the option
            const newStockQuantity = updates.stock_quantity ?? currentOption.stock_quantity;
            const newDamagedQuantity = updates.damaged_quantity ?? currentOption.damaged_quantity;
            const newAvailableQuantity = Math.max(0, newStockQuantity - newDamagedQuantity);
            
            updatedOptions[optionIndex] = {
              ...currentOption,
              stock_quantity: newStockQuantity,
              damaged_quantity: newDamagedQuantity,
              available_quantity: newAvailableQuantity,
              is_out_of_stock: newAvailableQuantity === 0,
              is_low_stock: newAvailableQuantity <= (currentOption.low_stock_threshold || 10) && newAvailableQuantity > 0,
            };
            
            // Recalculate totals
            const updatedOptionGroup = {
              ...optionGroup,
              options: updatedOptions,
            };
            
            updatedOptionGroup.total_stock = updatedOptions.reduce((sum, opt) => sum + opt.stock_quantity, 0);
            updatedOptionGroup.total_damaged = updatedOptions.reduce((sum, opt) => sum + opt.damaged_quantity, 0);
            updatedOptionGroup.total_available = updatedOptions.reduce((sum, opt) => sum + opt.available_quantity, 0);
            
            updatedInventory[key] = updatedOptionGroup;
          }
        });
        
        return {
          optionInventoryLoading: false,
          optionGroupInventory: updatedInventory
        };
      });
      
      return true;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ optionInventoryLoading: false, optionInventoryError: errorMessage });
      return false;
    }
  },

  updateOptionGroupInventoryTracking: async (optionGroupId: number, enabled: boolean) => {
    set({ optionInventoryLoading: true, optionInventoryError: null });
    try {
      if (enabled) {
        // Need to provide menu_item_id for enabling - this would need to be passed as a parameter
        // For now, we'll handle this in the calling code
        throw new Error('Enabling inventory tracking requires menu_item_id parameter');
      } else {
        await optionGroupsApi.disableInventoryTracking(optionGroupId);
      }
      
      // Update local state
      set((state) => {
        const updatedInventory = { ...state.optionGroupInventory };
        
        // Find and update the option group
        Object.keys(updatedInventory).forEach((key) => {
          if (updatedInventory[key].optionGroupId === optionGroupId) {
            updatedInventory[key] = {
              ...updatedInventory[key],
              has_inventory_tracking: enabled
            };
          }
        });
        
        return {
          optionInventoryLoading: false,
          optionGroupInventory: updatedInventory
        };
      });
      
      return true;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ optionInventoryLoading: false, optionInventoryError: errorMessage });
      return false;
    }
  },

  bulkUpdateOptionInventory: async (updates: Array<{ optionId: number; stock_quantity?: number; damaged_quantity?: number }>) => {
    set({ optionInventoryLoading: true, optionInventoryError: null });
    try {
      // Since there's no bulk update API, update each option individually
      for (const update of updates) {
        await get().updateOptionInventory(update.optionId, {
          stock_quantity: update.stock_quantity,
          damaged_quantity: update.damaged_quantity
        });
      }
      
      return true;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ optionInventoryLoading: false, optionInventoryError: errorMessage });
      return false;
    }
  },

  // FE-019: Utility methods
  getOptionInventoryByMenuItem: (menuItemId: string) => {
    const { optionGroupInventory } = get();
    return Object.values(optionGroupInventory).filter(
      (group) => group.menuItemId === menuItemId
    );
  },

  getOptionInventoryStatus: (optionId: number) => {
    const { optionGroupInventory } = get();
    for (const group of Object.values(optionGroupInventory)) {
      const option = group.options.find(opt => opt.optionId === optionId);
      if (option) {
        return option;
      }
    }
    return null;
  },

  isOptionLowStock: (optionId: number) => {
    const option = get().getOptionInventoryStatus(optionId);
    return option?.is_low_stock || false;
  },

  isOptionOutOfStock: (optionId: number) => {
    const option = get().getOptionInventoryStatus(optionId);
    return option?.is_out_of_stock || false;
  }
}));
