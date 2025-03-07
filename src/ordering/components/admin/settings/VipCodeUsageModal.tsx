// src/ordering/components/admin/settings/VipCodeUsageModal.tsx

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, ShoppingBag, User, Calendar, DollarSign } from 'lucide-react';
import { getCodeUsage } from '../../../../shared/api/endpoints/vipCodes';
import { LoadingSpinner } from '../../../../shared/components/ui/LoadingSpinner';

interface VipCodeUsageModalProps {
  codeId: number;
  onClose: () => void;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: number;
  created_at: string;
  status: string;
  total: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  user: {
    id: number;
    name: string;
  } | null;
  items: OrderItem[];
}

interface CodeUsageData {
  code: {
    id: number;
    code: string;
    name: string;
    max_uses: number | null;
    current_uses: number;
    expires_at: string | null;
    is_active: boolean;
    group_id?: string;
    archived?: boolean;
  };
  usage_count: number;
  orders: Order[];
}

export const VipCodeUsageModal: React.FC<VipCodeUsageModalProps> = ({ codeId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<CodeUsageData | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<number[]>([]);

  useEffect(() => {
    const fetchUsageData = async () => {
      setLoading(true);
      try {
        const data = await getCodeUsage(codeId);
        setUsageData(data as CodeUsageData);
      } catch (error) {
        console.error('Error fetching VIP code usage data:', error);
        toast.error('Failed to load VIP code usage data');
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, [codeId]);

  const toggleOrderExpand = (orderId: number) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl h-3/4 flex flex-col transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse"></div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg mb-4 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 w-24 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-grow space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          
          {Array.from({ length: 3 }).map((_, index) => (
            <div 
              key={`skeleton-order-${index}`} 
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!usageData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl h-3/4 flex flex-col transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">VIP Code Usage Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg mb-4 transition-all duration-300 animate-fadeIn">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Code</p>
              <p className="font-semibold">{usageData.code.code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-semibold">{usageData.code.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-semibold">{usageData.code.group_id ? 'Group' : 'Individual'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Usage</p>
              <p className="font-semibold">{usageData.usage_count} / {usageData.code.max_uses || '∞'}</p>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-auto">
          {usageData.orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingBag size={48} className="mx-auto mb-2 opacity-30" />
              <p>No orders have been placed using this VIP code yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Orders ({usageData.orders.length})</h3>
              
              {usageData.orders.map(order => (
                <div 
                  key={order.id} 
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div 
                    className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleOrderExpand(order.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">Order #{order.id}</span>
                      <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="font-semibold">{formatCurrency(order.total)}</div>
                  </div>
                  
                  {expandedOrders.includes(order.id) && (
                    <div className="p-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium flex items-center mb-2">
                            <User size={16} className="mr-2" /> Customer Information
                          </h4>
                          <p><span className="text-gray-500">Name:</span> {order.customer_name}</p>
                          <p><span className="text-gray-500">Email:</span> {order.customer_email}</p>
                          <p><span className="text-gray-500">Phone:</span> {order.customer_phone}</p>
                          {order.user && (
                            <p><span className="text-gray-500">User Account:</span> {order.user.name} (ID: {order.user.id})</p>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium flex items-center mb-2">
                            <Calendar size={16} className="mr-2" /> Order Details
                          </h4>
                          <p><span className="text-gray-500">Date:</span> {formatDate(order.created_at)}</p>
                          <p><span className="text-gray-500">Status:</span> {order.status}</p>
                          <p><span className="text-gray-500">Total:</span> {formatCurrency(order.total)}</p>
                        </div>
                      </div>
                      
                      <h4 className="font-medium flex items-center mb-2">
                        <ShoppingBag size={16} className="mr-2" /> Items
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {order.items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap">{item.name}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{item.quantity}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(item.price)}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50">
                              <td colSpan={3} className="px-4 py-2 text-right font-medium">Order Total:</td>
                              <td className="px-4 py-2 font-bold">{formatCurrency(order.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
