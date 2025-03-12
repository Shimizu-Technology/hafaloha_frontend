// src/ordering/components/admin/AdminEditOrderModal.tsx
import React, { useState, useEffect } from 'react';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';
import { SetEtaModal } from './SetEtaModal';
import { SearchableMenuItemSelector } from './SearchableMenuItemSelector';
import { PaymentStatusSelector } from './PaymentStatusSelector';
import { InventoryReversionDialog } from './InventoryReversionDialog';
import { menuItemsApi } from '../../../shared/api/endpoints/menuItems';
import { MenuItem } from '../../types/menu';
import {
  handleOrderPreparationStatus,
  calculatePickupTime,
  requiresAdvanceNotice,
} from '../../../shared/utils/orderUtils';

interface AdminEditOrderModalProps {
  order: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

interface OrderItem {
  _editId: string;
  id?: string | number | null;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  customizations?: any;
  paymentStatus?: 'needs_payment' | 'already_paid';
  enable_stock_tracking?: boolean;
  stock_quantity?: number;
  damaged_quantity?: number;
  low_stock_threshold?: number;
  option_groups?: any[];
  image?: string;
  description?: string;
}

export function AdminEditOrderModal({ order, onClose, onSave }: AdminEditOrderModalProps) {
  // 1) Track the "original" items so we can do inventory diffs before saving
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([]);
  // Track newly added items to distinguish from original items with same IDs
  const [newlyAddedItemIds, setNewlyAddedItemIds] = useState<Set<string>>(new Set());
  // Track if we're loading full menu item data
  const [loadingMenuItemData, setLoadingMenuItemData] = useState(false);

  useEffect(() => {
    if (order.items) {
      // Deep debug to see what we're receiving from the backend
      console.log("RAW items from order:", order.items);
      
      // First set the items from the order to avoid UI delay
      const initialItems = JSON.parse(JSON.stringify(order.items)).map((item: any) => ({
        ...item,
        enable_stock_tracking: !!item.enable_stock_tracking,
      }));
      
      setOriginalItems(initialItems);
      
      // Reset newly added items when order items load
      setNewlyAddedItemIds(new Set());
      
      // Now fetch full menu item data for each item in the order to get accurate inventory tracking info
      const fetchCompleteMenuItemData = async () => {
        try {
          setLoadingMenuItemData(true);
          
          const menuItemPromises = initialItems
            .filter((item: OrderItem) => item.id) // Only fetch for items with IDs
            .map((item: OrderItem) => 
              menuItemsApi.getById(item.id!)
                .then(fullItem => ({
                  ...item,
                  enable_stock_tracking: fullItem.enable_stock_tracking,
                  stock_quantity: fullItem.stock_quantity,
                  damaged_quantity: fullItem.damaged_quantity,
                  low_stock_threshold: fullItem.low_stock_threshold
                }))
                .catch(err => {
                  console.error(`Failed to fetch data for menu item ${item.id}:`, err);
                  return item; // Return original item if fetch fails
                })
            );
          
          const completeItems = await Promise.all(menuItemPromises);
          
          // Update our items with the complete data
          const enhancedItems = initialItems.map((item: OrderItem) => {
            if (!item.id) return item; // Skip items without ID
            
            // Find the matching complete item
            const completeItem = completeItems.find(ci => ci.id === item.id);
            return completeItem || item;
          });
          
          console.log("INIT: Original items set (with complete data):", enhancedItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            enable_stock_tracking: !!item.enable_stock_tracking, // Use consistent property name
            _editId: item._editId
          })));
          
          // Update both original items and local items with complete data
          setOriginalItems(enhancedItems);
          
          // Update local items with the enhanced data but preserve their current _editId
          setLocalItems(prevLocalItems => 
            prevLocalItems.map(localItem => {
              if (!localItem.id) return localItem; // Skip items without ID
              
              // Find the matching enhanced item
              const enhancedItem = enhancedItems.find((ei: OrderItem) => ei.id === localItem.id);
              if (enhancedItem) {
                return {
                  ...enhancedItem,
                  _editId: localItem._editId, // Keep the original _editId
                  // Preserve any local edits that might have been made
                  quantity: localItem.quantity,
                  price: localItem.price,
                  notes: localItem.notes,
                  customizations: localItem.customizations,
                  paymentStatus: localItem.paymentStatus
                };
              }
              return localItem;
            })
          );
          
          setLoadingMenuItemData(false);
        } catch (error) {
          console.error("Error fetching menu item data:", error);
          setLoadingMenuItemData(false);
        }
      };
      
      fetchCompleteMenuItemData();
    }
  }, [order.items]);

  // Local state for items, total, etc.
  const [localItems, setLocalItems] = useState<OrderItem[]>(() => {
    if (!order.items) return [];
    // Make a deep copy with unique _editId and explicitly preserve inventory tracking
    return order.items.map((item: any, index: number) => ({
      ...item,
      _editId: `item-${item.id}-${index}-${JSON.stringify(item.customizations || {})}`,
      enable_stock_tracking: !!item.enable_stock_tracking, // Ensure boolean value
    }));
  });

  const [localTotal, setLocalTotal] = useState<string>(String(order.total || '0'));
  const [originalStatus] = useState(order.status);
  const [localStatus, setLocalStatus] = useState(order.status);
  const [localInstructions, setLocalInstructions] = useState(
    order.special_instructions || order.specialInstructions || ''
  );

  // State for ETA modal (for status=preparing)
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(requiresAdvanceNotice(order) ? 10.0 : 5);

  // State for ETA update modal
  const [showEtaUpdateModal, setShowEtaUpdateModal] = useState(false);
  const [updateEtaMinutes, setUpdateEtaMinutes] = useState(() => {
    if (order.estimatedPickupTime || order.estimated_pickup_time) {
      const etaDate = new Date(order.estimatedPickupTime || order.estimated_pickup_time);

      if (requiresAdvanceNotice(order)) {
        // Convert to hour.minute format
        return etaDate.getHours() + (etaDate.getMinutes() === 30 ? 0.3 : 0);
      } else {
        // Calculate minutes from now
        const minutesFromNow = Math.max(5, Math.round((etaDate.getTime() - Date.now()) / 60000));
        return Math.ceil(minutesFromNow / 5) * 5;
      }
    }
    return requiresAdvanceNotice(order) ? 10.0 : 5;
  });

  // Menu item selector
  const [showMenuItemSelector, setShowMenuItemSelector] = useState(false);

  // Inventory reversion dialog
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ item: OrderItem; editId: string } | null>(
    null
  );
  
  // Track items removed and marked as damaged - these will be processed at save time
  const [itemsToMarkAsDamaged, setItemsToMarkAsDamaged] = useState<{
    itemId: string | number;
    quantity: number;
    reason: string;
  }[]>([]);

  const [activeTab, setActiveTab] = useState<'items' | 'details'>('items');

  // -------------- ITEM/ORDER FIELD HANDLERS --------------------

  function handleItemChange(editId: string, field: string, value: string | number) {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item._editId === editId) {
          return {
            ...item,
            [field]: field === 'price' ? parseFloat(String(value)) : value,
          };
        }
        return item;
      })
    );
  }

  function handlePaymentStatusChange(editId: string, status: 'needs_payment' | 'already_paid') {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item._editId === editId) {
          return { ...item, paymentStatus: status };
        }
        return item;
      })
    );
  }

  function handleRemoveItem(editId: string) {
    const item = localItems.find((it) => it._editId === editId);
    if (!item) return;

    // Check if this is a newly added item by its editId
    const isNewlyAdded = newlyAddedItemIds.has(editId);
    
    // Deep debug to understand what's happening
    console.log("DEBUG - Original items array:", originalItems.map(i => ({ 
      id: i.id, 
      name: i.name,
      enable_stock_tracking: !!i.enable_stock_tracking // Consistent property name
    })));
    
    // For debugging: show item details with explicit checks
    console.log("Removing item:", { 
      id: item.id, 
      name: item.name, 
      editId,
      enable_stock_tracking: !!item.enable_stock_tracking, // Consistent property name
      has_id: !!item.id,
      is_newly_added: isNewlyAdded
    });

    // Fixed Logic:
    // 1. If the item has inventory tracking AND is NOT newly added
    //    => Show the inventory dialog because inventory was already removed
    // 2. Otherwise, just remove it without prompting
    
    if (item.enable_stock_tracking && !isNewlyAdded) {
      // This item has inventory tracking AND was in the original order
      // We need to show the dialog to handle inventory
      console.log("Item has inventory tracking and was in original order - showing dialog:", item.name);
      setItemToRemove({ item, editId });
      setShowInventoryDialog(true);
    } else {
      // Either the item doesn't have inventory tracking OR it's a newly added item
      // Just remove without prompt
      console.log("Item removed without dialog - either no inventory tracking or newly added item");
      setLocalItems((prev) => prev.filter((it) => it._editId !== editId));
    }
  }

  function handleInventoryAction(action: 'return_to_inventory' | 'mark_as_damaged', reason?: string) {
    if (!itemToRemove) return;
    const { item, editId } = itemToRemove;

    // Store action type for tracking in case we need to debug
    const actionType = action;
    console.log(`Removing item ${item.name} with action: ${actionType}${reason ? `, reason: ${reason}` : ''}`);
    
    // Simply remove the item from local order
    setLocalItems((prev) => prev.filter((i) => i._editId !== editId));
    
    // If marked as damaged, track for processing at save time
    if (action === 'mark_as_damaged' && item.id) {
      setItemsToMarkAsDamaged((prev) => [
        ...prev,
        {
          itemId: item.id!,
          quantity: item.quantity,
          reason: reason || 'Damaged during order edit'
        }
      ]);
    }

    setShowInventoryDialog(false);
    setItemToRemove(null);
  }

  function handleAddItem() {
    setShowMenuItemSelector(true);
  }

  function handleMenuItemSelect(selectedItem: MenuItem) {
    const newEditId = `new-item-${Date.now()}`;
    const newItem = {
      ...selectedItem,
      id: selectedItem.id,
      quantity: 1,
      notes: '',
      _editId: newEditId,
      paymentStatus: selectedItem.paymentStatus || 'needs_payment',
      // Preserve inventory tracking fields
      enable_stock_tracking: selectedItem.enable_stock_tracking,
      stock_quantity: selectedItem.stock_quantity,
      damaged_quantity: selectedItem.damaged_quantity,
      low_stock_threshold: selectedItem.low_stock_threshold,
    };
    
    // Register this as a newly added item so we don't prompt for inventory when removed
    setNewlyAddedItemIds(prev => {
      const newSet = new Set(prev);
      newSet.add(newEditId);
      return newSet;
    });
    
    // Log the newly added item for debugging
    console.log("Added new item to order:", {
      id: newItem.id,
      name: newItem.name,
      enable_stock_tracking: !!newItem.enable_stock_tracking, // Consistent property name
      is_new: true, // By definition this is a new item
      _editId: newItem._editId
    });
    
    setLocalItems((prev) => [...prev, newItem]);
    setShowMenuItemSelector(false);
  }

  // --------------- INVENTORY DIFFS / FRONTEND --------------------

  /**
   * Identify if an item is new (not in originalItems by ID).
   * We need to be very explicit about the comparison and handle undefined/null cases
   */
  function isNewItem(item: OrderItem) {
    if (!item.id) return true; // If it has no ID, it's definitely new
    
    const result = !originalItems.some(orig => 
      orig.id !== undefined && item.id !== undefined && String(orig.id) === String(item.id)
    );
    
    console.log(`isNewItem check for ${item.name} (id: ${item.id}): ${result}`);
    return result;
  }

  /**
   * Find the matching item in originalItems by ID, if any.
   * Using the same robust ID comparison as isNewItem for consistency
   */
  function findOriginalItem(item: OrderItem) {
    if (!item.id) return undefined;
    
    return originalItems.find(orig => 
      orig.id !== undefined && item.id !== undefined && String(orig.id) === String(item.id)
    );
  }

  /**
   * Track inventory changes for logging purposes only - actual updates are handled by the backend.
   * This ensures we have proper data for debugging when needed.
   */
  async function processInventoryChanges() {
    console.log('Tracking inventory changes - updates will be handled by backend...');
    
    // Log information about new items that will affect inventory
    const newItems = localItems.filter((item) => item.enable_stock_tracking && isNewItem(item));
    console.log(`Found ${newItems.length} new inventory-tracked items to add`);
    
    for (const item of newItems) {
      console.log(`New tracked item: ${item.name}, quantity: ${item.quantity}, current stock: ${item.stock_quantity}`);
    }

    // Log information about changed quantities
    for (const item of localItems) {
      if (!item.enable_stock_tracking) continue;
      if (isNewItem(item)) continue; // skip new items (already logged)

      const orig = findOriginalItem(item);
      if (orig) {
        const qtyDiff = item.quantity - (orig.quantity || 0);
        if (qtyDiff !== 0) {
          console.log(`Changing quantity for tracked item: ${item.name}, from: ${orig.quantity} to: ${item.quantity}, diff: ${qtyDiff}`);
        }
      }
    }
    
    // The backend's process_inventory_changes method in OrdersController 
    // handles all actual inventory updates
  }

  // --------------- SUBTOTAL / SAVE --------------------

  const calculateSubtotal = () => {
    return localItems
      .reduce((sum, item) => {
        const price = parseFloat(String(item.price)) || 0;
        const qty = parseInt(String(item.quantity), 10) || 0;
        return sum + price * qty;
      }, 0)
      .toFixed(2);
  };

  function handleSave() {
    // If we changed from pending => preparing, show the ETA modal
    const { shouldShowEtaModal } = handleOrderPreparationStatus(order, localStatus, originalStatus);
    if (shouldShowEtaModal) {
      setShowEtaModal(true);
      return;
    }
    proceedWithSave();
  }

  function handleConfirmEta() {
    const pickupTime = calculatePickupTime(order, etaMinutes);
    proceedWithSave(pickupTime);
    setShowEtaModal(false);
  }

  function handleConfirmEtaUpdate() {
    const pickupTime = calculatePickupTime(order, updateEtaMinutes);
    proceedWithSave(pickupTime);
    setShowEtaUpdateModal(false);
  }

  /**
   * Final save: We first process inventory changes
   * then build our updated order object and pass it up via onSave.
   */
  async function proceedWithSave(pickupTime?: string) {
    try {
      console.log('Starting save process with inventory changes...');
      
      // 1) Process inventory changes for logging
      console.log('Calling processInventoryChanges()...');
      await processInventoryChanges();
      console.log('Inventory changes processed successfully');

      // 2) Process any items marked as damaged (these are now processed at save time)
      if (itemsToMarkAsDamaged.length > 0) {
        console.log(`Processing ${itemsToMarkAsDamaged.length} damaged items...`);
        const damagePromises = itemsToMarkAsDamaged.map(item => 
          menuItemsApi.markAsDamaged(item.itemId, {
            quantity: item.quantity,
            reason: item.reason,
            order_id: order.id
          }).catch(error => {
            console.error(`Failed to mark item ${item.itemId} as damaged:`, error);
          })
        );
        
        // Wait for all damage marking to complete
        await Promise.all(damagePromises);
        console.log('Damaged items processed successfully');
      }

      // 3) Build updated order payload
      const parsedTotal = parseFloat(localTotal) || 0.0;
      
      // Clean the items to only include fields expected by the backend
      const cleanedItems = localItems.map((item: OrderItem) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || '',
        customizations: item.customizations || {},
        // Only include inventory fields if they exist
        ...(item.enable_stock_tracking && {
          enable_stock_tracking: item.enable_stock_tracking,
          stock_quantity: item.stock_quantity,
          damaged_quantity: item.damaged_quantity,
          low_stock_threshold: item.low_stock_threshold
        })
      }));

      // Only include fields that are permitted in Rails strong parameters
      const updated = {
        id: order.id, // Keep ID for the API route
        restaurant_id: order.restaurant_id,
        user_id: order.user_id,
        items: cleanedItems,
        total: parsedTotal,
        status: localStatus,
        special_instructions: localInstructions,
        contact_name: order.contact_name,
        contact_phone: order.contact_phone,
        contact_email: order.contact_email,
        payment_method: order.payment_method,
        transaction_id: order.transaction_id,
        payment_status: order.payment_status,
        payment_amount: order.payment_amount,
        promo_code: order.promo_code,
        merchandise_items: order.merchandise_items || [],
        estimated_pickup_time: pickupTime || order.estimated_pickup_time // Include this field to fix TypeScript error
      };

      // 4) Trigger the actual save to the backend
      console.log('Saving updated order to backend:', { 
        id: updated.id, 
        itemCount: updated.items.length,
        status: updated.status,
        items: updated.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          enable_stock_tracking: !!item.enable_stock_tracking // Consistent property name
        }))
      });
      
      onSave(updated);
    } catch (error) {
      console.error('Error during order save process:', error);
      alert('There was an error updating the order. Please try again.');
    }
  }

  // --------------- UI / RENDER --------------------

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      confirmed: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const renderItemsTab = () => (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Items list */}
      <div className="space-y-3">
        {localItems.map((item, idx) => (
          <div
            key={item._editId}
            className="border border-gray-200 rounded-lg p-4 space-y-3 transition-shadow hover:shadow-md animate-fadeIn"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900">Item {idx + 1}</h5>
              <button
                type="button"
                onClick={() => handleRemoveItem(item._editId)}
                className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 
                       01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 
                       1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Remove
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm
                             focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                  value={item.name}
                  onChange={(e) => handleItemChange(item._editId, 'name', e.target.value)}
                  placeholder="Item name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm
                               focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(item._editId, 'quantity', parseInt(e.target.value, 10))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      className="border border-gray-300 rounded-md pl-7 pr-3 py-2 w-full text-sm
                                 focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => handleItemChange(item._editId, 'price', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm
                             focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
                  value={item.notes || ''}
                  onChange={(e) => handleItemChange(item._editId, 'notes', e.target.value)}
                  placeholder="Special requests or modifications"
                />
              </div>

              {/* Payment status selector for newly added items (no real ID in DB yet) */}
              {!item.id && (
                <div className="mt-3">
                  <PaymentStatusSelector
                    value={item.paymentStatus || 'needs_payment'}
                    onChange={(status) => handlePaymentStatusChange(item._editId, status)}
                  />
                </div>
              )}

              <div className="space-y-3">
                {/* Show customizations if they exist */}
                {item.customizations && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h6 className="text-sm font-medium text-gray-700 mb-2">Customizations:</h6>
                    <div className="text-xs text-gray-600">
                      {Array.isArray(item.customizations) ? (
                        // array format
                        item.customizations.map((custom: any, cidx: number) => (
                          <div key={`${item._editId}-custom-${cidx}`}>
                            {custom.option_name}
                            {custom.price > 0 && ` (+$${custom.price.toFixed(2)})`}
                          </div>
                        ))
                      ) : (
                        // object format
                        Object.entries(item.customizations).map(
                          ([group, options]: [string, any], cidx: number) => (
                            <div key={`${item._editId}-custom-${cidx}`}>
                              <span className="font-medium">{group}:</span>{' '}
                              {Array.isArray(options) ? options.join(', ') : options}
                            </div>
                          )
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 text-right text-sm font-medium text-gray-700">
                  Item Total: $
                  {(
                    (parseFloat(String(item.price)) || 0) *
                    (parseInt(String(item.quantity), 10) || 0)
                  ).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add item button */}
      <button
        type="button"
        onClick={handleAddItem}
        className="w-full flex items-center justify-center px-4 py-3 bg-gray-50 text-sm font-medium
                   text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Add Item
      </button>

      {/* Order summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Subtotal</span>
          <span className="text-sm font-medium">${calculateSubtotal()}</span>
        </div>
        <div
          className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 border-t border-gray-100
                     space-y-2 sm:space-y-0"
        >
          <span className="text-base font-medium text-gray-900">Total</span>
          <div className="relative w-full sm:w-32">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              step="0.01"
              className="border border-gray-300 rounded-md pl-7 pr-3 py-2 w-full text-sm
                         focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors
                         text-right font-medium"
              value={localTotal}
              onChange={(e) => setLocalTotal(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailsTab = () => (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Special instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
        <textarea
          className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm
                     focus:ring-[#c1902f] focus:border-[#c1902f] transition-colors"
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

      {/* ETA adjustment if status=preparing */}
      {localStatus === 'preparing' && (
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
          <div className="flex items-start mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 
                   0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="font-medium text-sm text-amber-800">Pickup Time / ETA</h4>
              {order.estimatedPickupTime || order.estimated_pickup_time ? (
                <p className="text-sm text-amber-700 mt-1">
                  Current ETA:{' '}
                  {new Date(order.estimatedPickupTime || order.estimated_pickup_time).toLocaleString()}
                </p>
              ) : (
                <p className="text-sm text-amber-700 mt-1">No ETA set</p>
              )}
            </div>
          </div>

          <div className="bg-amber-100 rounded p-3 mb-3 flex items-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 
                   0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464
                   0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-amber-800">
              Changing the ETA will send updated notifications to the customer.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowEtaUpdateModal(true)}
            className="w-full flex items-center justify-center px-4 py-2 bg-amber-100
                       hover:bg-amber-200 text-amber-800 rounded-md text-sm font-medium
                       transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M11 5H6a2 2 0 
                   00-2 2v11a2 2 0 002 2h11a2 2 0 
                   002-2v-5m-1.414-9.414a2 2 0 
                   112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
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
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Order #{order.id}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1
                           rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Status selector */}
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
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                  value={localStatus}
                  onChange={(value) => setLocalStatus(value)}
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto relative">
            <div
              className={`transition-opacity duration-300 ${
                activeTab === 'items' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}
            >
              {activeTab === 'items' && renderItemsTab()}
            </div>
            <div
              className={`transition-opacity duration-300 ${
                activeTab === 'details' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}
            >
              {activeTab === 'details' && renderDetailsTab()}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-white border border-gray-300
                         text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50
                         transition-colors order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-[#c1902f] text-white rounded-lg
                         text-sm font-medium hover:bg-[#d4a43f] transition-colors shadow-sm
                         order-1 sm:order-2"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* ETA Modals */}
      {showEtaModal && (
        <SetEtaModal
          order={order}
          etaMinutes={etaMinutes}
          setEtaMinutes={setEtaMinutes}
          onClose={() => setShowEtaModal(false)}
          onConfirm={handleConfirmEta}
        />
      )}
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

      {/* Item Selector */}
      {showMenuItemSelector && (
        <SearchableMenuItemSelector onSelect={handleMenuItemSelect} onClose={() => setShowMenuItemSelector(false)} />
      )}

      {/* Inventory reversion dialog */}
      {showInventoryDialog && itemToRemove && (
        <InventoryReversionDialog
          itemName={itemToRemove.item.name}
          onClose={() => {
            setShowInventoryDialog(false);
            setItemToRemove(null);
          }}
          onConfirm={handleInventoryAction}
        />
      )}
    </>
  );
}
