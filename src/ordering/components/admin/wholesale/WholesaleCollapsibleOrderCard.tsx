// src/ordering/components/admin/wholesale/WholesaleCollapsibleOrderCard.tsx

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Calendar,
  CheckSquare,
  Square,
  Heart,
  Building
} from 'lucide-react';

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

interface WholesaleCollapsibleOrderCardProps {
  order: WholesaleOrder;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isNew?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onSelectChange?: (selected: boolean) => void;
  renderActions: (order: WholesaleOrder) => React.ReactNode;
  getStatusColor: (status: string) => string;
  getPaymentStatusColor: (status: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

export function WholesaleCollapsibleOrderCard({
  order,
  isExpanded,
  onToggleExpand,
  isNew = false,
  isSelected = false,
  isHighlighted = false,
  onSelectChange,
  renderActions,
  getStatusColor,
  getPaymentStatusColor,
  formatCurrency,
  formatDate
}: WholesaleCollapsibleOrderCardProps) {

  // Determine card styling classes
  const newOrderClasses = isNew ? 'ring-2 ring-blue-400 ring-opacity-50' : '';
  const highlightClasses = isHighlighted ? 'bg-yellow-50 border-yellow-300' : '';

  return (
    <div
      id={`wholesale-order-${order.id}`}
      className={`rounded-lg shadow-sm overflow-hidden transition-all duration-200 ${newOrderClasses} ${highlightClasses} bg-white border border-gray-200`}
    >
      {/* Order Header - Always Visible */}
      <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Selection Checkbox */}
          {onSelectChange && (
            <button
              onClick={() => onSelectChange(!isSelected)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              aria-label={isSelected ? 'Deselect order' : 'Select order'}
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Expand/Collapse Button */}
          <button
            onClick={onToggleExpand}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label={isExpanded ? 'Collapse order details' : 'Expand order details'}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          {/* Order Basic Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
              {/* Order Number */}
              <div className="font-medium text-gray-900 truncate">
                #{order.order_number}
              </div>
              
              {/* Customer Name */}
              <div className="text-sm text-gray-600 truncate">
                {order.customer_name}
              </div>
              
              {/* Fundraiser Info */}
              <div className="text-sm text-gray-500 truncate">
                <Building className="w-4 h-4 inline mr-1" />
                {order.fundraiser_name}
                {order.participant_name && (
                  <span className="ml-1">
                    <Heart className="w-3 h-3 inline mr-1" />
                    {order.participant_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status and Total - Right Side */}
        <div className="flex items-center space-x-3 flex-shrink-0 mt-2 sm:mt-0">
          {/* Status Badge */}
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {order.status === 'fulfilled' ? 'Ready for Pickup' : order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
            </span>
          </div>

          {/* Total and Date */}
          <div className="text-right">
            <div className="font-semibold text-gray-900">
              {formatCurrency(order.total)}
            </div>
            <div className="text-xs text-gray-500">
              {order.item_count} item{order.item_count !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-400 flex items-center justify-end mt-1">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(order.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Items Summary - Always Visible */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Items ({order.items.length})
            </h4>
            <div className="space-y-1">
              {order.items.slice(0, 3).map((item, index) => {
                // Format selected options if no variant description
                const formatSelectedOptions = (options: Record<string, any>) => {
                  if (!options || Object.keys(options).length === 0) return '';
                  return ' (' + Object.entries(options).map(([key, value]) => 
                    `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`
                  ).join(', ') + ')';
                };

                const displayName = item.variant_description || 
                  (item.name + (item.selected_options ? formatSelectedOptions(item.selected_options) : ''));

                return (
                  <div key={`${item.id}-${index}`} className="flex justify-between text-sm">
                    <span className="text-gray-700 flex-1 pr-2">
                      {displayName} × {item.quantity}
                    </span>
                    <span className="font-medium text-gray-900 flex-shrink-0">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                );
              })}
              {order.items.length > 3 && (
                <div className="text-xs text-gray-500 italic">
                  ...and {order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons - Always Visible */}
          <div className="ml-4 flex-shrink-0">
            {renderActions && renderActions(order)}
          </div>
        </div>
      </div>

      {/* Expanded Content - Detailed Information */}
      {isExpanded && (
        <div className="p-4 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Customer & Shipping */}
            <div className="space-y-4">
              {/* Customer Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Customer Information
                </h4>
                <div className="space-y-1 text-sm text-gray-700 pl-6">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {order.customer_email}
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {order.customer_phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Pickup Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Pickup Location
                </h4>
                <div className="text-sm text-gray-700 pl-6">
                  <div className="font-medium">Hafaloha Restaurant</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Available for pickup at main location
                  </div>
                </div>
              </div>

              {/* Order Notes */}
              {order.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Order Notes</h4>
                  <div className="text-sm text-gray-700 pl-6">
                    {order.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Order Details & Items */}
            <div className="space-y-4">
              {/* Order Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Order Information
                </h4>
                <div className="space-y-1 text-sm text-gray-700 pl-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date:</span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Supporting:</span>
                    <span>{order.participant_name || 'General Support'}</span>
                  </div>
                  {order.tracking_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking:</span>
                      <span className="text-blue-600 font-medium">{order.tracking_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Items Ordered ({order.items.length})
                </h4>
                <div className="space-y-2 pl-6">
                  {order.items.map((item, index) => {
                    // Format selected options if no variant description
                    const formatSelectedOptions = (options: Record<string, any>) => {
                      if (!options || Object.keys(options).length === 0) return '';
                      return ' (' + Object.entries(options).map(([key, value]) => 
                        `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`
                      ).join(', ') + ')';
                    };

                    const displayName = item.variant_description || 
                      (item.name + (item.selected_options ? formatSelectedOptions(item.selected_options) : ''));

                    return (
                      <div key={`${item.id}-${index}`} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {displayName} × {item.quantity}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-medium text-sm">
                      <span>Total:</span>
                      <span className="text-gray-900">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}