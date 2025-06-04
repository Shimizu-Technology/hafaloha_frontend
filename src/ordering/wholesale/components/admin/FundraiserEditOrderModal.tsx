// src/ordering/wholesale/components/admin/FundraiserEditOrderModal.tsx

import { useState, useEffect } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import toastUtils from '../../../../shared/utils/toastUtils';
import fundraiserOrderService from '../../services/fundraiserOrderService';

interface FundraiserEditOrderModalProps {
  order: any;
  onClose: () => void;
  onSave: (updatedOrder: any) => void;
}

export function FundraiserEditOrderModal({
  order,
  onClose,
  onSave
}: FundraiserEditOrderModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [updatedOrder, setUpdatedOrder] = useState({ ...order });
  
  // Reset form when order changes
  useEffect(() => {
    setUpdatedOrder({ ...order });
  }, [order]);

  // Handle status change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUpdatedOrder({
      ...updatedOrder,
      status: e.target.value
    });
  };

  // Handle notes change
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUpdatedOrder({
      ...updatedOrder,
      admin_notes: e.target.value
    });
  };
  
  // Handle save
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fundraiserOrderService.updateOrder(order.id, {
        status: updatedOrder.status,
        admin_notes: updatedOrder.admin_notes
      });
      
      toastUtils.success('Order updated successfully');
      onSave(response);
    } catch (err) {
      console.error('Error updating order:', err);
      toastUtils.error('Failed to update order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold">
            Edit Fundraiser Order
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="mb-4">
            <p className="mb-2 font-medium text-gray-700">Order Number: {updatedOrder.order_number || `WF-${updatedOrder.id}`}</p>
            <p className="text-sm text-gray-600">
              {updatedOrder.contact_name} | {updatedOrder.contact_email}
            </p>
            {updatedOrder.fundraiser_participant?.name && (
              <p className="text-sm text-gray-600 mt-1">
                Participant: {updatedOrder.fundraiser_participant.name}
              </p>
            )}
          </div>
          
          {/* Status Selection */}
          <div className="mb-4">
            <label htmlFor="status" className="block mb-2 text-sm font-medium text-gray-700">
              Order Status
            </label>
            <select
              id="status"
              value={updatedOrder.status}
              onChange={handleStatusChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          {/* Admin Notes */}
          <div className="mb-4">
            <label htmlFor="admin_notes" className="block mb-2 text-sm font-medium text-gray-700">
              Admin Notes
            </label>
            <textarea
              id="admin_notes"
              value={updatedOrder.admin_notes || ''}
              onChange={handleNotesChange}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add internal notes about this order"
            ></textarea>
          </div>
          
          {/* Order Summary */}
          <div className="mb-4 bg-gray-50 p-3 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Order Summary</h3>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Total Items:</span>
              <span className="text-sm font-medium text-gray-900">
                {updatedOrder.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-600">Order Total:</span>
              <span className="text-sm font-medium text-gray-900">
                ${updatedOrder.total?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Order Date:</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(updatedOrder.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto order-1 sm:order-2"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
