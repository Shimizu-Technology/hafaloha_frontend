// src/ordering/components/admin/OrderManager.tsx
import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../../store/orderStore';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';
import { AdminEditOrderModal } from './AdminEditOrderModal';
import { SetEtaModal } from './SetEtaModal';
import { OrderDetailsModal } from './OrderDetailsModal';

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
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');

  // sort direction (true = newest first, false = oldest first)
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  // for the "Set ETA" modal
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [orderToPrep, setOrderToPrep] = useState<any | null>(null);

  // for the "Edit Order" modal
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

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
        useOrderStore.getState().fetchOrdersQuietly();
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

  // if the parent sets a selectedOrderId => open the edit modal instead of details
  // but only if it's not from a status update
  useEffect(() => {
    if (selectedOrderId && !isStatusUpdateInProgress) {
      const found = orders.find(o => Number(o.id) === selectedOrderId);
      if (found) {
        // Open the edit modal instead of the details modal
        setEditingOrder(found);
      }
    } else {
      setEditingOrder(null);
    }
  }, [selectedOrderId, orders, isStatusUpdateInProgress]);

  // Sort orders by creation date
  const sortedOrders = [...orders].sort((a, b) => {
    // Convert strings to Date objects for comparison
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    // Sort based on sortNewestFirst flag
    return sortNewestFirst 
      ? dateB.getTime() - dateA.getTime() // newest first
      : dateA.getTime() - dateB.getTime(); // oldest first
  });

  // filter the orders by selectedStatus
  const filteredOrders =
    selectedStatus === 'all'
      ? sortedOrders
      : sortedOrders.filter(order => order.status === selectedStatus);
      
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
  }, [selectedStatus, sortNewestFirst]);

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
  const getStatusBadgeColor = (status: OrderStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      confirmed: 'bg-purple-100 text-purple-800', // Added confirmed status
    };
    return colors[status];
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

  return (
    <div className="p-4">
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Header section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <p className="text-gray-600 text-sm">Manage and track customer orders</p>
      </div>

      {/* Filters and controls - mobile optimized */}
      <div className="mb-6 space-y-5">
        {/* Sort and count area */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="w-full sm:w-auto">
            <MobileSelect
              options={[
                { value: 'newest', label: 'Sort: Newest First' },
                { value: 'oldest', label: 'Sort: Oldest First' }
              ]}
              value={sortNewestFirst ? 'newest' : 'oldest'}
              onChange={(value) => setSortNewestFirst(value === 'newest')}
            />
          </div>
          
          <div className="text-sm text-gray-500 font-medium">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} found
          </div>
        </div>

        {/* Status filter buttons - horizontal scrolling with improved mobile styling */}
        <div className="relative">
          {/* Scrollable container */}
          <div className="flex flex-nowrap space-x-2 overflow-x-auto py-1 px-1 scrollbar-hide -mx-1">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`
                whitespace-nowrap px-4 py-2.5 rounded-md text-sm font-medium min-w-[90px] flex-shrink-0
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
                  whitespace-nowrap px-4 py-2.5 rounded-md text-sm font-medium min-w-[90px] flex-shrink-0
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

      {/* Orders list - further mobile optimized */}
      <div className="pb-16">
        {loading ? (
          // Skeleton loading state
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
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
              {currentOrders.map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Order header - more compact for mobile */}
                  <div className="flex justify-between items-center p-3 border-b border-gray-100">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">Order #{order.id}</h3>
                      {order.createdAt && (
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-1">
                        {requiresAdvanceNotice(order) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            24h
                          </span>
                        )}
                        <span
                          className={`
                            px-2 py-1 rounded-full text-xs font-medium
                            ${getStatusBadgeColor(order.status)}
                          `}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <div 
                        className="text-gray-400 hover:text-gray-600 relative cursor-pointer p-1"
                        onClick={() => toggleOrderActions(Number(order.id))}
                        role="button"
                        tabIndex={0}
                        aria-label="Order actions"
                        aria-haspopup="true"
                        aria-expanded={showOrderActions === Number(order.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleOrderActions(Number(order.id));
                          }
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"></circle>
                          <circle cx="19" cy="12" r="1"></circle>
                          <circle cx="5" cy="12" r="1"></circle>
                        </svg>
                        
                        {/* Dropdown menu for mobile */}
                        {showOrderActions === Number(order.id) && (
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingOrder(order);
                                  setShowOrderActions(null);
                                }}
                              >
                                Edit Order
                              </button>

                              {order.status === 'pending' && (
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOrderToPrep(order);
                                    // Set default ETA based on order type
                                    if (requiresAdvanceNotice(order)) {
                                      setEtaMinutes(10.0); // Default to 10 AM next day
                                    } else {
                                      setEtaMinutes(5); // Default to 5 minutes
                                    }
                                    setShowEtaModal(true);
                                    setShowOrderActions(null);
                                  }}
                                >
                                  Start Preparing
                                </button>
                              )}
                              
                              {order.status === 'preparing' && (
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsStatusUpdateInProgress(true);
                                    updateOrderStatusQuietly(order.id, 'ready')
                                      .finally(() => setIsStatusUpdateInProgress(false));
                                    setShowOrderActions(null);
                                  }}
                                >
                                  Mark as Ready
                                </button>
                              )}
                              
                              {order.status === 'ready' && (
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsStatusUpdateInProgress(true);
                                    updateOrderStatusQuietly(order.id, 'completed')
                                      .finally(() => setIsStatusUpdateInProgress(false));
                                    setShowOrderActions(null);
                                  }}
                                >
                                  Complete Order
                                </button>
                              )}
                              
                              {(order.status === 'pending' || order.status === 'preparing') && (
                                <button
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsStatusUpdateInProgress(true);
                                    updateOrderStatusQuietly(order.id, 'cancelled')
                                      .finally(() => setIsStatusUpdateInProgress(false));
                                    setShowOrderActions(null);
                                  }}
                                >
                                  Cancel Order
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order content - simplified for mobile */}
                  <div className="p-3">
                    {/* Items with prices aligned to right */}
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Order Items:</h4>
                      <div className="space-y-1">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <div>
                                <span className="font-medium">
                                  {item.name} × {item.quantity}
                                </span>
                              </div>
                              <div className="text-right">
                                ${Number(item.price * item.quantity).toFixed(2)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">No items found</div>
                        )}
                      </div>
                    </div>

                    {/* Customer info - more compact */}
                    <div className="text-xs space-y-2 mb-3">
                      {order.contact_name && (
                        <div>
                          <span className="font-medium text-gray-700">Customer: </span>
                          <span>{order.contact_name}</span>
                        </div>
                      )}
                      
                      <div>
                        <span className="font-medium text-gray-700">Pickup: </span>
                        <span>{formatDate((order as any).estimatedPickupTime || (order as any).estimated_pickup_time)}</span>
                      </div>
                      
                      {((order as any).special_instructions || (order as any).specialInstructions) && (
                        <div>
                          <span className="font-medium text-gray-700">Instructions: </span>
                          <span>{(order as any).special_instructions || (order as any).specialInstructions}</span>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <p className="font-medium text-sm">
                        Total: ${Number(order.total || 0).toFixed(2)}
                      </p>
                      
                      {/* Status-specific action button for larger screens */}
                      <div className="hidden sm:block">
                        {order.status === 'pending' && (
                          <button
                            className="px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600"
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
                            className="px-3 py-1 bg-green-500 text-white rounded-md text-xs hover:bg-green-600"
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
                            className="px-3 py-1 bg-gray-500 text-white rounded-md text-xs hover:bg-gray-600"
                            onClick={() => {
                              setIsStatusUpdateInProgress(true);
                              updateOrderStatusQuietly(order.id, 'completed')
                                .finally(() => setIsStatusUpdateInProgress(false));
                            }}
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6 pb-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md text-sm ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Previous
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${
                        currentPage === page
                          ? 'bg-[#c1902f] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md text-sm ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}
