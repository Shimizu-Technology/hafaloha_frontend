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
      {/* Summary Row */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {index + 1}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{staff.user_name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Staff
                </span>
                <span>•</span>
                <span>{employeeName}</span>
                {employeeEmail && employeeEmail !== 'No email' && (
                  <>
                    <span>•</span>
                    <span className="text-gray-500">{employeeEmail}</span>
                  </>
                )}
              </div>
              
              {/* Summary Stats */}
              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                <span>Total Orders: {totalOrdersCount}</span>
                <span>•</span>
                <span>Avg: {safeFormatCurrency(staffDetails?.average_order_value)}</span>
                {staff.payment_methods_used && staff.payment_methods_used.length > 0 && (
                  <>
                    <span>•</span>
                    <span>Payment: {staff.payment_methods_used.join(', ')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {safeFormatCurrency(staff.total_spent)}
              </div>
              <div className="text-sm text-gray-600">
                {staff.order_count} order{staff.order_count !== 1 ? 's' : ''}
              </div>
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              <svg 
                className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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

      {/* Expandable Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {/* View Mode Tabs */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('orders')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'orders'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Individual Orders ({totalOrdersCount})
            </button>
          </div>

          {/* Summary View */}
          {viewMode === 'summary' && (
            <div className="space-y-4">
              {/* Staff Information */}
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Staff Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Employee Name:</span>
                    <span className="ml-2 font-medium">{employeeName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Employee Email:</span>
                    <span className="ml-2 font-medium">{employeeEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Staff Orders:</span>
                    <span className="ml-2 font-medium">{staffDetails?.total_orders_for_staff || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Average Order Value:</span>
                    <span className="ml-2 font-medium">{safeFormatCurrency(staffDetails?.average_order_value)}</span>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Date Range:</span>
                    <span className="ml-2 font-medium">
                      {safeFormatDateOnly(staff.first_order_date)} - {safeFormatDateOnly(staff.last_order_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment Methods:</span>
                    <span className="ml-2 font-medium">
                      {staff.payment_methods_used && staff.payment_methods_used.length > 0
                        ? staff.payment_methods_used.join(', ')
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Spent:</span>
                    <span className="ml-2 font-medium text-green-600">{safeFormatCurrency(staff.total_spent)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Orders:</span>
                    <span className="ml-2 font-medium">{staff.order_count}</span>
                  </div>
                </div>
              </div>

              {/* Items Ordered */}
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Items Ordered</h4>
                <div className="space-y-2 text-sm">
                  {staff.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="p-2 bg-gray-50 rounded">
                      {renderItemWithCustomizations(item)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Individual Orders View */}
          {viewMode === 'orders' && (
            <div className="space-y-4">
              {staff.detailed_orders && staff.detailed_orders.length > 0 ? (
                staff.detailed_orders.map((order, orderIndex) => (
                  <div key={order.id} className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-medium">
                          {orderIndex + 1}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">Order #{order.order_number}</h5>
                          <p className="text-sm text-gray-600">{safeFormatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2">{getStatusBadge(order.status)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Payment:</span>
                        <span className="ml-2">{order.payment_method || 'N/A'}</span>
                        {order.payment_status && (
                          <span className="ml-2">{getPaymentStatusBadge(order.payment_status)}</span>
                        )}
                      </div>
                      {order.transaction_id && (
                        <div>
                          <span className="text-gray-600">Transaction ID:</span>
                          <span className="ml-2 font-mono text-xs">{order.transaction_id}</span>
                        </div>
                      )}
                      {order.estimated_pickup_time && (
                        <div>
                          <span className="text-gray-600">Pickup Time:</span>
                          <span className="ml-2">{safeFormatDate(order.estimated_pickup_time)}</span>
                        </div>
                      )}
                    </div>

                    {/* Contact Info */}
                    {(order.contact_name || order.contact_phone || order.contact_email) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3 p-2 bg-gray-50 rounded">
                        {order.contact_name && (
                          <div>
                            <span className="text-gray-600">Contact:</span>
                            <span className="ml-2 font-medium">{order.contact_name}</span>
                          </div>
                        )}
                        {order.contact_phone && (
                          <div>
                            <span className="text-gray-600">Phone:</span>
                            <span className="ml-2 font-medium">{order.contact_phone}</span>
                          </div>
                        )}
                        {order.contact_email && (
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <span className="ml-2 font-medium">{order.contact_email}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Special Info */}
                    {(order.special_instructions || order.vip_code || order.location_name) && (
                      <div className="space-y-2 text-sm mb-3">
                        {order.special_instructions && (
                          <div className="p-2 bg-yellow-50 rounded">
                            <span className="text-yellow-800 font-medium">Special Instructions:</span>
                            <span className="ml-2 text-yellow-700">{order.special_instructions}</span>
                          </div>
                        )}
                        {order.vip_code && (
                          <div className="p-2 bg-purple-50 rounded">
                            <span className="text-purple-800 font-medium">VIP Code:</span>
                            <span className="ml-2 text-purple-700">{order.vip_code}</span>
                          </div>
                        )}
                        {order.location_name && (
                          <div className="p-2 bg-blue-50 rounded">
                            <span className="text-blue-800 font-medium">Location:</span>
                            <span className="ml-2 text-blue-700">{order.location_name}</span>
                            {order.location_address && (
                              <span className="ml-1 text-blue-600">({order.location_address})</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items */}
                    <div>
                      <h6 className="font-medium text-gray-900 mb-2">Items:</h6>
                      <div className="space-y-1 text-sm">
                        {order.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between items-start p-2 bg-gray-50 rounded">
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
                            <div className="text-xs text-gray-500 mt-2 mb-1">Merchandise:</div>
                            {order.merchandise_items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex justify-between items-start p-2 bg-blue-50 rounded">
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