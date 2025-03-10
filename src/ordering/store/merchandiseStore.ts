import { create } from 'zustand';
import { api } from '../lib/api';

export interface MerchandiseVariant {
  id: number;
  merchandise_item_id: number;
  size: string;
  color: string;
  price_adjustment: number;
  stock_quantity: number;
  sku?: string;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  low_stock_threshold?: number;
  created_at?: string;
  updated_at?: string;
  stock_history?: StockHistoryEntry[];
}

export interface StockHistoryEntry {
  id: number;
  merchandise_variant_id: number;
  previous_quantity: number;
  new_quantity: number;
  change_reason: string;
  user_id: number;
  user_name: string;
  change_type: 'manual' | 'order' | 'return' | 'adjustment';
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  merchandise_collection_id: number;
}

export interface MerchandiseItem {
  id: number;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  second_image_url?: string; // For simplified model - front/back image approach
  additional_images?: string[]; // Array of additional images (front, back, etc.) - legacy support
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  merchandise_collection_id: number;
  category_id?: number; // Added for category filtering
  variants?: MerchandiseVariant[];
  collection_name?: string; // Added for "All Items" view
  created_at?: string;
  updated_at?: string;
  low_stock_threshold?: number; // Added for stock management
  quantity?: number; // Used when adding to cart
}

export interface MerchandiseCollection {
  id: number;
  name: string;
  description: string;
  restaurant_id: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface MerchandiseStore {
  collections: MerchandiseCollection[];
  merchandiseItems: MerchandiseItem[];
  categories: Category[];
  variants: MerchandiseVariant[];
  loading: boolean;
  error: string | null;

  // Collection operations
  fetchCollections: () => Promise<void>;
  createCollection: (name: string, description: string, restaurantId: number) => Promise<MerchandiseCollection>;
  updateCollection: (id: number, data: Partial<MerchandiseCollection>) => Promise<void>;
  deleteCollection: (id: number) => Promise<void>;
  setActiveCollection: (id: number) => Promise<void>;

  // Category operations
  fetchCategories: () => Promise<void>;
  
  // Merchandise item operations
  fetchMerchandiseItems: (params: { collection_id?: number, include_collection_names?: boolean }) => Promise<void>;
  addMerchandiseItem: (item: Omit<MerchandiseItem, 'id'>) => Promise<MerchandiseItem>;
  updateMerchandiseItem: (id: number, data: Partial<MerchandiseItem>) => Promise<void>;
  deleteMerchandiseItem: (id: number) => Promise<void>;

  // Variant operations
  fetchVariants: (params: { include_stock_data?: boolean }) => Promise<void>;
  fetchVariantHistory: (variantId: number) => Promise<void>;
  addMerchandiseVariant: (variant: Omit<MerchandiseVariant, 'id'>) => Promise<MerchandiseVariant>;
  updateVariant: (id: number, data: { stock_quantity?: number, adjustment_reason?: string, [key: string]: any }) => Promise<void>;
  deleteMerchandiseVariant: (id: number) => Promise<void>;
  batchCreateVariants: (itemId: number, variants: Omit<MerchandiseVariant, 'id' | 'merchandise_item_id'>[]) => Promise<MerchandiseVariant[]>;
}

export const useMerchandiseStore = create<MerchandiseStore>((set, get) => ({
  collections: [],
  merchandiseItems: [],
  categories: [],
  variants: [],
  loading: false,
  error: null,

  // Collection operations
  fetchCollections: async () => {
    set({ loading: true, error: null });
    try {
      const collections = await api.get<MerchandiseCollection[]>('/merchandise_collections');
      set({ collections, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error fetching collections:', err);
    }
  },

  createCollection: async (name, description, restaurantId) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        merchandise_collection: {
          name,
          description,
          restaurant_id: restaurantId
        }
      };
      const newCollection = await api.post<MerchandiseCollection>('/merchandise_collections', payload);
      set((state) => ({
        collections: [...state.collections, newCollection],
        loading: false
      }));
      return newCollection;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error creating collection:', err);
      throw err;
    }
  },

  updateCollection: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        merchandise_collection: data
      };
      const updatedCollection = await api.patch<MerchandiseCollection>(`/merchandise_collections/${id}`, payload);
      set((state) => ({
        collections: state.collections.map(c => c.id === id ? updatedCollection : c),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error updating collection:', err);
      throw err;
    }
  },

  deleteCollection: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/merchandise_collections/${id}`);
      set((state) => ({
        collections: state.collections.filter(c => c.id !== id),
        // If we're deleting a collection, also remove its items from the state
        merchandiseItems: state.merchandiseItems.filter(item => item.merchandise_collection_id !== id),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error deleting collection:', err);
      throw err;
    }
  },

  setActiveCollection: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/merchandise_collections/${id}/set_active`);
      
      // Update local state to reflect the change
      set((state) => ({
        collections: state.collections.map(c => ({
          ...c,
          active: c.id === id
        })),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error setting active collection:', err);
      throw err;
    }
  },

  // Merchandise item operations
  fetchMerchandiseItems: async (params) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.collection_id) {
        queryParams.append('collection_id', params.collection_id.toString());
      }
      if (params.include_collection_names) {
        queryParams.append('include_collection_names', 'true');
      }
      
      const url = `/merchandise_items?${queryParams.toString()}`;
      const items = await api.get<MerchandiseItem[]>(url);
      set({ merchandiseItems: items, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error fetching merchandise items:', err);
    }
  },

  addMerchandiseItem: async (item) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        merchandise_item: item
      };
      const newItem = await api.post<MerchandiseItem>('/merchandise_items', payload);
      set((state) => ({
        merchandiseItems: [...state.merchandiseItems, newItem],
        loading: false
      }));
      return newItem;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error adding merchandise item:', err);
      throw err;
    }
  },

  updateMerchandiseItem: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        merchandise_item: data
      };
      const updatedItem = await api.patch<MerchandiseItem>(`/merchandise_items/${id}`, payload);
      set((state) => ({
        merchandiseItems: state.merchandiseItems.map(item => 
          item.id === id ? updatedItem : item
        ),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error updating merchandise item:', err);
      throw err;
    }
  },

  deleteMerchandiseItem: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/merchandise_items/${id}`);
      set((state) => ({
        merchandiseItems: state.merchandiseItems.filter(item => item.id !== id),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error deleting merchandise item:', err);
      throw err;
    }
  },

  // Variant operations
  addMerchandiseVariant: async (variant) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        merchandise_variant: variant
      };
      const newVariant = await api.post<MerchandiseVariant>('/merchandise_variants', payload);
      
      // Update the item with the new variant
      set((state) => {
        const updatedItems = state.merchandiseItems.map(item => {
          if (item.id === variant.merchandise_item_id) {
            return {
              ...item,
              variants: [...(item.variants || []), newVariant]
            };
          }
          return item;
        });
        
        return {
          merchandiseItems: updatedItems,
          loading: false
        };
      });
      
      return newVariant;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error adding variant:', err);
      throw err;
    }
  },

  // Category operations
  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const categories = await api.get<Category[]>('/merchandise_categories');
      set({ categories, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error fetching categories:', err);
    }
  },

  // Variant operations with stock management
  fetchVariants: async (params: { include_stock_data?: boolean }) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params.include_stock_data) {
        queryParams.append('include_stock_data', 'true');
      }
      
      const url = `/merchandise_variants?${queryParams.toString()}`;
      const variants = await api.get<MerchandiseVariant[]>(url);
      set({ variants, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error fetching variants:', err);
    }
  },

  fetchVariantHistory: async (variantId: number) => {
    set({ loading: true, error: null });
    try {
      const url = `/merchandise_variants/${variantId}/history`;
      const history = await api.get<StockHistoryEntry[]>(url);
      
      // Update the variant with its history
      set((state) => {
        const updatedVariants = state.variants.map(variant => {
          if (variant.id === variantId) {
            return {
              ...variant,
              stock_history: history
            };
          }
          return variant;
        });
        
        return {
          variants: updatedVariants,
          loading: false
        };
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error fetching variant history:', err);
    }
  },

  updateVariant: async (id: number, data: { stock_quantity?: number, adjustment_reason?: string, [key: string]: any }) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        merchandise_variant: data
      };
      const updatedVariant = await api.patch<MerchandiseVariant>(`/merchandise_variants/${id}`, payload);
      
      // Update variants list
      set((state) => {
        const updatedVariants = state.variants.map(variant => 
          variant.id === id ? updatedVariant : variant
        );
        
        return {
          variants: updatedVariants,
          loading: false
        };
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error updating variant:', err);
      throw err;
    }
  },

  updateMerchandiseVariant: async (id: number, data: Partial<MerchandiseVariant>) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        merchandise_variant: data
      };
      const updatedVariant = await api.patch<MerchandiseVariant>(`/merchandise_variants/${id}`, payload);
      
      // Update the item with the updated variant
      set((state) => {
        const updatedItems = state.merchandiseItems.map(item => {
          if (item.variants) {
            const variantIndex = item.variants.findIndex(v => v.id === id);
            if (variantIndex !== -1) {
              const updatedVariants = [...item.variants];
              updatedVariants[variantIndex] = updatedVariant;
              return {
                ...item,
                variants: updatedVariants
              };
            }
          }
          return item;
        });
        
        return {
          merchandiseItems: updatedItems,
          loading: false
        };
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error updating variant:', err);
      throw err;
    }
  },

  deleteMerchandiseVariant: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/merchandise_variants/${id}`);
      
      // Remove the variant from the item
      set((state) => {
        const updatedItems = state.merchandiseItems.map(item => {
          if (item.variants) {
            return {
              ...item,
              variants: item.variants.filter(v => v.id !== id)
            };
          }
          return item;
        });
        
        return {
          merchandiseItems: updatedItems,
          loading: false
        };
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error deleting variant:', err);
      throw err;
    }
  },

  batchCreateVariants: async (itemId, variants) => {
    set({ loading: true, error: null });
    try {
      const payload = {
        merchandise_item_id: itemId,
        variants: variants
      };
      const newVariants = await api.post<MerchandiseVariant[]>(`/merchandise_items/${itemId}/batch_create_variants`, payload);
      
      // Update the item with the new variants
      set((state) => {
        const updatedItems = state.merchandiseItems.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              variants: [...(item.variants || []), ...newVariants]
            };
          }
          return item;
        });
        
        return {
          merchandiseItems: updatedItems,
          loading: false
        };
      });
      
      return newVariants;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      console.error('Error batch creating variants:', err);
      throw err;
    }
  }
}));
