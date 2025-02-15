// src/ordering/store/menuStore.ts
import { create } from 'zustand';
import { api } from '../lib/api';
import type { MenuItem } from '../types/menu';

interface MenuStore {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;

  // CRUD actions:
  fetchMenuItems: () => Promise<void>;
  addMenuItem: (item: Partial<MenuItem>) => Promise<MenuItem | null>;
  updateMenuItem: (id: string | number, updates: Partial<MenuItem>) => Promise<MenuItem | null>;
  deleteMenuItem: (id: string | number) => Promise<void>;

  // Utility if you want to “refresh” an item in local state after some partial update
  refreshItemInState: (updatedItem: MenuItem) => void;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  menuItems: [],
  loading: false,
  error: null,

  // -----------------------------------
  // GET /menu_items
  // -----------------------------------
  fetchMenuItems: async () => {
    set({ loading: true, error: null });
    try {
      const itemsFromApi: MenuItem[] = await api.get('/menu_items');
      // Convert "image_url" -> "image" so the front-end can use item.image
      const finalItems = itemsFromApi.map((itm) => ({
        ...itm,
        image: itm.image_url, // rename field for your frontend's convenience
      }));
      set({ menuItems: finalItems, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // -----------------------------------
  // POST /menu_items
  // -----------------------------------
  addMenuItem: async (item) => {
    set({ loading: true, error: null });
    try {
      let response: any;

      // If there's an actual File, do one-step multipart
      if (item.imageFile instanceof File) {
        const formData = new FormData();
        formData.append('menu_item[name]', item.name || '');
        formData.append('menu_item[description]', item.description || '');
        formData.append('menu_item[price]', String(item.price || 0));
        formData.append('menu_item[category]', item.category || '');
        formData.append('menu_item[menu_id]', String(item.menu_id || 1));
        formData.append('menu_item[advance_notice_hours]', String(item.advance_notice_hours || 0));
        formData.append('menu_item[seasonal]', String(item.seasonal || false));
        formData.append('menu_item[promo_label]', item.promo_label || '');

        if (item.available_from) {
          formData.append('menu_item[available_from]', item.available_from.toString());
        }
        if (item.available_until) {
          formData.append('menu_item[available_until]', item.available_until.toString());
        }

        // Finally, the file
        formData.append('menu_item[image]', item.imageFile);

        // Send one request:
        response = await api.upload('/menu_items', 'POST', formData);

      } else {
        // Fallback JSON if no file
        const { imageFile, ...rest } = item;
        if (!rest.menu_id) rest.menu_id = 1;
        response = await api.post('/menu_items', { menu_item: rest });
      }

      // Convert to final shape
      const finalItem = {
        ...response,
        image: response.image_url, // front-end uses "image"
      };

      // Add to local store array
      set({
        menuItems: [...get().menuItems, finalItem],
        loading: false,
      });

      return finalItem; // so the caller can see it
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // -----------------------------------
  // PATCH /menu_items/:id
  // -----------------------------------
  updateMenuItem: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      let response: any;

      if (updates.imageFile instanceof File) {
        // Single-step multipart
        const formData = new FormData();
        formData.append('menu_item[name]', updates.name || '');
        formData.append('menu_item[description]', updates.description || '');
        formData.append('menu_item[price]', String(updates.price || 0));
        formData.append('menu_item[category]', updates.category || '');
        formData.append('menu_item[menu_id]', String(updates.menu_id || 1));
        formData.append('menu_item[advance_notice_hours]', String(updates.advance_notice_hours || 0));
        formData.append('menu_item[seasonal]', String(updates.seasonal || false));
        formData.append('menu_item[promo_label]', updates.promo_label || '');

        if (updates.available_from) {
          formData.append('menu_item[available_from]', updates.available_from.toString());
        }
        if (updates.available_until) {
          formData.append('menu_item[available_until]', updates.available_until.toString());
        }

        formData.append('menu_item[image]', updates.imageFile);

        response = await api.upload(`/menu_items/${id}`, 'PATCH', formData);

      } else {
        // JSON approach if no image
        const { imageFile, ...rest } = updates;
        response = await api.patch(`/menu_items/${id}`, { menu_item: rest });
      }

      const finalItem = {
        ...response,
        image: response.image_url,
      };

      // Replace in local array
      const newList = get().menuItems.map((m) =>
        m.id === finalItem.id ? finalItem : m
      );
      set({ menuItems: newList, loading: false });

      return finalItem;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // -----------------------------------
  // DELETE /menu_items/:id
  // -----------------------------------
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

  // -----------------------------------
  // Refresh one item in local state
  // (Useful if you do a second call that returns updated item)
  // -----------------------------------
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
