// src/ordering/components/admin/AdminEditOrderModal.tsx

import React, { useState, useEffect } from 'react';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';
import { SetEtaModal } from './SetEtaModal';
import { SearchableMenuItemSelector } from './SearchableMenuItemSelector';
import { PaymentStatusSelector } from './PaymentStatusSelector';
import { InventoryReversionDialog } from './InventoryReversionDialog';
import { RefundModal } from './RefundModal';
import { OrderPaymentHistory } from './OrderPaymentHistory';
import { AdditionalPaymentModal } from './AdditionalPaymentModal';
import { menuItemsApi } from '../../../shared/api/endpoints/menuItems';
import { orderPaymentsApi } from '../../../shared/api/endpoints/orderPayments';
import { MenuItem } from '../../types/menu';
import {
  handleOrderPreparationStatus,
  calculatePickupTime,
  requiresAdvanceNotice,
} from '../../../shared/utils/orderUtils';

interface OrderPayment {
  id: number;
  payment_type: 'initial' | 'additional' | 'refund';
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  description?: string;
  transaction_id?: string;
}

interface AdminEditOrderModalProps {
  order: any; // The full order object
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

/** 
 * Represents an item on the order. 
 * 
 * (You may have different or additional fields in your real code, e.g., customizations, etc.)
 */
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
  // -----------------------------
  // 1) Original vs. local items
  // -----------------------------
  /**
   * Holds the original array of items from the order (used to detect new vs. existing).
   */
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([]);

  /**
   * Track the edit state of items in the order; this is what the user manipulates in the UI.
   */
  const [localItems, setLocalItems] = useState<OrderItem[]>(() => {
    if (!order.items) return [];
    // Make a deep copy with a unique _editId for each item
    return order.items.map((item: any, index: number) => ({
      ...item,
      _editId: `item-${item.id}-${index}-${JSON.stringify(item.customizations || {})}`,
      enable_stock_tracking: !!item.enable_stock_tracking,
      paymentStatus: item.paymentStatus || 'already_paid',
    }));
  });

  /**
   * For items that are newly added, we keep track of them separately so we can skip inventory reversion when removing them.
   */
  const [newlyAddedItemIds, setNewlyAddedItemIds] = useState<Set<string>>(new Set());

  /**
   * When an item is removed but it was part of the original order, we may prompt about inventory reversion.
   */
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ item: OrderItem; editId: string } | null>(
    null
  );

  /**
   * We store items that need to be marked as damaged (for the backend to handle on save).
   */
  const [itemsToMarkAsDamaged, setItemsToMarkAsDamaged] = useState<{
    itemId: string | number;
    quantity: number;
    reason: string;
  }[]>([]);

  // For loading the full menu item data (inventory, etc.)
  const [loadingMenuItemData, setLoadingMenuItemData] = useState(false);

  useEffect(() => {
    if (order.items) {
      // Build the original array of items (deep copy)
      const initialItems: OrderItem[] = JSON.parse(JSON.stringify(order.items)).map((item: any) => ({
        ...item,
        enable_stock_tracking: !!item.enable_stock_tracking,
        paymentStatus: item.paymentStatus || 'already_paid',
      }));
      setOriginalItems(initialItems);
      setNewlyAddedItemIds(new Set());

      // Possibly fetch extra data about each item (like stock details) from the backend
      const fetchCompleteMenuItemData = async () => {
        try {
          setLoadingMenuItemData(true);
          const menuItemPromises = initialItems
            .filter((it) => it.id)
            .map((it) =>
              menuItemsApi
                .getById(it.id!)
                .then((fullItem) => ({
                  ...it,
                  enable_stock_tracking: fullItem.enable_stock_tracking,
                  stock_quantity: fullItem.stock_quantity,
                  damaged_quantity: fullItem.damaged_quantity,
                  low_stock_threshold: fullItem.low_stock_threshold,
                }))
                .catch((err) => {
                  console.error(`Failed to fetch data for menu item ${it.id}:`, err);
                  return it;
                })
            );

          const completeItems = await Promise.all(menuItemPromises);

          // Update originalItems with full data
          setOriginalItems(completeItems);

          // Also update localItems to reflect any changes in inventory tracking fields
          setLocalItems((prevLocal) =>
            prevLocal.map((localItem) => {
              if (!localItem.id) return localItem;
              const enriched = completeItems.find(
                (ci) => ci.id && String(ci.id) === String(localItem.id)
              );
              if (!enriched) return localItem;

              return {
                ...enriched,
                _editId: localItem._editId,
                quantity: localItem.quantity,
                notes: localItem.notes,
                price: localItem.price,
                paymentStatus: localItem.paymentStatus,
                customizations: localItem.customizations,
              };
            })
          );
        } catch (error) {
          console.error('Error fetching menu item data:', error);
        } finally {
          setLoadingMenuItemData(false);
        }
      };

      fetchCompleteMenuItemData();
    }
  }, [order.items]);

  // -----------------------------
  // 2) Order-level local state
  // -----------------------------
  const [originalStatus] = useState(order.status);
  const [localStatus, setLocalStatus] = useState(order.status);

  const [localTotal, setLocalTotal] = useState<string>(String(order.total || '0'));
  const [localInstructions, setLocalInstructions] = useState(
    order.special_instructions || order.specialInstructions || ''
  );

  // Handling ETA modals if the status changes from pending -> preparing
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(requiresAdvanceNotice(order) ? 10 : 5);

  // If status is preparing, we might let user update the ETA
  const [showEtaUpdateModal, setShowEtaUpdateModal] = useState(false);
  const [updateEtaMinutes, setUpdateEtaMinutes] = useState(() => {
    if (order.estimatedPickupTime || order.estimated_pickup_time) {
      const etaDate = new Date(order.estimatedPickupTime || order.estimated_pickup_time);
      if (requiresAdvanceNotice(order)) {
        // 1. Convert to e.g. 10.5 if it's 10:30
        return etaDate.getHours() + (etaDate.getMinutes() === 30 ? 0.3 : 0);
      } else {
        // 2. If not advance notice, just convert to minutes from now
        const minutesFromNow = Math.max(5, Math.round((etaDate.getTime() - Date.now()) / 60000));
        return Math.ceil(minutesFromNow / 5) * 5;
      }
    }
    return requiresAdvanceNotice(order) ? 10 : 5;
  });

  // -----------------------------
  // 3) Payment / Refund state
  // -----------------------------
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [maxRefundable, setMaxRefundable] = useState<number>(0);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showAdditionalPaymentModal, setShowAdditionalPaymentModal] = useState(false);

  // For tab switching
  const [activeTab, setActiveTab] = useState<'items' | 'details' | 'payments'>('items');

  // -----------------------------
  // 4) Item add/remove/edit
  // -----------------------------
  function handleItemChange(_editId: string, field: string, value: any) {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item._editId === _editId) {
          return {
            ...item,
            [field]: value
          };
        }
        return item;
      })
    );

    // If modifying quantity or price, update the local total
    if (field === 'quantity' || field === 'price') {
      const updatedSubtotal = calculateSubtotal();
      setLocalTotal(updatedSubtotal);
    }
  }

  function handleAddItem() {
    setShowMenuItemSelector(true);
  }

  const [showMenuItemSelector, setShowMenuItemSelector] = useState(false);

  function handleMenuItemSelect(selectedItem: MenuItem) {
    setShowMenuItemSelector(false);

    // Create a new local item (with default quantity=1, paymentStatus=needs_payment)
    const newEditId = `new-item-${Date.now()}`;
    const newItem: OrderItem = {
      ...selectedItem,
      id: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price ?? 0,
      quantity: 1,
      notes: '',
      _editId: newEditId,
      paymentStatus: 'needs_payment',
      enable_stock_tracking: selectedItem.enable_stock_tracking,
      stock_quantity: selectedItem.stock_quantity,
      damaged_quantity: selectedItem.damaged_quantity,
      low_stock_threshold: selectedItem.low_stock_threshold,
    };

    // Mark this item as newly added
    setNewlyAddedItemIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(newEditId);
      return newSet;
    });

    // Add to localItems
    setLocalItems((prev) => [...prev, newItem]);
  }

  function handleRemoveItem(editId: string) {
    const item = localItems.find((i) => i._editId === editId);
    if (!item) return;

    const isNewlyAdded = newlyAddedItemIds.has(editId);

    // If item has inventory tracking AND is NOT newly added, prompt for reversion
    if (item.enable_stock_tracking && !isNewlyAdded) {
      setItemToRemove({ item, editId });
      setShowInventoryDialog(true);
    } else {
      // Otherwise remove immediately
      setLocalItems((prev) => prev.filter((i) => i._editId !== editId));
    }
  }

  function handleInventoryDialogAction(
    action: 'return_to_inventory' | 'mark_as_damaged',
    reason?: string
  ) {
    if (!itemToRemove) return;
    const { item, editId } = itemToRemove;

    // Remove from local items
    setLocalItems((prev) => prev.filter((i) => i._editId !== editId));

    // If user said "mark as damaged"
    if (action === 'mark_as_damaged' && item.id) {
      setItemsToMarkAsDamaged((prev) => [
        ...prev,
        {
          itemId: item.id!,
          quantity: item.quantity,
          reason: reason || 'Damaged during order edit',
        },
      ]);
    }

    setShowInventoryDialog(false);
    setItemToRemove(null);
  }

  // -----------------------------
  // 5) Payment handling
  // -----------------------------
  // When user clicks to the Payments tab, fetch payments
  useEffect(() => {
    if (activeTab === 'payments' && order.id) {
      fetchPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, order.id]);

  async function fetchPayments() {
    if (!order.id) return;
    setLoadingPayments(true);
    try {
      const resp = await orderPaymentsApi.getPayments(order.id);
      /**
       * The controller (OrderPaymentsController) typically returns something like:
       * {
       *   payments: [...],
       *   total_paid: number,
       *   total_refunded: number,
       *   net_amount: number
       * }
       */
      const responseData = resp as any;
      let { payments: list, total_paid, total_refunded } = responseData.data;
      
      // If no payment records found but order has a total, create a synthetic initial payment record
      if (list.length === 0 && order.total > 0) {
        const initialPayment: OrderPayment = {
          id: 0, // Temporary ID
          payment_type: 'initial' as const,
          amount: parseFloat(order.total),
          payment_method: order.payment_method || 'credit_card',
          status: 'completed',
          created_at: order.createdAt || new Date().toISOString(),
          description: 'Initial payment',
          transaction_id: order.transaction_id || 'N/A'
        };
        
        list = [initialPayment];
        total_paid = parseFloat(order.total);
        total_refunded = 0;
      }
      
      setPayments(list);
      setMaxRefundable(Math.max(0, total_paid - total_refunded));
    } catch (err) {
      console.error('Failed to load payments:', err);
      
      // Fallback: If API call fails but order has a total, set a default refundable amount
      if (order.total > 0) {
        setMaxRefundable(parseFloat(order.total));
        
        // Create a synthetic payment record
        const initialPayment: OrderPayment = {
          id: 0,
          payment_type: 'initial' as const,
          amount: parseFloat(order.total),
          payment_method: order.payment_method || 'credit_card',
          status: 'completed',
          created_at: order.createdAt || new Date().toISOString(),
          description: 'Initial payment',
          transaction_id: order.transaction_id || 'N/A'
        };
        
        setPayments([initialPayment]);
      }
    } finally {
      setLoadingPayments(false);
    }
  }

  async function handleRefundCreated() {
    // After refund completes in RefundModal, re-fetch payments
    try {
      const resp = await orderPaymentsApi.getPayments(order.id);
      const { total_paid, total_refunded } = resp.data;
      
      // Check if this is a full refund (all money returned)
      const isFullRefund = Math.abs(total_paid - total_refunded) < 0.01;
      
      // Update the local status based on refund type
      if (isFullRefund) {
        setLocalStatus('refunded');
      } else if (total_refunded > 0) {
        setLocalStatus('partially_refunded');
      }
      
      // Refresh payment data
      fetchPayments();
    } catch (error) {
      console.error('Error updating status after refund:', error);
    }
  }

  // Creating an additional payment for items that still need payment
  function handleProcessAdditionalPayment() {
    // Identify items with paymentStatus=needs_payment
    const itemsNeedingPayment = localItems
      .filter((it) => it.paymentStatus === 'needs_payment')
      .map((it) => ({
        id: typeof it.id === 'string' ? parseInt(it.id, 10) || 0 : (it.id || 0),
        name: it.name,
        price: it.price,
        quantity: it.quantity,
      }));

    if (itemsNeedingPayment.length === 0) {
      alert('No items require payment.');
      return;
    }

    // Show the additional payment modal
    setShowAdditionalPaymentModal(true);
  }

  function handleAdditionalPaymentCompleted() {
    // Mark all items that needed payment as paid
    setLocalItems((prev) =>
      prev.map((item) =>
        item.paymentStatus === 'needs_payment'
          ? { ...item, paymentStatus: 'already_paid' }
          : item
      )
    );

    // Refresh payment history
    fetchPayments();
    
    // Close the modal
    setShowAdditionalPaymentModal(false);
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

  // -----------------------------
  // 6) Inventory & order saving
  // -----------------------------
  function isNewItem(item: OrderItem) {
    if (!item.id) return true;
    return !originalItems.some((orig) => orig.id && String(orig.id) === String(item.id));
  }

  function findOriginalItem(item: OrderItem) {
    if (!item.id) return undefined;
    return originalItems.find(
      (orig) => orig.id && String(orig.id) === String(item.id)
    );
  }

  async function processInventoryChanges() {
    // In a real implementation, your backend might handle the actual inventory changes.
    // We just log them here (or do minimal calls if needed).
    console.log('Processing inventory changes...');
    for (const item of localItems) {
      if (!item.enable_stock_tracking) continue;
      const orig = findOriginalItem(item);
      // If no orig -> new item
      // If orig -> check quantity difference
      // etc.
    }
  }

  // Final “Save” button
  function handleSave() {
    // If we're going from pending -> preparing, show the ETA modal
    const { shouldShowEtaModal } = handleOrderPreparationStatus(order, localStatus, originalStatus);
    if (shouldShowEtaModal) {
      setShowEtaModal(true);
      return;
    }
    proceedWithSave();
  }

  // Called after user confirms the initial ETA
  function handleConfirmEta() {
    const pickupTime = calculatePickupTime(order, etaMinutes);
    proceedWithSave(pickupTime);
    setShowEtaModal(false);
  }

  // Called if user updates the ETA while in “preparing” status
  function handleConfirmEtaUpdate() {
    const pickupTime = calculatePickupTime(order, updateEtaMinutes);
    proceedWithSave(pickupTime);
    setShowEtaUpdateModal(false);
  }

  async function proceedWithSave(pickupTime?: string) {
    try {
      // 1) Process inventory changes (for logging or sending to backend)
      await processInventoryChanges();

      // 2) Mark items as damaged if flagged
      if (itemsToMarkAsDamaged.length > 0) {
        // Make calls to your backend, e.g.:
        const damageCalls = itemsToMarkAsDamaged.map((d) =>
          menuItemsApi.markAsDamaged(d.itemId, {
            quantity: d.quantity,
            reason: d.reason,
            order_id: order.id,
          })
        );
        await Promise.all(damageCalls);
      }

      // 3) Build updated order object
      const parsedTotal = parseFloat(localTotal) || 0;
      const cleanedItems = localItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || '',
        customizations: item.customizations || {},
        ...(item.enable_stock_tracking && {
          enable_stock_tracking: item.enable_stock_tracking,
          stock_quantity: item.stock_quantity,
          damaged_quantity: item.damaged_quantity,
          low_stock_threshold: item.low_stock_threshold,
        }),
      }));

      const updatedOrder = {
        id: order.id,
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
        estimated_pickup_time: pickupTime || order.estimatedPickupTime,
      };

      // 4) Trigger the parent's onSave to do the actual backend update
      onSave(updatedOrder);
    } catch (error) {
      console.error('Error saving order changes:', error);
      alert('Failed to save order changes. Check console for details.');
    }
  }

  // -----------------------------
  // 7) UI Rendering
  // -----------------------------
  function getStatusBadgeColor(status: string) {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      confirmed: 'bg-purple-100 text-purple-800',
      refunded: 'bg-purple-100 text-purple-800',
      partially_refunded: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  }

  function renderItemsTab() {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        {/* Items */}
        <div className="space-y-3">
          {localItems.map((item, idx) => (
            <div
              key={item._editId}
              className="border border-gray-200 rounded-lg p-4 space-y-3 transition-shadow hover:shadow-md"
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
                      d="M19 7l-.867 12.142A2
                         2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5
                         7m5 4v6m4-6v6m1-10V4a1
                         1 0 00-1-1h-4a1 1 0
                         00-1 1v3M4 7h16"
                    />
                  </svg>
                  Remove
                </button>
              </div>

              {/* Item fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm"
                    value={item.name}
                    onChange={(e) => handleItemChange(item._editId, 'name', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm"
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
                        className="border border-gray-300 rounded-md pl-7 pr-3 py-2 w-full text-sm"
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
                    className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm"
                    value={item.notes || ''}
                    onChange={(e) => handleItemChange(item._editId, 'notes', e.target.value)}
                    placeholder="Special requests / modifications"
                  />
                </div>

                {/* PaymentStatusSelector for newly added items or if you want to allow toggling explicitly */}
                <div className="mt-2">
                  <PaymentStatusSelector
                    value={item.paymentStatus || 'needs_payment'}
                    onChange={(st) => handlePaymentStatusChange(item._editId, st)}
                  />
                </div>

                {/* Display customizations in a user-friendly format */}
                {item.customizations && Object.keys(item.customizations).length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h6 className="text-sm font-medium text-gray-700 mb-2">Customizations:</h6>
                    <div className="space-y-2">
                      {Object.entries(item.customizations).map(([category, values]) => (
                        <div key={category} className="text-sm">
                          <span className="font-medium">{category}:</span>
                          {Array.isArray(values) ? (
                            <ul className="list-disc pl-5 mt-1">
                              {values.map((value, idx) => (
                                <li key={idx} className="text-gray-600">{value}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-600 ml-2">{String(values)}</span>
                          )}
                        </div>
                      ))}
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
          ))}
        </div>

        {/* Button to add new item */}
        <button
          type="button"
          onClick={handleAddItem}
          className="w-full flex items-center justify-center px-4 py-3 bg-gray-50 text-sm font-medium
                     text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0
               0v6m0-6h6m-6 0H6" />
          </svg>
          Add Item
        </button>

        {/* Subtotal / total area */}
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
                className="border border-gray-300 rounded-md pl-7 pr-3 py-2 w-full text-sm text-right font-medium"
                value={localTotal}
                onChange={(e) => setLocalTotal(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function calculateSubtotal() {
    return localItems
      .reduce((sum, it) => {
        const price = parseFloat(String(it.price)) || 0;
        const qty = parseInt(String(it.quantity), 10) || 0;
        return sum + price * qty;
      }, 0)
      .toFixed(2);
  }

  function renderDetailsTab() {
    return (
      <div className="space-y-5 p-4 sm:p-6">
        {/* Special instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
          <textarea
            className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm"
            rows={4}
            value={localInstructions}
            onChange={(e) => setLocalInstructions(e.target.value)}
            placeholder="Any special instructions for this order"
          />
        </div>

        {/* Basic metadata */}
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

        {/* If localStatus=preparing, let them update ETA */}
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
                  d="M12 9v2m0
                     4h.01m-6.938 4h13.856c1.54
                     0 2.502-1.667 1.732-3L13.732
                     4c-.77-1.333-2.694-1.333-3.464
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
                     00-2 2v11a2 2 0
                     002 2h11a2 2 0
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
  }

  function renderPaymentsTab() {
    // Count how many items are still needs_payment
    const needsPaymentCount = localItems.filter((it) => it.paymentStatus === 'needs_payment').length;
    const hasPayments = payments.length > 0;

    return (
      <div className="p-4 sm:p-6 space-y-4">
        {loadingPayments ? (
          <p className="text-gray-600">Loading payment history...</p>
        ) : (
          <>
            {/* Payment Actions - Prominent buttons at the top */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <h3 className="text-base font-medium text-gray-900 mb-3">Payment Actions</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {needsPaymentCount > 0 && (
                  <button
                    onClick={handleProcessAdditionalPayment}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Process Additional Payment
                  </button>
                )}
                
                <button
                  onClick={() => setShowRefundModal(true)}
                  disabled={maxRefundable <= 0}
                  className={`px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center
                    ${maxRefundable > 0 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Issue Refund
                </button>
              </div>
              
              <div className="mt-3 text-sm">
                {needsPaymentCount > 0 && (
                  <p className="text-gray-600 mb-1">
                    <span className="font-medium">{needsPaymentCount}</span> item(s) still require payment.
                  </p>
                )}
                <p className="text-gray-600">
                  Max refundable amount: <span className="font-medium">${maxRefundable.toFixed(2)}</span>
                </p>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-3">Payment History</h3>
              {hasPayments ? (
                <OrderPaymentHistory payments={payments} />
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-500 text-sm">No payment records found for this order.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // -----------------------------
  // 8) Render the modal layout
  // -----------------------------
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-lg w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slideUp relative">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Order #{order.id}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1
                           rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                    localStatus
                  )}`}
                >
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
                    { value: 'refunded', label: 'Refunded' },
                    { value: 'partially_refunded', label: 'Partially Refunded' },
                  ]}
                  value={localStatus}
                  onChange={(val) => setLocalStatus(val)}
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
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'payments'
                  ? 'text-[#c1902f] border-b-2 border-[#c1902f]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Payments
            </button>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto relative">
            {/* Items Tab */}
            <div
              className={`transition-opacity duration-300 ${
                activeTab === 'items' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}
            >
              {activeTab === 'items' && renderItemsTab()}
            </div>
            {/* Details Tab */}
            <div
              className={`transition-opacity duration-300 ${
                activeTab === 'details'
                  ? 'opacity-100'
                  : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}
            >
              {activeTab === 'details' && renderDetailsTab()}
            </div>
            {/* Payments Tab */}
            <div
              className={`transition-opacity duration-300 ${
                activeTab === 'payments'
                  ? 'opacity-100'
                  : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}
            >
              {activeTab === 'payments' && renderPaymentsTab()}
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
          isUpdateMode
        />
      )}

      {/* Item Selector Modal */}
      {showMenuItemSelector && (
        <SearchableMenuItemSelector
          onSelect={handleMenuItemSelect}
          onClose={() => setShowMenuItemSelector(false)}
        />
      )}

      {/* Inventory Reversion Dialog */}
      {showInventoryDialog && itemToRemove && (
        <InventoryReversionDialog
          itemName={itemToRemove.item.name}
          onClose={() => {
            setShowInventoryDialog(false);
            setItemToRemove(null);
          }}
          onConfirm={handleInventoryDialogAction}
        />
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          orderId={order.id}
          maxRefundable={maxRefundable}
          onRefundCreated={handleRefundCreated}
        />
      )}

      {/* Additional Payment Modal */}
      {showAdditionalPaymentModal && (
        <AdditionalPaymentModal
          isOpen={showAdditionalPaymentModal}
          onClose={() => setShowAdditionalPaymentModal(false)}
          orderId={order.id}
          paymentItems={localItems
            .filter((it) => it.paymentStatus === 'needs_payment')
            .map((it) => ({
              id: typeof it.id === 'string' ? parseInt(it.id, 10) || 0 : (it.id || 0),
              name: it.name,
              price: it.price,
              quantity: it.quantity,
            }))}
          onPaymentCompleted={handleAdditionalPaymentCompleted}
        />
      )}
    </>
  );
}
