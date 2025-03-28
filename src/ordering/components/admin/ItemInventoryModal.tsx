import React, { useState, useEffect } from 'react';
import { MenuItem as MenuItemType, MenuItemStockAudit, MenuOption } from '../../../ordering/types/menu';
import OptionInventoryForm from './OptionInventoryForm';
import { menuItemsApi } from '../../../shared/api/endpoints/menuItems';
import { useMenuStore } from '../../store/menuStore';
import { format } from 'date-fns';

interface ItemInventoryModalProps {
  open: boolean;
  onClose: () => void;
  menuItem?: MenuItemType;
  onSave: () => void;
  onEnableTrackingChange?: (enableTracking: boolean) => void;
}

const ItemInventoryModal: React.FC<ItemInventoryModalProps> = ({
  open,
  onClose,
  menuItem,
  onSave,
  onEnableTrackingChange
}) => {
  // State for inventory tracking type (menu-level, option-level, or none)
  const [inventoryTrackingType, setInventoryTrackingType] = useState<'menu' | 'option' | 'none'>('none');
  
  // State for stock quantities
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [damagedQuantity, setDamagedQuantity] = useState<number>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);
  
  // State for "Mark as damaged" form
  const [damageQuantity, setDamageQuantity] = useState<number>(1);
  const [damageReason, setDamageReason] = useState<string>('fell');
  const [otherDamageReason, setOtherDamageReason] = useState<string>('');
  const [damageReasonOptions, setDamageReasonOptions] = useState<string[]>(['fell', 'bad/spoiled', 'other']);
  
  // State for "Update stock" form
  const [stockOperation, setStockOperation] = useState<'add' | 'remove'>('add');
  const [stockAdjustmentAmount, setStockAdjustmentAmount] = useState<number>(0);
  const [reasonType, setReasonType] = useState<'restock' | 'adjustment' | 'other'>('restock');
  const [reasonDetails, setReasonDetails] = useState<string>('');
  
  // State for audit history
  const [auditHistory, setAuditHistory] = useState<MenuItemStockAudit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Access menu store for real-time inventory updates
  const { startInventoryPolling, stopInventoryPolling } = useMenuStore();

  // Load menu item data when opened and start polling for real-time updates
  useEffect(() => {
    if (open && menuItem) {
      // Fetch the menu item with option groups included
      refreshInventoryData({
        refreshAuditHistory: menuItem.enable_stock_tracking === true,
        notifyParent: false
      }).then(updatedItem => {
        if (updatedItem) {
          // Check if any options have inventory tracking enabled
          const hasOptionWithInventoryTracking = updatedItem.option_groups?.some(group =>
            group.options?.some(option => option.enable_stock_tracking)
          );
          
          // Set initial tracking type based on menu item data and options
          if (updatedItem.enable_stock_tracking) {
            setInventoryTrackingType('menu');
          } else if (hasOptionWithInventoryTracking) {
            setInventoryTrackingType('option');
          } else {
            setInventoryTrackingType('none');
          }
          
          setStockQuantity(updatedItem.stock_quantity || 0);
          setDamagedQuantity(updatedItem.damaged_quantity || 0);
          setLowStockThreshold(updatedItem.low_stock_threshold || 10);
          setStockAdjustmentAmount(0); // Reset adjustment amount when opening modal
          
          // Only load audit history if menu-level tracking is enabled
          if (updatedItem.enable_stock_tracking) {
            loadAuditHistory();
          }
        }
      });
      
      // Start polling for real-time inventory updates
      startInventoryPolling(menuItem.id);
    }
    
    // Clean up when the modal closes
    return () => {
      stopInventoryPolling();
    };
  }, [
    open,
    menuItem,
    startInventoryPolling,
    stopInventoryPolling
  ]);

  // Load and refresh inventory data when menuItem changes
  useEffect(() => {
    if (menuItem && open) {
      // Update local state when menuItem is refreshed (e.g., by polling)
      setStockQuantity(menuItem.stock_quantity || 0);
      setDamagedQuantity(menuItem.damaged_quantity || 0);
      setLowStockThreshold(menuItem.low_stock_threshold || 10);
      setStockAdjustmentAmount(0); // Reset to zero when the menuItem changes
    }
  }, [menuItem, open]);

  // Function to refresh inventory data with optimizations to prevent page shaking
  const refreshInventoryData = async (options = {
    refreshAuditHistory: true,
    notifyParent: true
  }) => {
    if (!menuItem?.id) return;
    
    try {
      // Fetch the latest menu item data with option groups and options included
      const updatedItem = await menuItemsApi.getById(menuItem.id, true);
      
      console.log('Refreshed menu item data:', updatedItem);
      
      // Update local state with the latest values using functional updates
      // to ensure we're working with the most current state
      setStockQuantity(updatedItem.stock_quantity || 0);
      setDamagedQuantity(updatedItem.damaged_quantity || 0);
      setLowStockThreshold(updatedItem.low_stock_threshold || 10);
      setStockAdjustmentAmount(0); // Reset adjustment amount after refresh
      
      // Only refresh audit history if specifically requested
      if (options.refreshAuditHistory) {
        loadAuditHistory();
      }
      
      // Only notify parent if specifically requested
      if (options.notifyParent) {
        onSave();
      }
      
      return updatedItem;
    } catch (err) {
      console.error('Failed to refresh inventory data:', err);
      return null;
    }
  };

  const loadAuditHistory = async () => {
    if (!menuItem) return;
    
    setLoadingAudits(true);
    try {
      const audits = await menuItemsApi.getStockAudits(menuItem.id);
      setAuditHistory(audits);
    } catch (err) {
      console.error('Failed to load audit history:', err);
      setError('Failed to load audit history');
    } finally {
      setLoadingAudits(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!menuItem) return;
    
    // Show success message immediately for better responsiveness
    setSuccess('Inventory settings saved successfully');
    setTimeout(() => setSuccess(null), 3000);
    
    try {
      // Set optimistic updates locally first
      const isMenuLevelTracking = inventoryTrackingType === 'menu';
      
      const updatedValues = {
        enable_stock_tracking: isMenuLevelTracking,
        stock_quantity: isMenuLevelTracking ? stockQuantity : 0,
        damaged_quantity: isMenuLevelTracking ? damagedQuantity : 0,
        low_stock_threshold: isMenuLevelTracking ? lowStockThreshold : undefined
      };
      
      console.log('Saving inventory settings:', updatedValues);
      
      // When disabling inventory tracking, explicitly set values to 0/undefined
      // This ensures the database clears these values when tracking is off
      await menuItemsApi.update(menuItem.id, updatedValues);
      
      // Refresh inventory data without refreshing audit history
      // to prevent unnecessary DOM updates
      await refreshInventoryData({ 
        refreshAuditHistory: false,
        notifyParent: true
      });
    } catch (err) {
      console.error('Failed to save inventory settings:', err);
      setError('Failed to save inventory settings');
      setTimeout(() => setSuccess(null), 0); // Clear any success message
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMarkAsDamaged = async () => {
    if (!menuItem) return;
    
    if (damageQuantity <= 0) {
      setError('Damage quantity must be greater than zero');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (!damageReason.trim()) {
      setError('Please provide a reason for marking items as damaged');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Determine the final reason (either selected preset or custom)
    const finalReason = damageReason === 'other' ? otherDamageReason : damageReason;
    
    if (!finalReason.trim()) {
      setError('Please provide a reason for marking items as damaged');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Save custom reason if checkbox is checked
    if (damageReason === 'other' && 
        (document.getElementById('saveCustomReason') as HTMLInputElement)?.checked && 
        otherDamageReason.trim() !== '') {
      // Add the new reason before 'other' in the options array
      setDamageReasonOptions(prev => [
        ...prev.filter(opt => opt !== 'other'), 
        otherDamageReason, 
        'other'
      ]);
    }
    
    // Apply optimistic updates to the UI immediately
    const newDamagedQuantity = damagedQuantity + damageQuantity;
    setDamagedQuantity(newDamagedQuantity);
    
    // Show success message immediately for better responsiveness
    setSuccess('Items marked as damaged successfully');
    setDamageQuantity(1); // Reset form
    setDamageReason('fell'); // Reset to default option
    setOtherDamageReason(''); // Clear custom reason
    
    try {
      await menuItemsApi.markAsDamaged(menuItem.id, {
        quantity: damageQuantity,
        reason: finalReason
      });
      
      // Refresh inventory data in the background with minimal UI disruption
      await refreshInventoryData({ 
        refreshAuditHistory: true, // We need audit history for damaged items
        notifyParent: true
      });
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to mark items as damaged:', err);
      setError('Failed to mark items as damaged');
      setDamagedQuantity(damagedQuantity); // Revert the optimistic update
      setTimeout(() => setSuccess(null), 0); // Clear success message
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateStock = async () => {
    if (!menuItem) return;
    
    // Calculate the new stock quantity based on the operation
    const calculatedNewQuantity =
      stockOperation === 'add'
        ? stockQuantity + stockAdjustmentAmount
        : stockQuantity - stockAdjustmentAmount;
    
    // Validate the operation
    if (calculatedNewQuantity < 0) {
      setError('Cannot remove more items than current stock');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (stockAdjustmentAmount <= 0) {
      setError('Quantity must be greater than zero');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Apply optimistic updates to the UI immediately
    const originalStockQuantity = stockQuantity;
    setStockQuantity(calculatedNewQuantity);
    
    // Show success message immediately for better responsiveness
    setSuccess('Stock updated successfully');
    setReasonDetails('');
    setStockAdjustmentAmount(0);
    
    try {
      await menuItemsApi.updateStock(menuItem.id, {
        stock_quantity: calculatedNewQuantity,
        reason_type: reasonType,
        reason_details: reasonDetails
      });
      
      // Refresh inventory data in the background with minimal UI disruption
      await refreshInventoryData({ 
        refreshAuditHistory: true, // We need audit history for stock updates
        notifyParent: true
      });
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update stock:', err);
      setError('Failed to update stock');
      setStockQuantity(originalStockQuantity); // Revert the optimistic update
      setTimeout(() => setSuccess(null), 0); // Clear success message
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!menuItem) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-center items-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-auto max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Inventory Management: {menuItem.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {(error || success) && (
            <div className="mb-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-2">
                  {success}
                </div>
              )}
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-4">Inventory Tracking</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="inventoryTrackingType"
                    value="none"
                    checked={inventoryTrackingType === 'none'}
                    onChange={() => {
                      setInventoryTrackingType('none');
                      
                      // Notify the parent component about the change
                      if (onEnableTrackingChange) {
                        onEnableTrackingChange(false);
                      }
                      
                      // Show success message
                      setSuccess('Inventory tracking disabled successfully');
                    }}
                    className="mr-2"
                  />
                  <span>No inventory tracking</span>
                </label>
              </div>
              
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="inventoryTrackingType"
                    value="menu"
                    checked={inventoryTrackingType === 'menu'}
                    onChange={() => {
                      setInventoryTrackingType('menu');
                      
                      // Notify the parent component about the change
                      if (onEnableTrackingChange) {
                        onEnableTrackingChange(true);
                      }
                      
                      // Save the changes immediately
                      setTimeout(() => {
                        handleSaveSettings();
                      }, 100);
                      
                      // Show success message
                      setSuccess('Menu-level inventory tracking enabled successfully');
                    }}
                    className="mr-2"
                  />
                  <span>Track inventory at menu item level</span>
                </label>
              </div>
              
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="inventoryTrackingType"
                    value="option"
                    checked={inventoryTrackingType === 'option'}
                    onChange={() => {
                      setInventoryTrackingType('option');
                      
                      // Notify the parent component about the change
                      if (onEnableTrackingChange) {
                        onEnableTrackingChange(false);
                      }
                      
                      // Save the changes immediately
                      setTimeout(() => {
                        handleSaveSettings();
                      }, 100);
                      
                      // Show success message
                      setSuccess('Option-level inventory tracking enabled successfully');
                    }}
                    className="mr-2"
                  />
                  <span>Track inventory at option level</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Menu-level inventory section */}
          {inventoryTrackingType === 'menu' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Damaged Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={damagedQuantity}
                  onChange={(e) => setDamagedQuantity(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When stock falls below this number, item will be marked as 'low stock'
                </p>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Available Quantity: <span className="font-bold">{Math.max(0, stockQuantity - damagedQuantity)}</span>
                </p>
              </div>
              
              <div className="flex justify-end mb-6">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Settings
                </button>
              </div>
              
              <hr className="my-6" />
              
              <h3 className="font-semibold text-lg mb-4">Mark Items as Damaged</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity to Mark as Damaged
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={damageQuantity}
                    min={1}
                    onChange={(e) =>
                      setDamageQuantity(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
                
                <div className="md:col-span-8">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Damage
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={damageReason}
                    onChange={(e) => setDamageReason(e.target.value)}
                  >
                    {damageReasonOptions.map((option) => (
                      option !== 'other' ? 
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option> 
                      : 
                        <option key="other" value="other">Other (specify)</option>
                    ))}
                  </select>
                </div>
                
                {damageReason === 'other' && (
                  <div className="md:col-span-8">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specify Other Reason
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                      value={otherDamageReason}
                      placeholder="Enter custom reason"
                      onChange={(e) => setOtherDamageReason(e.target.value)}
                    />
                  </div>
                )}
                
                {damageReason === 'other' && otherDamageReason.trim() !== '' && (
                  <div className="md:col-span-8 flex items-center">
                    <input
                      type="checkbox"
                      id="saveCustomReason"
                      className="h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                    />
                    <label htmlFor="saveCustomReason" className="ml-2 block text-sm text-gray-700">
                      Save this reason for future use
                    </label>
                  </div>
                )}
                
                <div className="md:col-span-12 flex justify-end">
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleMarkAsDamaged}
                    disabled={damageQuantity <= 0 || !damageReason.trim()}
                  >
                    Mark as Damaged
                  </button>
                </div>
              </div>
              
              <hr className="my-6" />
              
              <h3 className="font-semibold text-lg mb-4">Update Stock Quantity</h3>
              
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Current Stock:{' '}
                  <span className="font-bold">{stockQuantity}</span> items
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* OPERATION BUTTONS */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operation
                  </label>
                  {/* Make sure each label is half-width using grid or fixed widths */}
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex items-center justify-center px-3 py-2 rounded-md cursor-pointer text-sm font-medium text-center
                        ${
                          stockOperation === 'add'
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={stockOperation === 'add'}
                        onChange={() => setStockOperation('add')}
                      />
                      <span>Add</span>
                    </label>
                    
                    <label
                      className={`flex items-center justify-center px-3 py-2 rounded-md cursor-pointer text-sm font-medium text-center
                        ${
                          stockOperation === 'remove'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-gray-100 text-gray-700'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={stockOperation === 'remove'}
                        onChange={() => setStockOperation('remove')}
                      />
                      <span>Remove</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity to {stockOperation === 'add' ? 'Add' : 'Remove'}
                  </label>
                  <input
                    type="number"
                    className={`w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                      stockOperation === 'add'
                        ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                        : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    }`}
                    value={stockAdjustmentAmount}
                    min={1}
                    onChange={(e) =>
                      setStockAdjustmentAmount(parseInt(e.target.value) || 0)
                    }
                  />
                  {stockOperation === 'remove' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {stockQuantity} items
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason Type
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={reasonType}
                    onChange={(e) => {
                      const selectedType = e.target.value as
                        | 'restock'
                        | 'adjustment'
                        | 'other';
                      setReasonType(selectedType);
                      // Automatically set the stock operation based on reason type
                      if (selectedType === 'restock') {
                        setStockOperation('add');
                      }
                    }}
                  >
                    <option value="restock">Restock</option>
                    <option value="adjustment">Inventory Adjustment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={reasonDetails}
                    placeholder="Additional details about the update"
                    onChange={(e) => setReasonDetails(e.target.value)}
                  />
                </div>
                
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        New total will be:{' '}
                        <span className="font-bold">
                          {stockOperation === 'add'
                            ? stockQuantity + stockAdjustmentAmount
                            : Math.max(0, stockQuantity - stockAdjustmentAmount)}
                          {' '}items
                        </span>
                      </p>
                    </div>
                    <button
                      className={`py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                        stockOperation === 'add'
                          ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      }`}
                      onClick={handleUpdateStock}
                      disabled={
                        stockAdjustmentAmount <= 0 ||
                        (stockOperation === 'remove' &&
                          stockAdjustmentAmount > stockQuantity)
                      }
                    >
                      {stockOperation === 'add' ? 'Add' : 'Remove'} Stock
                    </button>
                  </div>
                </div>
              </div>
              
              <hr className="my-6" />
              
              <h3 className="font-semibold text-lg mb-4">Audit History</h3>
              
              {loadingAudits ? (
                <p className="text-gray-500">Loading audit history...</p>
              ) : auditHistory.length > 0 ? (
                <div className="max-h-[300px] overflow-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Previous Qty
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          New Qty
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Change
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {auditHistory.map((audit) => (
                        <tr key={audit.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(audit.created_at), 'MM/dd/yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {audit.previous_quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {audit.new_quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {audit.new_quantity - audit.previous_quantity > 0 ? (
                              <span className="text-green-600">
                                +{audit.new_quantity - audit.previous_quantity}
                              </span>
                            ) : (
                              <span className="text-red-600">
                                {audit.new_quantity - audit.previous_quantity}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {audit.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No audit history available</p>
              )}
            </>
          )}
          
          {/* Option-level inventory section */}
          {inventoryTrackingType === 'option' && (
            <>
              {menuItem.option_groups && menuItem.option_groups.length > 0 ? (
                <>
                  <hr className="my-6" />
                  
                  <h3 className="font-semibold text-lg mb-4">Option-Level Inventory</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Manage inventory for individual options (e.g., shirt sizes, musubi types)
                  </p>
                  
                  <div className="space-y-6">
                    {menuItem.option_groups.map((group) => (
                      <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-base mb-3">{group.name}</h4>
                        
                        <div className="space-y-4">
                          {group.options.map((option) => (
                            <OptionInventoryForm
                              key={option.id}
                              option={option as MenuOption}
                              onUpdate={() => {
                                // Refresh the menu item data after updating an option
                                refreshInventoryData({
                                  refreshAuditHistory: false,
                                  notifyParent: true
                                });
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800">
                    This menu item doesn't have any option groups or options.
                    Please add option groups and options first before enabling option-level inventory tracking.
                  </p>
                </div>
              )}
                    </>
                  )}
                </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemInventoryModal;
