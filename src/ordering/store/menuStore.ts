// src/ordering/store/menuStore.ts
import { create } from 'zustand';
import { menusApi, Menu } from '../../shared/api/endpoints/menus';
import { handleApiError } from '../../shared/utils/errorHandler';
import { MenuItem, Category } from '../types/menu';
import { apiClient } from '../../shared/api/apiClient';
import { menuItemsApi } from '../../shared/api/endpoints/menuItems';

interface MenuState {
  menus: Menu[];
  currentMenuId: number | null;
  menuItems: MenuItem[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  
  // Inventory polling state
  inventoryPolling: boolean;
  inventoryPollingInterval: number | null;
  
  // Actions
  fetchMenus: () => Promise<void>;
  fetchMenuItems: () => Promise<void>;
  fetchAllMenuItemsForAdmin: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  createMenu: (name: string, restaurantId: number) => Promise<Menu | null>;
  updateMenu: (id: number, data: Partial<Menu>) => Promise<Menu | null>;
  deleteMenu: (id: number) => Promise<boolean>;
  setActiveMenu: (id: number) => Promise<boolean>;
  cloneMenu: (id: number) => Promise<Menu | null>;
  addMenuItem: (data: any) => Promise<MenuItem | null>;
  updateMenuItem: (id: number | string, data: any) => Promise<MenuItem | null>;
  deleteMenuItem: (id: number | string) => Promise<boolean>;
  
  // Menu item copy functionality
  fetchMenuItemsByMenu: (menuId: number) => Promise<MenuItem[]>;
  copyMenuItem: (itemId: string, targetMenuId: number, categoryIds: number[]) => Promise<MenuItem | null>;
  
  // Visibility actions
  hideMenuItem: (id: number | string) => Promise<MenuItem | null>;
  showMenuItem: (id: number | string) => Promise<MenuItem | null>;
  toggleMenuItemVisibility: (id: number | string) => Promise<MenuItem | null>;
  
  // Inventory polling actions
  startInventoryPolling: (menuItemId?: number | string) => void;
  stopInventoryPolling: () => void;
  
  // Get individual menu item with fresh data
  getMenuItemById: (id: number | string) => Promise<MenuItem | null>;
  
  // Copy a menu item to another menu
  copyMenuItem: (itemId: string, targetMenuId: number, categoryIds: number[]) => Promise<MenuItem | null>;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menus: [],
  currentMenuId: null,
  menuItems: [],
  categories: [],
  loading: false,
  error: null,
  
  // Inventory polling state
  inventoryPolling: false,
  inventoryPollingInterval: null,

  fetchMenus: async () => {
    set({ loading: true, error: null });
    try {
      const menus = await menusApi.getAll();
      
      // Find the current menu (if any)
      const currentMenu = menus.find(menu => menu.active);
      const currentMenuId = currentMenu ? currentMenu.id : null;
      
      set({ menus, currentMenuId, loading: false });
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
    }
  },

  createMenu: async (name: string, restaurantId: number) => {
    set({ loading: true, error: null });
    try {
      const newMenu = await menusApi.create({
        name,
        active: false,
        restaurant_id: restaurantId
      });
      
      set(state => ({
        menus: [...state.menus, newMenu],
        loading: false
      }));
      
      return newMenu;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  updateMenu: async (id: number, data: Partial<Menu>) => {
    set({ loading: true, error: null });
    try {
      const updatedMenu = await menusApi.update(id, data);
      
      set(state => ({
        menus: state.menus.map(menu => 
          menu.id === id ? updatedMenu : menu
        ),
        loading: false
      }));
      
      return updatedMenu;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  deleteMenu: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await menusApi.delete(id);
      
      set(state => ({
        menus: state.menus.filter(menu => menu.id !== id),
        loading: false
      }));
      
      return true;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return false;
    }
  },

  setActiveMenu: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const result = await menusApi.setActive(id);
      
      set(state => ({
        menus: state.menus.map(menu => ({
          ...menu,
          active: menu.id === id
        })),
        currentMenuId: result.current_menu_id,
        loading: false
      }));
      
      return true;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return false;
    }
  },

  cloneMenu: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const clonedMenu = await menusApi.clone(id);
      
      // After cloning a menu, fetch all menu items again to ensure we have
      // all the items associated with the newly cloned menu
      // Use the same parameters as fetchAllMenuItemsForAdmin
      const response = await apiClient.get('/menu_items?admin=true&show_all=true');
      const menuItems = response.data.map((item: any) => ({
        ...item,
        image: item.image_url || '/placeholder-food.jpg'
      }));
      
      set(state => ({
        menus: [...state.menus, clonedMenu],
        menuItems,
        loading: false
      }));
      
      return clonedMenu;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/categories');
      set({ categories: response.data, loading: false });
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
    }
  },

  fetchMenuItems: async () => {
    set({ loading: true, error: null });
    try {
      // Use the menuItemsApi to get menu items with stock information
      const menuItems = await menuItemsApi.getAll({ include_stock: true });
      
      // Process the items to ensure image property is set
      const processedItems = menuItems.map((item: any) => ({
        ...item,
        // Ensure the image property is set for compatibility
        image: item.image_url || '/placeholder-food.jpg'
      }));
      
      set({ menuItems: processedItems, loading: false });
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
    }
  },

  fetchAllMenuItemsForAdmin: async () => {
    set({ loading: true, error: null });
    try {
      // Use the menuItemsApi to get all menu items with stock information
      const menuItems = await menuItemsApi.getAll({ 
        admin: true, 
        show_all: true,
        include_stock: true 
      });
      
      // Process the items to ensure image property is set
      const processedItems = menuItems.map((item: any) => ({
        ...item,
        // Ensure the image property is set for compatibility
        image: item.image_url || '/placeholder-food.jpg'
      }));
      
      set({ menuItems: processedItems, loading: false });
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
    }
  },

  addMenuItem: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      
      // Handle file upload if present
      if (data.imageFile) {
        formData.append('menu_item[image]', data.imageFile);
        delete data.imageFile;
      }
      
      // Add all other fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Special handling for arrays
          if (Array.isArray(value)) {
            // For arrays like available_days, append each value individually
            value.forEach((item, index) => {
              formData.append(`menu_item[${key}][]`, String(item));
            });
          } else {
            formData.append(`menu_item[${key}]`, String(value));
          }
        }
      });
      
      const response = await apiClient.post('/menu_items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const newItem = {
        ...response.data,
        image: response.data.image_url || '/placeholder-food.jpg'
      };
      
      set(state => ({
        menuItems: [...state.menuItems, newItem],
        loading: false
      }));
      
      return newItem;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  updateMenuItem: async (id: number | string, data: any) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      
      // Handle file upload if present
      if (data.imageFile) {
        formData.append('menu_item[image]', data.imageFile);
        delete data.imageFile;
      }
      
      // Add all other fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Special handling for arrays
          if (Array.isArray(value)) {
            // For arrays like available_days, append each value individually
            value.forEach((item, index) => {
              formData.append(`menu_item[${key}][]`, String(item));
            });
          } else {
            formData.append(`menu_item[${key}]`, String(value));
          }
        }
      });
      
      const response = await apiClient.patch(`/menu_items/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const updatedItem = {
        ...response.data,
        image: response.data.image_url || '/placeholder-food.jpg'
      };
      
      set(state => ({
        menuItems: state.menuItems.map(item => 
          String(item.id) === String(id) ? updatedItem : item
        ),
        loading: false
      }));
      
      return updatedItem;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  deleteMenuItem: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/menu_items/${id}`);
      
      set(state => ({
        menuItems: state.menuItems.filter(item => String(item.id) !== String(id)),
        loading: false
      }));
      
      return true;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return false;
    }
  },
  
  // Visibility actions
  hideMenuItem: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.patch(`/menu_items/${id}`, {
        menu_item: { hidden: true }
      });
      
      const updatedItem = {
        ...response.data,
        image: response.data.image_url || '/placeholder-food.jpg'
      };
      
      set(state => ({
        menuItems: state.menuItems.map(item => 
          String(item.id) === String(id) ? updatedItem : item
        ),
        loading: false
      }));
      
      return updatedItem;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return null;
    }
  },
  
  showMenuItem: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.patch(`/menu_items/${id}`, {
        menu_item: { hidden: false }
      });
      
      const updatedItem = {
        ...response.data,
        image: response.data.image_url || '/placeholder-food.jpg'
      };
      
      set(state => ({
        menuItems: state.menuItems.map(item => 
          String(item.id) === String(id) ? updatedItem : item
        ),
        loading: false
      }));
      
      return updatedItem;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return null;
    }
  },
  
  toggleMenuItemVisibility: async (id: number | string) => {
    const item = get().menuItems.find(item => String(item.id) === String(id));
    if (!item) return null;
    
    return item.hidden ? get().showMenuItem(id) : get().hideMenuItem(id);
  },
  
  // Get a single menu item by ID
  getMenuItemById: async (id: number | string) => {
    try {
      const item = await menuItemsApi.getById(id);
      
      // Update this item in the store
      set(state => ({
        menuItems: state.menuItems.map(existingItem => 
          String(existingItem.id) === String(id) 
            ? { ...item, image: item.image_url || existingItem.image || '/placeholder-food.jpg' }
            : existingItem
        )
      }));
      
      return item;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage });
      return null;
    }
  },
  
  // Start polling for inventory updates
  startInventoryPolling: (menuItemId?: number | string) => {
    // First stop any existing polling
    get().stopInventoryPolling();
    
    // Set polling flag to true
    set({ inventoryPolling: true });
    
    // Start a new polling interval
    const intervalId = window.setInterval(async () => {
      // If we have a specific menu item ID, just fetch that one
      if (menuItemId) {
        await get().getMenuItemById(menuItemId);
      } else {
        // Otherwise refresh all menu items
        await get().fetchAllMenuItemsForAdmin();
      }
    }, 10000); // Poll every 10 seconds
    
    // Store the interval ID so we can clear it later
    set({ inventoryPollingInterval: intervalId });
  },
  
  // Stop polling for inventory updates
  // Fetch menu items for a specific menu
  fetchMenuItemsByMenu: async (menuId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/menus/${menuId}/menu_items`);
      
      // Process the items to ensure image property is set
      const processedItems = response.data.map((item: any) => ({
        ...item,
        image: item.image_url || '/placeholder-food.jpg'
      }));
      
      set({ loading: false });
      return processedItems;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return [];
    }
  },
  
  // Copy a menu item to another menu
  copyMenuItem: async (itemId: string, targetMenuId: number, categoryIds: number[]) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post(`/menu_items/${itemId}/copy`, {
        target_menu_id: targetMenuId,
        category_ids: categoryIds
      });
      
      const newItem = {
        ...response.data,
        image: response.data.image_url || '/placeholder-food.jpg'
      };
      
      // Add the new item to our store
      set(state => ({
        menuItems: [...state.menuItems, newItem],
        loading: false
      }));
      
      return newItem;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return null;
    }
  },
  
  stopInventoryPolling: () => {
    const { inventoryPollingInterval } = get();
    
    if (inventoryPollingInterval !== null) {
      window.clearInterval(inventoryPollingInterval);
      set({
        inventoryPollingInterval: null,
        inventoryPolling: false
      });
    }
  }
}));
