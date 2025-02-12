// src/ordering/hooks/useMenu.ts
import { useState, useCallback } from 'react';
import { useOrderingApi } from './useOrderingApi';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;     // local usage
  image_url?: string; // from backend
  category?: string;
  menu_id?: number;
  // etc.
}

export function useMenu() {
  const { get, post, patch, remove, upload } = useOrderingApi();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMenuItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await get('/menu_items');
      const final = items.map((itm: any) => ({
        ...itm,
        image: itm.image_url, // map to "image"
      }));
      setMenuItems(final);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  const addMenuItem = useCallback(
    async (item: Partial<MenuItem & { imageFile?: File }>) => {
      setLoading(true);
      setError(null);
      try {
        let response: any;
        if (item.imageFile) {
          // upload
          const formData = new FormData();
          formData.append('menu_item[name]', item.name || '');
          formData.append('menu_item[description]', item.description || '');
          formData.append('menu_item[price]', String(item.price || 0));
          formData.append('menu_item[category]', item.category || '');
          formData.append('menu_item[menu_id]', String(item.menu_id || 1));
          formData.append('menu_item[image]', item.imageFile);
          response = await upload('/menu_items', 'POST', formData);
        } else {
          // JSON
          response = await post('/menu_items', {
            menu_item: {
              ...item,
              // remove imageFile key
            },
          });
        }

        const finalItem = {
          ...response,
          image: response.image_url,
        };

        setMenuItems((prev) => [...prev, finalItem]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [post, upload]
  );

  const updateMenuItem = useCallback(
    async (id: string, updates: Partial<MenuItem & { imageFile?: File }>) => {
      setLoading(true);
      setError(null);
      try {
        let response: any;
        if (updates.imageFile) {
          const formData = new FormData();
          formData.append('menu_item[name]', updates.name || '');
          formData.append('menu_item[description]', updates.description || '');
          formData.append('menu_item[price]', String(updates.price || 0));
          formData.append('menu_item[category]', updates.category || '');
          formData.append('menu_item[menu_id]', String(updates.menu_id || 1));
          formData.append('menu_item[image]', updates.imageFile);
          response = await upload(`/menu_items/${id}`, 'PATCH', formData);
        } else {
          const { imageFile, ...rest } = updates;
          response = await patch(`/menu_items/${id}`, { menu_item: rest });
        }

        const finalItem = {
          ...response,
          image: response.image_url,
        };

        setMenuItems((prev) =>
          prev.map((m) => (m.id === finalItem.id ? finalItem : m))
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [patch, upload]
  );

  const deleteMenuItem = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        await remove(`/menu_items/${id}`);
        setMenuItems((prev) => prev.filter((m) => m.id !== id));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [remove]
  );

  return {
    menuItems,
    loading,
    error,
    fetchMenuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };
}
