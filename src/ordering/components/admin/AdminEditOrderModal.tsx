// src/ordering/components/admin/AdminEditOrderModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { MobileSelect } from '../../../shared/components/ui/MobileSelect';
import { SetEtaModal } from './SetEtaModal';
import { SearchableMenuItemSelector } from './SearchableMenuItemSelector';
import { PaymentStatusSelector } from './PaymentStatusSelector';
import { InventoryReversionDialog } from './InventoryReversionDialog';
import { RefundModal } from './RefundModal';
import { OrderPaymentHistory } from './OrderPaymentHistory';
import { EnhancedAdditionalPaymentModal } from './EnhancedAdditionalPaymentModal';
import {
  PaymentHandlingDialog,
  PaymentAction,
  InventoryAction,
} from './PaymentHandlingDialog';
import { PaymentSummaryAlert } from './PaymentSummaryAlert';
import { menuItemsApi } from '../../../shared/api/endpoints/menuItems';
import { orderPaymentsApi } from '../../../shared/api/endpoints/orderPayments';
import { orderPaymentOperationsApi } from '../../../shared/api/endpoints/orderPaymentOperations';
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
 * You may have more fields in your real code (customizations, etc.).
 */
export interface OrderItem {
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
  // New fields for better quantity tracking
  originalQuantity?: number;  // Original quantity from the order
  paidQuantity?: number;      // How many units are already paid for
  unpaidQuantity?: number;    // How many units still require payment
}

export function AdminEditOrderModal({
  order,
  onClose,
  onSave,
}: AdminEditOrderModalProps) {
  // ----------------------------------------------------------------
  // 1) Original vs. local items
  // ----------------------------------------------------------------
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
    return order.items.map((item: any, index: number) => {
      const itemQuantity = parseInt(String(item.quantity), 10) || 0;
      return {
        ...item,
        _editId: `item-${item.id}-${index}-${JSON.stringify(
          item.customizations || {}
        )}`,
        enable_stock_tracking: !!item.enable_stock_tracking,
        paymentStatus: item.paymentStatus || 'already_paid',
        originalQuantity: itemQuantity,
        paidQuantity: itemQuantity,
        unpaidQuantity: 0,
      };
    });
  });

  /**
   * For items that are newly added, we track them separately so we can skip inventory reversion when removing.
   */
  const [newlyAddedItemIds, setNewlyAddedItemIds] = useState<Set<string>>(
    new Set()
  );

  /**
   * Used when removing an item that was part of the original order (to handle inventory or refunds).
   */
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{
    item: OrderItem;
    editId: string;
  } | null>(null);

  /**
   * Tracks a pending quantity change (specifically for partial-refund scenarios).
   */
  const [pendingQuantityChange, setPendingQuantityChange] = useState<{
    editId: string;
    oldQuantity: number;
    newQuantity: number;
    item: OrderItem;
  } | null>(null);

  /**
   * We store items that need to be marked as damaged so the backend can handle them on save.
   */
  const [itemsToMarkAsDamaged, setItemsToMarkAsDamaged] = useState<
    {
      itemId: string | number;
      quantity: number;
      reason: string;
    }[]
  >([]);

  /**
   * We store items that need to be returned to inventory so the backend can handle them on save.
   */
  const [itemsToReturnToInventory, setItemsToReturnToInventory] = useState<
    {
      itemId: string | number;
      quantity: number;
    }[]
  >([]);

  // For loading the full menu item data (e.g. inventory details)
  const [loadingMenuItemData, setLoadingMenuItemData] = useState(false);

  // On mount/load, set originalItems and fetch any additional item data if needed
  useEffect(() => {
    if (order.items) {
      // Build the original array of items (deep copy)
      const initialItems: OrderItem[] = JSON.parse(
        JSON.stringify(order.items)
      ).map((item: any) => ({
        ...item,
        enable_stock_tracking: !!item.enable_stock_tracking,
        paymentStatus: item.paymentStatus || 'already_paid',
      }));
      setOriginalItems(initialItems);
      setNewlyAddedItemIds(new Set());

      // Possibly fetch extra data (like stock details) from the backend
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
                  console.error(
                    `Failed to fetch data for menu item ${it.id}:`,
                    err
                  );
                  return it;
                })
            );

          const completeItems = await Promise.all(menuItemPromises);

          // Update originalItems with full data
          setOriginalItems(completeItems);

          // Also update localItems to reflect any new inventory data
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
                originalQuantity: localItem.originalQuantity,
                paidQuantity: localItem.paidQuantity,
                unpaidQuantity: localItem.unpaidQuantity,
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

  // ----------------------------------------------------------------
  // 2) Order-level local state
  // ----------------------------------------------------------------
  const [originalStatus] = useState(order.status);
  const [localStatus, setLocalStatus] = useState(order.status);

  // Sum of any refunds on the order so far (from order.order_payments).
  const sumRefunds = (order.order_payments || [])
    .filter((p: any) => p.payment_type === 'refund')
    .reduce((acc: number, p: any) => acc + parseFloat(String(p.amount)), 0);
  const netTotal = Math.max(
    0,
    parseFloat(String(order.total || '0')) - sumRefunds
  );

  // We initialize localTotal from the *items* rather than just `order.total`
  const [localTotal, setLocalTotal] = useState<string>(() => {
    if (!order.items) return '0.00';

    const initialSubtotal = order.items.reduce((sum: number, it: any) => {
      const price = parseFloat(String(it.price)) || 0;
      const qty = parseInt(String(it.quantity), 10) || 0;
      return sum + price * qty;
    }, 0);

    // Subtract refunds (to handle partial refunds in net total)
    const initialTotal = Math.max(0, initialSubtotal - sumRefunds);
    return initialTotal.toFixed(2);
  });

  // Special instructions / notes
  const [localInstructions, setLocalInstructions] = useState(
    order.special_instructions || order.specialInstructions || ''
  );

  // ETA modals (for pending -> preparing transitions)
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(
    requiresAdvanceNotice(order) ? 10 : 5
  );

  // If status is preparing, we might let user update the ETA
  const [showEtaUpdateModal, setShowEtaUpdateModal] = useState(false);
  const [updateEtaMinutes, setUpdateEtaMinutes] = useState(() => {
    if (order.estimatedPickupTime || order.estimated_pickup_time) {
      const etaDate = new Date(
        order.estimatedPickupTime || order.estimated_pickup_time
      );
      if (requiresAdvanceNotice(order)) {
        // Convert to approximate hours if needed
        return etaDate.getHours() + (etaDate.getMinutes() === 30 ? 0.3 : 0);
      } else {
        // Convert to minutes from now
        const minutesFromNow = Math.max(
          5,
          Math.round((etaDate.getTime() - Date.now()) / 60000)
        );
        return Math.ceil(minutesFromNow / 5) * 5;
      }
    }
    return requiresAdvanceNotice(order) ? 10 : 5;
  });

  // ----------------------------------------------------------------
  // 3) Payment / Refund state
  // ----------------------------------------------------------------
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [maxRefundable, setMaxRefundable] = useState<number>(0);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showAdditionalPaymentModal, setShowAdditionalPaymentModal] =
    useState(false);
  const [showPaymentHandlingDialog, setShowPaymentHandlingDialog] =
    useState(false);

  // Payment adjustment tracking (e.g., refunds, store credits, etc.)
  const [paymentAdjustments, setPaymentAdjustments] = useState<{
    refunds: Array<{ item: OrderItem; amount: number; reason: string }>;
    storeCredits: Array<{ item: OrderItem; amount: number; reason: string }>;
    adjustments: Array<{ item: OrderItem; amount: number; reason: string }>;
  }>({
    refunds: [],
    storeCredits: [],
    adjustments: [],
  });

  // Summaries for display
  const [paymentSummary, setPaymentSummary] = useState({
    originalTotal: 0,
    newTotal: 0,
    totalRefunded: 0,
    totalStoreCredit: 0,
    hasPendingPayments: false,
  });

  // Tab switching
  const [activeTab, setActiveTab] = useState<'items' | 'details' | 'payments'>(
    'items'
  );

  // For custom status dropdown
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ----------------------------------------------------------------
  // 4) Core item add/remove/edit logic
  // ----------------------------------------------------------------
  const [showMenuItemSelector, setShowMenuItemSelector] = useState(false);

  function handleAddItem() {
    setShowMenuItemSelector(true);
  }

  function handleMenuItemSelect(selectedItem: MenuItem) {
    setShowMenuItemSelector(false);

    // Create a new local item (default quantity = 1, needs payment)
    const newEditId = `new-item-${Date.now()}`;
    const newQuantity = 1;
    const newItem: OrderItem = {
      ...selectedItem,
      _editId: newEditId,
      id: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price ?? 0,
      quantity: newQuantity,
      notes: '',
      paymentStatus: 'needs_payment',
      enable_stock_tracking: selectedItem.enable_stock_tracking,
      stock_quantity: selectedItem.stock_quantity,
      damaged_quantity: selectedItem.damaged_quantity,
      low_stock_threshold: selectedItem.low_stock_threshold,
      // For better quantity tracking:
      originalQuantity: 0, // not originally on the order
      paidQuantity: 0,     // no units paid
      unpaidQuantity: newQuantity,   // all units need payment
    };

    setNewlyAddedItemIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(newEditId);
      return newSet;
    });

    // Add to local items
    setLocalItems((prev) => {
      const updated = [...prev, newItem];
      const newSubtotal = calculateSubtotalFromItems(updated);
      setLocalTotal(newSubtotal.toFixed(2));
      return updated;
    });
    
    // Update payment summary to reflect the new unpaid item
    updatePaymentSummary();
  }

  /**
   * Main function to update quantity:
   * - If quantity goes up: track the new unpaid units.
   * - If quantity goes down below paid quantity: partial refund logic.
   * - If user reverts to the original quantity, revert to original paid/unpaid state.
   */
  function updateItemQuantity(_editId: string, newQuantity: number) {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item._editId !== _editId) return item;

        const oldQuantity = item.quantity;
        // If no change, do nothing
        if (oldQuantity === newQuantity) {
          return item;
        }

        // If the item had some portion already paid
        const { originalQuantity = 0, paidQuantity = 0 } = item;

        // 1) If user reverts quantity to the original
        if (newQuantity === originalQuantity) {
          return {
            ...item,
            quantity: newQuantity,
            paymentStatus: 'already_paid',
            paidQuantity: originalQuantity,
            unpaidQuantity: 0,
          };
        }

        // 2) If quantity > paidQuantity => new units are unpaid
        if (newQuantity > paidQuantity) {
          const unpaidUnits = newQuantity - paidQuantity;
          // Mark the item as needing payment
          return {
            ...item,
            quantity: newQuantity,
            paymentStatus: 'needs_payment',
            // Paid portion stays the same
            paidQuantity: paidQuantity,
            // Calculate unpaid units
            unpaidQuantity: unpaidUnits,
          };
        }

        // 3) If quantity < paidQuantity => partial refund scenario
        if (newQuantity < paidQuantity) {
          // But we handle the "refund" in a dialog. For now, we set up the pendingQuantityChange
          setPendingQuantityChange({
            editId: _editId,
            oldQuantity,
            newQuantity,
            item: { ...item },
          });

          // The portion being removed is (paidQuantity - newQuantity).
          // We'll pass that to PaymentHandlingDialog for partial refund / store credit, etc.
          const removedQty = paidQuantity - newQuantity;

          // We'll open the dialog with that item "slice"
          const refundItem = {
            ...item,
            quantity: removedQty,
          };
          setItemToRemove({ item: refundItem, editId: _editId });
          setShowPaymentHandlingDialog(true);

          // Return the item as-is for now; we only finalize after the user's choice
          return item;
        }

        // Otherwise, default fallback
        return {
          ...item,
          quantity: newQuantity,
        };
      })
    );
  }

  function handleRemoveItem(editId: string) {
    const foundItem = localItems.find((i) => i._editId === editId);
    if (!foundItem) return;

    const isNewlyAdded = newlyAddedItemIds.has(editId);
    const isAlreadyPaid =
      foundItem.paymentStatus === 'already_paid' && !isNewlyAdded;

    // If it was an original item that’s already paid, we show Payment Handling
    if (isAlreadyPaid) {
      setItemToRemove({ item: foundItem, editId });
      setShowPaymentHandlingDialog(true);
      return;
    }

    // If it has inventory tracking and was not newly added, show Inventory reversion
    if (foundItem.enable_stock_tracking && !isNewlyAdded) {
      setItemToRemove({ item: foundItem, editId });
      setShowInventoryDialog(true);
      return;
    }

    // Otherwise, remove immediately
    setLocalItems((prev) => {
      const updated = prev.filter((i) => i._editId !== editId);
      const newSubtotal = calculateSubtotalFromItems(updated);
      setLocalTotal(newSubtotal.toFixed(2));
      return updated;
    });
  }

  function handleItemChange(
    _editId: string,
    field: keyof OrderItem,
    value: any
  ) {
    // If user changes quantity from an input box, use our “updateItemQuantity” function
    if (field === 'quantity') {
      const parsedValue = parseInt(String(value), 10);
      if (!isNaN(parsedValue) && parsedValue > 0) {
        updateItemQuantity(_editId, parsedValue);
      }
      return;
    }

    // For other fields (price, notes, etc.), just do a direct update
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item._editId === _editId) {
          const updatedItem = {
            ...item,
            [field]: value,
          };

          // If modifying price, recalc totals
          if (field === 'price') {
            const newSubtotal = calculateSubtotalFromItems(
              prev.map((x) => (x._editId === _editId ? updatedItem : x))
            );
            setLocalTotal(newSubtotal.toFixed(2));
          }
          return updatedItem;
        }
        return item;
      })
    );
  }

  // ----------------------------------------------------------------
  // 5) PaymentHandlingDialog & partial-refund actions
  // ----------------------------------------------------------------
  function handlePaymentAction(
    action: PaymentAction | 'cancel' | 'none', 
    reason: string, 
    amount: number, 
    inventoryAction?: InventoryAction, 
    inventoryReason?: string
  ) {
    // This is called once the user chooses "Refund" / "StoreCredit" / "NoAction" etc.
    if (!itemToRemove) return;
    const { item, editId } = itemToRemove;

    const isPartialQuantity = !!pendingQuantityChange;

    // If action is 'cancel', just close the dialog without making changes
    if (action === 'cancel') {
      // If this was a partial quantity change, revert to the original quantity
      if (isPartialQuantity && pendingQuantityChange) {
        setLocalItems((prev) =>
          prev.map((i) => {
            if (i._editId === editId) {
              return {
                ...i,
                quantity: pendingQuantityChange.oldQuantity,
              };
            }
            return i;
          })
        );
      }
      
      // Close dialog and reset state
      setShowPaymentHandlingDialog(false);
      setItemToRemove(null);
      setPendingQuantityChange(null);
      return;
    }

    // If no amount is given, fallback to item.price * item.quantity
    const paymentAmount =
      amount ||
      parseFloat(String(item.price)) *
        parseInt(String(item.quantity), 10);

    // Record the chosen action for final processing on "Save"
    switch (action) {
      case 'refund':
        setPaymentAdjustments((prev) => ({
          ...prev,
          refunds: [...prev.refunds, { item, amount: paymentAmount, reason }],
        }));
        break;
      case 'store_credit':
        setPaymentAdjustments((prev) => ({
          ...prev,
          storeCredits: [
            ...prev.storeCredits,
            { item, amount: paymentAmount, reason },
          ],
        }));
        break;
      case 'adjust_total':
        setPaymentAdjustments((prev) => ({
          ...prev,
          adjustments: [
            ...prev.adjustments,
            { item, amount: paymentAmount, reason },
          ],
        }));
        break;
      case 'none':
        // No payment action needed, but we'll still update quantities
        break;
      default:
        console.warn(`Unhandled payment action: ${action}`);
        break;
    }

    // Handle inventory action if provided and item has stock tracking
    if (item.enable_stock_tracking && inventoryAction) {
      if (inventoryAction === 'mark_as_damaged') {
        // Add to items to mark as damaged
        if (item.id) {
          setItemsToMarkAsDamaged((prev) => [
            ...prev,
            {
              itemId: item.id!,
              quantity: isPartialQuantity && pendingQuantityChange 
                ? pendingQuantityChange.oldQuantity - pendingQuantityChange.newQuantity 
                : item.quantity,
              reason: inventoryReason || 'Removed during order edit',
            },
          ]);
        }
      } else if (inventoryAction === 'return_to_inventory') {
        // Add to items to return to inventory
        if (item.id) {
          setItemsToReturnToInventory((prev) => [
            ...prev,
            {
              itemId: item.id!,
              quantity: isPartialQuantity && pendingQuantityChange 
                ? pendingQuantityChange.oldQuantity - pendingQuantityChange.newQuantity 
                : item.quantity,
            },
          ]);
        }
      }
    }

    // If partial quantity change
    if (isPartialQuantity && pendingQuantityChange) {
      // Actually set the new quantity for that item
      setLocalItems((prev) =>
        prev.map((i) => {
          if (i._editId === editId) {
            // If we partially refunded, the new "paidQuantity" should match the new quantity
            return {
              ...i,
              quantity: pendingQuantityChange.newQuantity,
              paidQuantity: pendingQuantityChange.newQuantity, // They refunded the removed portion
              paymentStatus: 'already_paid',
              unpaidQuantity: 0,
            };
          }
          return i;
        })
      );
    } else {
      // Otherwise, a full removal
      setLocalItems((prev) => {
        const updated = prev.filter((i) => i._editId !== editId);
        const newSubtotal = calculateSubtotalFromItems(updated);
        setLocalTotal(newSubtotal.toFixed(2));
        return updated;
      });
    }

    // Recalc summary
    updatePaymentSummary();

    // Close out the dialog, reset
    setShowPaymentHandlingDialog(false);
    setItemToRemove(null);
    setPendingQuantityChange(null);
  }

  function updatePaymentSummary() {
    const originalTotal = parseFloat(order.total) || 0;
    const newTotal = parseFloat(localTotal) || 0;

    // Summaries
    const totalRefunded = paymentAdjustments.refunds.reduce(
      (sum, r) => sum + r.amount,
      0
    );
    const totalStoreCredit = paymentAdjustments.storeCredits.reduce(
      (sum, s) => sum + s.amount,
      0
    );

    // Check if any items are currently in “needs_payment” status
    const hasPendingPayments = localItems.some(
      (it) => it.paymentStatus === 'needs_payment'
    );

    setPaymentSummary({
      originalTotal,
      newTotal,
      totalRefunded,
      totalStoreCredit,
      hasPendingPayments,
    });
  }

  function handleInventoryDialogAction(
    action: 'return_to_inventory' | 'mark_as_damaged',
    reason?: string
  ) {
    if (!itemToRemove) return;
    const { item, editId } = itemToRemove;

    // Remove from local items
    setLocalItems((prev) => {
      const updated = prev.filter((i) => i._editId !== editId);
      const newSubtotal = calculateSubtotalFromItems(updated);
      setLocalTotal(newSubtotal.toFixed(2));
      return updated;
    });

    // If user says "mark as damaged"
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

  // ----------------------------------------------------------------
  // 6) Payment tab & Additional Payment logic
  // ----------------------------------------------------------------
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
      // Typically the backend returns { payments, total_paid, total_refunded, ... }
      const responseData = resp as any;
      let { payments: list, total_paid, total_refunded } = responseData.data;

      // If no payments returned but order has a total, simulate an initial payment record
      if (list.length === 0 && order.total > 0) {
        const initialPayment: OrderPayment = {
          id: 0,
          payment_type: 'initial',
          amount: parseFloat(order.total),
          payment_method: order.payment_method || 'credit_card',
          status: 'completed',
          created_at: order.createdAt || new Date().toISOString(),
          description: 'Initial payment',
          transaction_id: order.transaction_id || 'N/A',
        };
        list = [initialPayment];
        total_paid = parseFloat(order.total);
        total_refunded = 0;
      }

      setPayments(list);
      setMaxRefundable(Math.max(0, total_paid - total_refunded));
    } catch (err) {
      console.error('Failed to load payments:', err);

      // Fallback if the API fails
      if (order.total > 0) {
        setMaxRefundable(parseFloat(order.total));
        const initialPayment: OrderPayment = {
          id: 0,
          payment_type: 'initial',
          amount: parseFloat(order.total),
          payment_method: order.payment_method || 'credit_card',
          status: 'completed',
          created_at: order.createdAt || new Date().toISOString(),
          description: 'Initial payment',
          transaction_id: order.transaction_id || 'N/A',
        };
        setPayments([initialPayment]);
      }
    } finally {
      setLoadingPayments(false);
    }
  }

  function handleRefundCreated() {
    // after a refund, re-fetch
    fetchPayments();

    // Recalc local total from items
    const currentSubtotal = calculateSubtotalFromItems(localItems);
    const sumRefundsLocal = payments
      .filter((p) => p.payment_type === 'refund')
      .reduce((acc, p) => acc + parseFloat(String(p.amount)), 0);

    const newNet = Math.max(0, currentSubtotal - sumRefundsLocal);
    setLocalTotal(newNet.toFixed(2));

    // Possibly update status to refunded or partially_refunded
    try {
      const isFullRefund = Math.abs(newNet) < 0.01;
      if (isFullRefund) {
        setLocalStatus('refunded');
      } else if (sumRefundsLocal > 0) {
        setLocalStatus('partially_refunded');
      }
    } catch (error) {
      console.error('Error updating status after refund:', error);
    }
  }

  function handleProcessAdditionalPayment() {
    // Identify items needing payment
    const itemsNeedingPayment = localItems
      .filter((it) => it.paymentStatus === 'needs_payment')
      .map((it) => ({
        id:
          typeof it.id === 'string'
            ? parseInt(it.id, 10) || 0
            : it.id || 0,
        name: it.name,
        price: it.price,
        quantity: it.unpaidQuantity ?? it.quantity,
      }));

    if (itemsNeedingPayment.length === 0) {
      alert('No items require payment.');
      return;
    }

    // Show the additional payment modal
    setShowAdditionalPaymentModal(true);
  }

  function handleAdditionalPaymentCompleted() {
    // Mark items as paid
    setLocalItems((prev) =>
      prev.map((it) =>
        it.paymentStatus === 'needs_payment'
          ? {
              ...it,
              paymentStatus: 'already_paid',
              // Increase paidQuantity to the full new quantity
              paidQuantity: it.quantity,
              unpaidQuantity: 0,
            }
          : it
      )
    );

    // Reload payment history
    fetchPayments();
    setShowAdditionalPaymentModal(false);
  }

  function handlePaymentStatusChange(
    editId: string,
    status: 'needs_payment' | 'already_paid'
  ) {
    // Sometimes you might let the user forcibly toggle the payment status
    setLocalItems((prev) =>
      prev.map((it) => {
        if (it._editId === editId) {
          return { ...it, paymentStatus: status };
        }
        return it;
      })
    );
  }

  // ----------------------------------------------------------------
  // 7) Inventory & saving the final order
  // ----------------------------------------------------------------
  function findOriginalItem(item: OrderItem) {
    if (!item.id) return undefined;
    return originalItems.find(
      (orig) => orig.id && String(orig.id) === String(item.id)
    );
  }

  async function processInventoryChanges() {
    // In a real implementation, your backend might handle inventory changes.
    console.log('Processing inventory changes if needed...');
    for (const item of localItems) {
      if (!item.enable_stock_tracking) continue;
      const orig = findOriginalItem(item);
      // Check differences or do your own logic.
    }
  }

  function handleSave() {
    // If going from pending -> preparing, show ETA modal
    const { shouldShowEtaModal } = handleOrderPreparationStatus(
      order,
      localStatus,
      originalStatus
    );
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

  async function proceedWithSave(pickupTime?: string) {
    try {
      // 1) Process any inventory changes
      await processInventoryChanges();

      // 2) Mark items as damaged if flagged
      if (itemsToMarkAsDamaged.length > 0) {
        const damageCalls = itemsToMarkAsDamaged.map((d) =>
          menuItemsApi.markAsDamaged(d.itemId, {
            quantity: d.quantity,
            reason: d.reason,
            order_id: order.id,
          })
        );
        await Promise.all(damageCalls);
      }

      // 3) Process items to return to inventory
      if (itemsToReturnToInventory.length > 0) {
        try {
          const inventoryCalls = itemsToReturnToInventory.map(async (i) => {
            try {
              // Get current item details to know the current stock level
              const menuItem = await menuItemsApi.getById(i.itemId);
              
              // Calculate new stock level after returning items
              const newStockLevel = (menuItem.stock_quantity || 0) + i.quantity;
              
              // Update stock level
              return menuItemsApi.updateStock(i.itemId, {
                stock_quantity: newStockLevel,
                reason_type: 'return',
                reason_details: `Items returned from edited Order #${order.id}`
              });
            } catch (err) {
              console.error(`Failed to update inventory for item ${i.itemId}:`, err);
              return Promise.reject(err);
            }
          });
          
          await Promise.all(inventoryCalls);
          console.log(`Successfully returned ${itemsToReturnToInventory.length} items to inventory`);
        } catch (error) {
          console.error('Error processing inventory returns:', error);
          alert('Failed to return some items to inventory. Check console for details.');
        }
      }

      // 4) Process all payment adjustments
      //    a) Refunds
      for (const refund of paymentAdjustments.refunds) {
        try {
          await orderPaymentOperationsApi.createPartialRefund(order.id, {
            amount: refund.amount,
            reason: refund.reason,
            items: [
              {
                id: refund.item.id || 0,
                name: refund.item.name,
                quantity: refund.item.quantity,
                price: refund.item.price,
              },
            ],
            refunded_items: [
              {
                id: refund.item.id || 0,
                name: refund.item.name,
                quantity: refund.item.quantity,
                price: refund.item.price,
              },
            ],
          });
        } catch (error) {
          console.error('Error processing refund:', error);
          alert(
            `Failed to process refund for ${refund.item.name}. Please try again.`
          );
          return;
        }
      }

      //    b) Store credits
      for (const credit of paymentAdjustments.storeCredits) {
        try {
          await orderPaymentOperationsApi.addStoreCredit(order.id, {
            amount: credit.amount,
            reason: credit.reason,
            email: order.contact_email,
          });
        } catch (error) {
          console.error('Error processing store credit:', error);
          alert(
            `Failed to process store credit for ${credit.item.name}. Please try again.`
          );
          return;
        }
      }

      //    c) Order total adjustments
      for (const adjustment of paymentAdjustments.adjustments) {
        try {
          await orderPaymentOperationsApi.adjustOrderTotal(order.id, {
            new_total: parseFloat(localTotal),
            reason: adjustment.reason,
          });
        } catch (error) {
          console.error('Error processing total adjustment:', error);
          alert('Failed to process total adjustment. Please try again.');
          return;
        }
      }

      // 5) Build updated order object
      const parsedTotal = parseFloat(localTotal) || 0;
      const cleanedItems = localItems.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        notes: i.notes || '',
        customizations: i.customizations || {},
        ...(i.enable_stock_tracking && {
          enable_stock_tracking: i.enable_stock_tracking,
          stock_quantity: i.stock_quantity,
          damaged_quantity: i.damaged_quantity,
          low_stock_threshold: i.low_stock_threshold,
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

      // 6) Trigger onSave for the parent to actually update the backend
      onSave(updatedOrder);
    } catch (error) {
      console.error('Error saving order changes:', error);
      alert('Failed to save order changes. Check console for details.');
    }
  }

  // ----------------------------------------------------------------
  // 8) UI rendering & helper functions
  // ----------------------------------------------------------------
  function calculateSubtotalFromItems(items: OrderItem[]) {
    return items.reduce((sum, it) => {
      const price = parseFloat(String(it.price)) || 0;
      const qty = parseInt(String(it.quantity), 10) || 0;
      return sum + price * qty;
    }, 0);
  }

  function calculateSubtotal() {
    return calculateSubtotalFromItems(localItems).toFixed(2);
  }

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

  // ------------------ RENDER TABS ------------------
  function renderItemsTab() {
    const currentSubtotal = calculateSubtotal();
    // Sum of *recorded* refunds from the payments array
    const sumRefundsHere = payments
      .filter((p) => p.payment_type === 'refund')
      .reduce((acc, p) => acc + parseFloat(String(p.amount)), 0);

    const net = Math.max(0, parseFloat(currentSubtotal) - sumRefundsHere);

    // Calculate payment summary information
    const itemsNeedingPayment = localItems.filter(
      (it) => it.paymentStatus === 'needs_payment'
    );
    
    const totalUnpaidAmount = itemsNeedingPayment.reduce((sum, item) => {
      const price = parseFloat(String(item.price)) || 0;
      const unpaidQty = item.unpaidQuantity || 0;
      return sum + (price * unpaidQty);
    }, 0);

    const hasItemsNeedingPayment = itemsNeedingPayment.length > 0;

    return (
      <div className="space-y-4 p-4 sm:p-6">
        {/* Payment Summary Alert - show at the top of the Items tab */}
        {hasItemsNeedingPayment && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-sm text-amber-800">Payment Required</h4>
                <p className="text-sm text-amber-700 mt-1">
                  {itemsNeedingPayment.reduce((total, item) => total + (item.unpaidQuantity || 0), 0) === 1 ? (
                    <>1 unit requires payment.</>
                  ) : (
                    <>{itemsNeedingPayment.reduce((total, item) => total + (item.unpaidQuantity || 0), 0)} units require payment.</>
                  )}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  <span className="font-medium">Amount due: ${totalUnpaidAmount.toFixed(2)}</span>
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setActiveTab('payments');
                      setTimeout(() => handleProcessAdditionalPayment(), 100);
                    }}
                    className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md text-sm font-medium transition-colors inline-flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Process Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {localItems.map((item, idx) => (
            <div
              key={item._editId}
              className="border border-gray-200 rounded-lg p-4 space-y-3 transition-shadow hover:shadow-md"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-gray-900">Item {idx + 1}</h5>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item._editId)}
                  className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors flex items-center"
                >
                  <svg
                    className="h-4 w-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2
                        2 0 0116.138 21H7.862a2 2 0
                        01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1
                        1 0 00-1-1h-4a1 1 0
                        00-1 1v3M4 7h16"
                    />
                  </svg>
                  Remove
                </button>
              </div>

              {/* Item Fields */}
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm"
                    value={item.name}
                    onChange={(e) =>
                      handleItemChange(item._editId, 'name', e.target.value)
                    }
                  />
                </div>

                {/* Quantity & Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity
                      </label>
                      {item.paymentStatus === 'already_paid' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Already Paid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                      <button
                        type="button"
                        className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border-r border-gray-300 transition-colors"
                        onClick={() =>
                          updateItemQuantity(
                            item._editId,
                            Math.max(1, item.quantity - 1)
                          )
                        }
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-center border-0 focus:ring-0"
                        value={item.quantity}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          if (newVal === '' || /^\d+$/.test(newVal)) {
                            const parsedVal =
                              newVal === ''
                                ? 1
                                : Math.max(1, parseInt(newVal, 10));
                            updateItemQuantity(item._editId, parsedVal);
                          }
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-800 border-l border-gray-300 transition-colors"
                        onClick={() =>
                          updateItemQuantity(item._editId, item.quantity + 1)
                        }
                        aria-label="Increase quantity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </button>
                    </div>
                    {item.paymentStatus === 'already_paid' && (
                      <p className="mt-1 text-xs text-gray-500">
                        Decreasing quantity will require a refund or
                        store-credit flow.
                      </p>
                    )}
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
                        step="0.01"
                        className="border border-gray-300 rounded-md pl-7 pr-3 py-2 w-full text-sm"
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(
                            item._editId,
                            'price',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded-md px-3 py-2 w-full text-sm"
                    value={item.notes || ''}
                    onChange={(e) =>
                      handleItemChange(item._editId, 'notes', e.target.value)
                    }
                    placeholder="Special requests / modifications"
                  />
                </div>

                {/* Explicit Payment Status toggle (optional) */}
                <div className="mt-2">
                  <PaymentStatusSelector
                    value={item.paymentStatus || 'needs_payment'}
                    onChange={(st) => handlePaymentStatusChange(item._editId, st)}
                  />
                </div>

                {/* Display customizations if any */}
                {item.customizations &&
                  Object.keys(item.customizations).length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">
                        Customizations:
                      </h6>
                      <div className="space-y-2">
                        {Object.entries(item.customizations).map(
                          ([category, values]) => (
                            <div key={category} className="text-sm">
                              <span className="font-medium">
                                {category}:
                              </span>
                              {Array.isArray(values) ? (
                                <ul className="list-disc pl-5 mt-1">
                                  {values.map((val, idx2) => (
                                    <li key={idx2} className="text-gray-600">
                                      {val}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-gray-600 ml-2">
                                  {String(values)}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Show item total */}
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
          <svg
            className="h-5 w-5 mr-2 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v6m0
                0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Item
        </button>

        {/* Subtotal/total area */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Subtotal</span>
            <span className="text-sm font-medium">${currentSubtotal}</span>
          </div>

          {sumRefundsHere > 0 && (
            <div className="flex justify-between items-center mb-2 pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-600">Original Total</span>
              <span className="text-sm font-medium line-through text-gray-400">
                ${currentSubtotal}
              </span>
            </div>
          )}
          {sumRefundsHere > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-red-600">Refunded</span>
              <span className="text-sm font-medium text-red-600">
                -${sumRefundsHere.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-2 border-t border-gray-100 space-y-2 sm:space-y-0">
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

  function renderDetailsTab() {
    return (
      <div className="space-y-5 p-4 sm:p-6">
        {/* Special instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions
          </label>
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
            <div className="text-gray-900">
              {new Date(order.createdAt).toLocaleString()}
            </div>

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
                  {new Date(
                    order.estimatedPickupTime || order.estimated_pickup_time
                  ).toLocaleString()}
                </div>
              </>
            )}
          </div>
        </div>

        {/* If localStatus=preparing, allow updating ETA */}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9
                    0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-sm text-amber-800">
                  Pickup Time / ETA
                </h4>
                {order.estimatedPickupTime || order.estimated_pickup_time ? (
                  <p className="text-sm text-amber-700 mt-1">
                    Current ETA:{' '}
                    {new Date(
                      order.estimatedPickupTime || order.estimated_pickup_time
                    ).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-amber-700 mt-1">
                    No ETA set
                  </p>
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
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
    // Count total unpaid units
    const itemsNeedingPayment = localItems.filter(
      (it) => it.paymentStatus === 'needs_payment'
    );
    const totalUnpaidUnits = itemsNeedingPayment.reduce((sum, item) => {
      if (typeof item.unpaidQuantity === 'number') {
        return sum + item.unpaidQuantity;
      }
      return sum + item.quantity;
    }, 0);

    const hasItemsNeedingPayment = itemsNeedingPayment.length > 0;
    const hasPayments = payments.length > 0;

    return (
      <div className="p-4 sm:p-6 space-y-4">
        {loadingPayments ? (
          <p className="text-gray-600">Loading payment history...</p>
        ) : (
          <>
            {/* Payment Actions */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <h3 className="text-base font-medium text-gray-900 mb-3">
                Payment Actions
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {hasItemsNeedingPayment && (
                  <button
                    onClick={handleProcessAdditionalPayment}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Process Additional Payment
                  </button>
                )}

                <button
                  onClick={() => setShowRefundModal(true)}
                  disabled={maxRefundable <= 0}
                  className={`px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center
                    ${
                      maxRefundable > 0
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 10h10a8 8 0
                        018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                  Issue Refund
                </button>
              </div>

              <div className="mt-3 text-sm">
                {hasItemsNeedingPayment && (
                  <>
                    <div className="bg-amber-50 border border-amber-100 rounded-md p-3 mb-2">
                      <p className="text-amber-800 mb-1">
                        {totalUnpaidUnits === 1 ? (
                          <>
                            <span className="font-medium">1</span> unit requires
                            payment.
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{totalUnpaidUnits}</span>{' '}
                            units require payment.
                          </>
                        )}
                      </p>
                      <p className="text-amber-800 font-medium">
                        Amount due: $
                        {itemsNeedingPayment.reduce((sum, item) => {
                          const price = parseFloat(String(item.price)) || 0;
                          const unpaidQty = item.unpaidQuantity || 0;
                          return sum + (price * unpaidQty);
                        }, 0).toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
                <p className="text-gray-600">
                  Max refundable amount:{' '}
                  <span className="font-medium">
                    ${maxRefundable.toFixed(2)}
                  </span>
                </p>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-3">
                Payment History
              </h3>
              {hasPayments ? (
                <OrderPaymentHistory payments={payments} />
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-500 text-sm">
                    No payment records found for this order.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------
  // 9) Render the overall modal
  // ----------------------------------------------------------------
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4 animate-fadeIn"
        style={{ isolation: 'isolate' }}
      >
        <div className="bg-white rounded-xl shadow-lg w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slideUp relative">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-20">
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
                <span className="text-sm font-medium text-gray-700 mr-2">
                  Status:
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                    localStatus
                  )}`}
                >
                  {localStatus.charAt(0).toUpperCase() + localStatus.slice(1)}
                </span>
              </div>

              {/* Custom status dropdown */}
              <div className="flex-1">
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    onClick={() =>
                      setIsStatusDropdownOpen(!isStatusDropdownOpen)
                    }
                    className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-sm"
                  >
                    <span>
                      {localStatus.charAt(0).toUpperCase() +
                        localStatus.slice(1)}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0
                          011.414 0L10 10.586l3.293-3.293a1 1 0
                          111.414 1.414l-4 4a1 1 0
                          01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {isStatusDropdownOpen && (
                    <div
                      className="absolute z-[99999] mt-1 w-full rounded-md bg-white shadow-lg"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                      }}
                    >
                      <ul className="max-h-60 overflow-auto py-1">
                        {[
                          { value: 'pending', label: 'Pending' },
                          { value: 'preparing', label: 'Preparing' },
                          { value: 'ready', label: 'Ready' },
                          { value: 'completed', label: 'Completed' },
                          { value: 'cancelled', label: 'Cancelled' },
                          { value: 'refunded', label: 'Refunded' },
                          {
                            value: 'partially_refunded',
                            label: 'Partially Refunded',
                          },
                        ].map((option) => (
                          <li
                            key={option.value}
                            className={`cursor-pointer px-4 py-2 hover:bg-gray-100 ${
                              localStatus === option.value
                                ? 'bg-gray-100'
                                : ''
                            }`}
                            onClick={() => {
                              setLocalStatus(option.value);
                              setIsStatusDropdownOpen(false);
                            }}
                          >
                            {option.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="px-4 sm:px-6 pt-2 pb-2 flex border-b border-gray-200 overflow-x-auto bg-white absolute top-[120px] left-0 right-0 z-0"
            style={{ maxWidth: 'inherit', width: '100%' }}
          >
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
          <div className="w-full h-[12px] flex-shrink-0 mt-10"></div>

          {/* Tab Content */}
          <div
            className="flex-1 overflow-y-auto relative"
            style={{ maxHeight: 'calc(100vh - 180px)' }}
          >
            <div
              className={`transition-opacity duration-300 ${
                activeTab === 'items'
                  ? 'opacity-100'
                  : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}
            >
              {activeTab === 'items' && renderItemsTab()}
            </div>
            <div
              className={`transition-opacity duration-300 ${
                activeTab === 'details'
                  ? 'opacity-100'
                  : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}
            >
              {activeTab === 'details' && renderDetailsTab()}
            </div>
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
          orderItems={localItems}
          onRefundCreated={handleRefundCreated}
        />
      )}

      {/* Additional Payment Modal */}
      {showAdditionalPaymentModal && (
        <EnhancedAdditionalPaymentModal
          isOpen={showAdditionalPaymentModal}
          onClose={() => setShowAdditionalPaymentModal(false)}
          orderId={order.id}
          paymentItems={localItems
            .filter((it) => it.paymentStatus === 'needs_payment')
            .map((it) => ({
              id:
                typeof it.id === 'string'
                  ? parseInt(it.id, 10) || 0
                  : it.id || 0,
              name: it.name,
              price: it.price,
              // Charge only the unpaid portion for each item
              quantity: it.unpaidQuantity ?? it.quantity,
            }))}
          onPaymentCompleted={handleAdditionalPaymentCompleted}
        />
      )}

      {/* Payment Handling Dialog */}
      {showPaymentHandlingDialog && itemToRemove && (
        <PaymentHandlingDialog
          item={{
            name: itemToRemove.item.name,
            quantity: parseInt(String(itemToRemove.item.quantity), 10),
            price: parseFloat(String(itemToRemove.item.price)),
            id: itemToRemove.item.id || undefined,
            enable_stock_tracking: itemToRemove.item.enable_stock_tracking,
          }}
          isPartialQuantity={pendingQuantityChange !== null}
          orderId={order.id}
          orderStatus={localStatus}
          onClose={() => {
            setShowPaymentHandlingDialog(false);
            setItemToRemove(null);
            setPendingQuantityChange(null);
          }}
          onAction={(action, reason, amount, inventoryAction, inventoryReason) =>
            handlePaymentAction(action, reason, amount, inventoryAction, inventoryReason)
          }
        />
      )}
    </>
  );
}
