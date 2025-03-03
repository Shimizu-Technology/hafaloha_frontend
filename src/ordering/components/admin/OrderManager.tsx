// src/ordering/components/admin/OrderManager.tsx
import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../../store/orderStore';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';

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
    const pickupTime = new Date(Date.now() + etaMinutes * 60_000).toISOString();

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
      <div className="space-y-4 pb-16">
        {loading ? (
          // Skeleton loading state
          Array.from({ length: 3 }).map((_, index) => (
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
          ))
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <p className="text-gray-500">No orders found matching your filters</p>
          </div>
        ) : (
          filteredOrders.map(order => (
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
                  <span
                    className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${getStatusBadgeColor(order.status)}
                    `}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
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
                                setEtaMinutes(5);
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
                    {order.items.map((item: any, index: number) => (
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
                    ))}
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
                          setEtaMinutes(5);
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
          ))
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

function OrderDetailsModal({
  order,
  onClose
}: {
  order: any;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md max-w-lg w-full p-4 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="text-lg font-bold mb-3">Order #{order.id}</h3>
        <p className="text-xs text-gray-500 mb-3">
          Placed: {new Date(order.createdAt).toLocaleString()}
        </p>

        <p className="font-medium mb-2 text-sm">Items:</p>
        <div className="space-y-2 mb-4">
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <div>
                <p className="font-medium">
                  {item.name} × {item.quantity}
                </p>
                {item.notes && (
                  <p className="text-xs text-gray-600">Notes: {item.notes}</p>
                )}
              </div>
              <p>${Number(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
          <p className="font-medium">
            Total: ${Number(order.total || 0).toFixed(2)}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#c1902f] text-white text-sm rounded hover:bg-[#d4a43f]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The "Set ETA" modal for pending->preparing
 */
function SetEtaModal({
  order,
  etaMinutes,
  setEtaMinutes,
  onClose,
  onConfirm,
}: {
  order: any;
  etaMinutes: number;
  setEtaMinutes: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const possibleEtas = Array.from({ length: 12 }, (_, i) => (i + 1) * 5);
  
  // Create options array for MobileSelect
  const etaOptions = possibleEtas.map(minutes => ({
    value: String(minutes),
    label: `${minutes} minutes`
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-sm p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="text-lg font-bold mb-3">Set ETA for Order #{order.id}</h3>
        <p className="text-sm text-gray-600 mb-4">
          How many minutes until this order is ready?
        </p>

        <div className="mb-6">
          <MobileSelect
            label="ETA (in minutes)"
            options={etaOptions}
            value={String(etaMinutes)}
            onChange={(value) => setEtaMinutes(Number(value))}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-md text-base font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 bg-[#c1902f] text-white rounded-md text-base font-medium hover:bg-[#d4a43f]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * "Admin Edit Order" modal for adjusting items, total, instructions, etc.
 */
function AdminEditOrderModal({
  order,
  onClose,
  onSave,
}: {
  order: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}) {
  // Local state for items, total, etc.
  const [localItems, setLocalItems] = useState(() => {
    // Make a shallow copy so we don't mutate the original array
    return order.items ? [...order.items] : [];
  });
  const [localTotal, setLocalTotal] = useState<string>(String(order.total || '0'));
  const [localStatus, setLocalStatus] = useState(order.status);
  const [localInstructions, setLocalInstructions] = useState((order as any).special_instructions || (order as any).specialInstructions || '');
  const [activeTab, setActiveTab] = useState<'items' | 'details'>('items');

  // Handle changing a single item row
  function handleItemChange(index: number, field: string, value: string | number) {
    setLocalItems((prev) => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        [field]: field === 'price' ? parseFloat(String(value)) : value,
      };
      return newItems;
    });
  }

  // Remove one item row
  function handleRemoveItem(index: number) {
    setLocalItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Add a new blank item row
  function handleAddItem() {
    setLocalItems((prev) => [
      ...prev,
      {
        id: null,
        name: '',
        quantity: 1,
        price: 0.0,
        notes: '',
      },
    ]);
  }

  // Calculate subtotal
  const calculateSubtotal = () => {
    return localItems.reduce((sum, item) => {
      const itemPrice = parseFloat(String(item.price)) || 0;
      const quantity = parseInt(String(item.quantity)) || 0;
      return sum + (itemPrice * quantity);
    }, 0).toFixed(2);
  };

  // Called by the "Save" button
  function handleSave() {
    // Convert total to a float
    const parsedTotal = parseFloat(localTotal) || 0.0;

    // Build our updated order data
    const updated = {
      ...order,
      items: localItems,
      total: parsedTotal,
      status: localStatus,
      // Include both property names to ensure compatibility
      special_instructions: localInstructions,
      specialInstructions: localInstructions,
    };

    onSave(updated);
  }

  // Status badge colors
  const getStatusBadgeColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      confirmed: 'bg-purple-100 text-purple-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full sm:max-w-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with close button */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Order #{order.id}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Status selector - always visible regardless of active tab */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(localStatus)}`}>
                {localStatus.charAt(0).toUpperCase() + localStatus.slice(1)}
              </span>
            </div>
            <div className="flex-1">
              <MobileSelect
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'preparing', label: 'Preparing' },
                  { value: 'ready', label: 'Ready' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]}
                value={localStatus}
                onChange={(value) => setLocalStatus(value)}
              />
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('items')}
            className={`mr-4 pb-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'items'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Order Items
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`mr-4 pb-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'details'
                ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Order Details
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'items' && (
            <div className="space-y-4">
              {/* Items list */}
              <div className="space-y-3">
                {localItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="border border-gray-200 rounded-lg p-4 space-y-3 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-900">Item {idx + 1}</h5>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors flex items-center"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="Item name"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', parseInt(e.target.value, 10))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                              type="number"
                              className="border border-gray-300 rounded-md pl-7 pr-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                          value={item.notes || ''}
                          onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                          placeholder="Special requests or modifications"
                        />
                      </div>

                      <div className="pt-2 text-right text-sm font-medium text-gray-700">
                        Item Total: ${((parseFloat(String(item.price)) || 0) * (parseInt(String(item.quantity)) || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add item button */}
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Item
              </button>

              {/* Order summary */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-medium">${calculateSubtotal()}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 border-t border-gray-100 space-y-2 sm:space-y-0">
                  <span className="text-base font-medium text-gray-900">Total</span>
                  <div className="relative w-full sm:w-32">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      className="border border-gray-300 rounded-md pl-7 pr-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors text-right font-medium"
                      value={localTotal}
                      onChange={(e) => setLocalTotal(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Special instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                  rows={4}
                  value={localInstructions}
                  onChange={(e) => setLocalInstructions(e.target.value)}
                  placeholder="Any special instructions for this order"
                />
              </div>

              {/* Order metadata */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Order Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Created</div>
                  <div className="text-gray-900">{new Date(order.createdAt).toLocaleString()}</div>
                  
                  {order.contact_name && (
                    <>
                      <div className="text-gray-500">Customer</div>
                      <div className="text-gray-900">{order.contact_name}</div>
                    </>
                  )}
                  
                  {(order.estimatedPickupTime || order.estimated_pickup_time) && (
                    <>
                      <div className="text-gray-500">Pickup Time</div>
                      <div className="text-gray-900">
                        {new Date(order.estimatedPickupTime || order.estimated_pickup_time).toLocaleString()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons - sticky footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-[#c1902f] text-white rounded-lg text-sm font-medium hover:bg-[#d4a43f] transition-colors shadow-sm order-1 sm:order-2"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
