// src/ordering/store/orderStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type { Order, OrderItem } from '../types/order';
import websocketService from '../../shared/services/websocketService';
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
  _sourceId?: string; // Track the source of the request for debugging
}

interface OrderStore {
  orders: Order[];
  metadata: OrdersMetadata;
  loading: boolean;
  error: string | null;
  websocketConnected: boolean;
  pollingInterval: number | null;
  _lastFetchRequestId: number;

  // WebSocket methods
  startWebSocketConnection: () => void;
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
    paymentDetails?: any
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

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      _lastFetchRequestId: 0,
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
          websocketService.updatePaginationParams({
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
        
        // Immediately set websocketConnected to true to prevent race conditions
        // This will be set to false if connection fails
        set({ websocketConnected: true });
        
        // Track reconnection attempts
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 3;
        
        // Define callbacks for WebSocket events
        const callbacks = {
          onNewOrder: (order: Order) => {
            get().handleNewOrder(order);
          },
          onOrderUpdated: (order: Order) => {
            get().handleOrderUpdate(order);
          },
          onConnected: () => {
            // Reset reconnection attempts on successful connection
            reconnectAttempts = 0;
            
            // Ensure websocketConnected is true
            set({ websocketConnected: true });
            
            // Send current pagination state to WebSocket service
            websocketService.updatePaginationParams({
              page: currentMetadata.page,
              perPage: currentMetadata.per_page
            });
            
            // Stop polling when WebSocket is connected
            get().stopOrderPolling();
            console.debug('[OrderStore] WebSocket connected, polling stopped');
          },
          onDisconnected: () => {
            const wasConnected = get().websocketConnected;
            set({ websocketConnected: false });
            console.debug('[OrderStore] WebSocket disconnected');
            
            // Attempt to reconnect a few times before falling back to polling
            if (wasConnected && reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              console.debug(`[OrderStore] Attempting WebSocket reconnection (${reconnectAttempts}/${maxReconnectAttempts})`);
              
              // Exponential backoff for reconnection attempts
              const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000);
              
              setTimeout(() => {
                // Try to reconnect if we're still disconnected
                if (!get().websocketConnected) {
                  // Attempt to reconnect with current pagination state
                  const currentState = get().metadata;
                  // Use connect instead of reconnect since reconnect is not available
                  const user = useAuthStore.getState().user;
                  if (user?.restaurant_id) {
                    websocketService.connect(user.restaurant_id, {
                      onNewOrder: (order) => get().handleNewOrder(order),
                      onOrderUpdated: (order) => get().handleOrderUpdate(order),
                      onConnected: () => set({ websocketConnected: true }),
                      onDisconnected: () => set({ websocketConnected: false }),
                      onError: (error) => console.error('[OrderStore] WebSocket error:', error)
                    });
                    
                    // Update pagination parameters after connection
                    websocketService.updatePaginationParams({
                      page: currentState.page,
                      perPage: currentState.per_page
                    });
                  }
                }
              }, backoffTime);
            } else if (wasConnected) {
              // If we've exceeded reconnection attempts, fall back to polling
              console.debug('[OrderStore] WebSocket reconnection failed, falling back to polling');
              
              // Add a small delay to ensure we don't have race conditions
              setTimeout(() => {
                // Double-check we're still not connected before starting polling
                if (!get().websocketConnected) {
                  // Use current page from metadata when starting polling
                  get().startOrderPolling();
                }
              }, 500);
            }
          },
          onError: (error: any) => {
            console.error('[OrderStore] WebSocket error:', error);
            set({ websocketConnected: false }); // Ensure we mark as disconnected on error
            
            // Attempt to reconnect on error if we haven't exceeded the limit
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              console.debug(`[OrderStore] Attempting WebSocket reconnection after error (${reconnectAttempts}/${maxReconnectAttempts})`);
              
              // Exponential backoff for reconnection attempts
              const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000);
              
              setTimeout(() => {
                // Try to reconnect if we're still disconnected
                if (!get().websocketConnected) {
                  // Attempt to reconnect with current pagination state
                  const currentState = get().metadata;
                  // Use connect instead of reconnect since reconnect is not available
                  const user = useAuthStore.getState().user;
                  if (user?.restaurant_id) {
                    websocketService.connect(user.restaurant_id, {
                      onNewOrder: (order) => get().handleNewOrder(order),
                      onOrderUpdated: (order) => get().handleOrderUpdate(order),
                      onConnected: () => set({ websocketConnected: true }),
                      onDisconnected: () => set({ websocketConnected: false }),
                      onError: (error) => console.error('[OrderStore] WebSocket error:', error)
                    });
                    
                    // Update pagination parameters after connection
                    websocketService.updatePaginationParams({
                      page: currentState.page,
                      perPage: currentState.per_page
                    });
                  }
                }
              }, backoffTime);
            } else {
              // Only start polling if we're not already polling and have exceeded reconnection attempts
              setTimeout(() => {
                if (!get().websocketConnected) {
                  // Use current page from metadata when starting polling
                  get().startOrderPolling();
                }
              }, 500);
            }
          }
        };
        
        // Connect to WebSocket
        console.debug('[OrderStore] Connecting to WebSocket', { 
          restaurantId: user.restaurant_id,
          currentPage: get().metadata.page 
        });
        websocketService.connect(user.restaurant_id, callbacks);
      },
      
      stopWebSocketConnection: () => {
        if (get().websocketConnected) {
          console.debug('[OrderStore] Stopping WebSocket connection');
          websocketService.disconnect('orderStore');
          set({ websocketConnected: false });
        }
      },
      
      handleNewOrder: (order: Order) => {
        if (!order || !order.id) return;
        
        console.debug('[OrderStore] Received new order via WebSocket:', order.id);
        
        // Check if we already have this order
        const existingOrderIndex = get().orders.findIndex((o: Order) => o.id === order.id);
        
        if (existingOrderIndex === -1) {
          // Only add the new order if we're on page 1
          // This prevents new orders from affecting pagination on other pages
          const { metadata } = get();
          if (metadata.page === 1) {
            console.debug('[OrderStore] Adding new order to page 1');
            
            // IMPORTANT: Create a shallow copy of the current state to avoid modifying metadata
            // This is the root cause of the pagination issues - we need to preserve the original metadata
            const currentOrders = [...get().orders];
            
            // Add the new order to the beginning of the array
            currentOrders.unshift(order);
            
            // Update only the orders array, explicitly preserving the existing metadata
            set({
              orders: currentOrders,
              // Explicitly keep the same metadata to prevent pagination issues
              metadata: { ...get().metadata }
            });
          } else {
            console.debug(`[OrderStore] Not adding new order to page ${metadata.page}, only updating page 1 would show this`);
            // Don't modify the current page's orders
          }
        }
      },
      
      handleOrderUpdate: (order: Order) => {
        if (!order || !order.id) return;
        
        console.debug('[OrderStore] Received order update via WebSocket:', order.id);
        
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
      // Polling Methods (Fallback)
      // ---------------------------------------------------------
      startOrderPolling: () => {
        // First stop any existing polling
        get().stopOrderPolling();
        
        // Check if WebSocket is connected - if so, don't start polling
        if (get().websocketConnected) {
          console.debug('[OrderStore] WebSocket is connected, not starting polling');
          return;
        }
        
        // Log that we're falling back to polling
        console.debug('[OrderStore] Starting polling for orders (WebSocket fallback)');
        
        // Start a new polling interval
        const intervalId = window.setInterval(async () => {
          // Double-check WebSocket status before each poll
          if (get().websocketConnected) {
            console.debug('[OrderStore] WebSocket is now connected, stopping polling');
            get().stopOrderPolling();
            return;
          }
          
          // Get the current metadata to ensure we poll with the correct page
          const { metadata } = get();
          console.debug(`[OrderStore] Polling for orders on page ${metadata.page}`);
          
          // Use the current page from metadata when polling
          await get().fetchOrdersQuietly({
            page: metadata.page,
            perPage: metadata.per_page,
            _sourceId: 'polling' // Mark this request as coming from polling
          });
        }, 30000); // Poll every 30 seconds
        
        // Store the interval ID so we can clear it later
        set({ pollingInterval: intervalId });
      },
      
      stopOrderPolling: () => {
        const { pollingInterval } = get();
        
        if (pollingInterval !== null) {
          window.clearInterval(pollingInterval);
          set({ pollingInterval: null });
        }
      },

      // ---------------------------------------------------------
      // Fetch orders with server-side pagination, filtering, and sorting
      // ---------------------------------------------------------
      fetchOrders: async (params: OrderQueryParams = {}) => {
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
          
          const response = await api.get<{
            orders: Order[];
            total_count: number;
            page: number;
            per_page: number;
            total_pages: number;
          }>(`/orders?${queryParams.toString()}`);
          
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
          
          // Generate a unique request ID to track this specific request
          const requestId = get()._lastFetchRequestId + 1;
          set({ _lastFetchRequestId: requestId });
          
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
          
          // Log the request with its ID and source for debugging
          console.debug(`[OrderStore] Fetch request #${requestId} from source ${_sourceId || 'unknown'} for page ${page}`);
          
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
          
          // Update metadata before the request to ensure any WebSocket updates
          // that arrive while we're waiting for the response use the correct page
          set(state => ({
            metadata: {
              ...state.metadata,
              page: page,
              per_page: perPage
            }
          }));
          
          const response = await api.get<{
            orders: Order[];
            total_count: number;
            page: number;
            per_page: number;
            total_pages: number;
          }>(`/orders?${queryParams.toString()}`);
          
          // Check if this request is still the most recent one
          // If not, discard the results to prevent race conditions
          if (requestId !== get()._lastFetchRequestId) {
            console.debug(`[OrderStore] Discarding stale response for request #${requestId} from ${_sourceId || 'unknown'}, current is #${get()._lastFetchRequestId}`);
            return;
          }
          
          const metadata = {
            total_count: response.total_count || 0,
            page: response.page || 1,
            per_page: response.per_page || 10,
            total_pages: response.total_pages || Math.ceil((response.total_count || 0) / (response.per_page || 10))
          };
          
          console.debug(`[OrderStore] Updating state with page ${metadata.page} data from request #${requestId} (source: ${_sourceId || 'unknown'})`);
          console.debug(`[OrderStore] Metadata from API: total_count=${metadata.total_count}, total_pages=${metadata.total_pages}`);
          
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
        staffOrderParams = {}
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
              ...staffOrderParams // Include staff order parameters
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
