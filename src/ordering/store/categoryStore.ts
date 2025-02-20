// src/ordering/store/categoryStore.ts
import { create } from 'zustand';
import { api } from '../lib/api';

export interface Category {
  id: number;        // numeric ID from your Rails DB
  name: string;
  position?: number; // optional
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
      // Suppose your backend gives them at /admin/categories or /categories
      // If you made a public endpoint /categories for GET, use that:
      const data = await api.get('/admin/categories');
      set({ categories: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
