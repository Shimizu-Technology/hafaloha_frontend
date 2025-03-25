// src/ordering/store/categoryStore.ts
import { create } from 'zustand';
import { fetchAllCategories, fetchCategoriesByMenu, Category as ApiCategory } from '../../shared/api/endpoints/categories';

// Use the ApiCategory interface directly instead of creating a duplicate
export type Category = ApiCategory;

// Define the API response type
interface ApiResponse<T> {
  data: T;
  [key: string]: any; // For any other properties that might be in the response
}

interface CategoryStore {
  categories: Category[];
  loading: boolean;
  error: string | null;
  currentMenuId: number | null;

  fetchCategories: () => Promise<void>;
  fetchCategoriesForMenu: (menuId: number, restaurantId?: number) => Promise<void>;
  setCurrentMenuId: (menuId: number | null) => void;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  loading: false,
  error: null,
  currentMenuId: null,

  // Set the current menu ID manually (if needed)
  setCurrentMenuId: (menuId: number | null) => {
    set({ currentMenuId: menuId });
  },

  // Fetch all categories (legacy/global)
  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetchAllCategories() as Category[];
      set({ categories: response, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // Fetch categories specific to a given menu
  fetchCategoriesForMenu: async (menuId: number, restaurantId?: number) => {
    set({ loading: true, error: null, currentMenuId: menuId });
    try {
      const response = await fetchCategoriesByMenu(menuId, restaurantId) as Category[];
      set({ categories: response, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
