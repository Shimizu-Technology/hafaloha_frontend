// src/ordering/components/admin/OrderManager.tsx
import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../../store/orderStore';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

interface OrderManagerProps {
  selectedOrderId?: number | null;
  setSelectedOrderId?: (id: number | null) => void;
}

export function OrderManager({ selectedOrderId, setSelectedOrderId }: OrderManagerProps) {
  const { orders, fetchOrders, updateOrderStatus, loading, error } = useOrderStore();

  // Local state: which order is in the “details” modal:
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Local state: which “tab” of status are we viewing?
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');

  // NEW: keep track if we’re showing the “Set ETA” modal
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(5); // default to 5 minutes
  const [orderToPrep, setOrderToPrep] = useState<any | null>(null); // which order are we about to prepare?

  console.log('[OrderManager] Rendering. orders.length=', orders.length,
    'selectedOrderId=', selectedOrderId);

  // Fetch all orders on mount
  useEffect(() => {
    console.log('[OrderManager] useEffect => fetchOrders() on mount');
    fetchOrders();
  }, [fetchOrders]);

  // If the parent sets a selectedOrderId => open the details modal
  useEffect(() => {
    console.log('[OrderManager] useEffect => selectedOrderId changed =>', selectedOrderId);
    if (selectedOrderId) {
      const found = orders.find(o => Number(o.id) === selectedOrderId);
      console.log('[OrderManager] found order =>', found);
      setSelectedOrder(found || null);
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, orders]);

  // Filter for whichever status the admin is viewing
  const filteredOrders =
    selectedStatus === 'all'
      ? orders
      : orders.filter(order => order.status === selectedStatus);

  function closeModal() {
    console.log('[OrderManager] closeModal => clearing selectedOrder');
    setSelectedOrder(null);
    if (setSelectedOrderId) {
      setSelectedOrderId(null);
    }
  }

  /** Called if admin actually chooses an ETA and hits “Confirm” in the modal */
  async function handleConfirmEta() {
    if (!orderToPrep) {
      setShowEtaModal(false);
      return;
    }
    // Convert ETA minutes to a Date => “now” + X minutes
    // The backend can do it, or you can do it here. For a quick approach:
    const pickupTime = new Date(Date.now() + etaMinutes * 60_000).toISOString();

    console.log(`[OrderManager] handleConfirmEta => orderId=${orderToPrep.id}, ETA=${etaMinutes}min => ${pickupTime}`);

    // 1) call updateOrderStatus with “preparing” + the new pickup time
    await updateOrderStatus(orderToPrep.id, 'preparing', pickupTime);

    // 2) hide the modal + reset
    setShowEtaModal(false);
    setEtaMinutes(5);
    setOrderToPrep(null);
  }

  // A small helper for color badges
  const getStatusBadgeColor = (status: OrderStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  // Format a date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No pickup time set';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? 'No pickup time set' : d.toLocaleString();
  };

  // Render
  return (
    <div className="max-w-7xl mx-auto p-6">
      {loading && <p>Loading orders...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Top: Title & Status Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold">Order Management</h2>

        <div className="flex flex-nowrap space-x-3 overflow-x-auto scrollbar-hide py-1">
          {(['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'] as const).map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`
                flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-md 
                ${
                  selectedStatus === status
                    ? 'bg-[#c1902f] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List of Orders */}
      <div className="space-y-6">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Order #{order.id}</h3>
                {order.createdAt && (
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
              <span
                className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${getStatusBadgeColor(order.status)}
                `}
              >
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>

            {/* Items */}
            <div className="border-t border-b py-4 mb-4">
              <h4 className="font-medium mb-2">Order Items:</h4>
              {order.items.map((item: any, index: number) => (
                <div key={index} className="mb-2">
                  <p className="font-medium">
                    {item.name} × {item.quantity}
                  </p>
                  {item.customizations &&
                    Object.entries(item.customizations).map(([gName, values]) => (
                      <p key={gName} className="text-sm text-gray-600">
                        {gName}: {(values as string[]).join(', ')}
                      </p>
                    ))}
                  {item.notes && (
                    <p className="text-sm text-gray-600">
                      Notes: {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Contact & Pickup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Customer</h4>
                <p>{(order as any).contact_name || 'Guest'}</p>
                <p>{(order as any).contact_phone || ''}</p>
                <p>{(order as any).contact_email || ''}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Pickup Time</h4>
                <p>{formatDate(order.estimatedPickupTime)}</p>
              </div>
            </div>

            {/* Special Instructions & Footer */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700">Special Instructions</h4>
              <p>{order.special_instructions || 'None'}</p>
            </div>

            <div className="flex justify-between items-center">
              <p className="font-medium">
                Total: ${Number(order.total || 0).toFixed(2)}
              </p>
              <div className="flex flex-wrap gap-2">
                {order.status === 'pending' && (
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    onClick={() => {
                      // Instead of calling updateOrderStatus directly,
                      // we open the "Set ETA" modal first
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
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                  >
                    Mark as Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                  >
                    Complete Order
                  </button>
                )}
                {(order.status === 'pending' || order.status === 'preparing') && (
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show the “Order Details” modal if the user clicked to see details */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={closeModal} />
      )}

      {/* Show the “Set ETA” modal if user is transitioning from pending -> preparing */}
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
    </div>
  );
}

// The “Details” modal (unchanged)
function OrderDetailsModal({
  order,
  onClose
}: {
  order: any;
  onClose: () => void;
}) {
  console.log('[OrderDetailsModal] rendering, order.id =', order.id);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="text-xl font-bold mb-4">Order #{order.id}</h3>
        <p className="text-sm text-gray-500 mb-4">
          Placed: {new Date(order.createdAt).toLocaleString()}
        </p>

        <p className="font-medium mb-2">Items:</p>
        {order.items.map((item: any, idx: number) => (
          <div key={idx} className="mb-2">
            <p>
              {item.name} × {item.quantity}
            </p>
            {item.notes && (
              <p className="text-sm text-gray-600">Notes: {item.notes}</p>
            )}
          </div>
        ))}

        <p className="font-medium mt-4">
          Total: ${Number(order.total || 0).toFixed(2)}
        </p>

        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-[#c1902f] text-white rounded hover:bg-[#d4a43f]"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/** 
 * This new “Set ETA” modal shows a dropdown of 5‐minute increments,
 * defaulting to 5.  The admin picks it, clicks Confirm => we call “onConfirm()”.
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
  // Just an example list from 5 to 60 in increments of 5
  const possibleEtas = Array.from({ length: 12 }, (_, i) => (i + 1) * 5); // [5,10,15...60]

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md max-w-sm w-full p-6 relative">
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

        <h3 className="text-xl font-bold mb-4">Set ETA for Order #{order.id}</h3>
        <p className="text-sm text-gray-600 mb-4">
          How many minutes from now until this order should be ready?
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ETA (in minutes)
          </label>
          <select
            value={etaMinutes}
            onChange={(e) => setEtaMinutes(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            {possibleEtas.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
