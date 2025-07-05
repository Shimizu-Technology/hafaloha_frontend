// src/ordering/components/admin/reports/PaymentMethodReport.tsx
import React, { useState, useMemo } from 'react';
import { PaymentMethodReport as PaymentMethodReportType, PaymentMethodOrderDetail } from '../../../../shared/api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

// Simplified color palette
const COLORS = [
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16'  // Lime
];

interface PaymentMethodReportProps {
  paymentMethods: PaymentMethodReportType[];
  totalAmount: number;
  totalCount: number;
  detailedOrders: PaymentMethodOrderDetail[];
}

// Comprehensive Order Card Component for Payment Methods
interface PaymentOrderCardProps {
  order: PaymentMethodOrderDetail;
  orderIndex: number;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getCustomerType: (order: PaymentMethodOrderDetail) => 'guest' | 'registered' | 'staff';
}

function PaymentOrderCard({ order, orderIndex, formatCurrency, formatDate, getCustomerType }: PaymentOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const customerType = getCustomerType(order);

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'staff': return 'bg-green-100 text-green-800';
      case 'registered': return 'bg-blue-100 text-blue-800';
      case 'guest': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderCustomerInfo = () => {
    if (customerType === 'staff') {
      return (
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900">
            {order.staff_member_name || order.created_by_staff_name || order.created_by_user_name || 'Staff Member'}
          </div>
          <div className="text-xs text-gray-600">Staff Order</div>
        </div>
      );
    } else {
      return (
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900">
            {order.customer_name || 'Guest Customer'}
          </div>
          <div className="text-xs text-gray-600">
            {order.customer_email && <div className="break-all">{order.customer_email}</div>}
            {order.customer_phone && <div>{order.customer_phone}</div>}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200">
      {/* Compact Order Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-medium">
              {orderIndex + 1}
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                <span className="font-medium text-gray-900">{order.order_number}</span>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getCustomerTypeColor(customerType)}`}>
                  {customerType === 'staff' ? '👥 Staff' : customerType === 'registered' ? '👤 Registered' : '🏃 Guest'}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {formatCurrency(order.payment_amount)} • {formatDate(order.created_at)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.payment_status)}`}>
              {order.payment_status}
            </span>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <span className="transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Order Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer/Staff Information */}
            <div className="bg-white rounded-lg p-3">
              <h5 className="font-medium text-gray-900 mb-2">Customer Information</h5>
              {renderCustomerInfo()}
            </div>

            {/* Payment Details */}
            <div className="bg-white rounded-lg p-3">
              <h5 className="font-medium text-gray-900 mb-2">Payment Details</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{formatCurrency(order.payment_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Total:</span>
                  <span className="font-medium">{formatCurrency(order.order_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Amount:</span>
                  <span className="font-medium">{formatCurrency(order.net_amount)}</span>
                </div>
                {order.transaction_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-xs">{order.transaction_id}</span>
                  </div>
                )}
                {order.cash_received && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash Received:</span>
                      <span className="font-medium">{formatCurrency(order.cash_received)}</span>
                    </div>
                    {order.change_due && order.change_due > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Change Due:</span>
                        <span className="font-medium">{formatCurrency(order.change_due)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="bg-white rounded-lg p-3">
            <h5 className="font-medium text-gray-900 mb-2">Order Information</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.order_status)}`}>
                  {order.order_status}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2 font-medium">{formatDate(order.created_at)}</span>
              </div>
              {order.estimated_pickup_time && (
                <div>
                  <span className="text-gray-600">Pickup Time:</span>
                  <span className="ml-2 font-medium">{formatDate(order.estimated_pickup_time)}</span>
                </div>
              )}
              {order.location_name && (
                <div>
                  <span className="text-gray-600">Location:</span>
                  <span className="ml-2 font-medium">{order.location_name}</span>
                </div>
              )}
              {order.vip_code && (
                <div>
                  <span className="text-gray-600">VIP Code:</span>
                  <span className="ml-2 font-mono text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">{order.vip_code}</span>
                </div>
              )}
              {order.special_instructions && (
                <div className="col-span-full">
                  <span className="text-gray-600">Special Instructions:</span>
                  <p className="ml-2 text-gray-800 italic">{order.special_instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Refund Information */}
          {order.has_refunds && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h5 className="font-medium text-red-900 mb-2">⚠️ Refund Information</h5>
              <div className="text-sm text-red-800">
                <div className="flex justify-between">
                  <span>Total Refunded:</span>
                  <span className="font-medium">{formatCurrency(order.total_refunded)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Amount:</span>
                  <span className="font-medium">{formatCurrency(order.net_amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PaymentMethodReport({ paymentMethods, totalAmount, totalCount, detailedOrders }: PaymentMethodReportProps) {
  const [sortBy, setSortBy] = useState<'amount' | 'count' | 'name'>('amount');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showDetailedOrders, setShowDetailedOrders] = useState(false);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Helper to handle filter changes and reset pagination
  const handleMethodFilterChange = (value: string) => {
    setSelectedMethod(value);
    setCurrentPage(1);
  };

  const handleCustomerTypeFilterChange = (value: string) => {
    setCustomerTypeFilter(value);
    setCurrentPage(1);
  };

  // Helper to toggle method expansion
  const toggleMethodExpansion = (methodName: string) => {
    setExpandedMethods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(methodName)) {
        newSet.delete(methodName);
      } else {
        newSet.add(methodName);
      }
      return newSet;
    });
  };

  // Helper function to format payment method names
  const formatMethodName = (method: string): string => {
    return method
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

  // Helper function to format dates
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      timeZone: 'Pacific/Guam',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to determine customer type
  const getCustomerType = (order: PaymentMethodOrderDetail): 'guest' | 'registered' | 'staff' => {
    if (order.is_staff_order) return 'staff';
    return order.customer_name ? 'registered' : 'guest';
  };

  // Sort payment methods
  const sortedPaymentMethods = [...paymentMethods].sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return Number(b.amount) - Number(a.amount);
      case 'count':
        return Number(b.count) - Number(a.count);
      case 'name':
        return formatMethodName(a.payment_method).localeCompare(formatMethodName(b.payment_method));
      default:
        return 0;
    }
  });

  // Enhanced data for each payment method with orders
  const enhancedPaymentMethods = useMemo(() => {
    return sortedPaymentMethods.map(method => {
      const orders = detailedOrders.filter(order => order.payment_method === method.payment_method);
      
      // Calculate customer type breakdown
      const customerTypeStats = {
        staff: orders.filter(o => getCustomerType(o) === 'staff').length,
        registered: orders.filter(o => getCustomerType(o) === 'registered').length,
        guest: orders.filter(o => getCustomerType(o) === 'guest').length
      };

      return {
        ...method,
        orders,
        customerTypeStats,
        averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.order_total, 0) / orders.length : 0,
        totalRefunded: orders.reduce((sum, o) => sum + o.total_refunded, 0)
      };
    });
  }, [sortedPaymentMethods, detailedOrders]);

  // Filter orders based on selected payment method and customer type
  const filteredOrders = useMemo(() => {
    let orders = detailedOrders;

    if (selectedMethod !== 'all') {
      orders = orders.filter(order => order.payment_method === selectedMethod);
    }

    if (customerTypeFilter !== 'all') {
      orders = orders.filter(order => getCustomerType(order) === customerTypeFilter);
    }

    return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [detailedOrders, selectedMethod, customerTypeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Summary data
    const summaryData = [
      { 'Metric': 'Total Transactions', 'Value': totalCount },
      { 'Metric': 'Total Revenue', 'Value': `$${Number(totalAmount).toFixed(2)}` },
      { 'Metric': 'Average Transaction Value', 'Value': totalCount > 0 ? `$${(Number(totalAmount) / totalCount).toFixed(2)}` : '$0.00' }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Payment method breakdown
    const methodData = enhancedPaymentMethods.map(method => ({
      'Payment Method': formatMethodName(method.payment_method),
      'Transaction Count': method.count,
      'Total Amount': `$${Number(method.amount).toFixed(2)}`,
      'Percentage of Revenue': `${Number(method.percentage).toFixed(2)}%`,
      'Average Transaction': `$${(Number(method.amount) / method.count).toFixed(2)}`,
      'Staff Orders': method.customerTypeStats.staff,
      'Registered Customer Orders': method.customerTypeStats.registered,
      'Guest Orders': method.customerTypeStats.guest,
      'Total Refunded': `$${method.totalRefunded.toFixed(2)}`
    }));
    
    const methodSheet = XLSX.utils.json_to_sheet(methodData);
    XLSX.utils.book_append_sheet(workbook, methodSheet, 'Payment Methods');

    // Detailed orders
    const orderData = detailedOrders.map(order => ({
      'Payment Method': formatMethodName(order.payment_method),
      'Order Number': order.order_number,
      'Customer Name': order.customer_name || (order.is_staff_order ? (order.staff_member_name || 'Staff') : 'Guest'),
      'Customer Type': getCustomerType(order),
      'Customer Email': order.customer_email || 'N/A',
      'Customer Phone': order.customer_phone || 'N/A',
      'Payment Amount': `$${order.payment_amount.toFixed(2)}`,
      'Order Total': `$${order.order_total.toFixed(2)}`,
      'Payment Status': order.payment_status,
      'Order Status': order.order_status,
      'Created Date': formatDate(order.created_at),
      'Location': order.location_name || 'N/A',
      'VIP Code': order.vip_code || 'N/A',
      'Transaction ID': order.transaction_id || 'N/A',
      'Has Refunds': order.has_refunds ? 'Yes' : 'No',
      'Total Refunded': `$${order.total_refunded.toFixed(2)}`,
      'Net Amount': `$${order.net_amount.toFixed(2)}`
    }));
    
    const ordersSheet = XLSX.utils.json_to_sheet(orderData);
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Detailed Orders');

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    XLSX.writeFile(workbook, `payment_methods_comprehensive_report_${timestamp}.xlsx`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Header */}
      <div className="px-3 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Payment Method Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount} transactions • ${Number(totalAmount).toFixed(2)} total revenue • {detailedOrders.length} detailed orders
            </p>
          </div>
          
          {paymentMethods.length > 0 && (
            <button
              onClick={exportToExcel}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-base sm:text-sm"
            >
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </div>

      {paymentMethods.length > 0 ? (
        <div className="p-3 sm:p-6">
          {/* Enhanced Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            {/* Sort Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'amount', label: 'Revenue' },
                  { key: 'count', label: 'Transactions' },
                  { key: 'name', label: 'Name' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key as typeof sortBy)}
                    className={`px-4 py-2 sm:px-3 sm:py-1 rounded text-base sm:text-sm transition-colors ${
                      sortBy === key
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
            >
              {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
              <h4 className="font-medium text-gray-900">Advanced Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={selectedMethod}
                    onChange={(e) => handleMethodFilterChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="all">All Methods</option>
                    {paymentMethods.map(method => (
                      <option key={method.payment_method} value={method.payment_method}>
                        {formatMethodName(method.payment_method)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
                  <select
                    value={customerTypeFilter}
                    onChange={(e) => handleCustomerTypeFilterChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="all">All Customer Types</option>
                    <option value="staff">Staff Orders</option>
                    <option value="registered">Registered Customers</option>
                    <option value="guest">Guest Orders</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Payment Method Cards */}
          <div className="space-y-3 mb-8">
            {enhancedPaymentMethods.map((method, index) => {
              const percentage = Number(method.percentage);
              const amount = Number(method.amount);
              const isExpanded = expandedMethods.has(method.payment_method);
              const methodOrders = method.orders.filter(order => {
                if (customerTypeFilter !== 'all' && getCustomerType(order) !== customerTypeFilter) return false;
                return true;
              });
              
              return (
                <div
                  key={method.payment_method}
                  className="border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
                >
                  {/* Compact Header - Always Visible */}
                  <div 
                    className="p-3 sm:p-4 cursor-pointer"
                    onClick={() => toggleMethodExpansion(method.payment_method)}
                  >
                    {/* Mobile-First Layout */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      {/* Left Section: Method info + Mobile metrics */}
                      <div className="flex-1">
                        {/* Method Name Row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-medium">
                              {index + 1}
                            </div>
                            <h4 className="font-semibold text-gray-900 text-base sm:text-lg">
                              {formatMethodName(method.payment_method)}
                            </h4>
                          </div>
                          <span className="text-xl sm:text-2xl font-bold text-gray-900">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        
                        {/* Metrics - Stack on mobile, inline on desktop */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center sm:space-x-6 gap-2 sm:gap-0 text-sm text-gray-600">
                          <div className="font-medium">
                            <span className="text-orange-600">{method.count}</span>
                            <span className="text-xs ml-1">transactions</span>
                          </div>
                          <div className="font-medium">
                            <span className="text-green-600">${amount.toFixed(2)}</span>
                            <span className="text-xs ml-1">revenue</span>
                          </div>
                          <div className="font-medium">
                            <span className="text-blue-600">${method.averageOrderValue.toFixed(2)}</span>
                            <span className="text-xs ml-1">avg</span>
                          </div>
                          {method.totalRefunded > 0 && (
                            <div className="font-medium">
                              <span className="text-red-600">${method.totalRefunded.toFixed(2)}</span>
                              <span className="text-xs ml-1">refunded</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Right Section: Progress & Controls */}
                      <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                        {/* Quick Customer Type Summary - Desktop Only */}
                        <div className="hidden lg:flex items-center space-x-3 text-xs">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{method.customerTypeStats.staff}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>{method.customerTypeStats.registered}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            <span>{method.customerTypeStats.guest}</span>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-20 sm:w-16 lg:w-20 h-3 bg-gray-200 rounded-full">
                          <div
                            className="h-3 bg-orange-500 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        
                        {/* Expand/Collapse Icon */}
                        <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                          <span className="transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            ▼
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                      {/* Customer Type Breakdown - Detailed */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                        <div className="bg-white rounded-lg p-3 text-center">
                          <div className="text-xl sm:text-2xl font-bold text-green-600">{method.customerTypeStats.staff}</div>
                          <div className="text-xs sm:text-sm text-gray-600">Staff Orders</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {method.customerTypeStats.staff > 0 ? 
                              `${((method.customerTypeStats.staff / method.count) * 100).toFixed(1)}%` : '0%'
                            }
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <div className="text-xl sm:text-2xl font-bold text-blue-600">{method.customerTypeStats.registered}</div>
                          <div className="text-xs sm:text-sm text-gray-600">Registered</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {method.customerTypeStats.registered > 0 ? 
                              `${((method.customerTypeStats.registered / method.count) * 100).toFixed(1)}%` : '0%'
                            }
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <div className="text-xl sm:text-2xl font-bold text-amber-600">{method.customerTypeStats.guest}</div>
                          <div className="text-xs sm:text-sm text-gray-600">Guest Orders</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {method.customerTypeStats.guest > 0 ? 
                              `${((method.customerTypeStats.guest / method.count) * 100).toFixed(1)}%` : '0%'
                            }
                          </div>
                        </div>
                      </div>

                      {/* Recent Transactions for this Payment Method */}
                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">
                            Recent Transactions ({methodOrders.length})
                          </h5>
                          {methodOrders.length > 5 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMethod(method.payment_method);
                                setShowDetailedOrders(true);
                                setShowAdvancedFilters(true);
                              }}
                              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                            >
                              View All →
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {methodOrders.slice(0, 5).map((order, orderIdx) => {
                            const customerType = getCustomerType(order);
                            return (
                              <div key={order.order_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                    customerType === 'staff' ? 'bg-green-100 text-green-700' :
                                    customerType === 'registered' ? 'bg-blue-100 text-blue-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {customerType === 'staff' ? '👥' : customerType === 'registered' ? '👤' : '🏃'}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 text-sm">{order.order_number}</div>
                                    <div className="text-xs text-gray-600">
                                      {order.customer_name || order.staff_member_name || 'Guest'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-gray-900">{formatCurrency(order.payment_amount)}</div>
                                  <div className="text-xs text-gray-600">{formatDate(order.created_at).split(',')[0]}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detailed Orders Section - Show when requested */}
          {showDetailedOrders && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 mb-2 sm:mb-0">
                  Detailed Payment Transactions
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({filteredOrders.length} {selectedMethod !== 'all' ? `${formatMethodName(selectedMethod)} ` : ''}transactions)
                  </span>
                </h4>
                <button
                  onClick={() => setShowDetailedOrders(false)}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Hide Details ↑
                </button>
              </div>

              {/* Orders List */}
              <div className="space-y-3 mb-4">
                {paginatedOrders.map((order, orderIdx) => (
                  <PaymentOrderCard
                    key={order.order_id}
                    order={order}
                    orderIndex={(currentPage - 1) * ordersPerPage + orderIdx}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                    getCustomerType={getCustomerType}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * ordersPerPage) + 1} to {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="min-w-[40px] sm:min-w-0 px-4 py-3 sm:px-3 sm:py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">←</span>
                    </button>
                    
                    <span className="px-4 py-3 sm:px-3 sm:py-2 text-sm font-medium text-gray-700">
                      {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="min-w-[40px] sm:min-w-0 px-4 py-3 sm:px-3 sm:py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show All Transactions Button */}
          {!showDetailedOrders && (
            <div className="text-center mb-6">
              <button
                onClick={() => setShowDetailedOrders(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                View All Transactions ({filteredOrders.length})
              </button>
            </div>
          )}

          {/* Pie Chart */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-6">
            <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Revenue Distribution</h4>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods.map(method => ({
                      ...method,
                      amount: Number(method.amount),
                      name: formatMethodName(method.payment_method)
                    }))}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({name, percent}) => `${(percent * 100).toFixed(1)}%`}
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-1">No Payment Data</h4>
          <p className="text-gray-500">Payment method breakdown will appear here once transactions are processed.</p>
        </div>
      )}
    </div>
  );
}