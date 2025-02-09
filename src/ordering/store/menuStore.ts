// src/ordering/store/menuStore.ts
import { create } from 'zustand';
import { api } from '../lib/api';
import type { MenuItem } from '../types/menu';

interface MenuStore {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;

  fetchMenuItems: () => Promise<void>;
  addMenuItem: (item: Partial<MenuItem>) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  refreshItemInState: (updatedItem: MenuItem) => void;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  menuItems: [],
  loading: false,
  error: null,

  // Example: GET /menu_items => returns an array of items with nested option_groups + options
  fetchMenuItems: async () => {
    set({ loading: true, error: null });
    try {
      const itemsFromApi: MenuItem[] = await api.get('/menu_items');
      // Convert "image_url" -> "image" if your backend uses image_url
      const finalItems = itemsFromApi.map((itm) => ({
        ...itm,
        image: itm.image_url, // rename field for your frontend
      }));
      set({ menuItems: finalItems, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // POST /menu_items
  addMenuItem: async (item) => {
    set({ loading: true, error: null });
    try {
      let response: any;

      // If user uploaded an image file, do multipart form-data
      if (item.imageFile instanceof File) {
        const formData = new FormData();
        formData.append('menu_item[name]', item.name || '');
        formData.append('menu_item[description]', item.description || '');
        formData.append('menu_item[price]', String(item.price || 0));
        formData.append('menu_item[category]', item.category || '');
        formData.append('menu_item[menu_id]', String(item.menu_id || 1));
        formData.append('menu_item[image]', item.imageFile); // file upload
        response = await api.upload('/menu_items', 'POST', formData);
      } else {
        // JSON approach
        const { imageFile, ...rest } = item;
        if (!rest.menu_id) rest.menu_id = 1;
        response = await api.post('/menu_items', { menu_item: rest });
      }

      const finalItem = {
        ...response,
        image: response.image_url,
      };

      set({
        menuItems: [...get().menuItems, finalItem],
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // PATCH /menu_items/:id
  updateMenuItem: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      let response: any;

      if (updates.imageFile instanceof File) {
        // multipart form-data
        const formData = new FormData();
        formData.append('menu_item[name]', updates.name || '');
        formData.append('menu_item[description]', updates.description || '');
        formData.append('menu_item[price]', String(updates.price || 0));
        formData.append('menu_item[category]', updates.category || '');
        formData.append('menu_item[menu_id]', String(updates.menu_id || 1));
        formData.append('menu_item[image]', updates.imageFile);
        response = await api.upload(`/menu_items/${id}`, 'PATCH', formData);
      } else {
        // JSON
        const { imageFile, ...rest } = updates;
        response = await api.patch(`/menu_items/${id}`, { menu_item: rest });
      }

      const finalItem = {
        ...response,
        image: response.image_url,
      };

      const newList = get().menuItems.map((m) =>
        m.id === finalItem.id ? finalItem : m
      );
      set({ menuItems: newList, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // DELETE /menu_items/:id
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

  // If you want to “refresh” a single item after image upload or partial update
  refreshItemInState: (updatedItem) => {
    set((state) => {
      const finalItem = {
        ...updatedItem,
        image: updatedItem.image_url,
      };
      const newList = state.menuItems.map((m) =>
        m.id === finalItem.id ? finalItem : m
      );
      return { menuItems: newList };
    });
  },
}));
