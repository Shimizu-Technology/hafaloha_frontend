// src/ordering/store/orderStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type { Order, OrderItem } from '../types/order';
import webSocketManager, { NotificationType } from '../../shared/services/WebSocketManager';
import pollingManager, { PollingResourceType } from '../../shared/services/PollingManager';
import { useAuthStore } from './authStore';

/** CartItem for local cart usage. */
export interface CartItem extends Omit<OrderItem, 'id'> {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  customizations?: any[];
  advance_notice_hours?: number;
  image?: string;
  type?: 'food' | 'merchandise';
  variant_id?: number;
  size?: string;
  color?: string;
}

export interface OrdersMetadata {
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface OrderQueryParams {
  page?: number;
  per_page?: number;
  status?: string | null;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  date_from?: string | null;
  date_to?: string | null;
  search_query?: string | null;
  restaurant_id?: string | null;
  endpoint?: string; // Used to determine which API endpoint to call (e.g., 'staff' for /orders/staff)
  online_orders_only?: string; // Used to filter for online orders only
  staff_member_id?: string; // Used to filter by staff member
  user_id?: string; // Used to filter by user
  include_online_orders?: string; // Used to include online orders with user orders
  _sourceId?: string; // Track the source of the request for debugging
}

interface OrderStore {
  orders: Order[];
  metadata: OrdersMetadata;
  loading: boolean;
  error: string | null;
  websocketConnected: boolean;
  pollingInterval: number | null;
  connectionCheckInterval: NodeJS.Timeout | null;
  // Replace request ID tracking with AbortController for better race condition handling
  _currentFetchController: AbortController | null;
  abortCurrentFetch: () => void;
  // WebSocket methods
  startWebSocketConnection: () => boolean | void;
  stopWebSocketConnection: () => void;
  handleNewOrder: (order: Order) => void;
  handleOrderUpdate: (order: Order) => void;
  
  // Polling methods (fallback)
  startOrderPolling: () => void;
  stopOrderPolling: () => void;

  fetchOrders: (params?: OrderQueryParams) => Promise<void>;
  fetchOrdersQuietly: (params?: OrderQueryParams) => Promise<void>;

  /** Creates a new order in the backend and returns it. */
  addOrder: (
    items: CartItem[],
    total: number,
    specialInstructions: string,
    contactName?: string,
    contactPhone?: string,
    contactEmail?: string,
    transactionId?: string,
    paymentMethod?: string,
    vipCode?: string,
    staffModal?: boolean,
    paymentDetails?: any,
    locationId?: number | null
  ) => Promise<Order>;

  /** Update just status + optional pickupTime. */
  updateOrderStatus: (orderId: string, status: string, pickupTime?: string) => Promise<void>;
  
  /** Update status without showing loading state (for smoother UI) */
  updateOrderStatusQuietly: (orderId: string, status: string, pickupTime?: string) => Promise<void>;

  /** For admin editing an entire order's data (items, total, instructions, etc.). */
  updateOrderData: (orderId: string, updatedOrder: any) => Promise<void>;
  getOrderHistory: (userId: number) => Order[];

  // CART
  cartItems: CartItem[];
  
  /** Utility function to generate a unique key for an item based on id and customizations */
  _getItemKey: (item: any) => string;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  setCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // Per‐item notes
  setCartItemNotes: (itemId: string, notes: string) => void;
}

/**
 * Helper function to calculate pagination metadata with fallbacks
 * Ensures we always have valid pagination values even when API returns incomplete data
 */
const calculatePaginationMetadata = (orders: Order[], metadata: OrdersMetadata): OrdersMetadata => {
  // If metadata has valid values, use them
  if (metadata.total_pages > 0 && metadata.total_count > 0) {
    return metadata;
  }
  
  // Calculate fallbacks when API doesn't provide proper values
  const per_page = metadata.per_page || 10;
  
  // For total_count, use either what API provided or calculate from orders length
  // If we have orders but total_count is 0, use at least the orders length
  const total_count = orders.length > 0 ? Math.max(orders.length, metadata.total_count || 0) : metadata.total_count;
  
  // Calculate total_pages based on either API value or our calculated count
  const total_pages = total_count > 0 ? Math.ceil(total_count / per_page) : 0;
  
  // Log what we're doing for debugging purposes
  console.debug(`[OrderStore] Using fallback pagination calculation:`, {
    originalMetadata: metadata,
    calculatedMetadata: { ...metadata, total_count, total_pages },
    ordersLength: orders.length
  });
  
  return {
    ...metadata,
    total_count,
    total_pages
  };
};

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      _currentFetchController: null,
      orders: [],
      metadata: {
        total_count: 0,
        page: 1,
        per_page: 10,
        total_pages: 0
      },
      loading: false,
      error: null,
      websocketConnected: false,
      pollingInterval: null,
      connectionCheckInterval: null,
      
      // ---------------------------------------------------------
      // Abort any current fetch to prevent race conditions
      // ---------------------------------------------------------
      abortCurrentFetch: () => {
        const controller = get()._currentFetchController;
        if (controller) {
          console.debug(`[OrderStore] Aborting current fetch request`);
          controller.abort();
          set({ _currentFetchController: null });
        }
      },
      
      // ---------------------------------------------------------
      // WebSocket Methods
      // ---------------------------------------------------------
      startWebSocketConnection: (paginationParams?: { page?: number; perPage?: number }) => {
        // Check if already connected to avoid duplicate connections
        if (get().websocketConnected) {
          console.debug('[OrderStore] WebSocket already connected, skipping connection');
          // Ensure polling is stopped when WebSocket is connected
          get().stopOrderPolling();
          
          // Even if already connected, update pagination params to ensure WebSocket has current state
          const currentMetadata = get().metadata;
          webSocketManager.updatePaginationParams({
            page: paginationParams?.page || currentMetadata.page,
            perPage: paginationParams?.perPage || currentMetadata.per_page
          });
          
          return;
        }
        
        // Stop polling if it's active
        get().stopOrderPolling();
        
        const user = useAuthStore.getState().user;
        if (!user?.restaurant_id) {
          console.error('[OrderStore] Cannot start WebSocket connection: No restaurant ID');
          return;
        }
        
        // If pagination params are provided, update the store's metadata
        if (paginationParams) {
          console.debug('[OrderStore] Updating metadata with pagination params:', paginationParams);
          set(state => ({
            metadata: {
              ...state.metadata,
              page: paginationParams.page || state.metadata.page,
              per_page: paginationParams.perPage || state.metadata.per_page
            }
          }));
        }
        
        // Get current pagination state to send to WebSocket
        const currentMetadata = get().metadata;
        
        // Initialize the WebSocketManager with the restaurant ID
        console.debug('[OrderStore] Initializing WebSocketManager', { 
          restaurantId: user.restaurant_id,
          currentPage: get().metadata.page 
        });
        
        // Initialize the WebSocketManager
        webSocketManager.initialize(user.restaurant_id);
        
        // Register handlers for order notifications
        webSocketManager.registerHandler(NotificationType.NEW_ORDER, (order: Order) => {
          get().handleNewOrder(order);
        });
        
        webSocketManager.registerHandler(NotificationType.ORDER_UPDATED, (order: Order) => {
          get().handleOrderUpdate(order);
        });
        
        // Update pagination parameters
        webSocketManager.updatePaginationParams({
          page: currentMetadata.page,
          perPage: currentMetadata.per_page
        });
        
        // Set connection status
        set({ websocketConnected: true });
        
        // Stop polling when WebSocket is connected
        get().stopOrderPolling();
        
        // Set up a connection status check interval
        const connectionCheckInterval = setInterval(() => {
          const isConnected = webSocketManager.isConnected();
          
          // If connection status has changed, update our state
          if (isConnected !== get().websocketConnected) {
            console.debug(`[OrderStore] WebSocket connection status changed: ${isConnected ? 'connected' : 'disconnected'}`);
            set({ websocketConnected: isConnected });
            
            // If disconnected, start polling
            if (!isConnected && !get().pollingInterval) {
              console.debug('[OrderStore] WebSocket disconnected, starting polling');
              get().startOrderPolling();
            }
            // If connected, stop polling
            else if (isConnected && get().pollingInterval) {
              console.debug('[OrderStore] WebSocket connected, stopping polling');
              get().stopOrderPolling();
            }
          }
        }, 5000); // Check every 5 seconds
        
        // Store the interval ID so we can clear it later
        set({ connectionCheckInterval });
        
        console.debug('[OrderStore] WebSocket connection initialized');
        
        // Return the connection status
        return webSocketManager.isConnected();
      },
      
      stopWebSocketConnection: () => {
        if (get().websocketConnected) {
          console.debug('[OrderStore] Stopping WebSocket connection');
          
          // Unregister handlers
          webSocketManager.unregisterHandler(NotificationType.NEW_ORDER, get().handleNewOrder);
          webSocketManager.unregisterHandler(NotificationType.ORDER_UPDATED, get().handleOrderUpdate);
          
          // Clear connection check interval if it exists
          const { connectionCheckInterval } = get();
          if (connectionCheckInterval) {
            clearInterval(connectionCheckInterval);
          }
          
          // Update connection status
          set({ websocketConnected: false, connectionCheckInterval: null });
          
          // Note: We don't actually disconnect the WebSocketManager here
          // as other components might be using it. We just unregister our handlers.
        }
      },
      
      handleNewOrder: (order: Order) => {
        if (!order || !order.id) return;
        
        console.debug('[OrderStore] Received new order via WebSocket:', order.id);
        console.debug('[OrderStore] Order staff info:', {
          created_by_staff_id: order.created_by_staff_id,
          is_staff_order: order.is_staff_order,
          staff_created: order.staff_created
        });
        
        // Get current user info from authStore
        const authState = useAuthStore.getState();
        const { isStaff, isAdmin, isSuperAdmin, user } = authState;
        
        // Skip filtering for admin and super admin users - they see all orders
        if (isAdmin() || isSuperAdmin()) {
          console.debug('[OrderStore] Admin user - showing all orders');
        }
        // Apply policy filtering for staff users
        else if (isStaff()) {
          // Get staff ID from user object (safely with type checking)
          const staffId = (user as any)?.staff_member?.id;
          
          if (staffId) {
            // Convert both IDs to strings for comparison to avoid type mismatches
            const orderStaffId = String(order.created_by_staff_id || '');
            const currentStaffId = String(staffId);
            
            // Check if this is a customer order (not staff-created and not a staff order)
            const isCustomerOrder = order.staff_created === false && order.is_staff_order === false;
            
            // Staff can see orders they created OR customer orders
            if (orderStaffId === currentStaffId) {
              console.debug(`[OrderStore] Showing order ${order.id} - created by current staff ${currentStaffId}`);
            } else if (isCustomerOrder) {
              console.debug(`[OrderStore] Showing order ${order.id} - this is a customer order`);
            } else {
              console.debug(`[OrderStore] Filtering out order ${order.id} - not created by current staff and not a customer order`);
              return; // Skip this order as it wasn't created by this staff member and is not a customer order
            }
          } else {
            console.debug('[OrderStore] Staff user without staff_member ID, unable to filter orders properly');
            return; // To be safe, don't show the order if we can't determine the staff ID
          }
        }
        
        // Check if we already have this order
        const existingOrderIndex = get().orders.findIndex((o: Order) => o.id === order.id);
        
        if (existingOrderIndex === -1) {
          // Get current metadata and page
          const { metadata } = get();
          const currentPage = metadata.page;
          
          // Always add new orders to the list if we're on page 1
          if (currentPage === 1) {
            console.debug('[OrderStore] Adding new order to page 1');
            
            // Create a shallow copy of the current state
            const currentOrders = [...get().orders];
            
            // Add the new order to the beginning of the array
            currentOrders.unshift(order);
            
            // Update the orders array and increment total_count in metadata
            set({
              orders: currentOrders,
              metadata: {
                ...get().metadata,
                total_count: get().metadata.total_count + 1,
                // Recalculate total_pages if needed
                total_pages: Math.ceil((get().metadata.total_count + 1) / get().metadata.per_page)
              }
            });
          } else {
            console.debug(`[OrderStore] On page ${currentPage}, refreshing orders to include new order`);
            
            // If we're not on page 1, refresh the current page to maintain consistency
            // This ensures the order counts and pagination are updated correctly
            const currentParams = {
              page: currentPage,
              perPage: metadata.per_page,
              _sourceId: 'websocket_new_order'
            };
            
            // Fetch orders quietly to update the list without showing loading state
            get().fetchOrdersQuietly(currentParams);
          }
        }
      },
      
      handleOrderUpdate: (order: Order) => {
        if (!order || !order.id) return;
        
        console.debug('[OrderStore] Received order update via WebSocket:', order.id);
        console.debug('[OrderStore] Order update staff info:', {
          created_by_staff_id: order.created_by_staff_id,
          is_staff_order: order.is_staff_order,
          staff_created: order.staff_created
        });
        
        // Get current user info from authStore
        const authState = useAuthStore.getState();
        const { isStaff, isAdmin, isSuperAdmin, user } = authState;
        
        // Skip filtering for admin and super admin users - they see all orders
        if (isAdmin() || isSuperAdmin()) {
          console.debug('[OrderStore] Admin user - showing all order updates');
        }
        // Apply policy filtering for staff users
        else if (isStaff()) {
          // Get staff ID from user object (safely with type checking)
          const staffId = (user as any)?.staff_member?.id;
          
          if (staffId) {
            // Convert both IDs to strings for comparison to avoid type mismatches
            const orderStaffId = String(order.created_by_staff_id || '');
            const currentStaffId = String(staffId);
            
            // Check if this is a customer order (not staff-created and not a staff order)
            const isCustomerOrder = order.staff_created === false && order.is_staff_order === false;
            
            // Staff can see orders they created OR customer orders
            if (orderStaffId === currentStaffId) {
              console.debug(`[OrderStore] Showing order update ${order.id} - created by current staff ${currentStaffId}`);
            } else if (isCustomerOrder) {
              console.debug(`[OrderStore] Showing order update ${order.id} - this is a customer order`);
            } else {
              console.debug(`[OrderStore] Filtering out order update ${order.id} - not created by current staff and not a customer order`);
              return; // Skip this order update as it wasn't created by this staff member and is not a customer order
            }
          } else {
            console.debug('[OrderStore] Staff user without staff_member ID, unable to filter order updates properly');
            return; // To be safe, don't show the order update if we can't determine the staff ID
          }
        }
        
        // Check if this order is in our current view
        const orderExists = get().orders.some((o: Order) => o.id === order.id);
        
        if (orderExists) {
          // Only update if the order is in our current page
          console.debug('[OrderStore] Updating existing order in current page');
          
          // IMPORTANT: Create a shallow copy of the current orders to avoid modifying metadata
          const updatedOrders = get().orders.map((o: Order) => 
            o.id === order.id ? { ...o, ...order } : o
          );
          
          // Update only the orders array, explicitly preserving the existing metadata
          set({
            orders: updatedOrders,
            // Explicitly keep the same metadata to prevent pagination issues
            metadata: { ...get().metadata }
          });
        } else {
          // If the order isn't in our current view, don't modify the state
          // This prevents pagination issues when viewing pages other than page 1
          console.debug('[OrderStore] Order not in current page, skipping update');
        }
      },
      
      // ---------------------------------------------------------
      // Polling Methods (Fallback) - Using centralized PollingManager
      // ---------------------------------------------------------
      startOrderPolling: () => {
        // First stop any existing polling
        get().stopOrderPolling();
        
        // Triple-check if WebSocket is connected - if so, don't start polling
        if (get().websocketConnected) {
          console.debug('[OrderStore] WebSocket is connected, not starting polling');
          return;
        }
        
        // Check if user has WebSocket capability
        const user = useAuthStore.getState().user;
        if (!user?.restaurant_id) {
          console.debug('[OrderStore] No restaurant ID available, cannot start polling');
          return;
        }
        
        // Log that we're falling back to polling
        console.debug('[OrderStore] Starting polling for orders (WebSocket fallback)');
        
        // Try to reconnect WebSocket before falling back to polling
        console.debug('[OrderStore] Attempting WebSocket connection before polling');
        
        // Initialize WebSocketManager
        webSocketManager.initialize(user.restaurant_id);
        
        // Register handlers for order notifications
        webSocketManager.registerHandler(NotificationType.NEW_ORDER, (order: Order) => {
          get().handleNewOrder(order);
        });
        
        webSocketManager.registerHandler(NotificationType.ORDER_UPDATED, (order: Order) => {
          get().handleOrderUpdate(order);
        });
        
        // Check if connected
        const isConnected = webSocketManager.isConnected();
        
        if (isConnected) {
          console.debug('[OrderStore] WebSocket connected successfully, no need for polling');
          set({ websocketConnected: true });
          return;
        }
        
        // If WebSocket connection failed, start polling using the PollingManager
        console.debug('[OrderStore] WebSocket connection failed, proceeding with polling');
        
        // Get the current metadata to ensure we poll with the correct page
        const { metadata } = get();
        
        // Create polling handler function
        const handlePollingResults = (data: any) => {
          if (!data || !data.orders) {
            console.debug('[OrderStore] Polling returned no data');
            return;
          }
          
          // Update the store with the polling results
          set({
            orders: data.orders || [],
            metadata: {
              total_count: data.total_count || 0,
              page: data.page || 1,
              per_page: data.per_page || 10,
              total_pages: data.total_pages || Math.ceil((data.total_count || 0) / (data.per_page || 10))
            }
          });
          
          console.debug(`[OrderStore] Updated orders from polling: ${data.orders.length} orders`);
        };
        
        // Start polling using the centralized PollingManager
        const pollingId = pollingManager.startPolling(
          PollingResourceType.ORDERS,
          handlePollingResults,
          {
            interval: 30000, // 30 seconds
            params: {
              page: metadata.page,
              per_page: metadata.per_page
            },
            sourceId: 'orderStore'
          }
        );
        
        // Store the polling ID so we can stop it later
        set({ pollingInterval: pollingId as any });
        
        // Set up a connection status check interval to stop polling if WebSocket connects
        const connectionCheckInterval = setInterval(() => {
          const isConnected = webSocketManager.isConnected();
          
          // If WebSocket is now connected, stop polling
          if (isConnected && !get().websocketConnected) {
            console.debug('[OrderStore] WebSocket is now connected, stopping polling');
            set({ websocketConnected: true });
            get().stopOrderPolling();
          }
          // If WebSocket disconnected, make sure polling is active
          else if (!isConnected && get().websocketConnected) {
            console.debug('[OrderStore] WebSocket disconnected, ensuring polling is active');
            set({ websocketConnected: false });
            
            // Only start polling if we don't already have an active polling interval
            if (!get().pollingInterval) {
              get().startOrderPolling();
            }
          }
        }, 5000); // Check every 5 seconds
        
        // Store the interval ID so we can clear it later
        set({ connectionCheckInterval });
      },
      
      stopOrderPolling: () => {
        const { pollingInterval, websocketConnected, connectionCheckInterval } = get();
        
        console.debug('[OrderStore] Stopping order polling', {
          hasPollingInterval: pollingInterval !== null,
          websocketConnected
        });
        
        // Clear the connection check interval if it exists
        if (connectionCheckInterval) {
          clearInterval(connectionCheckInterval);
          set({ connectionCheckInterval: null });
        }
        
        // Stop polling using the centralized PollingManager
        if (pollingInterval !== null) {
          console.debug('[OrderStore] Stopping polling through PollingManager');
          // Convert the polling interval to string if it's a number (for backward compatibility)
          const pollingId = typeof pollingInterval === 'number' 
            ? String(pollingInterval) 
            : pollingInterval as string;
            
          pollingManager.stopPolling(pollingId);
          set({ pollingInterval: null });
        }
        
        // If WebSocket is not connected, try to connect now that polling is stopped
        if (!websocketConnected) {
          const user = useAuthStore.getState().user;
          if (user?.restaurant_id) {
            console.debug('[OrderStore] Attempting to establish WebSocket connection after stopping polling');
            
            // Initialize the WebSocketManager
            webSocketManager.initialize(user.restaurant_id);
            
            // Register handlers for order notifications
            webSocketManager.registerHandler(NotificationType.NEW_ORDER, (order: Order) => {
              get().handleNewOrder(order);
            });
            
            webSocketManager.registerHandler(NotificationType.ORDER_UPDATED, (order: Order) => {
              get().handleOrderUpdate(order);
            });
            
            // Get connection status
            const isConnected = webSocketManager.isConnected();
            set({ websocketConnected: isConnected });
            
            if (isConnected) {
              console.debug('[OrderStore] WebSocket connected successfully after stopping polling');
            } else {
              console.debug('[OrderStore] WebSocket connection failed after stopping polling');
            }
          }
        }
      },

      // ---------------------------------------------------------
      // Fetch orders with server-side pagination, filtering, and sorting
      // ---------------------------------------------------------
      fetchOrders: async (params: OrderQueryParams = {}) => {
        // Create a new AbortController for this request
        const controller = new AbortController();
        
        // Check if this is a page change request (starts with 'page-change-')
        const isPaginationRequest = params._sourceId && String(params._sourceId).startsWith('page-change-');
        
        // Only set loading: true if this is not a pagination request
        // This prevents the UI from flashing during page transitions
        if (!isPaginationRequest) {
          set({ loading: true, error: null });
        } else {
          // For pagination requests, just clear errors
          set({ error: null });
          console.debug(`[OrderStore] Handling pagination request: ${params._sourceId}, page: ${params.page}`);
        }
        
        // Abort any existing fetch to prevent race conditions
        get().abortCurrentFetch();
        
        // Set this controller as the current fetch controller
        set({ _currentFetchController: controller });
        
        try {
          const {
            page = 1,
            per_page = 10,
            status = null,
            sort_by = 'created_at',
            sort_direction = 'desc',
            date_from = null,
            date_to = null,
            search_query = null,
            restaurant_id = null
          } = params;
          
          // Build query string
          const queryParams = new URLSearchParams();
          queryParams.append('page', page.toString());
          queryParams.append('per_page', per_page.toString());
          if (status && status !== 'all') queryParams.append('status', status);
          queryParams.append('sort_by', sort_by);
          queryParams.append('sort_direction', sort_direction);
          if (date_from) queryParams.append('date_from', date_from);
          if (date_to) queryParams.append('date_to', date_to);
          if (search_query) queryParams.append('search', search_query);
          if (restaurant_id) queryParams.append('restaurant_id', restaurant_id);
          
          // Include all other parameters from the params object
          // This ensures parameters like online_orders_only, staff_member_id, etc. are included
          Object.entries(params).forEach(([key, value]) => {
            // Skip parameters we've already handled, internal parameters (those starting with _),
            // signal parameter, and object values to prevent serialization errors
            if (!['page', 'per_page', 'status', 'sort_by', 'sort_direction', 'date_from', 'date_to', 'search_query', 'restaurant_id', 'endpoint', 'signal'].includes(key) 
                && !key.startsWith('_') 
                && value !== null 
                && value !== undefined 
                && typeof value !== 'object') {
              queryParams.append(key, String(value));
            }
          });
          
          // Always use the standard '/orders' endpoint since '/orders/staff' doesn't exist
          // The staff parameter will be passed as a query parameter instead
          const endpoint = '/orders';
          
          // If staff endpoint was requested, add a staff=true parameter instead
          if (params.endpoint === 'staff') {
            queryParams.append('staff', 'true');
          }
          
          // Remove the endpoint param since it's not a real API parameter
          delete params.endpoint;
          
          // Pass the AbortController signal to the API request for cancellation support
          const response = await api.get<{
            orders: Order[];
            total_count: number;
            page: number;
            per_page: number;
            total_pages: number;
          }>(`${endpoint}?${queryParams.toString()}`, { signal: controller.signal });
          
          // If the request was aborted while we were waiting, don't update state
          if (get()._currentFetchController !== controller) {
            console.debug(`[OrderStore] Request was superseded by a newer request, discarding results`);
            return;
          }
          
          // Create basic metadata from API response
          const rawMetadata = {
            total_count: response.total_count || 0,
            page: response.page || 1,
            per_page: response.per_page || 10,
            total_pages: response.total_pages || 0 // Don't calculate here, let the helper function do it
          };
          
          // Use our helper function to ensure consistent metadata calculation with fallbacks
          const metadata = calculatePaginationMetadata(response.orders || [], rawMetadata);
          
          set({ 
            orders: response.orders || [], 
            metadata, 
            loading: false 
          });
        } catch (err: any) {
          // Don't report errors from aborted requests as they're expected
          if (err.name === 'AbortError') {
            console.debug('[OrderStore] Request was aborted');
            // Still need to set loading to false for aborted requests in fetchOrders
            set({ loading: false });
            return;
          }
          
          set({ error: err.message, loading: false });
        } finally {
          // Clear the fetch controller if it's still the current one
          if (get()._currentFetchController === controller) {
            set({ _currentFetchController: null });
          }
        }
      },

      // ---------------------------------------------------------
      // Fetch quietly (no loading state) with server-side pagination, filtering, and sorting
      // ---------------------------------------------------------
      // Track the last fetch request to prevent race conditions
      
      fetchOrdersQuietly: async (params: OrderQueryParams = {}) => {
        // Create a new AbortController for this request
        const controller = new AbortController();
        
        try {
          // If source is polling and WebSocket is connected, skip the request
          if (params._sourceId === 'polling' && get().websocketConnected) {
            console.debug('[OrderStore] Skipping polling request because WebSocket is connected');
            return;
          }
          
          // Abort any existing fetch to prevent race conditions
          get().abortCurrentFetch();
          
          // Set this controller as the current fetch controller
          set({ _currentFetchController: controller });
          
          const {
            page = 1,
            per_page = 10,
            status = null,
            sort_by = 'created_at',
            sort_direction = 'desc',
            date_from = null,
            date_to = null,
            search_query = null,
            restaurant_id = null,
            _sourceId = null
          } = params;
          
          // Log the request source and parameters for debugging
          console.debug(`[OrderStore] Fetch request from source ${_sourceId || 'unknown'} for page ${page}`);
          
          // Build query string
          const queryParams = new URLSearchParams();
          queryParams.append('page', page.toString());
          queryParams.append('per_page', per_page.toString());
          if (status && status !== 'all') queryParams.append('status', status);
          queryParams.append('sort_by', sort_by);
          queryParams.append('sort_direction', sort_direction);
          if (date_from) queryParams.append('date_from', date_from);
          if (date_to) queryParams.append('date_to', date_to);
          if (search_query) queryParams.append('search', search_query);
          if (restaurant_id) queryParams.append('restaurant_id', restaurant_id);
          
          // Include all other parameters from the params object
          // This ensures parameters like online_orders_only, staff_member_id, etc. are included
          Object.entries(params).forEach(([key, value]) => {
            // Skip parameters we've already handled, internal parameters (those starting with _),
            // signal parameter, and object values to prevent serialization errors
            if (!['page', 'per_page', 'status', 'sort_by', 'sort_direction', 'date_from', 'date_to', 'search_query', 'restaurant_id', 'endpoint', 'signal'].includes(key) 
                && !key.startsWith('_') 
                && value !== null 
                && value !== undefined 
                && typeof value !== 'object') {
              queryParams.append(key, String(value));
            }
          });
          
          // Update metadata before the request to ensure any WebSocket updates
          // that arrive while we're waiting for the response use the correct page
          set(state => ({
            metadata: {
              ...state.metadata,
              page: page,
              per_page: per_page
            }
          }));
          
          // Always use the standard '/orders' endpoint since '/orders/staff' doesn't exist
          // The staff parameter will be passed as a query parameter instead
          const endpoint = '/orders';
          
          // If staff endpoint was requested, add a staff=true parameter instead
          if (params.endpoint === 'staff') {
            queryParams.append('staff', 'true');
          }
          
          // Remove the endpoint param since it's not a real API parameter
          delete params.endpoint;
          
          // Pass the AbortController signal to the API request for cancellation support
          const response = await api.get<{
            orders: Order[];
            total_count: number;
            page: number;
            per_page: number;
            total_pages: number;
          }>(`${endpoint}?${queryParams.toString()}`, { signal: controller.signal });
          
          // Debug API response
          console.log(`[OrderStore] API response received for ${endpoint}:`, {
            orderCount: response.orders?.length || 0,
            metadata: {
              total_count: response.total_count,
              page: response.page,
              per_page: response.per_page,
              total_pages: response.total_pages
            }
          });
          
          // If the request was aborted while we were waiting, don't update state
          if (get()._currentFetchController !== controller) {
            console.debug(`[OrderStore] Request was superseded by a newer request, discarding results`);
            return;
          }
          
          // Create basic metadata from API response
          const rawMetadata = {
            total_count: response.total_count || 0,
            page: response.page || 1,
            per_page: response.per_page || 10,
            total_pages: response.total_pages || 0 // Don't calculate here, let the helper function do it
          };
          
          // Use our helper function to ensure consistent metadata calculation with fallbacks
          const metadata = calculatePaginationMetadata(response.orders || [], rawMetadata);
          console.debug(`[OrderStore] Updating state with page ${metadata.page} data from source: ${_sourceId || 'unknown'}`);
          console.debug(`[OrderStore] Metadata from API: total_count=${metadata.total_count}, total_pages=${metadata.total_pages}`);
          
          // If we have orders but total_count is 0, use orders length instead
          const ordersArray = response.orders || [];
          if (metadata.total_count === 0 && ordersArray.length > 0) {
            metadata.total_count = ordersArray.length;
            metadata.total_pages = Math.ceil(ordersArray.length / metadata.per_page);
            console.debug(`[OrderStore] Corrected metadata from orders array: total_count=${metadata.total_count}, total_pages=${metadata.total_pages}`);
          }
          
          // Only update orders, don't change loading state
          set({ orders: ordersArray, metadata });
        } catch (err: any) {
          // Don't report errors from aborted requests as they're expected
          if (err.name === 'AbortError') {
            console.debug('[OrderStore] Request was aborted');
            return;
          }
          
          // Only update error state for real errors, don't change loading state
          set({ error: err.message });
          console.error('[OrderStore] Error fetching orders:', err.message);
        } finally {
          // Clear the fetch controller if it's still the current one
          if (get()._currentFetchController === controller) {
            set({ _currentFetchController: null });
          }
        }
      },

      // ---------------------------------------------------------
      // Create Order
      // ---------------------------------------------------------
      addOrder: async (
        items,
        total,
        specialInstructions,
        contactName,
        contactPhone,
        contactEmail,
        transactionId,
        paymentMethod = 'credit_card',
        vipCode,
        staffModal = false,
        paymentDetails = null,
        locationId = null
      ) => {
        // Skip setting loading state since we're showing a payment processing overlay already
        // This avoids unnecessary UI updates that can slow down the process
        set({ error: null });
        try {
          // Separate food vs merchandise
          const foodItems = [];
          const merchandiseItems = [];
          
          // Single-pass categorization is more efficient
          for (const item of items) {
            if (item.type === 'merchandise') {
              merchandiseItems.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                variant_id: item.variant_id,
                size: item.size,
                color: item.color,
                notes: item.notes
              });
            } else {
              foodItems.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                customizations: item.customizations,
                notes: item.notes
              });
            }
          }

          // Extract staffOrderParams from paymentDetails if present
          const staffOrderParams = paymentDetails?.staffOrderParams || {};
          
          const payload = {
            order: {
              items: foodItems,
              merchandise_items: merchandiseItems,
              total,
              special_instructions: specialInstructions,
              contact_name: contactName,
              contact_phone: contactPhone,
              contact_email: contactEmail,
              transaction_id: transactionId,
              payment_method: paymentMethod,
              vip_code: vipCode,
              staff_modal: staffModal,
              payment_details: paymentDetails,
              // Include location_id if provided
              location_id: locationId,
              // Include staff order parameters, especially created_by_staff_id
              ...staffOrderParams
            },
          };

          // Optimistic UI: create a temporary order
          const tempId = `temp-${Date.now()}`;
          const optimisticOrder: Order = {
            id: tempId,
            status: 'pending',
            items: foodItems,
            merchandise_items: merchandiseItems,
            total,
            special_instructions: specialInstructions,
            contact_name: contactName || '',
            contact_phone: contactPhone || '',
            contact_email: contactEmail || '',
            transaction_id: transactionId || '',
            payment_method: paymentMethod,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          set({
            orders: [...get().orders, optimisticOrder],
            cartItems: [] // Clear the cart right away for fast UI
          });

          // Real API call
          const newOrder = await api.post<Order>('/orders', payload);

          // Replace the optimistic order with the real one
          set({
            orders: get().orders.map(order => 
              order.id === tempId ? newOrder : order
            )
          });

          return newOrder;
        } catch (err: any) {
          set({ error: err.message });
          console.error('Failed to create order:', err);
          return {
            id: `error-${Date.now()}`,
            status: 'error',
            error: err.message
          } as any;
        }
      },

      // ---------------------------------------------------------
      // Update order status
      // ---------------------------------------------------------
      updateOrderStatus: async (orderId, status, pickupTime) => {
        set({ loading: true, error: null });
        try {
          const orderPayload: any = { status };
          if (pickupTime) {
            orderPayload.estimated_pickup_time = pickupTime;
          }
          const updatedOrder = await api.patch<Order>(`/orders/${orderId}`, {
            order: orderPayload,
          });
          const updatedOrders = get().orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
          set({ orders: updatedOrders, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      // ---------------------------------------------------------
      // Update order status quietly (no loading spinner)
      // ---------------------------------------------------------
      updateOrderStatusQuietly: async (orderId, status, pickupTime) => {
        set({ error: null });
        const existingOrder = get().orders.find((o: Order) => o.id === orderId);
        if (existingOrder) {
          const typedStatus = status as Order['status'];
          const optimisticOrder = { ...existingOrder, status: typedStatus };
          if (pickupTime) {
            (optimisticOrder as any).estimated_pickup_time = pickupTime;
          }
          const optimisticOrders = get().orders.map((o: Order) =>
            o.id === orderId ? optimisticOrder : o
          );
          set({ orders: optimisticOrders });
        }
        try {
          const orderPayload: any = { status };
          if (pickupTime) {
            orderPayload.estimated_pickup_time = pickupTime;
          }
          const updatedOrder = await api.patch<Order>(`/orders/${orderId}`, {
            order: orderPayload,
          });
          const newOrders = get().orders.map(o =>
            o.id === updatedOrder.id ? updatedOrder : o
          );
          set({ orders: newOrders });
        } catch (err: any) {
          set({ error: err.message });
          // revert or re-fetch if needed
        }
      },

      // ---------------------------------------------------------
      // Update entire order
      // ---------------------------------------------------------
      updateOrderData: async (orderId, updatedOrder) => {
        set({ loading: true, error: null });
        try {
          const resp = await api.patch<Order>(`/orders/${orderId}`, {
            order: updatedOrder
          });
          const updatedOrders = get().orders.map(o =>
            o.id === resp.id ? resp : o
          );
          set({ orders: updatedOrders, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      // ---------------------------------------------------------
      // Return order history for a user
      // ---------------------------------------------------------
      getOrderHistory: (userId: number) => {
        return get().orders.filter(o => (o as any).user_id === userId || (o as any).userId === userId);
      },

      // ---------------------------------------------------------
      // CART
      // ---------------------------------------------------------
      cartItems: [],
      _getItemKey: (item: any): string => {
        let customizationsKey = '';
        if (item.customizations) {
          if (Array.isArray(item.customizations)) {
            // Sort by group/option ID
            customizationsKey = JSON.stringify(
              item.customizations.sort((a: any, b: any) => {
                if (a.option_group_id === b.option_group_id) {
                  return a.option_id - b.option_id;
                }
                return a.option_group_id - b.option_group_id;
              })
            );
          } else {
            // Object-based
            const sortedGroups = Object.keys(item.customizations).sort();
            const groupStrings = sortedGroups.map(groupName => {
              const options = item.customizations[groupName];
              return `${groupName}:${Array.isArray(options)
                ? [...options].sort().join(',')
                : options}`;
            });
            customizationsKey = JSON.stringify(groupStrings);
          }
        }
        return `${item.id}-${customizationsKey}`;
      },

      addToCart: (item, quantity = 1) => {
        set((state) => {
          const getItemKey = get()._getItemKey;
          const itemKey = getItemKey(item);
          const existing = state.cartItems.find(ci => getItemKey(ci) === itemKey);
          if (existing) {
            return {
              cartItems: state.cartItems.map(ci =>
                getItemKey(ci) === itemKey
                  ? { ...ci, quantity: ci.quantity + quantity }
                  : ci
              )
            };
          }
          return { cartItems: [...state.cartItems, { ...item, quantity }] };
        });
      },

      removeFromCart: (itemId) => {
        set((state) => {
          const itemToRemove = state.cartItems.find(ci =>
            ci.id === itemId || get()._getItemKey(ci) === itemId
          );
          if (!itemToRemove) return state;
          const fullKey = get()._getItemKey(itemToRemove);
          return {
            cartItems: state.cartItems.filter(ci => get()._getItemKey(ci) !== fullKey)
          };
        });
      },

      setCartQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId);
        } else {
          set((state) => {
            const itemToUpdate = state.cartItems.find(ci =>
              ci.id === itemId || get()._getItemKey(ci) === itemId
            );
            if (!itemToUpdate) return state;
            const fullKey = get()._getItemKey(itemToUpdate);
            return {
              cartItems: state.cartItems.map(ci =>
                get()._getItemKey(ci) === fullKey
                  ? { ...ci, quantity }
                  : ci
              )
            };
          });
        }
      },

      clearCart: () => {
        set({ cartItems: [] });
      },

      setCartItemNotes: (itemId, notes) => {
        set((state) => {
          const itemToUpdate = state.cartItems.find(ci =>
            ci.id === itemId || get()._getItemKey(ci) === itemId
          );
          if (!itemToUpdate) return state;
          const fullKey = get()._getItemKey(itemToUpdate);
          return {
            cartItems: state.cartItems.map(ci =>
              get()._getItemKey(ci) === fullKey
                ? { ...ci, notes }
                : ci
            )
          };
        });
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ cartItems: state.cartItems }),
    }
  )
);
