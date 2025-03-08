// src/ordering/components/admin/AdminEditOrderModal.tsx
import React, { useState } from 'react';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';
import { SetEtaModal } from './SetEtaModal';
import { 
  handleOrderPreparationStatus, 
  calculatePickupTime, 
  requiresAdvanceNotice 
} from '../../../shared/utils/orderUtils';

interface AdminEditOrderModalProps {
  order: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

export function AdminEditOrderModal({ order, onClose, onSave }: AdminEditOrderModalProps) {
  // Local state for items, total, etc.
  const [localItems, setLocalItems] = useState(() => {
    // Make a shallow copy so we don't mutate the original array
    return order.items ? [...order.items] : [];
  });
  const [localTotal, setLocalTotal] = useState<string>(String(order.total || '0'));
  const [originalStatus] = useState(order.status); // Store original status to detect changes
  const [localStatus, setLocalStatus] = useState(order.status);
  const [localInstructions, setLocalInstructions] = useState((order as any).special_instructions || (order as any).specialInstructions || '');
  
  // State for ETA modal (for status change to preparing)
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(requiresAdvanceNotice(order) ? 10.0 : 5);
  
  // State for ETA update modal (for adjusting existing ETA)
  const [showEtaUpdateModal, setShowEtaUpdateModal] = useState(false);
  const [updateEtaMinutes, setUpdateEtaMinutes] = useState(() => {
    // Initialize with current ETA if available
    if (order.estimatedPickupTime || order.estimated_pickup_time) {
      const etaDate = new Date(order.estimatedPickupTime || order.estimated_pickup_time);
      
      if (requiresAdvanceNotice(order)) {
        // For advance notice orders, convert to hour.minute format
        return etaDate.getHours() + (etaDate.getMinutes() === 30 ? 0.3 : 0);
      } else {
        // For regular orders, calculate minutes from now
        const minutesFromNow = Math.max(5, Math.round((etaDate.getTime() - Date.now()) / 60000));
        // Round to nearest 5 minutes
        return Math.ceil(minutesFromNow / 5) * 5;
      }
    }
    
    // Default values if no ETA is set
    return requiresAdvanceNotice(order) ? 10.0 : 5;
  });
  
  const [activeTab, setActiveTab] = useState<'items' | 'details'>('items');

  // Handle changing a single item row
  function handleItemChange(index: number, field: string, value: string | number) {
    setLocalItems((prev) => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        [field]: field === 'price' ? parseFloat(String(value)) : value,
      };
      return newItems;
    });
  }

  // Remove one item row
  function handleRemoveItem(index: number) {
    setLocalItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Add a new blank item row
  function handleAddItem() {
    setLocalItems((prev) => [
      ...prev,
      {
        id: null,
        name: '',
        quantity: 1,
        price: 0.0,
        notes: '',
      },
    ]);
  }

  // Calculate subtotal
  const calculateSubtotal = () => {
    return localItems.reduce((sum, item) => {
      const itemPrice = parseFloat(String(item.price)) || 0;
      const quantity = parseInt(String(item.quantity)) || 0;
      return sum + (itemPrice * quantity);
    }, 0).toFixed(2);
  };

  // Check if we need to show the ETA modal before saving
  function handleSave() {
    // Check if we're changing to preparing status
    const { shouldShowEtaModal } = handleOrderPreparationStatus(
      order,
      localStatus,
      originalStatus
    );
    
    if (shouldShowEtaModal) {
      // Show ETA modal and halt save process
      setShowEtaModal(true);
      return; // Don't proceed with save until ETA is confirmed
    }
    
    // Regular save process if we don't need to show ETA modal
    proceedWithSave();
  }
  
  // Handle ETA confirmation (for status change to preparing)
  function handleConfirmEta() {
    // Get pickup time based on selected ETA
    const pickupTime = calculatePickupTime(order, etaMinutes);
    
    // Now we can proceed with save including the pickup time
    proceedWithSave(pickupTime);
    
    // Close the modal
    setShowEtaModal(false);
  }
  
  // Handle ETA update confirmation (for adjusting existing ETA)
  function handleConfirmEtaUpdate() {
    // Get pickup time based on selected ETA
    const pickupTime = calculatePickupTime(order, updateEtaMinutes);
    
    // Update the order with the new ETA
    proceedWithSave(pickupTime);
    
    // Close the modal
    setShowEtaUpdateModal(false);
  }
  
  // Extracted the actual save logic
  function proceedWithSave(pickupTime?: string) {
    // Convert total to a float
    const parsedTotal = parseFloat(localTotal) || 0.0;

    // Build our updated order data
    const updated = {
      ...order,
      items: localItems,
      total: parsedTotal,
      status: localStatus,
      // Include both property names to ensure compatibility
      special_instructions: localInstructions,
      specialInstructions: localInstructions,
    };
    
    // Add pickup time if provided
    if (pickupTime) {
      updated.estimated_pickup_time = pickupTime;
      updated.estimatedPickupTime = pickupTime;
    }

    onSave(updated);
  }

  // Status badge colors
  const getStatusBadgeColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      confirmed: 'bg-purple-100 text-purple-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Render the items tab content
  const renderItemsTab = () => (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Items list */}
      <div className="space-y-3">
        {localItems.map((item, idx) => (
          <div 
            key={idx} 
            className="border border-gray-200 rounded-lg p-4 space-y-3 transition-shadow hover:shadow-md animate-fadeIn"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900">Item {idx + 1}</h5>
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                  value={item.name}
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                  placeholder="Item name"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(idx, 'quantity', parseInt(e.target.value, 10))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      className="border border-gray-300 rounded-md pl-7 pr-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                  value={item.notes || ''}
                  onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                  placeholder="Special requests or modifications"
                />
              </div>

              <div className="pt-2 text-right text-sm font-medium text-gray-700">
                Item Total: ${((parseFloat(String(item.price)) || 0) * (parseInt(String(item.quantity)) || 0)).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add item button */}
      <button
        type="button"
        onClick={handleAddItem}
        className="w-full flex items-center justify-center px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Item
      </button>

      {/* Order summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Subtotal</span>
          <span className="text-sm font-medium">${calculateSubtotal()}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 border-t border-gray-100 space-y-2 sm:space-y-0">
          <span className="text-base font-medium text-gray-900">Total</span>
          <div className="relative w-full sm:w-32">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              step="0.01"
              className="border border-gray-300 rounded-md pl-7 pr-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors text-right font-medium"
              value={localTotal}
              onChange={(e) => setLocalTotal(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Render the details tab content
  const renderDetailsTab = () => (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Special instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Special Instructions
        </label>
        <textarea
          className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
          rows={4}
          value={localInstructions}
          onChange={(e) => setLocalInstructions(e.target.value)}
          placeholder="Any special instructions for this order"
        />
      </div>

      {/* Order metadata */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-sm text-gray-700">Order Information</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-500">Created</div>
          <div className="text-gray-900">{new Date(order.createdAt).toLocaleString()}</div>
          
          {order.contact_name && (
            <>
              <div className="text-gray-500">Customer</div>
              <div className="text-gray-900">{order.contact_name}</div>
            </>
          )}
          
          {(order.estimatedPickupTime || order.estimated_pickup_time) && (
            <>
              <div className="text-gray-500">Pickup Time</div>
              <div className="text-gray-900">
                {new Date(order.estimatedPickupTime || order.estimated_pickup_time).toLocaleString()}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* ETA Adjustment Section - only show for orders in preparing status */}
      {localStatus === 'preparing' && (
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
          <div className="flex items-start mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-sm text-amber-800">Pickup Time / ETA</h4>
              {(order.estimatedPickupTime || order.estimated_pickup_time) ? (
                <p className="text-sm text-amber-700 mt-1">
                  Current ETA: {new Date(order.estimatedPickupTime || order.estimated_pickup_time).toLocaleString()}
                </p>
              ) : (
                <p className="text-sm text-amber-700 mt-1">No ETA set</p>
              )}
            </div>
          </div>
          
          <div className="bg-amber-100 rounded p-3 mb-3 flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800">
              Changing the ETA will send updated notifications to the customer.
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => setShowEtaUpdateModal(true)}
            className="w-full flex items-center justify-center px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md text-sm font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Update ETA
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-lg w-full sm:max-w-2xl relative max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
          {/* Header with close button */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Order #{order.id}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Status selector - always visible regardless of active tab */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(localStatus)}`}>
                  {localStatus.charAt(0).toUpperCase() + localStatus.slice(1)}
                </span>
              </div>
              <div className="flex-1">
                <MobileSelect
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'preparing', label: 'Preparing' },
                    { value: 'ready', label: 'Ready' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                  value={localStatus}
                  onChange={(value) => setLocalStatus(value)}
                />
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="px-4 sm:px-6 pt-3 pb-2 flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('items')}
              className={`mr-4 pb-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'items'
                  ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Order Items
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`mr-4 pb-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'details'
                  ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Order Details
            </button>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto relative">
            <div className={`transition-opacity duration-300 ${activeTab === 'items' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'items' && renderItemsTab()}
            </div>
            
            <div className={`transition-opacity duration-300 ${activeTab === 'details' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {activeTab === 'details' && renderDetailsTab()}
            </div>
          </div>

          {/* Action buttons - sticky footer */}
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-[#c1902f] text-white rounded-lg text-sm font-medium hover:bg-[#d4a43f] transition-colors shadow-sm order-1 sm:order-2"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
      
      {/* "Set ETA" modal - for status change to preparing */}
      {showEtaModal && (
        <SetEtaModal
          order={order}
          etaMinutes={etaMinutes}
          setEtaMinutes={setEtaMinutes}
          onClose={() => setShowEtaModal(false)}
          onConfirm={handleConfirmEta}
        />
      )}
      
      {/* "Update ETA" modal - for adjusting existing ETA */}
      {showEtaUpdateModal && (
        <SetEtaModal
          order={order}
          etaMinutes={updateEtaMinutes}
          setEtaMinutes={setUpdateEtaMinutes}
          onClose={() => setShowEtaUpdateModal(false)}
          onConfirm={handleConfirmEtaUpdate}
          isUpdateMode={true}
        />
      )}
    </>
  );
}
