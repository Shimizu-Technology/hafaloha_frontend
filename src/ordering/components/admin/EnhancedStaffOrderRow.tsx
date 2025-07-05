import React, { useState } from 'react';

interface DetailedOrder {
  id: number;
  order_number: string;
  status: string;
  total: number;
  net_amount: number;
  payment_method: string;
  payment_status: string;
  payment_amount?: number;
  transaction_id?: string;
  created_at: string;
  estimated_pickup_time?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  special_instructions?: string;
  location_name?: string;
  location_address?: string;
  vip_code?: string;
  is_staff_order: boolean;
  staff_member_name?: string;
  created_by_staff_name?: string;
  created_by_user_name?: string;
  has_refunds: boolean;
  total_refunded: number;
  pre_discount_total?: number;
  discount_amount?: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    customizations?: any;
  }>;
  merchandise_items: Array<{
    name: string;
    quantity: number;
    price: number;
    customizations?: any;
  }>;
}

interface StaffOrderDetails {
  total_orders_for_staff: number;
  average_order_value: number;
  employee_name?: string;
  employee_email?: string;
}

interface EnhancedStaffOrderRowProps {
  staff: {
    user_id: number | null;
    user_name: string;
    user_email?: string;
    total_spent: number;
    order_count: number;
    items: Array<{
      name: string;
      quantity: number;
      customizations?: any;
    }>;
    order_type?: string;
    created_by_user_id?: number | null;
    detailed_orders?: DetailedOrder[];
    first_order_date?: string;
    last_order_date?: string;
    payment_methods_used?: string[];
    staff_order_details?: StaffOrderDetails;
  };
  index: number;
}

export function EnhancedStaffOrderRow({ staff, index }: EnhancedStaffOrderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'orders'>('summary');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const safeFormatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
    return formatCurrency(amount);
  };

  const safeFormatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const safeFormatDateOnly = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'ready': 'bg-green-100 text-green-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'refunded': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const paymentStyles = {
      'paid': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'failed': 'bg-red-100 text-red-800',
      'refunded': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentStyles[paymentStatus as keyof typeof paymentStyles] || 'bg-gray-100 text-gray-800'}`}>
        {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
      </span>
    );
  };

  const renderItemWithCustomizations = (item: { name: string; quantity: number; customizations?: any }) => {
    return (
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <span className="font-medium">{item.name}</span>
          {item.customizations && Object.keys(item.customizations).length > 0 && (
            <div className="ml-2 text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-200">
              {Object.entries(item.customizations).map(([group, selection], idx) => (
                <div key={idx}>
                  <span className="font-medium">{group}:</span> {Array.isArray(selection) ? selection.join(', ') : String(selection)}
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="text-gray-600 font-medium ml-2">×{item.quantity}</span>
      </div>
    );
  };

  const totalOrdersCount = staff.detailed_orders?.length || 0;
  const staffDetails = staff.staff_order_details;
  const employeeName = staffDetails?.employee_name || 'Unknown Employee';
  const employeeEmail = staffDetails?.employee_email || 'No email';

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Summary Row - Mobile Optimized */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {index + 1}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 text-base sm:text-lg">{staff.user_name}</h3>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Staff
                </span>
                <span className="hidden sm:inline">•</span>
                <span>{employeeName}</span>
                {employeeEmail && employeeEmail !== 'No email' && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-gray-500 text-xs sm:text-sm break-all">{employeeEmail}</span>
                  </>
                )}
              </div>
              
              {/* Summary Stats - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs text-gray-500 mt-2">
                <span>Total Orders: {totalOrdersCount}</span>
                <span className="hidden sm:inline">•</span>
                <span>Avg: {safeFormatCurrency(staffDetails?.average_order_value)}</span>
                {staff.payment_methods_used && staff.payment_methods_used.length > 0 && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span>Payment: {staff.payment_methods_used.join(', ')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end space-x-3">
            <div className="text-left sm:text-right">
              <div className="font-semibold text-gray-900 text-lg sm:text-xl">
                {safeFormatCurrency(staff.total_spent)}
              </div>
              <div className="text-sm text-gray-600">
                {staff.order_count} order{staff.order_count !== 1 ? 's' : ''}
              </div>
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 sm:p-1 text-gray-400 hover:text-gray-600 transition-colors min-w-[40px] sm:min-w-0"
              title={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              <svg 
                className={`w-5 h-5 sm:w-4 sm:h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Details - Mobile Optimized */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
          {/* View Mode Tabs - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <button
              onClick={() => setViewMode('summary')}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('orders')}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'orders'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Individual Orders ({totalOrdersCount})
            </button>
          </div>

          {/* Summary View - Mobile Optimized */}
          {viewMode === 'summary' && (
            <div className="space-y-4">
              {/* Staff Information - Mobile Optimized */}
              <div className="bg-white rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-3">Staff Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-gray-600 font-medium">Employee Name:</span>
                    <span className="sm:ml-2 font-medium">{employeeName}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-gray-600 font-medium">Employee Email:</span>
                    <span className="sm:ml-2 font-medium break-all">{employeeEmail}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-gray-600 font-medium">Total Staff Orders:</span>
                    <span className="sm:ml-2 font-medium">{staffDetails?.total_orders_for_staff || 0}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-gray-600 font-medium">Average Order Value:</span>
                    <span className="sm:ml-2 font-medium">{safeFormatCurrency(staffDetails?.average_order_value)}</span>
                  </div>
                </div>
              </div>

              {/* Order Summary - Mobile Optimized */}
              <div className="bg-white rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-gray-600 font-medium">Date Range:</span>
                    <span className="sm:ml-2 font-medium">
                      {safeFormatDateOnly(staff.first_order_date)} - {safeFormatDateOnly(staff.last_order_date)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-gray-600 font-medium">Payment Methods:</span>
                    <span className="sm:ml-2 font-medium">
                      {staff.payment_methods_used && staff.payment_methods_used.length > 0
                        ? staff.payment_methods_used.join(', ')
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-gray-600 font-medium">Total Spent:</span>
                    <span className="sm:ml-2 font-medium text-green-600">{safeFormatCurrency(staff.total_spent)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <span className="text-gray-600 font-medium">Total Orders:</span>
                    <span className="sm:ml-2 font-medium">{staff.order_count}</span>
                  </div>
                </div>
              </div>

              {/* Items Ordered - Mobile Optimized */}
              <div className="bg-white rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-3">Items Ordered</h4>
                <div className="space-y-2 text-sm">
                  {staff.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="p-3 bg-gray-50 rounded-lg">
                      {renderItemWithCustomizations(item)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Individual Orders View - Mobile Optimized */}
          {viewMode === 'orders' && (
            <div className="space-y-4">
              {staff.detailed_orders && staff.detailed_orders.length > 0 ? (
                staff.detailed_orders.map((order, orderIndex) => (
                  <div key={order.id} className="bg-white rounded-lg p-3 sm:p-4 border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-medium">
                          {orderIndex + 1}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">Order #{order.order_number}</h5>
                          <p className="text-sm text-gray-600">
                            <span className="sm:hidden">{safeFormatDate(order.created_at).split(',')[0]}</span>
                            <span className="hidden sm:inline">{safeFormatDate(order.created_at)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="font-semibold text-gray-900">
                          {safeFormatCurrency(order.total)}
                        </div>
                        {order.has_refunds && (
                          <div className="text-sm text-red-600">
                            -{safeFormatCurrency(order.total_refunded)} refunded
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm mb-3">
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2">{getStatusBadge(order.status)}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Payment:</span>
                        <span className="ml-2">{order.payment_method || 'N/A'}</span>
                        {order.payment_status && (
                          <span className="ml-2 block sm:inline sm:ml-2">{getPaymentStatusBadge(order.payment_status)}</span>
                        )}
                      </div>
                      {order.transaction_id && (
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-600">Transaction ID:</span>
                          <span className="ml-2 font-mono text-xs break-all">{order.transaction_id}</span>
                        </div>
                      )}
                      {order.estimated_pickup_time && (
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-600">Pickup Time:</span>
                          <span className="ml-2 text-xs sm:text-sm">{safeFormatDate(order.estimated_pickup_time)}</span>
                        </div>
                      )}
                    </div>

                    {/* Contact Info - Mobile Optimized */}
                    {(order.contact_name || order.contact_phone || order.contact_email) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm mb-3 p-3 bg-gray-50 rounded-lg">
                        {order.contact_name && (
                          <div className="flex flex-col sm:flex-row">
                            <span className="text-gray-600 font-medium">Contact:</span>
                            <span className="sm:ml-2 font-medium">{order.contact_name}</span>
                          </div>
                        )}
                        {order.contact_phone && (
                          <div className="flex flex-col sm:flex-row">
                            <span className="text-gray-600 font-medium">Phone:</span>
                            <span className="sm:ml-2 font-medium">{order.contact_phone}</span>
                          </div>
                        )}
                        {order.contact_email && (
                          <div className="flex flex-col sm:flex-row">
                            <span className="text-gray-600 font-medium">Email:</span>
                            <span className="sm:ml-2 font-medium break-all">{order.contact_email}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Special Info - Mobile Optimized */}
                    {(order.special_instructions || order.vip_code || order.location_name) && (
                      <div className="space-y-2 text-sm mb-3">
                        {order.special_instructions && (
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <span className="text-yellow-800 font-medium">Special Instructions:</span>
                            <span className="ml-2 text-yellow-700">{order.special_instructions}</span>
                          </div>
                        )}
                        {order.vip_code && (
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <span className="text-purple-800 font-medium">VIP Code:</span>
                            <span className="ml-2 text-purple-700">{order.vip_code}</span>
                          </div>
                        )}
                        {order.location_name && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <span className="text-blue-800 font-medium">Location:</span>
                            <span className="ml-2 text-blue-700">{order.location_name}</span>
                            {order.location_address && (
                              <span className="ml-1 text-blue-600 block sm:inline">({order.location_address})</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items - Mobile Optimized */}
                    <div>
                      <h6 className="font-medium text-gray-900 mb-2">Items:</h6>
                      <div className="space-y-2 text-sm">
                        {order.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <span className="font-medium">{item.name}</span>
                              {item.customizations && Object.keys(item.customizations).length > 0 && (
                                <div className="text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-200">
                                  {Object.entries(item.customizations).map(([group, selection], idx) => (
                                    <div key={idx}>
                                      <span className="font-medium">{group}:</span> {Array.isArray(selection) ? selection.join(', ') : String(selection)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-gray-600 font-medium">×{item.quantity}</span>
                              <div className="text-xs text-gray-500">{safeFormatCurrency(item.price)}</div>
                            </div>
                          </div>
                        ))}
                        {order.merchandise_items && order.merchandise_items.length > 0 && (
                          <>
                            <div className="text-xs text-gray-500 mt-2 mb-1 font-medium">Merchandise:</div>
                            {order.merchandise_items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex justify-between items-start p-3 bg-blue-50 rounded-lg">
                                <div className="flex-1">
                                  <span className="font-medium">{item.name}</span>
                                  {item.customizations && Object.keys(item.customizations).length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-200">
                                      {Object.entries(item.customizations).map(([group, selection], idx) => (
                                        <div key={idx}>
                                          <span className="font-medium">{group}:</span> {Array.isArray(selection) ? selection.join(', ') : String(selection)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-gray-600 font-medium">×{item.quantity}</span>
                                  <div className="text-xs text-gray-500">{safeFormatCurrency(item.price)}</div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  No detailed order information available
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 