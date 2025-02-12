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
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');

  console.log('[OrderManager] Rendering. orders.length=', orders.length,
    'selectedOrderId=', selectedOrderId);

  useEffect(() => {
    console.log('[OrderManager] useEffect => fetchOrders() on mount');
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    console.log('[OrderManager] useEffect => selectedOrderId changed =>', selectedOrderId);
    if (selectedOrderId) {
      // find matching order in "orders" array
      const found = orders.find(o => Number(o.id) === selectedOrderId);
      console.log('[OrderManager] found order =>', found);
      if (found) setSelectedOrder(found);
      else setSelectedOrder(null);
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, orders]);

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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No pickup time set'; 
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? 'No pickup time set' : d.toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {loading && <p>Loading orders...</p>}
      {error && <p className="text-red-600">{error}</p>}

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

      <div className="space-y-6">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
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

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700">Special Instructions</h4>
              <p>{order.special_instructions || 'None'}</p>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center">
              <p className="font-medium">
                Total: ${Number(order.total || 0).toFixed(2)}
              </p>
              <div className="flex flex-wrap gap-2">
                {order.status === 'pending' && (
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
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

      {/* Show modal if selectedOrder is set */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={closeModal} />
      )}
    </div>
  );
}

// Simple Modal
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
