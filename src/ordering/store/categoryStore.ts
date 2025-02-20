// src/ordering/store/categoryStore.ts
import { create } from 'zustand';
import { api } from '../lib/api';

export interface Category {
  id: number;        
  name: string;
  position?: number;
  description?: string;
}

interface CategoryStore {
  categories: Category[];
  loading: boolean;
  error: string | null;

  fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>((set) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      // Use the PUBLIC endpoint now:
      const data = await api.get('/categories');
      set({ categories: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
