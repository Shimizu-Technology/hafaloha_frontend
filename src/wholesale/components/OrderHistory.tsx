// src/wholesale/components/OrderHistory.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wholesaleApi, WholesaleOrder } from '../services/wholesaleApi';

interface OrderFilters {
  status: string;
  fundraiserName: string;
  dateFrom: string;
  dateTo: string;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({
    status: '',
    fundraiserName: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await wholesaleApi.getOrders();
      
      if (response.success && response.data) {
        setOrders(response.data.orders);
      } else {
        setError(response.message || 'Failed to load orders');
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Unable to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof OrderFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      fundraiserName: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const filteredOrders = orders.filter(order => {
    // Status filter
    if (filters.status && order.status !== filters.status) {
      return false;
    }
    
    // Fundraiser filter
    if (filters.fundraiserName && !order.fundraiser.name.toLowerCase().includes(filters.fundraiserName.toLowerCase())) {
      return false;
    }
    
    // Date filters
    if (filters.dateFrom) {
      const orderDate = new Date(order.createdAt);
      const fromDate = new Date(filters.dateFrom);
      if (orderDate < fromDate) return false;
    }
    
    if (filters.dateTo) {
      const orderDate = new Date(order.createdAt);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (orderDate > toDate) return false;
    }
    
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'shipped':
        return 'text-purple-600 bg-purple-100';
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleReorder = async (order: WholesaleOrder) => {
    // TODO: Implement reorder functionality
    // This would typically:
    // 1. Clear current cart
    // 2. Add all items from this order to cart
    // 3. Navigate to fundraiser or cart page
    console.log('Reorder functionality not yet implemented for order:', order.orderNumber);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold">Unable to Load Orders</h3>
          <p className="text-sm mt-2">{error}</p>
        </div>
        <button 
          onClick={loadOrders}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="order-history max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
        <p className="text-gray-600">
          View and track all your wholesale fundraiser orders.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Orders</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Fundraiser Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fundraiser
            </label>
            <input
              type="text"
              value={filters.fundraiserName}
              onChange={(e) => handleFilterChange('fundraiserName', e.target.value)}
              placeholder="Search fundraiser..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {(filters.status || filters.fundraiserName || filters.dateFrom || filters.dateTo) && (
          <div className="mt-4">
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          </h3>
          <p className="text-gray-600 mb-4">
            {orders.length === 0 
              ? 'Start supporting fundraisers to see your order history here.'
              : 'Try adjusting your filters to see more orders.'
            }
          </p>
          {orders.length === 0 && (
            <Link 
              to="/wholesale"
              className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Fundraisers
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(order.createdAt)} • {order.fundraiser.name}
                  </p>
                </div>
                
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    {formatCurrency(order.total)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Order Info */}
                <div>
                  <div className="text-sm text-gray-600">Items</div>
                  <div className="font-medium">
                    {order.uniqueItemCount} item{order.uniqueItemCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Participant Info */}
                <div>
                  <div className="text-sm text-gray-600">Supporting</div>
                  <div className="font-medium">
                    {order.participant ? order.participant.name : 'General Organization'}
                  </div>
                </div>

                {/* Payment Info */}
                <div>
                  <div className="text-sm text-gray-600">Payment</div>
                  <div className="font-medium">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      order.paymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-4">
                  <Link
                    to={`/wholesale/orders/${order.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Details
                  </Link>
                  
                  {order.status !== 'cancelled' && (
                    <button
                      onClick={() => handleReorder(order)}
                      className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                    >
                      Reorder Items
                    </button>
                  )}
                  
                  <Link
                    to={`/wholesale/${order.fundraiser.slug}`}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Visit Fundraiser
                  </Link>
                </div>

                {/* Status-specific actions */}
                {order.status === 'pending' && order.paymentStatus !== 'paid' && (
                  <div className="text-sm">
                    <span className="text-yellow-600">Payment required</span>
                  </div>
                )}
                
                {order.status === 'shipped' && (
                  <div className="text-sm">
                    <span className="text-blue-600">Track shipment</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{filteredOrders.length}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.total, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Spent</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {new Set(filteredOrders.map(order => order.fundraiser.id)).size}
              </div>
              <div className="text-sm text-gray-600">Fundraisers Supported</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}