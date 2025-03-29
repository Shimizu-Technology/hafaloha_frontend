// src/ordering/components/admin/OrderManager.tsx

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOrderStore } from '../../store/orderStore';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';
import { AdminEditOrderModal } from './AdminEditOrderModal';
import { SetEtaModal } from './SetEtaModal';
import { OrderDetailsModal } from './OrderDetailsModal';
import { SearchInput } from './SearchInput';
import { DateFilter, DateFilterOption } from './DateFilter';
import { CollapsibleOrderCard } from './CollapsibleOrderCard';
import { MultiSelectActionBar } from './MultiSelectActionBar';
import { StaffOrderModal } from './StaffOrderModal';
import { BulkInventoryActionDialog } from './BulkInventoryActionDialog';
import { RefundModal } from './RefundModal';
import { menuItemsApi } from '../../../shared/api/endpoints/menuItems';
import { orderPaymentsApi } from '../../../shared/api/endpoints/orderPayments';
import { orderPaymentOperationsApi } from '../../../shared/api/endpoints/orderPaymentOperations';
import toastUtils from '../../../shared/utils/toastUtils';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'confirmed' | 'refunded' | 'partially_refunded';

interface OrderManagerProps {
  selectedOrderId?: number | null;
  setSelectedOrderId?: (id: number | null) => void;
  restaurantId?: string;
}

export function OrderManager({ selectedOrderId, setSelectedOrderId, restaurantId }: OrderManagerProps) {
  const {
    orders,
    fetchOrders,
    fetchOrdersQuietly,    // For background polling
    updateOrderStatus,
    updateOrderStatusQuietly,
    updateOrderData,
    loading,
    error
  } = useOrderStore();

  // which order is selected for the "details" modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // which "tab" we are viewing
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('pending');

  // sort direction (true = newest first, false = oldest first)
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  
  // search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // date filter
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('today');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  
  // expanded order cards
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
  // selected orders for batch actions
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  
  // new orders highlighting (for newly arrived orders during polling)
  const [newOrders, setNewOrders] = useState<Set<string>>(new Set());

  // for the "Set ETA" modal
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [orderToPrep, setOrderToPrep] = useState<any | null>(null);

  // for the "Edit Order" modal
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  // for the "Staff Order" modal (POS)
  const [showStaffOrderModal, setShowStaffOrderModal] = useState(false);
  
  // for the "Refund" modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [orderToRefund, setOrderToRefund] = useState<any | null>(null);

  // for mobile menu (if you have a contextual menu or dropdown)
  const [showOrderActions, setShowOrderActions] = useState<number | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Auto-refresh interval in ms
  const POLLING_INTERVAL = 30000; // 30 seconds

  // Are we in the middle of refreshing data (quietly)?
  const [isRefreshing, setIsRefreshing] = useState(false);

  // If we are updating an order’s status, block certain UI interactions
  const [isStatusUpdateInProgress, setIsStatusUpdateInProgress] = useState(false);

  // For temporarily highlighting a specific order row
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  
  //
  // NEW: State for inventory-based cancellation flow
  //
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [batchOrdersToCancel, setBatchOrdersToCancel] = useState<any[]>([]);
  const [isBatchCancel, setIsBatchCancel] = useState(false);

  // ----------------------------------
  // Fetch orders on mount + Setup Polling
  // ----------------------------------
  useEffect(() => {
    // 1) Initial fetch with full loading state
    fetchOrders();

    // 2) Track current order IDs to detect new ones
    const currentOrderIds = new Set(orders.map((o) => o.id));
    let pollingInterval: number | null = null;

    // Start polling function
    const startPolling = () => {
      if (pollingInterval) clearInterval(pollingInterval);
      pollingInterval = window.setInterval(() => {
        fetchOrdersQuietly().then(() => {
          const storeOrders = useOrderStore.getState().orders;
          const newOrderIds = storeOrders
            .filter((o) => !currentOrderIds.has(o.id))
            .map((o) => o.id);

          if (newOrderIds.length > 0) {
            // Mark them as new
            setNewOrders((prev) => {
              const updated = new Set(prev);
              newOrderIds.forEach((id) => updated.add(id));
              return updated;
            });

            // Update the known IDs
            newOrderIds.forEach((id) => currentOrderIds.add(id));

            // Clear highlight after 30s
            setTimeout(() => {
              setNewOrders((prev) => {
                const updated = new Set(prev);
                newOrderIds.forEach((id) => updated.delete(id));
                return updated;
              });
            }, 30000);
          }
        });
      }, POLLING_INTERVAL);
    };

    // Stop polling function
    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    // Start polling now
    startPolling();

    // Pause polling if the tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Refresh once, then start again
        fetchOrdersQuietly();
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOrders, fetchOrdersQuietly]);

  // ----------------------------------
  // Collapsible / Multi-select logic
  // ----------------------------------
  const toggleOrderExpand = useCallback((orderId: string) => {
    setExpandedOrders((prev) => {
      const updated = new Set(prev);
      if (updated.has(orderId)) updated.delete(orderId);
      else updated.add(orderId);
      return updated;
    });
  }, []);

  const toggleOrderSelection = useCallback((orderId: string, selected: boolean) => {
    setSelectedOrders((prev) => {
      const updated = new Set(prev);
      if (selected) updated.add(orderId);
      else updated.delete(orderId);
      return updated;
    });
  }, []);

  const clearSelections = useCallback(() => {
    setSelectedOrders(new Set());
  }, []);

  // ----------------------------------
  // Single + Batch Cancelation with Inventory
  // ----------------------------------

  /**
   * Single-order flow: Confirm with user, then show BulkInventoryActionDialog
   * to handle inventory for any tracked items, then finalize cancellation.
   */
  const handleCancelOrder = useCallback((order: any) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      setOrderToCancel(order);
      setIsBatchCancel(false);
      setShowInventoryDialog(true); // shows BulkInventoryActionDialog
    }
  }, []);

  /**
   * Batch cancel flow: gather the orders, show BulkInventoryActionDialog
   */
  const handleBatchMarkAsCancelled = useCallback(() => {
    const ordersToCancel = orders.filter((o) => selectedOrders.has(o.id));
    if (ordersToCancel.length > 0) {
      setBatchOrdersToCancel(ordersToCancel);
      setIsBatchCancel(true);
      setShowInventoryDialog(true);
    }
  }, [orders, selectedOrders]);

  /**
   * Called when BulkInventoryActionDialog is done (Confirm & Continue).
   * Processes each item action (damaged or not) and calls updateOrderStatusQuietly.
   * Also handles payment actions (refund, store credit, etc.) if specified.
   */
  const processInventoryActionsAndCancel = async (inventoryActions: any[]) => {
    setIsStatusUpdateInProgress(true);
    try {
      console.log("Processing inventory actions:", inventoryActions);
      
      // Group actions by order ID for payment processing
      const actionsByOrder = new Map<string | number, any[]>();
      
      // 1) Process each inventory action
      for (const action of inventoryActions) {
        // Group by order ID for payment processing
        const orderId = action.orderId || orderToCancel?.id || '';
        if (!actionsByOrder.has(orderId)) {
          actionsByOrder.set(orderId, []);
        }
        actionsByOrder.get(orderId)?.push(action);
        
        // Skip inventory processing for placeholder items (itemId = 0)
        if (action.itemId === 0) {
          console.log('Skipping inventory processing for placeholder item');
          continue;
        }
        
        // Process inventory action
        if (action.action === 'mark_as_damaged') {
          // Mark items as damaged - use the orderId from the action
          // (which comes from the specific order the item belongs to)
          console.log(`Marking item ${action.itemId} as damaged (qty: ${action.quantity})`);
          await menuItemsApi.markAsDamaged(action.itemId, {
            quantity: action.quantity,
            reason: action.reason || 'Damaged during order cancellation',
            order_id: orderId
          });
        } else if (action.action === 'return_to_inventory') {
          // Explicitly return items to inventory by increasing stock
          console.log(`Returning item ${action.itemId} to inventory (qty: ${action.quantity})`);
          // Get current item details
          const menuItem = await menuItemsApi.getById(action.itemId);
          
          // Calculate new stock level after returning items
          const newStockLevel = (menuItem.stock_quantity || 0) + action.quantity;
          
          // Update stock level with explicit API call
          await menuItemsApi.updateStock(action.itemId, {
            stock_quantity: newStockLevel,
            reason_type: 'return',
            reason_details: `Items returned from cancelled Order #${orderId}`
          });
        }
      }

      // 2) Process payment actions for each order
      if (inventoryActions.length > 0) {
        const paymentAction = inventoryActions[0].paymentAction;
        const paymentReason = inventoryActions[0].paymentReason || 'Order cancelled';
        
        if (paymentAction && paymentAction !== 'no_action') {
          // Process each order's payment
          for (const [orderId, actions] of actionsByOrder.entries()) {
            // Get the order object
            const orderObj = isBatchCancel 
              ? batchOrdersToCancel.find(o => o.id === orderId)
              : orderToCancel;
              
            if (!orderObj) continue;
            
            // Calculate total refund amount for this order
            const refundItems = actions.map(action => ({
              id: action.itemId,
              name: action.name || 'Item',
              quantity: action.quantity,
              price: action.price || 0
            }));
            
            // Process based on payment action type
            switch (paymentAction) {
              case 'refund':
                try {
                  await orderPaymentOperationsApi.createPartialRefund(Number(orderId), {
                    amount: orderObj.total, // Full order amount for cancellation
                    reason: paymentReason,
                    items: refundItems,
                    refunded_items: refundItems
                  });
                  console.log(`Refund processed for order ${orderId}`);
                } catch (error) {
                  console.error(`Error processing refund for order ${orderId}:`, error);
                  toastUtils.error(`Failed to process refund for order #${orderId}`);
                }
                break;
                
              case 'store_credit':
                try {
                  await orderPaymentOperationsApi.addStoreCredit(Number(orderId), {
                    amount: orderObj.total, // Full order amount for cancellation
                    reason: paymentReason,
                    email: orderObj.contact_email
                  });
                  console.log(`Store credit added for order ${orderId}`);
                } catch (error) {
                  console.error(`Error adding store credit for order ${orderId}:`, error);
                  toastUtils.error(`Failed to add store credit for order #${orderId}`);
                }
                break;
                
              case 'adjust_total':
                try {
                  await orderPaymentOperationsApi.adjustOrderTotal(Number(orderId), {
                    new_total: 0, // Set to 0 for cancellation
                    reason: paymentReason
                  });
                  console.log(`Order total adjusted for order ${orderId}`);
                } catch (error) {
                  console.error(`Error adjusting total for order ${orderId}:`, error);
                  toastUtils.error(`Failed to adjust total for order #${orderId}`);
                }
                break;
            }
          }
        }
      }

      // 3) Cancel the orders
      if (isBatchCancel) {
        // For batch
        for (const ord of batchOrdersToCancel) {
          await updateOrderStatusQuietly(ord.id, 'cancelled');
        }
        clearSelections();
      } else if (orderToCancel) {
        // For single
        await updateOrderStatusQuietly(orderToCancel.id, 'cancelled');
      }

      // 4) Reset state
      setBatchOrdersToCancel([]);
      setOrderToCancel(null);
      setIsBatchCancel(false);
      setShowInventoryDialog(false);

    } catch (error) {
      console.error('Error processing inventory actions:', error);
      toastUtils.error('Failed to process inventory changes');
    } finally {
      setIsStatusUpdateInProgress(false);
    }
  };

  // ----------------------------------
  // Other batch actions (ready/completed)
  // ----------------------------------
  const handleBatchMarkAsReady = useCallback(async () => {
    setIsStatusUpdateInProgress(true);
    try {
      for (const orderId of selectedOrders) {
        await updateOrderStatusQuietly(orderId, 'ready');
      }
      clearSelections();
    } finally {
      setIsStatusUpdateInProgress(false);
    }
  }, [selectedOrders, updateOrderStatusQuietly, clearSelections]);

  const handleBatchMarkAsCompleted = useCallback(async () => {
    setIsStatusUpdateInProgress(true);
    try {
      for (const orderId of selectedOrders) {
        await updateOrderStatusQuietly(orderId, 'completed');
      }
      clearSelections();
    } finally {
      setIsStatusUpdateInProgress(false);
    }
  }, [selectedOrders, updateOrderStatusQuietly, clearSelections]);

  // ----------------------------------
  // Date / Search / Filter
  // ----------------------------------
  const getDateRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    switch (dateFilter) {
      case 'today':
        return { start: today, end: tomorrow };
      case 'yesterday':
        return { start: yesterday, end: today };
      case 'thisWeek':
        return { start: weekStart, end: tomorrow };
      case 'lastWeek':
        return { start: lastWeekStart, end: lastWeekEnd };
      case 'thisMonth':
        return { start: monthStart, end: tomorrow };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: today, end: tomorrow };
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Simple search function
  const searchOrders = useCallback((order: any, query: string) => {
    if (!query) return true;

    const searchLower = query.toLowerCase();

    // Search in ID
    if (String(order.id).includes(searchLower)) return true;

    // Customer name
    if (order.contact_name && order.contact_name.toLowerCase().includes(searchLower)) return true;

    // Email
    if (order.contact_email && order.contact_email.toLowerCase().includes(searchLower)) return true;

    // Phone
    if (order.contact_phone && order.contact_phone.toLowerCase().includes(searchLower)) return true;

    // Special instructions
    const instructions = (order.special_instructions || order.specialInstructions || '').toLowerCase();
    if (instructions.includes(searchLower)) return true;

    // Order items
    if (order.items && order.items.length > 0) {
      return order.items.some((item: any) => {
        if (item.name.toLowerCase().includes(searchLower)) return true;
        if (item.notes && item.notes.toLowerCase().includes(searchLower)) return true;
        return false;
      });
    }

    return false;
  }, []);

  // Combined filtering + sorting
  const filteredOrders = useMemo(() => {
    // 1) Sort
    const sorted = [...orders].sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || Date.now());
      const dateB = new Date(b.created_at || b.createdAt || Date.now());
      return sortNewestFirst ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

    // 2) Date range
    const { start, end } = getDateRange();
    const dateFiltered = sorted.filter((ord) => {
      const d = new Date(ord.created_at || ord.createdAt || Date.now());
      return d >= start && d < end;
    });

    // 3) Status filter
    const statusFiltered =
      selectedStatus === 'all'
        ? dateFiltered
        : dateFiltered.filter((o) => o.status === selectedStatus);

    // 4) Search
    return searchQuery
      ? statusFiltered.filter((ord) => searchOrders(ord, searchQuery))
      : statusFiltered;
  }, [orders, sortNewestFirst, selectedStatus, searchQuery, getDateRange, searchOrders]);

  // Pagination
  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  // When filters change, reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, sortNewestFirst, searchQuery, dateFilter]);

  // If the parent sets a selectedOrderId => expand that order
  // (And scroll to it if it's in the list)
  useEffect(() => {
    if (selectedOrderId && !isStatusUpdateInProgress) {
      const found = orders.find((o) => Number(o.id) === selectedOrderId);
      if (found) {
        // Show it
        setSelectedStatus('all');
        setSearchQuery('');

        // Figure out which page it's on
        const idx = filteredOrders.findIndex((o) => Number(o.id) === selectedOrderId);
        if (idx >= 0) {
          const targetPage = Math.floor(idx / ordersPerPage) + 1;
          setCurrentPage(targetPage);
        }

        // Expand
        setExpandedOrders((prev) => {
          const updated = new Set(prev);
          updated.add(found.id);
          return updated;
        });

        // Highlight
        setHighlightedOrderId(found.id);
        setTimeout(() => {
          setHighlightedOrderId(null);
        }, 5000);

        // Scroll to it
        setTimeout(() => {
          const elem = document.getElementById(`order-${found.id}`);
          if (elem) {
            elem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
    }
  }, [
    selectedOrderId,
    orders,
    isStatusUpdateInProgress,
    filteredOrders,
    ordersPerPage,
  ]);

  // For the "view details" modal
  function closeModal() {
    setSelectedOrder(null);
    if (setSelectedOrderId) {
      setSelectedOrderId(null);
    }
  }

  // For setting an order to "preparing" with an ETA
  async function handleConfirmEta() {
    if (!orderToPrep) {
      setShowEtaModal(false);
      return;
    }

    // Calculate pickup time
    let pickupTime: string;
    if (requiresAdvanceNotice(orderToPrep)) {
      const [hourStr, minuteStr] = String(etaMinutes).split('.');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr || '0', 10) === 3 ? 30 : 0;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hour, minute, 0, 0);
      pickupTime = tomorrow.toISOString();
    } else {
      pickupTime = new Date(Date.now() + Number(etaMinutes) * 60_000).toISOString();
    }

    setIsStatusUpdateInProgress(true);
    await updateOrderStatusQuietly(orderToPrep.id, 'preparing', pickupTime);
    setIsStatusUpdateInProgress(false);

    setShowEtaModal(false);
    setEtaMinutes(5);
    setOrderToPrep(null);
  }

  // color badges
  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      confirmed: 'bg-purple-100 text-purple-800',
      refunded: 'bg-purple-100 text-purple-800',
      partially_refunded: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Check if an order requires 24-hour notice
  const requiresAdvanceNotice = (order: any) => {
    return order.requires_advance_notice === true;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No pickup time set';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? 'No pickup time set' : d.toLocaleString();
  };

  // Called when admin finishes editing the order in the AdminEditOrderModal
  async function handleSaveEdit(updatedData: any) {
    await updateOrderData(updatedData.id, updatedData);
    setEditingOrder(null);
  }

  // Toggle sort
  const toggleSortDirection = () => {
    setSortNewestFirst(!sortNewestFirst);
  };

  // Show/hide order actions (if needed on mobile)
  const toggleOrderActions = (orderId: number) => {
    setShowOrderActions(showOrderActions === orderId ? null : orderId);
  };

  // Single-order action buttons for CollapsibleOrderCard
  const renderOrderActions = (order: any) => {
    // Check if order is refunded or partially refunded
    const isRefunded = order.status === 'refunded' || order.status === 'partially_refunded';
    
    // Calculate net amount and refund info for display
    const netAmount = Number(order.total || 0) - (order.total_refunded || 0);
    const refundInfo = isRefunded ? (
      <div className="text-sm">
        <span className="font-medium">
          {order.status === 'refunded' ? 'Fully Refunded' : 'Partially Refunded'}
        </span>
        {order.status === 'partially_refunded' && (
          <span className="ml-1">
            (${order.total_refunded?.toFixed(2) || '0.00'})
          </span>
        )}
      </div>
    ) : null;
    
    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          {isRefunded ? (
            <p className="font-medium text-sm">
              <span className="line-through text-gray-400 mr-2">
                ${Number(order.total || 0).toFixed(2)}
              </span>
              <span>
                ${netAmount.toFixed(2)}
              </span>
            </p>
          ) : (
            <p className="font-medium text-sm">
              Total: ${Number(order.total || 0).toFixed(2)}
            </p>
          )}
          {refundInfo}
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          {/* Only show workflow buttons if not refunded */}
          {!isRefunded && (
            <>
              {order.status === 'pending' && (
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 min-w-[120px] flex-grow sm:flex-grow-0"
                  onClick={() => {
                    setOrderToPrep(order);
                    if (requiresAdvanceNotice(order)) {
                      setEtaMinutes(10.0); // default for next-day
                    } else {
                      setEtaMinutes(5);
                    }
                    setShowEtaModal(true);
                  }}
                >
                  Start Preparing
                </button>
              )}

              {order.status === 'preparing' && (
                <button
                  className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 min-w-[120px] flex-grow sm:flex-grow-0"
                  onClick={() => {
                    setIsStatusUpdateInProgress(true);
                    updateOrderStatusQuietly(order.id, 'ready')
                      .finally(() => setIsStatusUpdateInProgress(false));
                  }}
                >
                  Mark as Ready
                </button>
              )}

              {order.status === 'ready' && (
                <button
                  className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm font-medium hover:bg-gray-600 min-w-[120px] flex-grow sm:flex-grow-0"
                  onClick={() => {
                    setIsStatusUpdateInProgress(true);
                    updateOrderStatusQuietly(order.id, 'completed')
                      .finally(() => setIsStatusUpdateInProgress(false));
                  }}
                >
                  Complete
                </button>
              )}
              
              {/* Refund button removed - users should use the AdminEditOrderModal for refunds */}
              
              {/* Cancel button (with inventory handling) */}
              {(order.status === 'pending' || order.status === 'preparing') && (
                <button
                  className="p-2 text-red-400 hover:text-red-600 rounded-md"
                  onClick={() => handleCancelOrder(order)}
                  aria-label="Cancel order"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </>
          )}
          
          {/* Edit button - always available */}
          <button
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            onClick={() => setEditingOrder(order)}
            aria-label="Edit order"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 
                  00-2 2v11a2 2 0 
                  002 2h11a2 2 0 
                  002-2v-5m-1.414-9.414a2 
                  2 0 112.828 2.828L11.828 
                  15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Header section */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Order Management</h2>
          <p className="text-gray-600 text-sm">Manage and track customer orders</p>
        </div>
        <button
          onClick={() => setShowStaffOrderModal(true)}
          className="px-4 py-2 bg-[#c1902f] text-white rounded-md font-medium hover:bg-[#a97c28] focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50 flex items-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
               viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span>Create Staff Order</span>
        </button>
      </div>

      {/* Top Filters (Date, Search, Sort) */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Date Filter */}
          <div className="w-full">
            <DateFilter
              selectedOption={dateFilter}
              onOptionChange={setDateFilter}
              startDate={customStartDate}
              endDate={customEndDate}
              onDateRangeChange={(start, end) => {
                setCustomStartDate(start);
                setCustomEndDate(end);
              }}
            />
          </div>

          {/* Search */}
          <div className="w-full">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search orders..."
              className="w-full"
            />
          </div>

          {/* Sort + total # */}
          <div className="w-full flex items-center justify-between">
            <MobileSelect
              options={[
                { value: 'newest', label: 'Sort: Newest First' },
                { value: 'oldest', label: 'Sort: Oldest First' }
              ]}
              value={sortNewestFirst ? 'newest' : 'oldest'}
              onChange={(val) => setSortNewestFirst(val === 'newest')}
            />

            <div className="text-sm text-gray-500 font-medium ml-3 whitespace-nowrap">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} found
            </div>
          </div>
        </div>

        {/* Status filter buttons */}
        <div className="relative mt-2">
          <div className="flex flex-nowrap space-x-2 overflow-x-auto py-1 px-1 scrollbar-hide -mx-1 pb-2 -mb-1 snap-x touch-pan-x">
            <button
              onClick={() => {
                setSelectedStatus('all');
                if (setSelectedOrderId) setSelectedOrderId(null);
              }}
              className={`
                whitespace-nowrap px-4 py-2.5 rounded-md text-sm font-medium min-w-[90px] flex-shrink-0 snap-start
                ${selectedStatus === 'all'
                  ? 'bg-[#c1902f] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              All Orders
            </button>
            {(['pending', 'preparing', 'ready', 'completed', 'cancelled', 'refunded', 'partially_refunded'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setSelectedStatus(status);
                  if (setSelectedOrderId) setSelectedOrderId(null);
                }}
                className={`
                  whitespace-nowrap px-4 py-2.5 rounded-md text-sm font-medium min-w-[90px] flex-shrink-0 snap-start
                  ${selectedStatus === status
                    ? 'bg-[#c1902f] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders list or loading */}
      <div className="pb-16">
        {loading ? (
          // Show skeletons
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse animate-fadeIn"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="flex justify-between items-center p-3 border-b border-gray-100">
                  <div>
                    <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                    <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="mb-4">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 w-40 bg-gray-200 rounded"></div>
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      </div>
                      <div className="flex justify-between">
                        <div className="h-4 w-36 bg-gray-200 rounded"></div>
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="h-3 w-48 bg-gray-200 rounded"></div>
                    <div className="h-3 w-40 bg-gray-200 rounded"></div>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <p className="text-gray-500">No orders found matching your filters</p>
          </div>
        ) : (
          <div>
            {/* CollapsibleOrderCard list */}
            <div className="space-y-4 mb-6">
              {currentOrders.map((order) => (
                <CollapsibleOrderCard
                  key={order.id}
                  order={order}
                  isExpanded={expandedOrders.has(order.id)}
                  onToggleExpand={() => toggleOrderExpand(order.id)}
                  isNew={newOrders.has(order.id)}
                  isSelected={selectedOrders.has(order.id)}
                  isHighlighted={highlightedOrderId === order.id}
                  onSelectChange={(sel) => toggleOrderSelection(order.id, sel)}
                  renderActions={() => renderOrderActions(order)}
                  getStatusBadgeColor={getStatusBadgeColor}
                  formatDate={formatDate}
                  requiresAdvanceNotice={requiresAdvanceNotice}
                />
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6 pb-4">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label="Previous page"
                >
                  Previous
                </button>

                {/* Page buttons (desktop) */}
                <div className="hidden sm:flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-medium ${
                        currentPage === page
                          ? 'bg-[#c1902f] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      aria-label={`Page ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* Mobile page indicator */}
                <div className="sm:hidden flex items-center px-3">
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-select action bar */}
      {selectedOrders.size > 0 && (
        <MultiSelectActionBar
          selectedCount={selectedOrders.size}
          onClearSelection={clearSelections}
          onMarkAsReady={handleBatchMarkAsReady}
          onMarkAsCompleted={handleBatchMarkAsCompleted}
          onMarkAsCancelled={handleBatchMarkAsCancelled} // now uses the new inventory logic
          isProcessing={isStatusUpdateInProgress}
        />
      )}

      {/* Modals and Overlays */}
      {/* 1) Details modal */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={closeModal} />
      )}

      {/* 2) "Set ETA" modal */}
      {showEtaModal && orderToPrep && (
        <SetEtaModal
          order={orderToPrep}
          etaMinutes={etaMinutes}
          setEtaMinutes={setEtaMinutes}
          onClose={() => {
            setShowEtaModal(false);
            setOrderToPrep(null);
          }}
          onConfirm={handleConfirmEta}
        />
      )}

      {/* 3) "Edit Order" modal */}
      {editingOrder && (
        <AdminEditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* 4) Staff Order Modal (POS) */}
      {showStaffOrderModal && (
        <StaffOrderModal
          onClose={() => setShowStaffOrderModal(false)}
          onOrderCreated={(orderId) => {
            setShowStaffOrderModal(false);
            // Refresh orders
            fetchOrders();
            if (setSelectedOrderId) {
              setSelectedOrderId(Number(orderId));
            }
            toastUtils.success(`Staff order #${orderId} created successfully!`);
          }}
          restaurantId={restaurantId}
        />
      )}

      {/* 5) Inventory Action Dialog for cancels (single or batch) */}
      {showInventoryDialog && (
        <BulkInventoryActionDialog
          order={isBatchCancel ? batchOrdersToCancel : orderToCancel}
          onClose={() => {
            setShowInventoryDialog(false);
            setOrderToCancel(null);
            setBatchOrdersToCancel([]);
            setIsBatchCancel(false);
          }}
          onConfirm={processInventoryActionsAndCancel}
          isBatch={isBatchCancel}
        />
      )}

      {/* 6) Refund Modal */}
      {showRefundModal && orderToRefund && (
        <RefundModal
          isOpen={showRefundModal}
          orderId={Number(orderToRefund.id)}
          maxRefundable={Number(orderToRefund.total || 0) - (orderToRefund.total_refunded || 0)}
          onClose={() => {
            setShowRefundModal(false);
            setOrderToRefund(null);
          }}
          onRefundCreated={async () => {
            try {
              setIsStatusUpdateInProgress(true);
              
              // Get the refund amount to determine if it's a full or partial refund
              const result = await orderPaymentsApi.getPayments(orderToRefund.id);
              const { total_paid, total_refunded } = result.data;
              
              // Check if this is a full refund (all money returned)
              const isFullRefund = Math.abs(total_paid - total_refunded) < 0.01;
              
              // Update the order status based on refund type
              if (isFullRefund) {
                await updateOrderStatusQuietly(orderToRefund.id, 'refunded');
              } else if (total_refunded > 0) {
                await updateOrderStatusQuietly(orderToRefund.id, 'partially_refunded');
              }
              
              // Refresh orders to get the updated data
              await fetchOrders();
              
              // Close the modal
              setShowRefundModal(false);
              setOrderToRefund(null);
              
              // Show success message
              toastUtils.success('Refund processed successfully');
            } catch (error) {
              console.error('Error processing refund:', error);
              toastUtils.error('Failed to update order status after refund.');
            } finally {
              setIsStatusUpdateInProgress(false);
            }
          }}
        />
      )}
    </div>
  );
}
