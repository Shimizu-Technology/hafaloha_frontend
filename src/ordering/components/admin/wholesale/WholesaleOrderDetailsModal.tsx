// src/ordering/components/admin/wholesale/WholesaleOrderDetailsModal.tsx

import { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Calendar,
  Edit3,
  Save,
  Building,
  Heart,
  ClipboardList,
  Clock,
  Check,
  AlertCircle,
  DollarSign,
  FileText
} from 'lucide-react';
import { apiClient } from '../../../../shared/api/apiClient';
import toastUtils from '../../../../shared/utils/toastUtils';

interface WholesaleOrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number | string;
  total: number | string;
  selected_options?: Record<string, any>;
  variant_description?: string;
}

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
  items: WholesaleOrderItem[];
  // Additional details that might be fetched
  fundraiser?: {
    id: number;
    name: string;
    description?: string;
    slug: string;
  };
  participant?: {
    id: number;
    name: string;
    bio?: string;
    slug: string;
  };
}

interface WholesaleOrderDetailsModalProps {
  order: WholesaleOrder;
  onClose: () => void;
  onOrderUpdate?: (updatedOrder: WholesaleOrder) => void;
}

export function WholesaleOrderDetailsModal({ 
  order: initialOrder, 
  onClose, 
  onOrderUpdate 
}: WholesaleOrderDetailsModalProps) {
  const [order, setOrder] = useState<WholesaleOrder>(initialOrder);
  const [loading, setLoading] = useState(false);
  // Removed activeTab state - using single page layout
  
  // Edit states
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(order.notes || '');

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency helper
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

  // Status color helpers
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'fulfilled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Update order status
  const updateOrderStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      await apiClient.patch(`/wholesale/admin/orders/${order.id}`, {
        status: newStatus
      });
      
      const updatedOrder = { ...order, status: newStatus as any };
      setOrder(updatedOrder);
      onOrderUpdate?.(updatedOrder);
      toastUtils.success(`Order status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating order status:', err);
      toastUtils.error('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  // Save notes
  const saveNotes = async () => {
    setLoading(true);
    try {
      await apiClient.patch(`/wholesale/admin/orders/${order.id}`, {
        notes: editedNotes
      });
      
      const updatedOrder = { ...order, notes: editedNotes };
      setOrder(updatedOrder);
      onOrderUpdate?.(updatedOrder);
      setIsEditingNotes(false);
      toastUtils.success('Notes updated successfully');
    } catch (err) {
      console.error('Error updating notes:', err);
      toastUtils.error('Failed to update notes');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-0 border w-full max-w-6xl shadow-lg rounded-lg bg-white min-h-[90vh]">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Order #{order.order_number}
              </h2>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Quick Status Update */}
              {order.status && order.status !== 'completed' && order.status !== 'cancelled' && (
                <select
                  value={order.status || 'pending'}
                  onChange={(e) => updateOrderStatus(e.target.value)}
                  disabled={loading}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              )}
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>


        </div>

        {/* Content - Consolidated Single Page Layout */}
        <div className="px-6 py-6 space-y-8">
          
          {/* Top Section: Customer & Fundraiser Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Customer & Pickup */}
            <div className="space-y-6">
              
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-3 text-gray-400" />
                    <span className="font-medium text-gray-900">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-3 text-gray-400" />
                    <a 
                      href={`mailto:${order.customer_email}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {order.customer_email}
                    </a>
                  </div>
                  {order.customer_phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-gray-400" />
                      <a 
                        href={`tel:${order.customer_phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {order.customer_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Pickup Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Pickup Location
                </h3>
                <div className="text-gray-700">
                  <div className="font-medium text-gray-900">Hafaloha Restaurant</div>
                  <div className="text-sm text-gray-600 mt-1">
                    All wholesale orders are available for pickup at our main location.
                  </div>
                  <div className="mt-3">
                    <a 
                      href="#" 
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={(e) => e.preventDefault()}
                    >
                      Contact customer to coordinate pickup time.
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Fundraiser & Timeline */}
            <div className="space-y-6">
              
              {/* Fundraiser Information */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Fundraiser Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-3 text-gray-400" />
                    <span className="font-medium text-gray-900">{order.fundraiser?.name}</span>
                  </div>
                  {order.participant && (
                    <div className="flex items-center">
                      <Heart className="w-4 h-4 mr-3 text-gray-400" />
                      <span className="text-gray-700">Supporting: {order.participant.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Timeline */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Order Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-3 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-600">Order Placed</span>
                      <div className="font-medium">{formatDate(order.created_at)}</div>
                    </div>
                  </div>
                  {order.updated_at !== order.created_at && (
                    <div className="flex items-center">
                      <Check className="w-4 h-4 mr-3 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Last Updated</span>
                        <div className="font-medium">{formatDate(order.updated_at)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section: Enhanced Order Summary with Items */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Order Summary & Items
            </h3>
            
            {/* Item Details */}
            <div className="space-y-4 mb-6">
              {order.items.map((item, index) => {
                // Format selected options if no variant description
                const formatSelectedOptions = (options: Record<string, any>) => {
                  if (!options || Object.keys(options).length === 0) return '';
                  return Object.entries(options).map(([key, value]) => 
                    `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`
                  ).join(', ');
                };

                const displayName = item.variant_description || item.name;
                const optionsText = item.variant_description ? '' : formatSelectedOptions(item.selected_options || {});

                return (
                  <div key={`${item.id}-${index}`} className="bg-white rounded-md p-4 border border-gray-200 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-lg">{displayName}</div>
                      {optionsText && (
                        <div className="text-sm text-gray-500 mt-1">{optionsText}</div>
                      )}
                      <div className="text-sm text-gray-600 mt-2">
                        Quantity: {item.quantity} × {formatCurrency(item.price)} each
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-lg text-gray-900">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Totals */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600">Items</div>
                  <div className="font-semibold text-gray-900">{order.item_count} items ({order.unique_item_count} unique)</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600">Payment Status</div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                    {order.payment_status || 'Unknown'}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="font-bold text-xl text-gray-900">{formatCurrency(order.total)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Notes */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Order Notes
              </h3>
              <button
                onClick={() => setIsEditingNotes(!isEditingNotes)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {isEditingNotes ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="Add notes about this order..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={saveNotes}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Saving...' : 'Save Notes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingNotes(false);
                      setEditedNotes(order.notes || '');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-gray-700">
                {order.notes ? (
                  <div className="whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200">
                    {order.notes}
                  </div>
                ) : (
                  <div className="text-gray-500 italic bg-white p-4 rounded-lg border border-gray-200">
                    No notes added yet. Click "Edit" to add notes about this order.
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
