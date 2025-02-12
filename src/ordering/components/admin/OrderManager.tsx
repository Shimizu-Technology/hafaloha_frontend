// src/ordering/components/admin/OrderManager.tsx
import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../../store/orderStore';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export function OrderManager() {
  const { orders, fetchOrders, updateOrderStatus, loading, error } = useOrderStore();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    // Load orders on mount
    fetchOrders();
  }, [fetchOrders]);

  // Filter by selected status
  const filteredOrders =
    selectedStatus === 'all'
      ? orders
      : orders.filter(order => order.status === selectedStatus);

  // For status color badges
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

  // Safely format date or fallback
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No pickup time set'; 
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? 'No pickup time set' : d.toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Loading / Error */}
      {loading && <p>Loading orders...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Header: Title & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold">Order Management</h2>
        
        {/* Status Filter Buttons: horizontal scroll on mobile */}
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

      {/* Orders List */}
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

            {/* Order Items */}
            <div className="border-t border-b py-4 mb-4">
              <h4 className="font-medium mb-2">Order Items:</h4>
              {order.items.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2"
                >
                  <div>
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
                </div>
              ))}
            </div>

            {/* Contact & Pickup Info: grid -> 1 col on mobile, 2 col on sm+ */}
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

            {/* Special instructions */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700">Special Instructions</h4>
              <p>{order.special_instructions || 'None'}</p>
            </div>

            {/* Footer: total + status buttons */}
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
    </div>
  );
}
