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
  perPage?: number;
  status?: string | null;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  dateFrom?: string | null;
  dateTo?: string | null;
  searchQuery?: string | null;
  restaurantId?: string | null;
  // endpoint parameter removed - backend handles authorization
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
  updateOrderStatusQuietly: (orderId: string, status: string, pickupTime?: string, currentFilter?: string) => Promise<void>;

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

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
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
      // WebSocket Methods
      // ---------------------------------------------------------
      startWebSocketConnection: (paginationParams?: { page?: number; perPage?: number }) => {
        console.debug('[OrderStore] Requesting WebSocket connection via centralized manager');
        
        // Stop polling if it's active
        get().stopOrderPolling();
        
        // First clean up any existing handlers to prevent duplicates
        webSocketManager.unregisterHandler(NotificationType.NEW_ORDER, undefined, 'orderStore');
        webSocketManager.unregisterHandler(NotificationType.ORDER_UPDATED, undefined, 'orderStore');
        
        const user = useAuthStore.getState().user;
        if (!user?.restaurant_id) {
          console.error('[OrderStore] Cannot request WebSocket connection: No restaurant ID');
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
        
        // Create stable handler references to avoid duplicate registrations
        const newOrderHandler = (order: Order) => get().handleNewOrder(order);
        const orderUpdateHandler = (order: Order) => get().handleOrderUpdate(order);
        
        // Register handlers for order notifications with source identifier
        webSocketManager.registerHandler(NotificationType.NEW_ORDER, newOrderHandler, 'orderStore');
        webSocketManager.registerHandler(NotificationType.ORDER_UPDATED, orderUpdateHandler, 'orderStore');
        
        // Update pagination parameters
        webSocketManager.updatePaginationParams({
          page: currentMetadata.page,
          perPage: currentMetadata.per_page
        });
        
        // Check if WebSocket is already connected by the centralized manager
        if (webSocketManager.isConnected()) {
          console.debug('[OrderStore] WebSocket already connected by centralized manager');
          set({ websocketConnected: true });
          
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
          
          return true;
        }
        
        // If not connected, rely on the centralized initialization
        // The AdminDashboard or other components should handle the actual connection
        console.debug('[OrderStore] WebSocket not yet connected, registered handlers for when connection is established');
        
        // Set connection status based on actual WebSocket state
        set({ websocketConnected: webSocketManager.isConnected() });
        
        // Return the connection status
        return webSocketManager.isConnected();
      },
      
      stopWebSocketConnection: () => {
        console.debug('[OrderStore] Stopping WebSocket connection and unregistering handlers');
        
        // Unregister all handlers from this source (much more reliable than function reference)
        webSocketManager.unregisterHandler(NotificationType.NEW_ORDER, undefined, 'orderStore');
        webSocketManager.unregisterHandler(NotificationType.ORDER_UPDATED, undefined, 'orderStore');
        
        // Clear connection check interval if it exists
        const { connectionCheckInterval } = get();
        if (connectionCheckInterval) {
          clearInterval(connectionCheckInterval);
        }
        
        // Update connection status
        set({ websocketConnected: false, connectionCheckInterval: null });
        
        // Note: We don't disconnect the centralized WebSocketManager
        // Other components may still need the connection
      },
      
      handleNewOrder: (order: Order) => {
        if (!order || !order.id) return;
        
        // ROLE CHECK: Filter orders based on user role
        const user = useAuthStore.getState().user;
        
        if (!user) {
          console.debug('[OrderStore] No user found, ignoring order notification');
          return;
        }
        
        // For staff users: only show orders they created via the staff modal
        if (user.role === 'staff') {
          // Staff users can only see orders where:
          // 1. The order was created by this user (created_by_user_id matches)
          // 2. The order was created via staff modal (staff_created is true)
          const isUserCreatedOrder = order.staff_created && 
            String(order.created_by_user_id) === String(user.id);
          
          if (!isUserCreatedOrder) {
            console.debug('[OrderStore] Staff user - ignoring order not created by them:', {
              orderId: order.id,
              orderCreatedByUserId: order.created_by_user_id,
              currentUserId: user.id,
              staffCreated: order.staff_created
            });
            return;
          }
        }
        
        // For admin/super_admin: they can see all orders (no additional filtering needed)
        
        // Check if we already have this order
        const existingOrderIndex = get().orders.findIndex((o: Order) => o.id === order.id);
        
        if (existingOrderIndex === -1) {
          // Get current metadata and page
          const { metadata } = get();
          const currentPage = metadata.page;
          
          // Always add new orders to the list if we're on page 1
          if (currentPage === 1) {
            
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
        

        
        // Trust backend to send only authorized orders
        // No frontend filtering needed
        
        // Check if this order is in our current view
        const orderExists = get().orders.some((o: Order) => o.id === order.id);
        
        if (orderExists) {
          // Only update if the order is in our current page
          
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
        
        // Clean up any existing polling handlers first to prevent duplicates
        webSocketManager.unregisterHandler(NotificationType.NEW_ORDER, undefined, 'orderStore_polling');
        webSocketManager.unregisterHandler(NotificationType.ORDER_UPDATED, undefined, 'orderStore_polling');
        
        // Register handlers for order notifications
        webSocketManager.registerHandler(NotificationType.NEW_ORDER, (order: Order) => {
          get().handleNewOrder(order);
        }, 'orderStore_polling');
        
        webSocketManager.registerHandler(NotificationType.ORDER_UPDATED, (order: Order) => {
          get().handleOrderUpdate(order);
        }, 'orderStore_polling');
        
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
          
          // Clean up polling handlers when we stop polling
          webSocketManager.unregisterHandler(NotificationType.NEW_ORDER, undefined, 'orderStore_polling');
          webSocketManager.unregisterHandler(NotificationType.ORDER_UPDATED, undefined, 'orderStore_polling');
        }
        
        // If WebSocket is not connected, try to connect now that polling is stopped
        if (!websocketConnected) {
          const user = useAuthStore.getState().user;
          if (user?.restaurant_id) {
            console.debug('[OrderStore] Attempting to establish WebSocket connection after stopping polling');
            
            // Initialize the WebSocketManager
            webSocketManager.initialize(user.restaurant_id);
            
            // Clean up any existing polling handlers first to prevent duplicates
            webSocketManager.unregisterHandler(NotificationType.NEW_ORDER, undefined, 'orderStore_polling');
            webSocketManager.unregisterHandler(NotificationType.ORDER_UPDATED, undefined, 'orderStore_polling');
            
            // Register handlers for order notifications
            webSocketManager.registerHandler(NotificationType.NEW_ORDER, (order: Order) => {
              get().handleNewOrder(order);
            }, 'orderStore_polling');
            
            webSocketManager.registerHandler(NotificationType.ORDER_UPDATED, (order: Order) => {
              get().handleOrderUpdate(order);
            }, 'orderStore_polling');
            
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
        set({ loading: true, error: null });
        
        try {
          const {
            page = 1,
            perPage = 10,
            status = null,
            sortBy = 'created_at',
            sortDirection = 'desc',
            dateFrom = null,
            dateTo = null,
            searchQuery = null,
            restaurantId = null
          } = params;
          
          // Build query string
          const queryParams = new URLSearchParams();
          queryParams.append('page', page.toString());
          queryParams.append('per_page', perPage.toString());
          if (status && status !== 'all') queryParams.append('status', status);
          queryParams.append('sort_by', sortBy);
          queryParams.append('sort_direction', sortDirection);
          if (dateFrom) queryParams.append('date_from', dateFrom);
          if (dateTo) queryParams.append('date_to', dateTo);
          if (searchQuery) queryParams.append('search', searchQuery);
          if (restaurantId) queryParams.append('restaurant_id', restaurantId);
          
          // Include all other parameters from the params object
          // This ensures parameters like online_orders_only, staff_member_id, etc. are included
          Object.entries(params).forEach(([key, value]) => {
            // Skip parameters we've already handled and internal parameters (those starting with _)
            // Also skip restaurant_id to avoid duplicates (we use restaurantId above)
            if (!['page', 'perPage', 'status', 'sortBy', 'sortDirection', 'dateFrom', 'dateTo', 'searchQuery', 'restaurantId', 'restaurant_id'].includes(key) && !key.startsWith('_') && value !== null && value !== undefined) {
              queryParams.append(key, String(value));
            }
          });
          
          // Always use the main orders endpoint (backend handles authorization)
          const endpoint = '/orders';
          
          const fullUrl = `${endpoint}?${queryParams.toString()}`;
          
          const response = await api.get<{
            orders: Order[];
            total_count: number;
            page: number;
            per_page: number;
            total_pages: number;
          }>(fullUrl);
          
          const metadata = {
            total_count: response.total_count || 0,
            page: response.page || 1,
            per_page: response.per_page || 10,
            total_pages: response.total_pages || Math.ceil((response.total_count || 0) / (response.per_page || 10))
          };
          
          set({ 
            orders: response.orders || [], 
            metadata, 
            loading: false 
          });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      // ---------------------------------------------------------
      // Fetch quietly (no loading state) with server-side pagination, filtering, and sorting
      // ---------------------------------------------------------
      // Track the last fetch request to prevent race conditions
      
      fetchOrdersQuietly: async (params: OrderQueryParams = {}) => {
        try {
          // If source is polling and WebSocket is connected, skip the request
          if (params._sourceId === 'polling' && get().websocketConnected) {
            console.debug('[OrderStore] Skipping polling request because WebSocket is connected');
            return;
          }
          
          const {
            page = 1,
            perPage = 10,
            status = null,
            sortBy = 'created_at',
            sortDirection = 'desc',
            dateFrom = null,
            dateTo = null,
            searchQuery = null,
            restaurantId = null,
            _sourceId = null
          } = params;
          

          
          // Build query string
          const queryParams = new URLSearchParams();
          queryParams.append('page', page.toString());
          queryParams.append('per_page', perPage.toString());
          if (status && status !== 'all') queryParams.append('status', status);
          queryParams.append('sort_by', sortBy);
          queryParams.append('sort_direction', sortDirection);
          if (dateFrom) queryParams.append('date_from', dateFrom);
          if (dateTo) queryParams.append('date_to', dateTo);
          if (searchQuery) queryParams.append('search', searchQuery);
          if (restaurantId) queryParams.append('restaurant_id', restaurantId);
          
          // Include all other parameters from the params object
          // This ensures parameters like online_orders_only, staff_member_id, etc. are included
          Object.entries(params).forEach(([key, value]) => {
            // Skip parameters we've already handled and internal parameters (those starting with _)
            // Also skip restaurant_id to avoid duplicates (we use restaurantId above)
            if (!['page', 'perPage', 'status', 'sortBy', 'sortDirection', 'dateFrom', 'dateTo', 'searchQuery', 'restaurantId', 'restaurant_id'].includes(key) && !key.startsWith('_') && value !== null && value !== undefined) {
              queryParams.append(key, String(value));
            }
          });
          
          // Update metadata before the request to ensure any WebSocket updates
          // that arrive while we're waiting for the response use the correct page
          set(state => ({
            metadata: {
              ...state.metadata,
              page: page,
              per_page: perPage
            }
          }));
          
          // Always use the main orders endpoint (backend handles authorization)
          const endpoint = '/orders';
          
          const fullUrl = `${endpoint}?${queryParams.toString()}`;
          
          const response = await api.get<{
            orders: Order[];
            total_count: number;
            page: number;
            per_page: number;
            total_pages: number;
          }>(fullUrl);
          
          const metadata = {
            total_count: response.total_count || 0,
            page: response.page || 1,
            per_page: response.per_page || 10,
            total_pages: response.total_pages || Math.ceil((response.total_count || 0) / (response.per_page || 10))
          };
          

          
          // Only update orders, don't change loading state
          set({ orders: response.orders || [], metadata });
        } catch (err: any) {
          // Only update error, don't change loading state
          set({ error: err.message });
          console.error('Error fetching orders:', err.message);
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
      updateOrderStatusQuietly: async (orderId, status, pickupTime, currentFilter?: string) => {
        set({ error: null });
        
        const existingOrder = get().orders.find((o: Order) => o.id === orderId);
        if (existingOrder) {
          const typedStatus = status as Order['status'];
          const optimisticOrder = { ...existingOrder, status: typedStatus };
          if (pickupTime) {
            (optimisticOrder as any).estimated_pickup_time = pickupTime;
          }
          
          // Check if the order should still be visible in the current filtered view
          let shouldRemoveFromView = false;
          
          if (currentFilter && currentFilter !== 'all') {
            // If we're viewing a specific status filter and the new status doesn't match,
            // the order should be removed from the current view
            shouldRemoveFromView = typedStatus !== currentFilter;
          }
          
          if (shouldRemoveFromView) {
            // Remove the order from the current view since it no longer matches the filter
            const filteredOrders = get().orders.filter((o: Order) => o.id !== orderId);
            
            // Update the metadata to reflect the reduced count
            const currentMetadata = get().metadata;
            set({ 
              orders: filteredOrders,
              metadata: {
                ...currentMetadata,
                total_count: Math.max(0, currentMetadata.total_count - 1)
              }
            });
          } else {
            // Keep the order but update its status
            const optimisticOrders = get().orders.map((o: Order) =>
              o.id === orderId ? optimisticOrder : o
            );
            set({ orders: optimisticOrders });
          }
        }
        
        try {
          const orderPayload: any = { status };
          if (pickupTime) {
            orderPayload.estimated_pickup_time = pickupTime;
          }
          const updatedOrder = await api.patch<Order>(`/orders/${orderId}`, {
            order: orderPayload,
          });
          
          // After backend confirmation, update the order if it's still in the view
          const orderStillInView = get().orders.some(o => o.id === updatedOrder.id);
          if (orderStillInView) {
            const newOrders = get().orders.map(o =>
              o.id === updatedOrder.id ? updatedOrder : o
            );
            set({ orders: newOrders });
          }
          
        } catch (err: any) {
          set({ error: err.message });
          // On error, revert the optimistic update by refreshing the current view
          const currentMetadata = get().metadata;
          get().fetchOrdersQuietly({
            page: currentMetadata.page,
            perPage: currentMetadata.per_page,
            _sourceId: 'status_update_error_revert'
          });
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
