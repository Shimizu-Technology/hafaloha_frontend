// src/store/menuStore.ts
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

  // 1) Load all menus, flatten their menu_items
  fetchMenuItems: async () => {
    set({ loading: true, error: null });
    try {
      const menus = await api.get('/menus'); // => [ { id, menu_items: [...] }, ... ]
      let items: MenuItem[] = [];
      menus.forEach((menu: any) => {
        if (Array.isArray(menu.menu_items)) {
          items = items.concat(menu.menu_items);
        }
      });
      // Convert "image_url" to just "image" so the UI can do item.image
      const finalItems = items.map(itm => ({
        ...itm,
        image: itm.image_url
      }));

      set({ menuItems: finalItems, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // 2) Create new item
  addMenuItem: async (item) => {
    set({ loading: true, error: null });
    try {
      let response: any;

      // If user selected a file => use FormData + api.upload
      if (item.imageFile instanceof File) {
        const formData = new FormData();
        formData.append('menu_item[name]', item.name || '');
        formData.append('menu_item[description]', item.description || '');
        formData.append('menu_item[price]', String(item.price || 0));
        formData.append('menu_item[category]', item.category || '');
        // Or whichever menu_id you want
        formData.append('menu_item[menu_id]', String(item.menu_id || 1));
        // the file => 'menu_item[image]'
        formData.append('menu_item[image]', item.imageFile);

        // POST /menu_items (multipart)
        response = await api.upload('/menu_items', 'POST', formData);
      } else {
        // JSON approach if no file
        const { id, imageFile, ...rest } = item;
        if (!rest.menu_id) {
          rest.menu_id = 1;
        }
        // { menu_item: {...} }
        response = await api.post('/menu_items', {
          menu_item: rest
        });
      }

      // Convert returned "image_url" => "image"
      const finalItem = {
        ...response,
        image: response.image_url
      };

      set({
        menuItems: [...get().menuItems, finalItem],
        loading: false
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // 3) Update existing item by ID
  updateMenuItem: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      let response: any;

      if (updates.imageFile instanceof File) {
        // If user selected a new file => do a multipart PATCH
        const formData = new FormData();
        formData.append('menu_item[name]', updates.name || '');
        formData.append('menu_item[description]', updates.description || '');
        formData.append('menu_item[price]', String(updates.price || 0));
        formData.append('menu_item[category]', updates.category || '');
        formData.append('menu_item[menu_id]', String(updates.menu_id || 1));
        // The file => 'menu_item[image]'
        formData.append('menu_item[image]', updates.imageFile);

        response = await api.upload(`/menu_items/${id}`, 'PATCH', formData);
      } else {
        // JSON approach
        const { id: _ignore, imageFile, ...rest } = updates;
        if (!rest.menu_id) {
          rest.menu_id = 1;
        }
        response = await api.patch(`/menu_items/${id}`, {
          menu_item: rest
        });
      }

      const finalItem = {
        ...response,
        image: response.image_url
      };

      // Replace item in local array
      const newList = get().menuItems.map(mi =>
        mi.id === finalItem.id ? finalItem : mi
      );
      set({ menuItems: newList, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // 4) Delete item
  deleteMenuItem: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/menu_items/${id}`);
      const filtered = get().menuItems.filter(mi => mi.id !== id);
      set({ menuItems: filtered, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  // Manually refresh an item in the store array (e.g. after uploading an image)
  refreshItemInState: (updatedItem) => {
    set(state => {
      const finalItem = {
        ...updatedItem,
        image: updatedItem.image_url
      };
      const newList = state.menuItems.map(m =>
        m.id === finalItem.id ? finalItem : m
      );
      return { menuItems: newList };
    });
  }
}));
