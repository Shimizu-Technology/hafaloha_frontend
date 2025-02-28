// src/ordering/components/admin/OrderManager.tsx
import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../../store/orderStore';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'confirmed';

interface OrderManagerProps {
  selectedOrderId?: number | null;
  setSelectedOrderId?: (id: number | null) => void;
}

export function OrderManager({ selectedOrderId, setSelectedOrderId }: OrderManagerProps) {
  const {
    orders,
    fetchOrders,
    updateOrderStatus,
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

  // fetch all orders on mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // if the parent sets a selectedOrderId => open the details
  useEffect(() => {
    if (selectedOrderId) {
      const found = orders.find(o => Number(o.id) === selectedOrderId);
      setSelectedOrder(found || null);
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, orders]);

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

    await updateOrderStatus(orderToPrep.id, 'preparing', pickupTime);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
      {loading && <p>Loading orders...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Header section */}
      <div className="mb-4">
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
        {filteredOrders.length === 0 ? (
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
                                updateOrderStatus(order.id, 'ready');
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
                                updateOrderStatus(order.id, 'completed');
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
                                updateOrderStatus(order.id, 'cancelled');
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
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                      >
                        Mark as Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        className="px-3 py-1 bg-gray-500 text-white rounded-md text-xs hover:bg-gray-600"
                        onClick={() => updateOrderStatus(order.id, 'completed')}
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

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      {/* Outer container: on small screens => full width, on bigger => max-w-2xl */}
      <div className="bg-white rounded-lg shadow-md w-full sm:max-w-2xl p-4 relative space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Close button (X) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="text-lg font-bold pr-8">Edit Order #{order.id}</h3>

        {/* ITEMS TABLE */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Items</h4>
          <div className="space-y-2 mb-2">
            {localItems.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium">Item {idx + 1}</h5>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-red-600 text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="border w-full rounded px-2 py-1 text-sm"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        className="border w-full rounded px-2 py-1 text-sm"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', parseInt(e.target.value, 10))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        className="border w-full rounded px-2 py-1 text-sm"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      className="border w-full rounded px-2 py-1 text-sm"
                      value={item.notes || ''}
                      onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full text-center px-3 py-2 bg-gray-100 text-sm rounded hover:bg-gray-200"
          >
            + Add Item
          </button>
        </div>

        {/* TOTAL / STATUS / INSTRUCTIONS */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Total
              </label>
              <input
                type="number"
                step="0.01"
                className="border-2 border-gray-300 rounded px-4 py-3 w-full text-base"
                style={{ fontSize: '16px' }} /* Prevent iOS zoom on focus */
                value={localTotal}
                onChange={(e) => setLocalTotal(e.target.value)}
              />
            </div>

            <div>
              <MobileSelect
                label="Status"
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

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              className="border-2 border-gray-300 rounded px-4 py-3 w-full text-base"
              style={{ fontSize: '16px' }} /* Prevent iOS zoom on focus */
              rows={3}
              value={localInstructions}
              onChange={(e) => setLocalInstructions(e.target.value)}
            />
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-md text-base font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#c1902f] text-white rounded-md text-base font-medium hover:bg-[#d4a43f]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
