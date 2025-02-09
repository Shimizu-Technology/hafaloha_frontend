// src/ordering/components/profile/OrderHistory.tsx
import React, { useEffect } from 'react';
import { useOrderStore } from '../../store/orderStore';
import { useAuthStore } from '../../store/authStore';
import { Clock, ShoppingBag } from 'lucide-react';

export function OrderHistory() {
  const { user } = useAuthStore();
  const { getOrderHistory, fetchOrders } = useOrderStore();

  useEffect(() => {
    // Load orders from the backend on mount
    fetchOrders();
  }, [fetchOrders]);

  if (!user) return null;

  const orders = getOrderHistory(user.id);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Order History</h2>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium">Order #{order.id}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : order.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <div className="border-t border-b py-4 mb-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{item.name} × {item.quantity}</p>
                      {item.customizations &&
                        Object.entries(item.customizations).map(([key, values]) => (
                          <p key={key} className="text-sm text-gray-600">
                            {key}: {values.join(', ')}
                          </p>
                        ))}
                    </div>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  Pickup Time: {new Date(order.estimatedPickupTime).toLocaleTimeString()}
                </div>
                <p className="font-medium">Total: ${order.total.toFixed(2)}</p>
              </div>

              {order.specialInstructions && (
                <p className="mt-4 text-sm text-gray-600">
                  Special Instructions: {order.specialInstructions}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrderHistory;
