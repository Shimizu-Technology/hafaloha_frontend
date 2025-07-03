// src/ordering/store/menuStore.ts
import { create } from 'zustand';
import { menusApi, Menu } from '../../shared/api/endpoints/menus';
import { handleApiError } from '../../shared/utils/errorHandler';
import { MenuItem, Category, MenuItemFilterParams } from '../types/menu';
import { apiClient } from '../../shared/api/apiClient';
import { menuItemsApi } from '../../shared/api/endpoints/menuItems';
import webSocketManager from '../../shared/services/WebSocketManager';
import { getCurrentRestaurantId, addRestaurantIdToParams } from '../../shared/utils/tenantUtils';
import { pollingManager, PollingResourceType } from '../../shared/services/PollingManager';
import { useMenuLayoutStore } from './menuLayoutStore';

interface MenuState {
  menus: Menu[];
  currentMenuId: number | null;
  menuItems: MenuItem[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  
  // Inventory update state
  inventoryPolling: boolean;
  inventoryPollingInterval: number | null;
  websocketConnected: boolean;
  
  // Option-level inventory state
  optionInventoryLoading: boolean;
  optionInventoryError: string | null;
  optionInventoryUpdates: Record<string, any>; // Track option inventory changes
  
  // Actions
  fetchMenus: () => Promise<void>;
  fetchAllMenus: (restaurantId?: number) => Promise<Menu[]>; // New function to fetch all menus
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
  cloneMenuItemInSameMenu: (itemId: string, newName: string, categoryIds: number[]) => Promise<MenuItem | null>;
  moveMenuItem: (itemId: string, targetMenuId: number, categoryIds: number[]) => Promise<MenuItem | null>;
  
  // Visibility actions
  hideMenuItem: (id: number | string) => Promise<MenuItem | null>;
  showMenuItem: (id: number | string) => Promise<MenuItem | null>;
  toggleMenuItemVisibility: (id: number | string) => Promise<MenuItem | null>;
  
  // Inventory polling actions
  startInventoryPolling: (menuItemId?: number | string) => void;
  startInventoryPollingFallback: (menuItemId?: number | string) => void;
  stopInventoryPolling: () => void;
  startMenuItemsWebSocket: () => void;
  
  // Get individual menu item with fresh data
  getMenuItemById: (id: number | string) => Promise<MenuItem | null>;
  
  // Option inventory methods
  updateOptionInventoryInStore: (menuItemId: string, optionGroupId: number, optionUpdates: any) => void;
  refreshMenuItemWithOptions: (menuItemId: string) => Promise<MenuItem | null>;
  clearOptionInventoryError: () => void;
  
  // Option inventory polling methods
  startOptionInventoryPolling: (menuItemId: string, optionGroupId?: number) => string;
  stopOptionInventoryPolling: (pollingId?: string) => void;
  getActiveOptionPolling: () => Map<string, any>;
  
  // New optimized methods for backend filtering
  fetchMenuItemsWithFilters: (params: MenuItemFilterParams) => Promise<MenuItem[]>;
  fetchFeaturedItems: (restaurantId?: number) => Promise<MenuItem[]>;
  fetchVisibleMenuItems: (categoryId?: number, restaurantId?: number, featured?: boolean, seasonal?: boolean, searchQuery?: string) => Promise<MenuItem[]>;
  fetchMenuItemsForAdmin: (filters: MenuItemFilterParams) => Promise<MenuItem[]>;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menus: [],
  currentMenuId: null,
  menuItems: [],
  categories: [],
  loading: false,
  error: null,
  
  // Inventory update state
  inventoryPolling: false,
  inventoryPollingInterval: null,
  websocketConnected: false,
  
  // Option-level inventory state
  optionInventoryLoading: false,
  optionInventoryError: null,
  optionInventoryUpdates: {},

  fetchMenus: async () => {
    set({ loading: true, error: null });
    try {
      // Only fetch the active menu for the current restaurant
      const restaurantId = getCurrentRestaurantId();
      const params: { active: boolean; restaurant_id?: number } = { active: true };
      
      // Only add restaurant_id if it's available
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      const activeMenus = await menusApi.getAll(params);
      
      // Get the current active menu
      const currentMenu = activeMenus.length > 0 ? activeMenus[0] : null;
      const currentMenuId = currentMenu ? currentMenu.id : null;
      
      // Set the active menu in the store
      set({ menus: activeMenus, currentMenuId, loading: false });
      
      console.debug('[MenuStore] Fetched active menu:', currentMenuId);
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      console.error('[MenuStore] Error fetching active menu:', error);
    }
  },

  // New function to fetch all menus for a restaurant (for admin use)
  fetchAllMenus: async (restaurantId?: number) => {
    try {
      // Ensure tenant isolation by getting restaurant ID
      const restId = restaurantId || getCurrentRestaurantId();
      
      if (!restId) {
        console.warn('[MenuStore] Restaurant ID not available, cannot fetch all menus');
        return [];
      }
      
      // Create params with restaurant_id but without active flag
      const params: { restaurant_id: number } = { restaurant_id: restId };
      
      // Fetch all menus for the restaurant
      const allMenus = await menusApi.getAll(params);
      
      // Update the menus in the store, but keep the currentMenuId as is
      // This ensures we don't disrupt the active menu for customer-facing components
      set({ menus: allMenus });
      
      console.debug(`[MenuStore] Fetched all ${allMenus.length} menus for restaurant ${restId}`);
      return allMenus;
    } catch (error) {
      handleApiError(error);
      console.error('[MenuStore] Error fetching all menus:', error);
      return [];
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
        image: item.image_url || '/placeholder-food.png'
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
    // If we already have menu items and WebSocket is connected, don't fetch again
    const state = get();
    if (state.menuItems.length > 0 && state.websocketConnected) {
      console.debug('Skipping menu items fetch - using WebSocket updates');
      return;
    }

    set({ loading: true, error: null });
    try {
      console.debug('Fetching menu items from API');
      // Use the menuItemsApi to get menu items with stock information
      const menuItems = await menuItemsApi.getAll({ include_stock: true });
      
      // Process the items to ensure image property is set
      const processedItems = menuItems.map((item: any) => ({
        ...item,
        // Ensure the image property is set for compatibility
        image: item.image_url || '/placeholder-food.png'
      }));
      
      set({ menuItems: processedItems, loading: false });
      
      // Only try to start WebSocket if we have restaurant ID
      const restaurantId = localStorage.getItem('restaurantId');
      if (restaurantId) {
        // Start WebSocket connection for real-time updates
        get().startMenuItemsWebSocket();
      } else {
        console.debug('Restaurant ID not available yet, skipping WebSocket setup for menu items');
      }
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
        image: item.image_url || '/placeholder-food.png'
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
            value.forEach(item => {
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
        image: response.data.image_url || '/placeholder-food.png'
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
            value.forEach(item => {
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
        image: response.data.image_url || '/placeholder-food.png'
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
        image: response.data.image_url || '/placeholder-food.png'
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
        image: response.data.image_url || '/placeholder-food.png'
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
            ? { ...item, image: item.image_url || existingItem.image || '/placeholder-food.png' }
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
  
  // Start real-time inventory updates using WebSockets with polling fallback
  startInventoryPolling: (menuItemId?: number | string) => {
    // First stop any existing polling
    get().stopInventoryPolling();
    
    // Try to connect via WebSocket first
    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      console.error('No restaurant ID found for WebSocket connection');
      return get().startInventoryPollingFallback(menuItemId);
    }
    
    // Set up WebSocket handlers for inventory updates
    try {
      // Subscribe to the inventory channel
      webSocketManager.subscribe({
        channel: 'InventoryChannel',
        received: (data: any) => {
          // Handle inventory updates
          if (data.type === 'inventory_update') {
            const updatedItem = data.item;
            
            // Update the specific item in our store
            set(state => ({
              menuItems: state.menuItems.map(item => 
                item.id === updatedItem.id ? { ...item, ...updatedItem } : item
              )
            }));
          }
        },
        connected: () => {
          console.debug('Connected to inventory channel');
          set({ websocketConnected: true });
        },
        disconnected: () => {
          console.debug('Disconnected from inventory channel');
          set({ websocketConnected: false });
          
          // Fall back to polling if WebSocket disconnects
          get().startInventoryPollingFallback(menuItemId);
        }
      });
    } catch (error) {
      console.error('Error connecting to WebSocket for inventory updates:', error);
      // Fall back to polling if WebSocket connection fails
      get().startInventoryPollingFallback(menuItemId);
    }
  },
  
  // Start WebSocket connection for real-time menu item updates
  startMenuItemsWebSocket: () => {
    // First, ensure any existing polling is stopped
    get().stopInventoryPolling();
    
    // Check if we're already connected to avoid duplicate subscriptions
    if (get().websocketConnected) {
      console.debug('[MenuStore] Already connected to menu items channel');
      return;
    }

    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      console.debug('[MenuStore] No restaurant ID found for WebSocket connection - will retry when available');
      
      // Set up a listener for when restaurant data becomes available
      const checkForRestaurantId = () => {
        const id = localStorage.getItem('restaurantId');
        if (id) {
          console.debug('[MenuStore] Restaurant ID now available, connecting to WebSocket');
          window.removeEventListener('storage', checkForRestaurantId);
          get().startMenuItemsWebSocket();
        }
      };
      
      // Listen for localStorage changes
      window.addEventListener('storage', checkForRestaurantId);
      
      // Also check again after a short delay in case the ID is set by the current window
      setTimeout(() => {
        if (!get().websocketConnected && localStorage.getItem('restaurantId')) {
          get().startMenuItemsWebSocket();
        }
      }, 2000);
      
      return;
    }
    
    try {
      console.debug('[MenuStore] Subscribing to menu items channel with restaurant ID:', restaurantId);
      // Set websocketConnected to true immediately to prevent duplicate API calls
      set({ websocketConnected: true });
      
      // Double-check that polling is stopped before WebSocket connection
      if (get().inventoryPollingInterval !== null) {
        console.debug('[MenuStore] Stopping inventory polling before WebSocket connection');
        get().stopInventoryPolling();
      }
      
      // Subscribe to the menu items channel
      webSocketManager.subscribe({
        channel: 'MenuItemsChannel',
        params: { restaurant_id: restaurantId },
        connected: () => {
          console.debug('[MenuStore] WebSocket connected to menu items channel');
          set({ websocketConnected: true });
          
          // Stop polling when WebSocket is connected
          get().stopInventoryPolling();
        },
        disconnected: () => {
          console.debug('[MenuStore] WebSocket disconnected from menu items channel');
          set({ websocketConnected: false });
          
          // Start polling as fallback when WebSocket disconnects
          get().startInventoryPollingFallback();
        },
        rejected: () => {
          console.debug('[MenuStore] WebSocket connection rejected');
          set({ websocketConnected: false });
          
          // Start polling as fallback when WebSocket connection is rejected
          get().startInventoryPollingFallback();
        },
        received: (data: any) => {
          console.debug('[MenuStore] Received menu items update via WebSocket', data.type);
          // Handle menu item updates
          if (data.type === 'menu_item_update') {
            const updatedItem = data.item;
            
            // Update the specific item in our store
            set(state => ({
              menuItems: state.menuItems.map(item => 
                item.id === updatedItem.id ? { ...item, ...updatedItem } : item
              )
            }));
            console.debug(`[MenuStore] Updated menu item ${updatedItem.id} via WebSocket`);
          } else if (data.type === 'option_inventory_update') {
            // Handle option-level inventory updates
            const { menu_item_id, option_group_id, option_group, menu_item } = data;
            
            console.debug(`[MenuStore] Received option inventory update for item ${menu_item_id}, group ${option_group_id}`);
            
            set(state => ({
              menuItems: state.menuItems.map(item => {
                if (item.id === menu_item_id.toString() && item.option_groups) {
                  return {
                    ...item,
                    // Update menu item level inventory if provided
                    ...(menu_item && {
                      stock_quantity: menu_item.stock_quantity,
                      damaged_quantity: menu_item.damaged_quantity,
                      available_quantity: menu_item.available_quantity
                    }),
                    // Update the specific option group
                    option_groups: item.option_groups.map(group => 
                      group.id === option_group_id ? { ...group, ...option_group } : group
                    )
                  };
                }
                return item;
              }),
              // Track the update
              optionInventoryUpdates: {
                ...state.optionInventoryUpdates,
                [`${menu_item_id}_${option_group_id}`]: {
                  ...option_group,
                  timestamp: Date.now(),
                  source: 'websocket'
                }
              }
            }));
          } else if (data.type === 'menu_item_created') {
            // Add the new item to our store
            const newItem = data.item;
            set(state => ({
              menuItems: [...state.menuItems, {
                ...newItem,
                image: newItem.image_url || '/placeholder-food.png'
              }]
            }));
            console.debug(`[MenuStore] Added new menu item via WebSocket`);
          } else if (data.type === 'menu_item_deleted') {
            // Remove the item from our store
            const deletedItemId = data.item_id;
            set(state => ({
              menuItems: state.menuItems.filter(item => item.id !== deletedItemId)
            }));
            console.debug(`[MenuStore] Removed menu item ${deletedItemId} via WebSocket`);
          }
        }
      });
    } catch (error) {
      console.error('[MenuStore] Error connecting to WebSocket for menu item updates:', error);
      set({ websocketConnected: false });
      
      // Try to reconnect before falling back to polling
      console.debug('[MenuStore] Attempting to reconnect WebSocket after error before falling back to polling');
      setTimeout(() => {
        // Check if we're still disconnected before starting polling
        if (!get().websocketConnected && get().inventoryPollingInterval === null) {
          console.debug('[MenuStore] WebSocket reconnection failed after error, falling back to polling');
          get().startInventoryPollingFallback();
        }
      }, 3000);
    }
  },
  
  // Fallback to traditional polling if WebSockets aren't available
  // Uses PollingManager instead of direct setInterval calls
  startInventoryPollingFallback: (menuItemId?: number | string) => {
    console.debug('[MenuStore] Considering fallback to inventory polling');
    
    // First, try to establish a WebSocket connection instead of polling
    if (!get().websocketConnected) {
      console.debug('[MenuStore] Attempting to establish WebSocket connection before falling back to polling');
      try {
        // Try to start WebSocket connection first
        get().startMenuItemsWebSocket();
        
        // Give the WebSocket a moment to connect before deciding to poll
        setTimeout(() => {
          if (get().websocketConnected) {
            console.debug('[MenuStore] WebSocket connected successfully, no need for polling');
            return;
          } else {
            console.debug('[MenuStore] WebSocket connection attempt failed, proceeding with polling');
            // Continue with polling setup below if the WebSocket didn't connect
            setupPollingWithManager();
          }
        }, 2000); // Wait 2 seconds for WebSocket to connect
        
        return; // Exit early while we wait to see if WebSocket connects
      } catch (error) {
        console.error('[MenuStore] Error attempting WebSocket connection:', error);
        // Continue with polling if WebSocket connection attempt fails
      }
    } else {
      console.debug('[MenuStore] WebSocket is already connected, not starting polling');
      return;
    }
    
    // Setup polling function that will be called if WebSocket fails
    // Uses PollingManager instead of direct setInterval
    function setupPollingWithManager() {
      // Double-check WebSocket status before setting up polling
      if (get().websocketConnected) {
        console.debug('[MenuStore] WebSocket is now connected, not starting polling');
        return;
      }
      
      // Check if polling is already active
      if (get().inventoryPolling) {
        console.debug('[MenuStore] Polling already active, not starting another poller');
        return;
      }
      
      // Set polling flag to true
      set({ inventoryPolling: true });
      
      // Define the polling handler function
      const pollingHandler = async () => {
        // Double-check WebSocket status before each poll
        if (get().websocketConnected) {
          console.debug('[MenuStore] WebSocket is now connected, stopping polling');
          get().stopInventoryPolling();
          return;
        }
        
        console.debug(`[MenuStore] Polling for inventory updates${menuItemId ? ` for item ${menuItemId}` : ''}`);
        
        // If we have a specific menu item ID, just fetch that one
        if (menuItemId) {
          await get().getMenuItemById(menuItemId);
        } else {
          // Otherwise refresh all menu items - use silent mode to prevent loading indicators
          try {
            // Use the optimized backend filtering with silent mode
            const params = addRestaurantIdToParams({ view_type: 'admin', silent: true });
            await menuItemsApi.getAll(params);
          } catch (error) {
            console.error('[MenuStore] Error during silent polling:', error);
          }
        }
        
        // Check WebSocket status after polling
        if (get().websocketConnected) {
          console.debug('[MenuStore] WebSocket connected after polling, stopping polling');
          get().stopInventoryPolling();
        }
        
        // Periodically try to reconnect WebSocket
        if (!get().websocketConnected && Math.random() < 0.2) { // 20% chance each poll interval
          console.debug('[MenuStore] Attempting to re-establish WebSocket connection during polling cycle');
          get().startMenuItemsWebSocket();
        }
      };
      
      // Use the PollingManager to handle polling instead of direct setInterval
      // This will automatically handle WebSocket status and prevent duplicate polling
      const pollingId = pollingManager.startPolling(
        PollingResourceType.MENU_ITEMS, // Resource type
        pollingHandler, // Handler function
        {
          interval: 30000, // Poll every 30 seconds instead of 10 to reduce server load
          silent: true // Use silent mode to prevent loading indicators
        }
      );
      
      // Store the polling ID as a string in the inventoryPollingInterval field
      // We're repurposing this field to store the polling ID instead of the interval ID
      set({ inventoryPollingInterval: pollingId as unknown as number });
    }
    
    // Call setupPolling immediately if we didn't try WebSocket connection
    if (!get().websocketConnected) {
      setupPollingWithManager();
    }
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
        image: item.image_url || '/placeholder-food.png'
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
        category_ids: categoryIds,
        operation_type: 'clone'
      });
      
      const newItem = {
        ...response.data,
        image: response.data.image_url || '/placeholder-food.png'
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

  // Clone a menu item within the same menu
  cloneMenuItemInSameMenu: async (itemId: string, newName: string, categoryIds: number[]) => {
    set({ loading: true, error: null });
    try {
      const sourceItem = get().menuItems.find(item => item.id === itemId);
      if (!sourceItem) {
        throw new Error("Source item not found");
      }
      
      const response = await apiClient.post(`/menu_items/${itemId}/copy`, {
        target_menu_id: sourceItem.menu_id, // Same menu ID
        category_ids: categoryIds,
        new_name: newName,
        operation_type: 'clone'
      });
      
      const newItem = {
        ...response.data,
        image: response.data.image_url || '/placeholder-food.png'
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
    const { inventoryPollingInterval, websocketConnected } = get();
    
    // Log the current state for debugging
    console.debug('[MenuStore] Stopping inventory polling', {
      hasPollingInterval: inventoryPollingInterval !== null,
      websocketConnected
    });
    
    // Check if we're using the PollingManager (string ID) or legacy interval (number)
    if (inventoryPollingInterval !== null) {
      if (typeof inventoryPollingInterval === 'string') {
        // Use PollingManager to stop polling
        console.debug('[MenuStore] Stopping polling via PollingManager');
        pollingManager.stopPolling(inventoryPollingInterval);
      } else {
        // Legacy cleanup for any direct intervals
        console.debug('[MenuStore] Clearing inventory polling interval');
        window.clearInterval(inventoryPollingInterval);
      }
      
      set({
        inventoryPollingInterval: null,
        inventoryPolling: false
      });
    }
    
    // Important: Do NOT set websocketConnected to false here
    // We want to keep the WebSocket connection if it's already established
    // Only unsubscribe from the inventory channel if we're explicitly told to
    // and we're not connected to the WebSocket
    if (!websocketConnected) {
      try {
        // Get the current restaurant ID for tenant isolation
        const restaurantId = getCurrentRestaurantId();
        if (restaurantId) {
          const channelName = `menu_items:${restaurantId}`;
          console.debug(`[MenuStore] Unsubscribing from WebSocket channel: ${channelName}`);
          webSocketManager.unsubscribe(channelName);
        } else {
          console.debug('[MenuStore] Unsubscribing from inventory channel');
          webSocketManager.unsubscribe('InventoryChannel');
        }
      } catch (error) {
        console.error('[MenuStore] Error unsubscribing from WebSocket channel:', error);
      }
    }
  },

  // New optimized methods for backend filtering
  fetchMenuItemsWithFilters: async (params: MenuItemFilterParams) => {
    try {
      // Get current layout type from the imported store
      const { layoutType } = useMenuLayoutStore.getState();
      
      // Ensure restaurant_id is included in params for tenant isolation
      const enhancedParams = addRestaurantIdToParams({
        ...params,
        // Add layout_type parameter for layout-specific responses
        layout_type: layoutType
      });
      
      // Don't use list view optimization to ensure we get complete data including option groups
      // if (layoutType === 'list' && !enhancedParams.view_type) {
      //   enhancedParams.view_type = 'list';
      //   enhancedParams.include_option_groups = true;
      // }
      
      // Always include option groups information
      enhancedParams.include_option_groups = true;
      
      // Log the request for debugging
      console.debug('[menuStore] Fetching menu items with filters:', enhancedParams);
      
      // Make the API request with the enhanced params
      const response = await apiClient.get('/menu_items', { params: enhancedParams });
      
      // Process the items to ensure image property is set
      const processedItems = response.data.map((item: any) => ({
        ...item,
        image: item.image_url || '/placeholder-food.png'
      }));
      
      return processedItems;
    } catch (error) {
      console.error('[menuStore] Error fetching filtered menu items:', error);
      const errorMessage = handleApiError(error);
      set({ error: errorMessage });
      return [];
    }
  },
  
  fetchFeaturedItems: async (restaurantId?: number) => {
    try {
      // Create filter params for featured items
      const params: MenuItemFilterParams = {
        featured: true,
        hidden: false, // Only show visible items
        // Don't use view_type: 'list' to ensure we get complete data including option groups
        // This ensures the customize button works properly on the home page
        restaurant_id: restaurantId || getCurrentRestaurantId() || undefined
      };
      
      console.debug('[menuStore] Fetching featured items with complete data');
      // Use the base filtering method
      const featuredItems = await get().fetchMenuItemsWithFilters(params);
      
      // Update the store with the featured items
      // Note: We don't update the full menuItems array to avoid overwriting other items
      return featuredItems;
    } catch (error) {
      console.error('[menuStore] Error fetching featured items:', error);
      const errorMessage = handleApiError(error);
      set({ error: errorMessage });
      return [];
    }
  },
  
  fetchVisibleMenuItems: async (categoryId?: number, restaurantId?: number, featured?: boolean, seasonal?: boolean, searchQuery?: string) => {
    try {
      // Get the current day of week (0-6, where 0 is Sunday)
      const currentDayOfWeek = new Date().getDay();
      
      // Create filter params for visible menu items
      const params: MenuItemFilterParams = {
        hidden: false, // Only show visible items
        available_on_day: currentDayOfWeek.toString(), // Convert to string for API compatibility
        restaurant_id: restaurantId || getCurrentRestaurantId() || undefined
      };
      
      // Add category filter if provided
      if (categoryId) {
        params.category_id = categoryId;
      }
      
      // Add featured/seasonal filters if provided
      if (featured) {
        params.featured = true;
      }
      if (seasonal) {
        params.seasonal = true;
      }
      
      // Add search query if provided
      if (searchQuery && searchQuery.trim() !== '') {
        params.search_query = searchQuery.trim();
      }
      
      console.debug('[menuStore] Fetching visible menu items with params:', params);
      
      // Use the base filtering method
      const visibleItems = await get().fetchMenuItemsWithFilters(params);
      
      // Always update the store with the visible items for consistency
      set({ menuItems: visibleItems });
      
      return visibleItems;
    } catch (error) {
      console.error('[menuStore] Error fetching visible menu items:', error);
      const errorMessage = handleApiError(error);
      set({ error: errorMessage });
      return [];
    }
  },
  
  fetchMenuItemsForAdmin: async (filters: MenuItemFilterParams) => {
    try {
      // Ensure admin-specific options but DON'T set view_type to 'admin' 
      // because that excludes option_groups data which we need for the customize button
      const adminFilters: MenuItemFilterParams = {
        ...filters,
        // Remove view_type: 'admin' to get full data including option_groups
        include_stock: true, // Always include stock information
        include_option_groups: true // Explicitly request option groups for customize functionality
      };
      
      // Ensure restaurant_id is included
      const enhancedParams = addRestaurantIdToParams(adminFilters);
      
      console.debug('[menuStore] Fetching admin menu items with option groups:', enhancedParams);
      
      // Use the base filtering method
      const adminItems = await get().fetchMenuItemsWithFilters(enhancedParams);
      
      // Update the store with the admin items
      set({ menuItems: adminItems });
      
      return adminItems;
    } catch (error) {
      console.error('[menuStore] Error fetching admin menu items:', error);
      const errorMessage = handleApiError(error);
      set({ error: errorMessage });
      return [];
    }
  },

  // Option inventory methods
  updateOptionInventoryInStore: (menuItemId: string, optionGroupId: number, optionUpdates: any) => {
    set(state => ({
      menuItems: state.menuItems.map(item => {
        if (item.id === menuItemId && item.option_groups) {
          return {
            ...item,
            option_groups: item.option_groups.map(group => {
              if (group.id === optionGroupId) {
                return {
                  ...group,
                  ...optionUpdates
                };
              }
              return group;
            })
          };
        }
        return item;
      }),
      optionInventoryUpdates: {
        ...state.optionInventoryUpdates,
        [`${menuItemId}_${optionGroupId}`]: {
          ...optionUpdates,
          timestamp: Date.now()
        }
      }
    }));
  },

  refreshMenuItemWithOptions: async (menuItemId: string) => {
    set({ optionInventoryLoading: true, optionInventoryError: null });
    try {
      const updatedItem = await menuItemsApi.getById(menuItemId, true);
      
      // Process the item to ensure image property is set
      const processedItem = {
        ...updatedItem,
        image: updatedItem.image_url || '/placeholder-food.png'
      };
      
      // Update the specific item in the store
      set(state => ({
        menuItems: state.menuItems.map(item => 
          item.id === menuItemId ? processedItem : item
        ),
        optionInventoryLoading: false
      }));
      
      return processedItem;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        optionInventoryError: errorMessage,
        optionInventoryLoading: false 
      });
      console.error('[MenuStore] Error refreshing menu item with options:', error);
      return null;
    }
  },

  clearOptionInventoryError: () => {
    set({ optionInventoryError: null });
  },

  // Option inventory polling methods
  startOptionInventoryPolling: (menuItemId: string, optionGroupId?: number) => {
    
    // If WebSocket is connected, don't start polling
    if (get().websocketConnected) {
      console.debug(`[MenuStore] WebSocket is connected, not starting option inventory polling for item ${menuItemId}`);
      return '';
    }
    
    console.debug(`[MenuStore] Starting option inventory polling for item ${menuItemId}${optionGroupId ? `, group ${optionGroupId}` : ''}`);
    
    // Define the polling handler for option inventory updates
    const optionPollingHandler = (data: any) => {
      if (data && data.id === menuItemId) {
        console.debug(`[MenuStore] Received option inventory update via polling for item ${menuItemId}`);
        
        // Update the specific menu item in the store
        set(state => ({
          menuItems: state.menuItems.map(item => 
            item.id === menuItemId ? {
              ...item,
              ...data,
              image: data.image_url || item.image || '/placeholder-food.png'
            } : item
          ),
          optionInventoryUpdates: {
            ...state.optionInventoryUpdates,
            [`${menuItemId}_polling`]: {
              timestamp: Date.now(),
              source: 'polling',
              data: data
            }
          }
        }));
      }
    };
    
    // Start polling using PollingManager
    const pollingId = pollingManager.startPolling(
      PollingResourceType.OPTION_INVENTORY,
      optionPollingHandler,
      {
        resourceId: menuItemId,
        interval: 45000, // Poll every 45 seconds
        silent: true,
        sourceId: 'option_inventory_polling',
        params: {
          include_option_groups: true,
          include_stock: true
        }
      }
    );
    
    console.debug(`[MenuStore] Started option inventory polling with ID: ${pollingId}`);
    return pollingId;
  },

  stopOptionInventoryPolling: (pollingId?: string) => {
    if (pollingId) {
      console.debug(`[MenuStore] Stopping specific option inventory polling: ${pollingId}`);
      pollingManager.stopPolling(pollingId);
    } else {
      // Stop all option inventory polling
      console.debug(`[MenuStore] Stopping all option inventory polling`);
      const activePolling = pollingManager.getActivePolling();
      
      activePolling.forEach((type: any, id: string) => {
        if (type === PollingResourceType.OPTION_INVENTORY) {
          pollingManager.stopPolling(id);
        }
      });
    }
  },

  getActiveOptionPolling: () => {
    const activePolling = pollingManager.getActivePolling();
    const optionPolling = new Map();
    
    activePolling.forEach((type: any, id: string) => {
      if (type === PollingResourceType.OPTION_INVENTORY) {
        const status = pollingManager.getPollingStatus(id);
        optionPolling.set(id, {
          type,
          ...status
        });
      }
    });
    
    return optionPolling;
  },

  moveMenuItem: async (itemId: string, targetMenuId: number, categoryIds: number[]) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post(`/menu_items/${itemId}/move`, {
        target_menu_id: targetMenuId,
        category_ids: categoryIds
      });
      
      const updatedItem = {
        ...response.data,
        image: response.data.image_url || '/placeholder-food.png'
      };
      
      // Update the specific item in the store
      set(state => ({
        menuItems: state.menuItems.map(item => 
          item.id === itemId ? updatedItem : item
        ),
        loading: false
      }));
      
      return updatedItem;
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ error: errorMessage, loading: false });
      return null;
    }
  }
}));
