import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import {
  RefundDetail,
  RefundsByMethod,
  RefundDailyTrend,
  RefundSummary
} from '../../../../shared/api/endpoints/reports';

interface RefundsReportProps {
  summary: RefundSummary;
  refundsByMethod: RefundsByMethod[];
  dailyTrends: RefundDailyTrend[];
  refundDetails: RefundDetail[];
}

interface RefundOrderCardProps {
  refund: RefundDetail;
  refundIndex: number;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  formatDateTime: (dateString: string) => string;
}

function RefundOrderCard({ refund, refundIndex, formatCurrency, formatDate, formatDateTime }: RefundOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMethodName = (method: string): string => {
    return method
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const refundPercentage = refund.original_order_total > 0 
    ? (refund.amount / refund.original_order_total) * 100 
    : 0;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      {/* Main Refund Info */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-sm font-medium">
              #{refundIndex + 1}
            </div>
            <div>
              <span className="font-semibold text-gray-900">{refund.order_number}</span>
              <span className="text-sm text-gray-500 ml-2">
                {formatMethodName(refund.payment_method)}
              </span>
            </div>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(refund.status)}`}>
              {refund.status}
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Customer: {refund.customer_name || 'N/A'}</span>
              <span className="font-medium">
                {refundPercentage.toFixed(1)}% of order refunded
              </span>
            </div>
            {refund.customer_email && (
              <div>Email: <span className="break-all">{refund.customer_email}</span></div>
            )}
            <div>Date: {formatDateTime(refund.created_at)}</div>
            {refund.description && (
              <div>Reason: <span className="italic">{refund.description}</span></div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="font-bold text-xl text-red-600">
            {formatCurrency(refund.amount)}
          </div>
          <div className="text-sm text-gray-500">
            of {formatCurrency(refund.original_order_total)}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium mt-1"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 mb-2">Order Information</h5>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Order ID: #{refund.order_id}</div>
                <div>Original Total: {formatCurrency(refund.original_order_total)}</div>
                <div>Refund Amount: {formatCurrency(refund.amount)}</div>
                <div>Net Amount: {formatCurrency(refund.original_order_total - refund.amount)}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 mb-2">Refund Details</h5>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Status: <span className={`font-medium ${
                  refund.status === 'completed' ? 'text-green-600' : 
                  refund.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                }`}>{refund.status}</span></div>
                <div>Payment Method: {formatMethodName(refund.payment_method)}</div>
                <div>Processed: {formatDate(refund.created_at)}</div>
              </div>
            </div>
          </div>

          {refund.refunded_items && refund.refunded_items.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 mb-2">Refunded Items</h5>
              <div className="space-y-1 text-sm text-gray-600">
                {refund.refunded_items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.name || 'Item'}</span>
                    <span>Qty: {item.quantity || 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];

export function RefundsReport({ 
  summary, 
  refundsByMethod, 
  dailyTrends, 
  refundDetails 
}: RefundsReportProps) {
  const [showDetailedRefunds, setShowDetailedRefunds] = useState(false);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const refundsPerPage = 10;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount));
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return '0.0';
    }
    return Number(value).toFixed(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMethodName = (method: string): string => {
    return method
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter refunds based on selected criteria
  const filteredRefunds = useMemo(() => {
    let refunds = refundDetails;

    if (selectedMethod !== 'all') {
      refunds = refunds.filter(refund => refund.payment_method === selectedMethod);
    }

    if (statusFilter !== 'all') {
      refunds = refunds.filter(refund => refund.status === statusFilter);
    }

    return refunds.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [refundDetails, selectedMethod, statusFilter]);

  // Enhanced payment methods with refund details
  const enhancedRefundMethods = useMemo(() => {
    return refundsByMethod.map(method => {
      const methodRefunds = refundDetails.filter(refund => refund.payment_method === method.payment_method);
      
      // Calculate status breakdown
      const statusStats = {
        completed: methodRefunds.filter(r => r.status === 'completed').length,
        pending: methodRefunds.filter(r => r.status === 'pending').length,
        failed: methodRefunds.filter(r => r.status === 'failed').length,
        cancelled: methodRefunds.filter(r => r.status === 'cancelled').length
      };

      return {
        ...method,
        refunds: methodRefunds,
        statusStats,
        averageRefundAmount: methodRefunds.length > 0 ? methodRefunds.reduce((sum, r) => sum + r.amount, 0) / methodRefunds.length : 0
      };
    });
  }, [refundsByMethod, refundDetails]);

  // Pagination
  const totalPages = Math.ceil(filteredRefunds.length / refundsPerPage);
  const paginatedRefunds = filteredRefunds.slice(
    (currentPage - 1) * refundsPerPage,
    currentPage * refundsPerPage
  );

  // Helper functions
  const handleMethodFilterChange = (value: string) => {
    setSelectedMethod(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

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

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Summary data
    const summaryData = [
      { 'Metric': 'Total Refunds Count', 'Value': summary.total_refunds_count },
      { 'Metric': 'Total Refund Amount', 'Value': `$${Number(summary.total_refund_amount).toFixed(2)}` },
      { 'Metric': 'Average Refund Amount', 'Value': `$${Number(summary.average_refund_amount).toFixed(2)}` },
      { 'Metric': 'Refund Rate by Orders', 'Value': `${Number(summary.refund_rate_by_orders).toFixed(2)}%` },
      { 'Metric': 'Refund Rate by Amount', 'Value': `${Number(summary.refund_rate_by_amount).toFixed(2)}%` },
      { 'Metric': 'Total Orders in Period', 'Value': summary.total_orders_in_period },
      { 'Metric': 'Total Revenue in Period', 'Value': `$${Number(summary.total_revenue_in_period).toFixed(2)}` }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Refunds Summary');

    // Payment method breakdown
    const methodData = enhancedRefundMethods.map(method => ({
      'Payment Method': formatMethodName(method.payment_method),
      'Refund Count': method.count,
      'Total Amount': `$${Number(method.amount).toFixed(2)}`,
      'Percentage of Total': `${Number(method.percentage).toFixed(2)}%`,
      'Average Refund': `$${method.averageRefundAmount.toFixed(2)}`,
      'Completed': method.statusStats.completed,
      'Pending': method.statusStats.pending,
      'Failed': method.statusStats.failed,
      'Cancelled': method.statusStats.cancelled
    }));
    
    const methodSheet = XLSX.utils.json_to_sheet(methodData);
    XLSX.utils.book_append_sheet(workbook, methodSheet, 'Refunds by Method');

    // Detailed refunds
    const refundData = refundDetails.map(refund => ({
      'Order Number': refund.order_number,
      'Customer Name': refund.customer_name || 'N/A',
      'Customer Email': refund.customer_email || 'N/A',
      'Refund Amount': `$${refund.amount.toFixed(2)}`,
      'Original Order Total': `$${refund.original_order_total.toFixed(2)}`,
      'Refund Percentage': `${((refund.amount / refund.original_order_total) * 100).toFixed(1)}%`,
      'Payment Method': formatMethodName(refund.payment_method),
      'Status': refund.status,
      'Description': refund.description || 'N/A',
      'Refund Date': formatDateTime(refund.created_at),
      'Net Amount': `$${(refund.original_order_total - refund.amount).toFixed(2)}`
    }));
    
    const refundsSheet = XLSX.utils.json_to_sheet(refundData);
    XLSX.utils.book_append_sheet(workbook, refundsSheet, 'Detailed Refunds');

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    XLSX.writeFile(workbook, `refunds_comprehensive_report_${timestamp}.xlsx`);
  };

  if (summary.total_refunds_count === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-3 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Refunds Analytics</h3>
          <p className="text-sm text-gray-500 mt-1">
            No refunds processed in the selected period
          </p>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">No refunds in this period</p>
            <p className="text-gray-600">Great job! No refunds were processed during the selected time range.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Header */}
      <div className="px-3 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Refunds Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">
              {summary.total_refunds_count} refunds • {formatCurrency(summary.total_refund_amount)} total • {refundDetails.length} detailed records
            </p>
          </div>
          
          {refundsByMethod.length > 0 && (
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

      <div className="p-3 sm:p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-800">Refund Rate</p>
                <p className="text-2xl font-bold text-red-600">{formatPercentage(summary.refund_rate_by_orders)}%</p>
                <p className="text-xs text-red-600">{formatPercentage(summary.refund_rate_by_amount)}% by amount</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-800">Avg. Refund</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.average_refund_amount)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-800">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{summary.total_orders_in_period}</p>
                <p className="text-xs text-blue-600">{formatCurrency(summary.total_revenue_in_period)} revenue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm text-gray-600">Quick Actions:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowDetailedRefunds(!showDetailedRefunds)}
                className="px-4 py-2 sm:px-3 sm:py-1 rounded text-base sm:text-sm transition-colors bg-orange-100 text-orange-700 hover:bg-orange-200"
              >
                {showDetailedRefunds ? 'Hide' : 'Show'} All Refunds
              </button>
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
                  {refundsByMethod.map(method => (
                    <option key={method.payment_method} value={method.payment_method}>
                      {formatMethodName(method.payment_method)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Refund Method Cards */}
        <div className="space-y-3 mb-8">
          {enhancedRefundMethods.map((method, index) => {
            const percentage = Number(method.percentage);
            const amount = Number(method.amount);
            const isExpanded = expandedMethods.has(method.payment_method);
            const methodRefunds = method.refunds.filter(refund => {
              if (statusFilter !== 'all' && refund.status !== statusFilter) return false;
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
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-medium">
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
                          <span className="text-red-600">{method.count}</span>
                          <span className="text-xs ml-1">refunds</span>
                        </div>
                        <div className="font-medium">
                          <span className="text-orange-600">{formatCurrency(amount)}</span>
                          <span className="text-xs ml-1">total</span>
                        </div>
                        <div className="font-medium col-span-2 sm:col-span-1">
                          <span className="text-blue-600">{formatCurrency(method.averageRefundAmount)}</span>
                          <span className="text-xs ml-1">avg</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Section: Progress & Controls */}
                    <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                      {/* Quick Status Summary - Desktop Only */}
                      <div className="hidden lg:flex items-center space-x-3 text-xs">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{method.statusStats.completed}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>{method.statusStats.pending}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>{method.statusStats.failed}</span>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-20 sm:w-16 lg:w-20 h-3 bg-gray-200 rounded-full">
                        <div
                          className="h-3 bg-red-500 rounded-full transition-all duration-300"
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
                    {/* Status Breakdown - Detailed */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{method.statusStats.completed}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Completed</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {method.statusStats.completed > 0 ? 
                            `${((method.statusStats.completed / method.count) * 100).toFixed(1)}%` : '0%'
                          }
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600">{method.statusStats.pending}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Pending</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {method.statusStats.pending > 0 ? 
                            `${((method.statusStats.pending / method.count) * 100).toFixed(1)}%` : '0%'
                          }
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-red-600">{method.statusStats.failed}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Failed</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {method.statusStats.failed > 0 ? 
                            `${((method.statusStats.failed / method.count) * 100).toFixed(1)}%` : '0%'
                          }
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-gray-600">{method.statusStats.cancelled}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Cancelled</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {method.statusStats.cancelled > 0 ? 
                            `${((method.statusStats.cancelled / method.count) * 100).toFixed(1)}%` : '0%'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Recent Refunds for this Payment Method */}
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900">
                          Recent Refunds ({methodRefunds.length})
                        </h5>
                        {methodRefunds.length > 5 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMethod(method.payment_method);
                              setShowDetailedRefunds(true);
                              setShowAdvancedFilters(true);
                            }}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            View All →
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {methodRefunds.slice(0, 5).map((refund, refundIdx) => (
                          <div key={refund.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                refund.status === 'completed' ? 'bg-green-100 text-green-700' :
                                refund.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {refund.status === 'completed' ? '✓' : refund.status === 'pending' ? '⏳' : '✗'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{refund.order_number}</div>
                                <div className="text-xs text-gray-600">
                                  {refund.customer_name || 'Guest'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-red-600">{formatCurrency(refund.amount)}</div>
                              <div className="text-xs text-gray-600">{formatDate(refund.created_at).split(',')[0]}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detailed Refunds Section - Show when requested */}
        {showDetailedRefunds && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900 mb-2 sm:mb-0">
                Detailed Refunds
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredRefunds.length} {selectedMethod !== 'all' ? `${formatMethodName(selectedMethod)} ` : ''}refunds)
                </span>
              </h4>
              <button
                onClick={() => setShowDetailedRefunds(false)}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Hide Details ↑
              </button>
            </div>

            {/* Refunds List */}
            <div className="space-y-3 mb-4">
              {paginatedRefunds.map((refund, refundIdx) => (
                <RefundOrderCard
                  key={refund.id}
                  refund={refund}
                  refundIndex={(currentPage - 1) * refundsPerPage + refundIdx}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  formatDateTime={formatDateTime}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * refundsPerPage) + 1} to {Math.min(currentPage * refundsPerPage, filteredRefunds.length)} of {filteredRefunds.length} refunds
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

        {/* Show All Refunds Button */}
        {!showDetailedRefunds && (
          <div className="text-center mb-6">
            <button
              onClick={() => setShowDetailedRefunds(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              View All Refunds ({filteredRefunds.length})
            </button>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Refunds by Payment Method */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Refunds by Payment Method</h4>
            {refundsByMethod.length > 0 ? (
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={refundsByMethod}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ payment_method, percentage }) => `${formatMethodName(payment_method)}: ${formatPercentage(percentage)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {refundsByMethod.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Payment Method: ${label}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No refund data available</p>
              </div>
            )}
          </div>

          {/* Daily Refund Trends */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Daily Refund Trends</h4>
            {dailyTrends.length > 0 ? (
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => formatDate(value)}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Refunds']}
                      labelFormatter={(label) => `Date: ${formatDate(label)}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#ff6b6b"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Refund Amount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No trend data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 