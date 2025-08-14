// src/wholesale/components/OrderDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { wholesaleApi, WholesaleOrder } from '../services/wholesaleApi';

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<WholesaleOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder(parseInt(orderId));
    }
  }, [orderId]);

  const loadOrder = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await wholesaleApi.getOrder(id);
      
      if (response.success && response.data) {
        setOrder(response.data.order);
      } else {
        setError(response.message || 'Failed to load order details');
      }
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Unable to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setCancelling(true);
      
      const response = await wholesaleApi.cancelOrder(order.id);
      
      if (response.success && response.data) {
        setOrder(response.data.order);
        // You might want to show a success message here
      } else {
        alert(response.message || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Unable to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      case 'fulfilled':
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

  const getStatusDescription = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'paid':
        return 'Your order has been confirmed and payment has been processed successfully.';
      case 'pending':
        return 'Your order is pending and will be processed soon.';
      case 'processing':
        return 'Your order is being prepared for shipment.';
      case 'fulfilled':
        return 'Your order is ready for pickup!';
      case 'shipped':
        return 'Your order has been shipped and is on its way.';
      case 'delivered':
        return 'Your order has been delivered successfully.';
      case 'cancelled':
        return 'This order has been cancelled.';
      default:
        return 'Order status is being updated.';
    }
  };

  const canCancelOrder = (order: WholesaleOrder): boolean => {
    const cancellableStatuses = ['pending', 'confirmed'];
    return cancellableStatuses.includes(order.status.toLowerCase());
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
          <h3 className="text-lg font-semibold">Unable to Load Order</h3>
          <p className="text-sm mt-2">{error}</p>
        </div>
        <div className="space-x-4">
          <button 
            onClick={() => orderId && loadOrder(parseInt(orderId))}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
          <button 
            onClick={() => navigate(-1)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Order not found</h2>
        <button 
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="order-detail max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
            <p className="text-gray-600">
              Placed on {formatDate(order.createdAt)} • {order.fundraiser.name}
            </p>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status === 'fulfilled' ? 'Ready for Pickup' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <div>
              <div className="font-medium text-gray-900">
                {order.status === 'cancelled' ? 'Order Cancelled' : getStatusDescription(order.status)}
              </div>
              <div className="text-sm text-gray-600">
                Last updated: {formatDate(order.updatedAt)}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-3">
            {canCancelOrder(order) && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
            
            <Link
              to={`/wholesale/${order.fundraiser.slug}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Visit Fundraiser
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
            
            {/* Note: In a real implementation, you'd fetch order items from the API */}
            <div className="space-y-4">
              <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Order items details would be loaded from the API in a real implementation.</span>
                </div>
              </div>
              
              {/* Placeholder for order items */}
              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-600">
                  {order.uniqueItemCount} unique item{order.uniqueItemCount !== 1 ? 's' : ''} • {order.itemCount} total items
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pickup Information</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <div className="font-medium text-gray-900 mb-1">Pickup Location</div>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">{order.fundraiser?.pickup_display_name || 'Pickup Location'}</div>
                  <div>{order.fundraiser?.pickup_display_address || 'Contact for details'}</div>
                </div>
              </div>
              
              {order.fundraiser?.pickup_instructions && (
                <div>
                  <div className="font-medium text-gray-900 mb-1">Pickup Instructions</div>
                  <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border">
                    {order.fundraiser.pickup_instructions}
                  </div>
                </div>
              )}
              
              {order.fundraiser?.pickup_hours && (
                <div>
                  <div className="font-medium text-gray-900 mb-1">Pickup Hours</div>
                  <div className="text-sm text-green-700">
                    {order.fundraiser.pickup_hours}
                  </div>
                </div>
              )}
              
              {order.fundraiser?.pickup_contact_name && (
                <div>
                  <div className="font-medium text-gray-900 mb-1">Contact</div>
                  <div className="text-sm text-gray-700">
                    {order.fundraiser.pickup_contact_name}
                    {order.fundraiser.pickup_contact_phone && ` - ${order.fundraiser.pickup_contact_phone}`}
                  </div>
                </div>
              )}
            </div>
              
              {order.status === 'ready' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="font-medium text-green-900">Order Ready for Pickup</div>
                      <div className="text-sm text-green-700">
                        Your order is ready! Please bring your order confirmation when picking up.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {order.status === 'paid' && (
                <div className="mt-4 p-3 bg-[#c1902f]/10 border border-[#c1902f]/20 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#c1902f] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="font-medium text-[#c1902f]">Order Processing</div>
                      <div className="text-sm text-gray-700">
                        Your order is being prepared. You'll be notified when it's ready for pickup.
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping:</span>
                <span>Free</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Payment Status:</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    order.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Amount Paid:</span>
                <div className="font-medium">{formatCurrency(order.totalPaid)}</div>
              </div>
              
              {order.paymentStatus !== 'paid' && (
                <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                  Payment is still pending. You may receive additional payment instructions via email.
                </div>
              )}
            </div>
          </div>

          {/* Fundraiser Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Fundraiser Details</h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Fundraiser:</span>
                <div className="font-medium">{order.fundraiser.name}</div>
              </div>
              
              {order.participant && (
                <div>
                  <span className="text-sm text-gray-600">Supporting:</span>
                  <div className="font-medium">{order.participant.name}</div>
                </div>
              )}
              
              <div className="pt-3">
                <Link
                  to={`/wholesale/${order.fundraiser.slug}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Visit Fundraiser Page →
                </Link>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Information</h2>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <div className="font-medium">{order.customerName}</div>
              </div>
              
              <div>
                <span className="text-gray-600">Email:</span>
                <div className="font-medium">{order.customerEmail}</div>
              </div>
              
              {order.customerPhone && (
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <div className="font-medium">{order.customerPhone}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Support Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            If you have any questions about your order, please contact us.
          </p>
          <div className="space-x-4">
            <a 
              href="mailto:support@hafaloha.com" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              support@hafaloha.com
            </a>
            <span className="text-gray-300">•</span>
            <a 
              href="tel:+1234567890" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              (123) 456-7890
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}