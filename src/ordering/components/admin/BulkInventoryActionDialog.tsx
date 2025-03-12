// src/ordering/componenets/admin/BulkInventoryActionDialog.tsx
import React, { useState, useEffect } from 'react';
import { menuItemsApi } from '../../../shared/api/endpoints/menuItems';

interface OrderItem {
  id?: string | number | null;
  name: string;
  quantity: number;
  enable_stock_tracking?: boolean;
  orderId?: string | number; // Order ID this item belongs to
}

interface InventoryAction {
  itemId: string | number;
  uniqueId: string; // Track each unique instance of an item
  quantity: number;
  action: 'return_to_inventory' | 'mark_as_damaged';
  reason?: string;
  orderId?: string | number; // Track which order this item belongs to
}

interface BulkInventoryActionDialogProps {
  order: any; // The order or orders being canceled
  onClose: () => void;
  onConfirm: (inventoryActions: InventoryAction[]) => void;
  isBatch?: boolean; // Whether this is for a batch of orders or single order
}

export function BulkInventoryActionDialog({
  order,
  onClose,
  onConfirm,
  isBatch = false
}: BulkInventoryActionDialogProps) {
  // State to track actions for each inventory item
  const [inventoryActions, setInventoryActions] = useState<InventoryAction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Process orders and find items with inventory tracking
  useEffect(() => {
    const findInventoryItems = async () => {
      setLoading(true);
      try {
        // Handle the case of a single order or multiple orders
        const orders = isBatch ? order : [order];
        const allItems: OrderItem[] = [];

        // Extract all items from all orders
        for (const currentOrder of orders) {
          if (currentOrder.items && currentOrder.items.length > 0) {
            // For each item in the order, get full item details including inventory tracking
            const itemsWithDetails = await Promise.all(
              currentOrder.items.map(async (item: OrderItem) => {
                if (!item.id) return null;
                
                try {
                  // Get full menu item details
                  const fullItem = await menuItemsApi.getById(item.id);
                  
                  // Return if item has inventory tracking
                  if (fullItem.enable_stock_tracking) {
                    return {
                      ...item,
                      enable_stock_tracking: fullItem.enable_stock_tracking,
                      // Use the item quantity from the order
                      quantity: item.quantity,
                      // Store the order ID this item belongs to
                      orderId: currentOrder.id
                    };
                  }
                } catch (error) {
                  console.error(`Failed to fetch item ${item.id}:`, error);
                }
                return null;
              })
            );

            // Filter out null items (no inventory tracking) and add to our collection
            const validItems = itemsWithDetails.filter((item): item is OrderItem => 
              item !== null && item.enable_stock_tracking === true
            );
            
            allItems.push(...validItems);
          }
        }

        // Initialize inventory actions for each item
        const initialActions = allItems.map((item, index) => ({
          itemId: item.id!,
          uniqueId: `${item.id}-${item.orderId}-${index}`, // Create unique identifier for each item
          quantity: item.quantity,
          action: 'return_to_inventory' as const,
          reason: '',
          orderId: item.orderId // Include the order ID in the action
        }));

        setInventoryItems(allItems);
        setInventoryActions(initialActions);
      } catch (error) {
        console.error('Error fetching inventory items:', error);
      } finally {
        setLoading(false);
      }
    };

    findInventoryItems();
  }, [order, isBatch]);

  // Handle action change for an item
  const handleActionChange = (uniqueId: string, action: 'return_to_inventory' | 'mark_as_damaged') => {
    setInventoryActions(prev => 
      prev.map(item => 
        item.uniqueId === uniqueId 
          ? { ...item, action, reason: action === 'return_to_inventory' ? '' : item.reason } 
          : item
      )
    );
  };

  // Handle reason change for damaged items
  const handleReasonChange = (uniqueId: string, reason: string) => {
    setInventoryActions(prev => 
      prev.map(item => 
        item.uniqueId === uniqueId 
          ? { ...item, reason } 
          : item
      )
    );
  };

  // Process all items and confirm
  const handleConfirm = () => {
    onConfirm(inventoryActions);
  };

  // If no inventory items, close immediately
  useEffect(() => {
    if (!loading && inventoryItems.length === 0) {
      onClose(); // No inventory items to process
    }
  }, [loading, inventoryItems, onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fadeIn">
          <div className="flex justify-center items-center h-32">
            <svg className="animate-spin h-8 w-8 text-[#c1902f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-center text-gray-600">Checking inventory items...</p>
        </div>
      </div>
    );
  }

  if (inventoryItems.length === 0) {
    return null; // Will be closed via useEffect
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">
              {isBatch 
                ? 'Manage Inventory for Cancelled Orders' 
                : 'Manage Inventory for Cancelled Order'
              }
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            The following items have inventory tracking. Please specify what should happen to each item.
          </p>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {inventoryItems.map((item, index) => {
              const uniqueItemId = `${item.id}-${item.orderId}-${index}`;
              const action = inventoryActions.find(a => a.uniqueId === uniqueItemId);
              
              return (
                <div 
                  key={uniqueItemId} 
                  className="border border-gray-200 rounded-lg p-4 animate-fadeIn"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Action
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => handleActionChange(uniqueItemId, 'return_to_inventory')}
                          className={`px-4 py-2 rounded-md text-sm font-medium flex-1 ${
                            action?.action === 'return_to_inventory'
                              ? 'bg-green-100 text-green-800 border-2 border-green-300'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Return to Inventory
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActionChange(uniqueItemId, 'mark_as_damaged')}
                          className={`px-4 py-2 rounded-md text-sm font-medium flex-1 ${
                            action?.action === 'mark_as_damaged'
                              ? 'bg-red-100 text-red-800 border-2 border-red-300'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Mark as Damaged
                        </button>
                      </div>
                    </div>

                    {action?.action === 'mark_as_damaged' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason (Optional)
                        </label>
                        <input
                          type="text"
                          value={action.reason || ''}
                          onChange={(e) => handleReasonChange(uniqueItemId, e.target.value)}
                          placeholder="Why is this item damaged?"
                          className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm focus:ring-[#c1902f] focus:border-[#c1902f]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-[#c1902f] text-white rounded-lg text-sm font-medium hover:bg-[#d4a43f] transition-colors shadow-sm"
          >
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
