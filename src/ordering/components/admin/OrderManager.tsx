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
import toast from 'react-hot-toast';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'confirmed';

interface OrderManagerProps {
  selectedOrderId?: number | null;
  setSelectedOrderId?: (id: number | null) => void;
  restaurantId?: string;
}

export function OrderManager({ selectedOrderId, setSelectedOrderId, restaurantId }: OrderManagerProps) {
  const {
    orders,
    fetchOrders,
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
  
  // new orders highlighting
  const [newOrders, setNewOrders] = useState<Set<string>>(new Set());

  // for the "Set ETA" modal
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [orderToPrep, setOrderToPrep] = useState<any | null>(null);

  // for the "Edit Order" modal
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  // for the "Staff Order" modal (POS)
  const [showStaffOrderModal, setShowStaffOrderModal] = useState(false);

  // for mobile menu
  const [showOrderActions, setShowOrderActions] = useState<number | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Constants for configuration - auto-refresh interval
  const POLLING_INTERVAL = 30000; // 30 seconds - could be moved to a config file or environment variable

  // State to track if we're currently refreshing data
  const [isRefreshing, setIsRefreshing] = useState(false);

  // fetch all orders on mount and set up polling for automatic refreshes
  useEffect(() => {
    // Initial fetch - this one can show loading state
    fetchOrders();
    
    // Store the current orders to detect new ones
    const currentOrderIds = new Set(orders.map(o => o.id));
    
    // Set up polling with visibility detection
    let pollingInterval: number | null = null;
    
    // Function to start polling
    const startPolling = () => {
      // Clear any existing interval first
      if (pollingInterval) clearInterval(pollingInterval);
      
      // Set up new interval with the quiet fetch that doesn't trigger loading indicators
      pollingInterval = window.setInterval(() => {
        // Use the fetchOrdersQuietly function from the store
        // This won't update the loading state, preventing UI "shake"
        const store = useOrderStore.getState();
        store.fetchOrdersQuietly().then(() => {
          // Check for new orders by comparing with previous set
          const newOrderIds = store.orders
            .filter(o => !currentOrderIds.has(o.id))
            .map(o => o.id);
          
          if (newOrderIds.length > 0) {
            // Add to new orders set
            setNewOrders(prev => {
              const updated = new Set(prev);
              newOrderIds.forEach(id => updated.add(id));
              return updated;
            });
            
            // Update current orders
            newOrderIds.forEach(id => currentOrderIds.add(id));
            
            // Clear new order highlight after 30 seconds
            setTimeout(() => {
              setNewOrders(prev => {
                const updated = new Set(prev);
                newOrderIds.forEach(id => updated.delete(id));
                return updated;
              });
            }, 30000);
          }
        });
      }, POLLING_INTERVAL);
    };
    
    // Function to stop polling
    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
    
    // Start polling immediately
    startPolling();
    
    // Set up visibility change detection to pause polling when tab is not visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // When becoming visible again, fetch immediately then start polling
        useOrderStore.getState().fetchOrdersQuietly();
        startPolling();
      }
    };
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
  // Clean up on component unmount
  return () => {
    stopPolling();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [fetchOrders]);

  // Track if the status update is in progress to prevent opening edit modal
  const [isStatusUpdateInProgress, setIsStatusUpdateInProgress] = useState(false);

  // State to track highlighted orders (for visual feedback)
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Toggle order expansion
  const toggleOrderExpand = useCallback((orderId: string) => {
    setExpandedOrders(prev => {
      const updated = new Set(prev);
      if (updated.has(orderId)) {
        updated.delete(orderId);
      } else {
        updated.add(orderId);
      }
      return updated;
    });
  }, []);
  
  // Toggle order selection
  const toggleOrderSelection = useCallback((orderId: string, selected: boolean) => {
    setSelectedOrders(prev => {
      const updated = new Set(prev);
      if (selected) {
        updated.add(orderId);
      } else {
        updated.delete(orderId);
      }
      return updated;
    });
  }, []);
  
  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedOrders(new Set());
  }, []);
  
  // Batch actions for selected orders
  const handleBatchMarkAsReady = useCallback(async () => {
    setIsStatusUpdateInProgress(true);
    
    try {
      // Process orders sequentially to avoid race conditions
      for (const orderId of selectedOrders) {
        await updateOrderStatusQuietly(orderId, 'ready');
      }
      
      // Clear selections after successful update
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
  
  const handleBatchMarkAsCancelled = useCallback(async () => {
    setIsStatusUpdateInProgress(true);
    
    try {
      for (const orderId of selectedOrders) {
        await updateOrderStatusQuietly(orderId, 'cancelled');
      }
      
      clearSelections();
    } finally {
      setIsStatusUpdateInProgress(false);
    }
  }, [selectedOrders, updateOrderStatusQuietly, clearSelections]);
  
  // Date filter functions
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
  
  // Search function
  const searchOrders = useCallback((order: any, query: string) => {
    if (!query) return true;
    
    const searchLower = query.toLowerCase();
    
    // Search in order ID
    if (order.id.toString().includes(searchLower)) return true;
    
    // Search in customer name
    if (order.contact_name && order.contact_name.toLowerCase().includes(searchLower)) return true;
    
    // Search in customer email
    if (order.contact_email && order.contact_email.toLowerCase().includes(searchLower)) return true;
    
    // Search in customer phone
    if (order.contact_phone && order.contact_phone.toLowerCase().includes(searchLower)) return true;
    
    // Search in special instructions
    const instructions = (order.special_instructions || order.specialInstructions || '').toLowerCase();
    if (instructions.includes(searchLower)) return true;
    
    // Search in order items
    if (order.items && order.items.length > 0) {
      return order.items.some((item: any) => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.notes && item.notes.toLowerCase().includes(searchLower))
      );
    }
    
    return false;
  }, []);
  
  // Apply all filters
  const filteredOrders = useMemo(() => {
    // First sort orders by creation date
    const sortedOrders = [...orders].sort((a, b) => {
      // Convert strings to Date objects for comparison
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      // Sort based on sortNewestFirst flag
      return sortNewestFirst 
        ? dateB.getTime() - dateA.getTime() // newest first
        : dateA.getTime() - dateB.getTime(); // oldest first
    });
    
    // Apply date filter
    const { start, end } = getDateRange();
    const dateFiltered = sortedOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate < end;
    });
    
    // Apply status filter
    const statusFiltered = selectedStatus === 'all'
      ? dateFiltered
      : dateFiltered.filter(order => order.status === selectedStatus);
    
    // Apply search filter
    return searchQuery
      ? statusFiltered.filter(order => searchOrders(order, searchQuery))
      : statusFiltered;
  }, [orders, sortNewestFirst, selectedStatus, searchQuery, getDateRange, searchOrders]);
      
  // Calculate pagination
  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  
  // Get current page of orders
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, sortNewestFirst, searchQuery, dateFilter]);
  
  // if the parent sets a selectedOrderId => expand the order card and scroll to it
  // but only if it's not from a status update
  useEffect(() => {
    if (selectedOrderId && !isStatusUpdateInProgress) {
      const found = orders.find(o => Number(o.id) === selectedOrderId);
      if (found) {
        // Reset filters to ensure the order is visible
        setSelectedStatus('all');
        setSearchQuery('');
        
        // Find the order in the filtered list to determine which page it's on
        const orderIndex = filteredOrders.findIndex(o => Number(o.id) === selectedOrderId);
        if (orderIndex >= 0) {
          // Calculate which page the order should be on
          const targetPage = Math.floor(orderIndex / ordersPerPage) + 1;
          setCurrentPage(targetPage);
        }
        
        // Add to expanded orders
        setExpandedOrders(prev => {
          const updated = new Set(prev);
          updated.add(found.id);
          return updated;
        });
        
        // Highlight the order for visual feedback
        setHighlightedOrderId(found.id);
        
        // Clear highlight after 5 seconds
        setTimeout(() => {
          setHighlightedOrderId(null);
        }, 5000);
        
        // Schedule scrolling after render
        setTimeout(() => {
          const orderElement = document.getElementById(`order-${found.id}`);
          if (orderElement) {
            orderElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
    }
  }, [selectedOrderId, orders, isStatusUpdateInProgress, filteredOrders, ordersPerPage]);

  function closeModal() {
    setSelectedOrder(null);
    if (setSelectedOrderId) {
      setSelectedOrderId(null);
    }
  }

  // handle ETA confirm => patch status=preparing & estimated_pickup_time
  async function handleConfirmEta() {
    if (!orderToPrep) {
      setShowEtaModal(false);
      return;
    }

    let pickupTime: string;
    
    if (requiresAdvanceNotice(orderToPrep)) {
      // For advance notice orders, create a timestamp for tomorrow at the selected time
      const [hourStr, minuteStr] = String(etaMinutes).split('.');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr || '0', 10);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hour, minute, 0, 0);
      
      pickupTime = tomorrow.toISOString();
    } else {
      // For regular orders, just add minutes to current time
      pickupTime = new Date(Date.now() + Number(etaMinutes) * 60_000).toISOString();
    }

    setIsStatusUpdateInProgress(true);
    // Use the quiet version for smoother UI
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
      confirmed: 'bg-purple-100 text-purple-800', // Added confirmed status
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Check if an order requires 24-hour advance notice
  const requiresAdvanceNotice = (order: any) => {
    return order.requires_advance_notice === true;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No pickup time set';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? 'No pickup time set' : d.toLocaleString();
  };

  // Called when admin finishes editing the order in the modal
  async function handleSaveEdit(updatedData: any) {
    // updatedData might contain items, total, status, instructions, etc.
    await updateOrderData(updatedData.id, updatedData);
    setEditingOrder(null);
  }

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortNewestFirst(!sortNewestFirst);
  };

  // Toggle order actions menu
  const toggleOrderActions = (orderId: number) => {
    setShowOrderActions(showOrderActions === orderId ? null : orderId);
  };

  // Render order actions for CollapsibleOrderCard - optimized for touch
  const renderOrderActions = (order: any) => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="font-medium text-sm">
          Total: ${Number(order.total || 0).toFixed(2)}
        </p>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          {order.status === 'pending' && (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 min-w-[120px] flex-grow sm:flex-grow-0"
              onClick={() => {
                setOrderToPrep(order);
                // Set default ETA based on order type
                if (requiresAdvanceNotice(order)) {
                  setEtaMinutes(10.0); // Default to 10 AM next day
                } else {
                  setEtaMinutes(5); // Default to 5 minutes
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
          
          <button
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
            onClick={() => {
              setEditingOrder(order);
            }}
            aria-label="Edit order"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          {(order.status === 'pending' || order.status === 'preparing') && (
            <button
              className="p-2 text-red-400 hover:text-red-600 rounded-md"
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this order?')) {
                  setIsStatusUpdateInProgress(true);
                  updateOrderStatusQuietly(order.id, 'cancelled')
                    .finally(() => setIsStatusUpdateInProgress(false));
                }
              }}
              aria-label="Cancel order"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Create Staff Order</span>
        </button>
      </div>

      {/* Filters and controls - optimized for mobile, tablet, and desktop */}
      <div className="mb-6 space-y-4">
        {/* Date, search and sort area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          
          <div className="w-full">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search orders..."
              className="w-full"
            />
          </div>
          
          <div className="w-full flex items-center justify-between">
            <MobileSelect
              options={[
                { value: 'newest', label: 'Sort: Newest First' },
                { value: 'oldest', label: 'Sort: Oldest First' }
              ]}
              value={sortNewestFirst ? 'newest' : 'oldest'}
              onChange={(value) => setSortNewestFirst(value === 'newest')}
            />
            
            <div className="text-sm text-gray-500 font-medium ml-3 whitespace-nowrap">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} found
            </div>
          </div>
        </div>

        {/* Status filter buttons - horizontal scrolling with improved mobile styling */}
        <div className="relative mt-2">
          {/* Scrollable container with improved touch scrolling for mobile */}
          <div className="flex flex-nowrap space-x-2 overflow-x-auto py-1 px-1 scrollbar-hide -mx-1 pb-2 -mb-1 snap-x touch-pan-x">
            <button
              onClick={() => setSelectedStatus('all')}
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
            {(['pending', 'preparing', 'ready', 'completed', 'cancelled'] as const).map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
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

      {/* Orders list - with collapsible cards */}
      <div className="pb-16">
        {loading ? (
          // Skeleton loading state
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div 
                key={`skeleton-${index}`} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse animate-fadeIn"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Skeleton header */}
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
                
                {/* Skeleton content */}
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
                  onSelectChange={(selected) => toggleOrderSelection(order.id, selected)}
                  renderActions={() => renderOrderActions(order)}
                  getStatusBadgeColor={getStatusBadgeColor}
                  formatDate={formatDate}
                  requiresAdvanceNotice={requiresAdvanceNotice}
                />
              ))}
            </div>
            
            {/* Pagination controls - optimized for mobile */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6 pb-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                
                <div className="hidden sm:flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
      <MultiSelectActionBar
        selectedCount={selectedOrders.size}
        onClearSelection={clearSelections}
        onMarkAsReady={handleBatchMarkAsReady}
        onMarkAsCompleted={handleBatchMarkAsCompleted}
        onMarkAsCancelled={handleBatchMarkAsCancelled}
        isProcessing={isStatusUpdateInProgress}
      />

      {/* Click outside handler for order actions dropdown */}
      {showOrderActions !== null && (
        <div 
          className="fixed inset-0 h-full w-full z-0"
          onClick={() => setShowOrderActions(null)}
        ></div>
      )}

      {/* Details modal */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={closeModal} />
      )}

      {/* "Set ETA" modal */}
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

      {/* "Edit Order" modal */}
      {editingOrder && (
        <AdminEditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Staff Order Modal (POS) */}
      {showStaffOrderModal && (
        <StaffOrderModal
          onClose={() => setShowStaffOrderModal(false)}
          onOrderCreated={(orderId) => {
            setShowStaffOrderModal(false);
            // Refresh orders
            fetchOrders();
            // Optionally, select the newly created order
            if (setSelectedOrderId) {
              setSelectedOrderId(Number(orderId));
            }
            // Show success message with toast instead of alert
            toast.success(`Staff order #${orderId} created successfully!`);
          }}
          restaurantId={restaurantId}
        />
      )}
    </div>
  );
}
