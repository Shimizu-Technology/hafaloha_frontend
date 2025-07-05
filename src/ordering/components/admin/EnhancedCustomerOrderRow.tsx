import React, { useState } from 'react';
import { CustomerOrderReport, CustomerOrderItem, DetailedOrder } from '../../../shared/api/endpoints/analytics';

interface EnhancedCustomerOrderRowProps {
  customer: CustomerOrderReport;
  index: number;
  isRegistered: boolean;
}

export function EnhancedCustomerOrderRow({ customer, index, isRegistered }: EnhancedCustomerOrderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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

  const renderItemWithCustomizations = (item: CustomerOrderItem, colorClass: string = 'text-gray-700') => {
    return (
      <div className="space-y-1">
        {/* Main item */}
        <div className={`flex justify-between py-1 ${colorClass}`}>
          <span className="font-medium">{item.name}</span>
          <span className="font-medium">×{item.quantity}</span>
        </div>
        
        {/* Customizations */}
        {item.customizations && Object.keys(item.customizations).length > 0 && (
          <div className="ml-4 space-y-0.5">
            {Object.entries(item.customizations).map(([optionGroup, selections], idx) => {
              // Handle different data structures for selections
              let selectionsText = '';
              if (Array.isArray(selections)) {
                selectionsText = selections.join(', ');
              } else if (typeof selections === 'string') {
                selectionsText = selections;
              } else {
                selectionsText = String(selections);
              }
              
              return (
                <div key={idx} className={`text-xs ${colorClass} opacity-80`}>
                  <span className="font-medium">{optionGroup}:</span>
                  <span className="ml-1">{selectionsText}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderOrderItem = (item: any) => (
    <div className="flex justify-between items-start py-1">
      <div className="flex-1">
        <span className="font-medium text-gray-800">{item.name || 'Unknown Item'}</span>
                 {item.customizations && Object.keys(item.customizations).length > 0 && (
           <div className="ml-2 text-xs text-gray-600">
             {Object.entries(item.customizations).map(([group, selection], idx) => (
               <div key={idx}>
                 <span className="font-medium">{group}:</span> {Array.isArray(selection) ? selection.join(', ') : String(selection)}
               </div>
             ))}
           </div>
         )}
      </div>
      <div className="text-right text-sm">
        <div>×{item.quantity || 1}</div>
        <div className="text-gray-600">{formatCurrency(item.price || 0)}</div>
      </div>
    </div>
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      {/* Customer Summary Row - Mobile Optimized */}
      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
              isRegistered ? 'bg-blue-500' : 'bg-amber-500'
            }`}>
              {index + 1}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 text-base sm:text-lg">{customer.user_name}</h3>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isRegistered ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isRegistered ? 'Registered' : 'Guest'}
                </span>
                <span className="hidden sm:inline">•</span>
                <span>{customer.order_count} order{customer.order_count !== 1 ? 's' : ''}</span>
                {customer.payment_methods_used && customer.payment_methods_used.length > 0 && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-xs sm:text-sm">{customer.payment_methods_used.join(', ')}</span>
                  </>
                )}
              </div>
              
              {/* Contact Information - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs text-gray-500 mt-2">
                {customer.primary_contact_email && (
                  <span className="flex items-center break-all">
                    <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    {customer.primary_contact_email}
                  </span>
                )}
                {customer.primary_contact_phone && (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {customer.primary_contact_phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end space-x-3">
            <div className="text-left sm:text-right">
              <div className="font-semibold text-gray-900 text-lg sm:text-xl">
                {formatCurrency(customer.total_spent)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <div className="sm:hidden">
                  {formatDate(customer.first_order_date).split(',')[0]} - {formatDate(customer.last_order_date).split(',')[0]}
                </div>
                <div className="hidden sm:block">
                  {formatDate(customer.first_order_date)} - {formatDate(customer.last_order_date)}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 sm:p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-400 min-w-[40px] sm:min-w-0"
              title="Toggle detailed view"
            >
              <svg className={`w-5 h-5 sm:w-4 sm:h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details - Mobile Optimized */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Toggle between Summary and Individual Orders - Mobile Optimized */}
          <div className="px-3 sm:px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setShowOrderDetails(false)}
                className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !showOrderDetails 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-800 bg-white border border-gray-300'
                }`}
              >
                Summary View
              </button>
              <button
                onClick={() => setShowOrderDetails(true)}
                className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  showOrderDetails 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-800 bg-white border border-gray-300'
                }`}
              >
                Individual Orders ({customer.detailed_orders?.length || 0})
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {!showOrderDetails ? (
              /* Summary View - Aggregated Items - Mobile Optimized */
              <div>
                <h4 className="text-sm font-medium mb-3 text-gray-700">Items Ordered (Aggregated):</h4>
                <div className="space-y-2 text-sm">
                  {customer.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="bg-gray-50 rounded-lg p-3">
                      {renderItemWithCustomizations(item, 'text-gray-600')}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Individual Orders View - Mobile Optimized */
              <div>
                <h4 className="text-sm font-medium mb-3 text-gray-700">Individual Order Details:</h4>
                <div className="space-y-4">
                  {customer.detailed_orders?.map((order: DetailedOrder, orderIndex) => (
                    <div key={order.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                      {/* Order Header - Mobile Optimized */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                          <h5 className="font-medium text-gray-900">Order #{order.order_number}</h5>
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                              {order.status}
                            </span>
                            {order.has_refunds && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                Refunded: {formatCurrency(order.total_refunded)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="font-semibold text-gray-900">{formatCurrency(order.net_amount)}</div>
                          {order.total !== order.net_amount && (
                            <div className="text-xs text-gray-500 line-through">{formatCurrency(order.total)}</div>
                          )}
                        </div>
                      </div>

                      {/* Order Details Grid - Mobile Optimized */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
                        <div className="bg-white rounded p-3">
                          <div className="text-xs text-gray-600 mb-1">Date & Time</div>
                          <div className="text-sm font-medium">{formatDate(order.created_at)}</div>
                          {order.estimated_pickup_time && (
                            <div className="text-xs text-gray-600">Pickup: {formatDate(order.estimated_pickup_time)}</div>
                          )}
                        </div>
                        
                        <div className="bg-white rounded p-3">
                          <div className="text-xs text-gray-600 mb-1">Payment</div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
                            <span className="text-sm font-medium">{order.payment_method || 'Unknown'}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(order.payment_status)}`}>
                              {order.payment_status}
                            </span>
                          </div>
                          {order.transaction_id && (
                            <div className="text-xs text-gray-600 font-mono mt-1">ID: {order.transaction_id}</div>
                          )}
                        </div>

                        {/* Contact Information - Mobile Optimized */}
                        <div className="bg-white rounded p-3">
                          <div className="text-xs text-gray-600 mb-1">Contact</div>
                          <div className="text-sm space-y-1">
                            {order.contact_name && <div className="font-medium">{order.contact_name}</div>}
                            {order.contact_email && <div className="text-xs text-gray-600 break-all">{order.contact_email}</div>}
                            {order.contact_phone && <div className="text-xs text-gray-600">{order.contact_phone}</div>}
                          </div>
                        </div>

                        {/* Additional Details - Mobile Optimized */}
                        <div className="bg-white rounded p-3">
                          <div className="text-xs text-gray-600 mb-1">Additional Info</div>
                          <div className="text-sm space-y-1">
                            {order.location_name && (
                              <div className="text-xs">📍 {order.location_name}</div>
                            )}
                            {order.vip_code && (
                              <div className="text-xs">🎫 VIP: {order.vip_code}</div>
                            )}
                            {order.is_staff_order && (
                              <div className="text-xs">👥 Staff Order</div>
                            )}
                            {order.staff_member_name && (
                              <div className="text-xs">Staff: {order.staff_member_name}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Special Instructions - Mobile Optimized */}
                      {order.special_instructions && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-600 mb-1">Special Instructions</div>
                          <div className="text-sm bg-yellow-50 border border-yellow-200 rounded p-2">
                            {order.special_instructions}
                          </div>
                        </div>
                      )}

                      {/* Order Items - Mobile Optimized */}
                      <div>
                        <div className="text-xs text-gray-600 mb-2">Items ({order.items?.length || 0}):</div>
                        <div className="space-y-1 bg-white rounded border border-gray-200 p-3">
                          {order.items?.map((item, itemIndex) => (
                            <div key={itemIndex} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                              {renderOrderItem(item)}
                            </div>
                          ))}
                          
                          {/* Merchandise Items - Mobile Optimized */}
                          {order.merchandise_items && order.merchandise_items.length > 0 && (
                            <>
                              <div className="border-t border-gray-200 pt-2 mt-2">
                                <div className="text-xs text-gray-600 mb-1">Merchandise:</div>
                                {order.merchandise_items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                                    {renderOrderItem(item)}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Staff Discount Information - Mobile Optimized */}
                      {order.is_staff_order && order.discount_amount && order.discount_amount > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                          <div className="flex justify-between mb-1">
                            <span>Pre-discount Total:</span>
                            <span>{formatCurrency(order.pre_discount_total || 0)}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Staff Discount:</span>
                            <span>-{formatCurrency(order.discount_amount)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      No detailed order information available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 