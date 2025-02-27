// src/ordering/store/menuStore.ts

import { create } from 'zustand';
import { api, saveMenuItemWithImage } from '../../shared/api';
import type { MenuItem, MenuItemFormData } from '../types/menu';

interface MenuStore {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;

  fetchMenuItems: () => Promise<void>;
  fetchAllMenuItemsForAdmin: () => Promise<void>;
  addMenuItem: (item: Partial<MenuItemFormData>) => Promise<MenuItem | null>;
  updateMenuItem: (id: string | number, updates: Partial<MenuItemFormData>) => Promise<MenuItem | null>;
  deleteMenuItem: (id: string | number) => Promise<void>;

  refreshItemInState: (updatedItem: MenuItem) => void;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  menuItems: [],
  loading: false,
  error: null,

  // Public items => no ?show_all => excludes expired
  fetchMenuItems: async () => {
    set({ loading: true, error: null });
    try {
      const itemsFromApi = await api.get<any[]>('/menu_items');
      const finalItems = itemsFromApi.map((itm) => ({
        ...itm,
        image: itm.image_url || '', // Ensure image is always a string
      })) as MenuItem[];
      
      set({ menuItems: finalItems, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // Admin => show_all=1
  fetchAllMenuItemsForAdmin: async () => {
    set({ loading: true, error: null });
    try {
      const itemsFromApi = await api.get<any[]>('/menu_items?show_all=1');
      const finalItems = itemsFromApi.map((itm) => ({
        ...itm,
        image: itm.image_url || '', // Ensure image is always a string
      })) as MenuItem[];
      
      set({ menuItems: finalItems, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // POST /menu_items - using the simplified approach
  addMenuItem: async (item) => {
    set({ loading: true, error: null });
    try {
      const { imageFile, ...rest } = item;
      if (!rest.menu_id) rest.menu_id = 1;
      
      const response: any = await saveMenuItemWithImage(rest, imageFile);

      // Ensure we have a valid MenuItem with required fields
      const finalItem: MenuItem = { 
        ...response, 
        image: response.image_url || '', // Fallback for image
        id: String(response.id),
        name: response.name || '',
        description: response.description || '',
        price: response.price || 0
      };
      
      set({ menuItems: [...get().menuItems, finalItem], loading: false });
      return finalItem;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // PATCH /menu_items/:id - using the simplified approach
  updateMenuItem: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { imageFile, ...rest } = updates;
      
      const response: any = await saveMenuItemWithImage(rest, imageFile, id);

      // Ensure we have a valid MenuItem with required fields
      const finalItem: MenuItem = { 
        ...response, 
        image: response.image_url || '', // Fallback for image
        id: String(response.id),
        name: response.name || '',
        description: response.description || '',
        price: response.price || 0
      };
      
      const newList = get().menuItems.map((m) => (m.id === finalItem.id ? finalItem : m));
      set({ menuItems: newList, loading: false });
      return finalItem;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // DELETE
  deleteMenuItem: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/menu_items/${id}`);
      const filtered = get().menuItems.filter((mi) => mi.id !== id);
      set({ menuItems: filtered, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // Refresh local item
  refreshItemInState: (updatedItem) => {
    set((state) => {
      // Ensure we have a valid MenuItem with required fields
      const finalItem: MenuItem = { 
        ...updatedItem, 
        image: updatedItem.image_url || '', // Fallback for image
        id: String(updatedItem.id),
        name: updatedItem.name || '',
        description: updatedItem.description || '',
        price: updatedItem.price || 0
      };
      
      const newList = state.menuItems.map((m) =>
        m.id === finalItem.id ? finalItem : m
      );
      
      return { menuItems: newList };
    });
  },
}));
