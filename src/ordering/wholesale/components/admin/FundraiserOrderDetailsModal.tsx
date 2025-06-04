// src/ordering/wholesale/components/admin/FundraiserOrderDetailsModal.tsx

import { useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { Download } from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';
import fundraiserOrderService from '../../services/fundraiserOrderService';

interface FundraiserOrderDetailsModalProps {
  order: any;
  onClose: () => void;
  onEdit?: (order: any) => void;
}

export function FundraiserOrderDetailsModal({
  order,
  onClose,
  onEdit
}: FundraiserOrderDetailsModalProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format price for display
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle export order
  const handleExportOrder = async () => {
    setIsExporting(true);
    try {
      const blob = await fundraiserOrderService.exportOrders([order.id]);
      
      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fundraiser-order-${order.id}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      toastUtils.success('Order exported successfully');
    } catch (err) {
      console.error('Error exporting order:', err);
      toastUtils.error('Failed to export order. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold truncate">
            Order Details: {order.order_number || `WF-${order.id}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Order Information</h3>
              <div className="bg-gray-50 p-3 sm:p-4 rounded">
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-500 font-medium sm:w-1/3">Order Number:</span>
                  <span className="font-medium">{order.order_number || `WF-${order.id}`}</span>
                </div>
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-500 font-medium sm:w-1/3">Date:</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-500 font-medium sm:w-1/3">Status:</span>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-500 font-medium sm:w-1/3">Payment Method:</span>
                  <span>{order.payment_method}</span>
                </div>
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-500 font-medium sm:w-1/3">Transaction ID:</span>
                  <span>{order.transaction_id || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3">Customer Information</h3>
              <div className="bg-gray-50 p-3 sm:p-4 rounded">
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-500 font-medium sm:w-1/3">Name:</span>
                  <span className="font-medium">{order.contact_name}</span>
                </div>
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-500 font-medium sm:w-1/3">Email:</span>
                  <span className="break-all">{order.contact_email}</span>
                </div>
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center">
                  <span className="text-gray-500 font-medium sm:w-1/3">Phone:</span>
                  <span>{order.contact_phone}</span>
                </div>
                {order.shipping_address && (
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-medium mb-1 sm:mb-0 sm:w-1/3">Shipping Address:</span>
                    <div className="mt-1 sm:mt-0">
                      <div>{order.shipping_address.address}</div>
                      <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip_code}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Fundraiser & Participant</h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded">
              <div className="mb-2 flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 font-medium sm:w-1/3">Fundraiser:</span>
                <span className="font-medium">{order.fundraiser?.name || 'N/A'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="text-gray-500 font-medium sm:w-1/3">Participant:</span>
                <span className="font-medium">{order.fundraiser_participant?.name || 'General Support'}</span>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Order Items</h3>
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Size</th>
                    <th className="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Price</th>
                    <th className="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-3 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items && order.items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-3 sm:px-4 py-2">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500 sm:hidden">{item.size || 'No size'} - ${item.unit_price ? (item.unit_price).toFixed(2) : '0.00'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 hidden sm:table-cell">
                        <div className="text-sm text-gray-500">{item.size || 'N/A'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 text-right hidden sm:table-cell">
                        <div className="text-sm text-gray-500">${item.unit_price ? (item.unit_price).toFixed(2) : '0.00'}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 text-right">
                        <div className="text-sm text-gray-500">{item.quantity}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 text-right">
                        <div className="text-sm font-medium text-gray-900">${item.total_price ? (item.total_price).toFixed(2) : '0.00'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-900">Subtotal:</td>
                    <td className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-900">
                      {formatPrice(order.subtotal || (order.total * 0.925))} {/* Use subtotal if available, otherwise estimate */}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-900">Tax:</td>
                    <td className="px-3 sm:px-4 py-2 text-right text-sm font-medium text-gray-900">
                      {formatPrice(order.tax || (order.total * 0.075))} {/* Use tax if available, otherwise estimate */}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-3 sm:px-4 py-2 text-right text-sm font-semibold text-gray-900">Total:</td>
                    <td className="px-3 sm:px-4 py-2 text-right text-sm font-semibold text-gray-900">
                      {formatPrice(order.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {order.special_instructions && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Special Instructions</h3>
              <div className="bg-gray-50 p-3 sm:p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-700 whitespace-pre-line">{order.special_instructions}</p>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-full sm:w-auto order-3 sm:order-1"
            >
              Close
            </Button>
            <Button
              onClick={handleExportOrder}
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center w-full sm:w-auto order-2 sm:order-2"
            >
              <Download size={16} className="mr-2" />
              {isExporting ? 'Exporting...' : 'Export Order'}
            </Button>
            <Button
              onClick={() => onEdit && onEdit(order)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center w-full sm:w-auto order-1 sm:order-3"
            >
              Edit Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
