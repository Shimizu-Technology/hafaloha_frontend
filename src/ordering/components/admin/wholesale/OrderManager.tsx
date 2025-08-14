// src/ordering/components/admin/wholesale/OrderManager.tsx

import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Eye,
  Package,
  AlertCircle,
  CheckSquare,
  Square
} from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';
import { apiClient } from '../../../../shared/api/apiClient';
import { WholesaleCollapsibleOrderCard } from './WholesaleCollapsibleOrderCard';
import { WholesaleOrderDetailsModal } from './WholesaleOrderDetailsModal';

interface WholesaleOrder {
  id: number;
  order_number: string;
  status?: 'pending' | 'fulfilled' | 'completed' | 'cancelled';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  fundraiser_name: string;
  participant_name?: string;
  total: number | string;
  item_count: number;
  unique_item_count: number;
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number | string;
    total: number | string;
    selected_options?: Record<string, any>;
    variant_description?: string;
  }>;
}

interface OrderManagerProps {
  restaurantId: string;
  fundraiserId?: number; // Optional for backwards compatibility
}

export function OrderManager({ restaurantId, fundraiserId }: OrderManagerProps) {
  // State management
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'total' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Order update state
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  
  // Bulk selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  
  // Order expansion state
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<number>>(new Set());

  // Load orders on component mount
  useEffect(() => {
    loadOrders();
  }, [restaurantId, fundraiserId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use apiClient for proper base URL and authentication
      let response;
      if (fundraiserId) {
        // Scoped mode: Load orders for specific fundraiser
        response = await apiClient.get(`/wholesale/admin/orders?fundraiser_id=${fundraiserId}`);
      } else {
        // Legacy mode: Load all orders (for backwards compatibility)
        response = await apiClient.get('/wholesale/admin/orders');
      }
      
      // Extract orders from API response, default to empty array
      const orders = response.data.success ? (response.data.data?.orders || []) : [];
      setOrders(orders);
      
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders');
      toastUtils.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      setUpdatingOrderId(orderId);
      
      await apiClient.patch(`/wholesale/admin/orders/${orderId}/update_status`, { status: newStatus });
      
      toastUtils.success(`Order status updated to ${newStatus}`);
      loadOrders();
      
    } catch (err) {
      console.error('Error updating order status:', err);
      toastUtils.error('Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };



  const bulkUpdateStatus = async (orderIds: number[], newStatus: string) => {
    try {
      await apiClient.patch('/wholesale/admin/orders/bulk_update_status', { 
        order_ids: orderIds, 
        status: newStatus 
      });
      
      toastUtils.success(`Updated ${orderIds.length} orders to ${newStatus}`);
      setSelectedOrderIds([]);
      loadOrders();
      
    } catch (err) {
      console.error('Error bulk updating orders:', err);
      toastUtils.error('Failed to bulk update orders');
    }
  };

  

  const toggleSelectAll = () => {
    // We need to get the paginated orders here, but they're calculated below
    // For now, let's use a simpler approach
    const visibleOrderIds = paginatedOrders.map(order => order.id);
    const allSelected = visibleOrderIds.every(id => selectedOrderIds.includes(id));
    
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !visibleOrderIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => [...new Set([...prev, ...visibleOrderIds])]);
    }
  };

  const clearSelection = () => {
    setSelectedOrderIds([]);
  };

  const exportOrders = async () => {
    try {
      const response = await apiClient.get('/wholesale/admin/orders/export_all', {
        responseType: 'blob'
      });
      
      // Handle file download - response.data is already the blob when responseType is 'blob'
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wholesale-orders-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toastUtils.success('Orders exported successfully');
    } catch (err) {
      console.error('Error exporting orders:', err);
      toastUtils.error('Failed to export orders');
    }
  };

  const viewOrderDetails = (order: WholesaleOrder) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // Order expansion handlers
  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const isOrderExpanded = (orderId: number) => expandedOrderIds.has(orderId);

  // Action buttons renderer for cards
  const renderOrderActions = (order: WholesaleOrder) => {
    const getNextStatusButton = () => {
      switch (order.status) {
        case 'pending':
          return (
            <button
              onClick={() => updateOrderStatus(order.id, 'fulfilled')}
              disabled={updatingOrderId === order.id}
              className="px-3 py-1 text-sm text-green-600 hover:text-green-900 border border-green-300 rounded-md hover:bg-green-50 disabled:opacity-50"
              title="Mark as Ready for Pickup"
            >
              {updatingOrderId === order.id ? 'Updating...' : 'Ready for Pickup'}
            </button>
          );
        case 'fulfilled':
          return (
            <button
              onClick={() => updateOrderStatus(order.id, 'completed')}
              disabled={updatingOrderId === order.id}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-900 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
              title="Mark as Completed"
            >
              {updatingOrderId === order.id ? 'Updating...' : 'Complete Order'}
            </button>
          );
        default:
          return null;
      }
    };

    return (
      <div className="flex items-center justify-end space-x-2">
        <button
          onClick={() => viewOrderDetails(order)}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
          title="View Details"
        >
          <Eye className="w-4 h-4 inline mr-1" />
          View Details
        </button>
        {getNextStatusButton()}
      </div>
    );
  };

  // Filter and sort orders
  const filteredAndSortedOrders = orders
    .filter(order => {
      const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           order.fundraiser_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter;
      
      // Date filtering logic
      let matchesDate = true;
      if (dateRange !== 'all') {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateRange) {
          case 'today':
            matchesDate = daysDiff === 0;
            break;
          case 'week':
            matchesDate = daysDiff <= 7;
            break;
          case 'month':
            matchesDate = daysDiff <= 30;
            break;
          default:
            matchesDate = true;
        }
      }
      
      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Pagination logic
  const totalOrders = filteredAndSortedOrders.length;
  const totalPages = Math.ceil(totalOrders / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredAndSortedOrders.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amount: number | string | undefined) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount === undefined || numAmount === null || isNaN(numAmount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'fulfilled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-600 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Orders</h3>
        <p className="text-red-700 mb-4">{error}</p>
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
    <div className="order-manager">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Order Management</h2>
          <p className="text-gray-600">Process and fulfill wholesale orders</p>
        </div>
        
        <button
          onClick={exportOrders}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Orders
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="fulfilled">Ready for Pickup</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Date range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          {/* Sort options */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="total-desc">Highest Value</option>
            <option value="total-asc">Lowest Value</option>
            <option value="status-asc">Status A-Z</option>
          </select>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedOrderIds.length} order{selectedOrderIds.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-700 hover:text-blue-900"
              >
                Clear selection
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-700">Update status to:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    bulkUpdateStatus(selectedOrderIds, e.target.value);
                    e.target.value = ''; // Reset dropdown
                  }
                }}
                className="text-sm border-blue-300 rounded px-2 py-1"
                defaultValue=""
              >
                <option value="">Select status...</option>
                <option value="pending">Pending</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Orders list */}
      <div className="space-y-4">
        {paginatedOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || dateRange !== 'all' ? 'No orders found' : 'No orders yet'}
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || dateRange !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : fundraiserId 
                  ? 'No orders have been placed for this fundraiser yet'
                  : 'Orders will appear here once customers start placing them'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Select All Header */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-400 hover:text-gray-600 flex items-center space-x-2"
                  >
                    {paginatedOrders.length > 0 && paginatedOrders.every(order => selectedOrderIds.includes(order.id)) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {paginatedOrders.length > 0 && paginatedOrders.every(order => selectedOrderIds.includes(order.id))
                        ? 'Deselect All'
                        : 'Select All'
                      }
                    </span>
                  </button>
                  {selectedOrderIds.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {selectedOrderIds.length} order{selectedOrderIds.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {paginatedOrders.length} order{paginatedOrders.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Order Cards */}
            <div className="space-y-4">
              {paginatedOrders.map((order) => (
                <WholesaleCollapsibleOrderCard
                  key={order.id}
                  order={order}
                  isExpanded={isOrderExpanded(order.id)}
                  onToggleExpand={() => toggleOrderExpansion(order.id)}
                  isNew={false}
                  isSelected={selectedOrderIds.includes(order.id)}
                  onSelectChange={(selected) => {
                    if (selected) {
                      setSelectedOrderIds(prev => [...prev, order.id]);
                    } else {
                      setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                    }
                  }}
                  renderActions={renderOrderActions}
                  getStatusColor={getStatusColor}
                  getPaymentStatusColor={getPaymentStatusColor}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-lg shadow-sm border px-4 py-3 flex items-center justify-between sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalOrders)}</span> of{' '}
                      <span className="font-medium">{totalOrders}</span> orders
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <WholesaleOrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowOrderModal(false)}
          onOrderUpdate={(updatedOrder) => {
            // Update the order in the local state
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
            setSelectedOrder(updatedOrder);
          }}
        />
      )}
    </div>
  );
}

export default OrderManager;