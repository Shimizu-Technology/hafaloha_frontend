import React, { useState, useEffect } from 'react';
import { MenuItem as MenuItemType, MenuItemStockAudit } from '../../../ordering/types/menu';
import { menuItemsApi } from '../../../shared/api/endpoints/menuItems';
import { useMenuStore } from '../../store/menuStore';
import { format } from 'date-fns';
import { optionGroupsApi, OptionGroupInventoryStatus } from '../../../shared/api/endpoints/optionGroups';
import { optionsApi } from '../../../shared/api/endpoints/options';

interface ItemInventoryModalProps {
  open: boolean;
  onClose: () => void;
  menuItem?: MenuItemType;
  onSave: () => void;
  onEnableTrackingChange?: (enableTracking: boolean) => void;
  onTrackingTypeChange?: (trackingType: 'manual' | 'menu_item_level' | 'option_level') => void;
}

const ItemInventoryModal: React.FC<ItemInventoryModalProps> = ({
  open,
  onClose,
  menuItem,
  onSave,
  onEnableTrackingChange,
  onTrackingTypeChange
}) => {
  // State for inventory tracking toggle
  const [enableTracking, setEnableTracking] = useState(false);
  
  // State for inventory strategy selection
  const [inventoryTrackingType, setInventoryTrackingType] = useState<'manual' | 'menu_item_level' | 'option_level'>('manual');
  
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
      setEnableTracking(menuItem.enable_stock_tracking || false);
      setInventoryTrackingType(menuItem.inventory_tracking_type || 'manual');
      setStockQuantity(menuItem.stock_quantity || 0);
      setDamagedQuantity(menuItem.damaged_quantity || 0);
      setLowStockThreshold(menuItem.low_stock_threshold || 10);
      setStockAdjustmentAmount(0); // Reset adjustment amount when opening modal
      
      // Only load audit history if tracking is enabled
      if (menuItem.enable_stock_tracking) {
        loadAuditHistory();
      }
      
      // Start polling for real-time inventory updates
      startInventoryPolling(menuItem.id);
    }
    
    // Clean up polling when the modal closes
    return () => {
      stopInventoryPolling();
    };
  }, [open, menuItem, startInventoryPolling, stopInventoryPolling]);

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
      // Fetch the latest menu item data
      const updatedItem = await menuItemsApi.getById(menuItem.id);
      
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
      const updatedValues = {
        enable_stock_tracking: enableTracking,
        inventory_tracking_type: inventoryTrackingType,
        stock_quantity: enableTracking && inventoryTrackingType === 'menu_item_level' ? stockQuantity : 0,
        damaged_quantity: enableTracking && inventoryTrackingType === 'menu_item_level' ? damagedQuantity : 0,
        low_stock_threshold: enableTracking && inventoryTrackingType === 'menu_item_level' ? lowStockThreshold : undefined
      };
      
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
            <div className="flex items-center mb-2">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTracking}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setEnableTracking(newValue);
                    
                    // Notify the parent component about the change
                    if (onEnableTrackingChange) {
                      onEnableTrackingChange(newValue);
                    }
                    
                    // Show success message immediately for better user feedback
                    setSuccess(
                      'Inventory tracking ' +
                        (newValue ? 'enabled' : 'disabled') +
                        ' successfully'
                    );
                    
                    // Immediately save the change to the database
                    if (menuItem) {
                      try {
                        // When disabling inventory tracking, explicitly set values to 0/undefined
                        await menuItemsApi.update(menuItem.id, {
                          enable_stock_tracking: newValue,
                          stock_quantity: newValue ? stockQuantity : 0,
                          damaged_quantity: newValue ? damagedQuantity : 0,
                          low_stock_threshold: newValue
                            ? lowStockThreshold
                            : undefined
                        });
                        
                        // Refresh inventory data with minimal UI disruption
                        await refreshInventoryData({
                          refreshAuditHistory: false,
                          notifyParent: true
                        });
                        
                        setTimeout(() => setSuccess(null), 3000);
                      } catch (err) {
                        console.error('Failed to update inventory tracking:', err);
                        setError('Failed to update inventory tracking');
                        setTimeout(() => setSuccess(null), 0); // Clear success message
                        setTimeout(() => setError(null), 3000);
                        
                        // Revert the UI if the API call fails
                        setEnableTracking(!newValue);
                      }
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#c1902f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c1902f]"></div>
                <span className="ml-3 text-gray-900 font-medium">
                  Enable Inventory Tracking
                </span>
              </label>
            </div>
            <p className="text-sm text-gray-500">
              When enabled, you can track stock quantities, set low stock
              thresholds, and mark items as damaged.
            </p>
          </div>
          
          {/* Inventory Strategy Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Inventory Strategy</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="inventory_strategy"
                  value="manual"
                  checked={inventoryTrackingType === 'manual'}
                  onChange={async () => {
                    setInventoryTrackingType('manual');
                    setEnableTracking(false);
                    
                    // Save the change immediately
                    try {
                      await menuItemsApi.update(menuItem.id, {
                        inventory_tracking_type: 'manual',
                        enable_stock_tracking: false
                      });
                      
                      setSuccess('Switched to manual status tracking');
                      setTimeout(() => setSuccess(null), 3000);
                      
                      if (onTrackingTypeChange) {
                        onTrackingTypeChange('manual');
                      }
                      onSave();
                    } catch (err) {
                      console.error('Failed to update tracking type:', err);
                      setError('Failed to update tracking type');
                      setTimeout(() => setError(null), 3000);
                    }
                  }}
                  className="mr-3 h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300"
                />
                <div>
                  <span className="text-sm font-medium">Manual Status Only</span>
                  <p className="text-xs text-gray-500">Manually set availability status without quantity tracking</p>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="inventory_strategy"
                  value="menu_item_level"
                  checked={inventoryTrackingType === 'menu_item_level'}
                  onChange={async () => {
                    setInventoryTrackingType('menu_item_level');
                    setEnableTracking(true);
                    
                    // Save the change immediately
                    try {
                      await menuItemsApi.update(menuItem.id, {
                        inventory_tracking_type: 'menu_item_level',
                        enable_stock_tracking: true
                      });
                      
                      setSuccess('Switched to menu item level tracking');
                      setTimeout(() => setSuccess(null), 3000);
                      
                      if (onTrackingTypeChange) {
                        onTrackingTypeChange('menu_item_level');
                      }
                      onSave();
                    } catch (err) {
                      console.error('Failed to update tracking type:', err);
                      setError('Failed to update tracking type');
                      setTimeout(() => setError(null), 3000);
                    }
                  }}
                  className="mr-3 h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300"
                />
                <div>
                  <span className="text-sm font-medium">Menu Item Level Tracking</span>
                  <p className="text-xs text-gray-500">Track inventory for the entire menu item</p>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="inventory_strategy"
                  value="option_level"
                  checked={inventoryTrackingType === 'option_level'}
                  onChange={async () => {
                    setInventoryTrackingType('option_level');
                    setEnableTracking(true);
                    
                    // Save the change immediately
                    try {
                      await menuItemsApi.update(menuItem.id, {
                        inventory_tracking_type: 'option_level',
                        enable_stock_tracking: true
                      });
                      
                      setSuccess('Switched to option level tracking');
                      setTimeout(() => setSuccess(null), 3000);
                      
                      if (onTrackingTypeChange) {
                        onTrackingTypeChange('option_level');
                      }
                      onSave();
                    } catch (err) {
                      console.error('Failed to update tracking type:', err);
                      setError('Failed to update tracking type');
                      setTimeout(() => setError(null), 3000);
                    }
                  }}
                  disabled={!menuItem?.id}
                  className="mr-3 h-4 w-4 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 disabled:opacity-50"
                />
                <div>
                  <span className={`text-sm font-medium ${!menuItem?.id ? 'text-gray-400' : ''}`}>
                    Option Level Tracking
                  </span>
                  <p className="text-xs text-gray-500">
                    {!menuItem?.id 
                      ? "Save the menu item first, then configure option groups for option-level tracking"
                      : "Track inventory for individual options (sizes, flavors, etc.)"
                    }
                  </p>
                </div>
              </label>
            </div>
                     </div>
           
           {/* Manual Status Selection */}
           {inventoryTrackingType === 'manual' && (
             <div className="mb-6">
               <h3 className="font-semibold text-lg mb-4">Manual Status</h3>
               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Availability Status
                 </label>
                 <select
                   value={menuItem?.stock_status || 'in_stock'}
                   onChange={(e) => {
                     // Handle manual status change here
                     // This would need to be passed back to parent component
                   }}
                   className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                 >
                   <option value="in_stock">In Stock</option>
                   <option value="out_of_stock">Out of Stock</option>
                   <option value="low_stock">Low Stock</option>
                 </select>
                 <p className="text-xs text-gray-500 mt-1">
                   "Low Stock" shows a warning but still allows ordering. "Out of Stock" fully disables ordering.
                 </p>
               </div>
             </div>
           )}
           
           {/* Option Level Tracking Status */}
           {inventoryTrackingType === 'option_level' && (
             <OptionLevelInventorySection 
               menuItem={menuItem}
               onSave={refreshInventoryData}
             />
           )}
           
           {enableTracking && inventoryTrackingType === 'menu_item_level' && (
            <>
              <h3 className="font-semibold text-lg mb-4">Inventory Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={stockQuantity}
                    min={0}
                    onChange={(e) =>
                      setStockQuantity(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Damaged Quantity
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={damagedQuantity}
                    min={0}
                    onChange={(e) =>
                      setDamagedQuantity(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={lowStockThreshold}
                    min={1}
                    onChange={(e) =>
                      setLowStockThreshold(parseInt(e.target.value) || 1)
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    When stock falls below this number, item will be marked as
                    'low stock'
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-800">
                  Available Quantity:{' '}
                  <span className="font-bold">
                    {stockQuantity - damagedQuantity > 0
                      ? stockQuantity - damagedQuantity
                      : 0}
                  </span>
                </p>
                
                <button
                  className="bg-[#c1902f] hover:bg-[#a97c28] text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50"
                  onClick={handleSaveSettings}
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
                      setDamageQuantity(parseInt(e.target.value) || 0)
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

// Inline Option Level Inventory Section Component
interface OptionLevelInventorySectionProps {
  menuItem: MenuItemType;
  onSave: () => void;
}

const OptionLevelInventorySection: React.FC<OptionLevelInventorySectionProps> = ({ menuItem, onSave }) => {
  const [optionGroups, setOptionGroups] = useState<OptionGroupInventoryStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [optionStockChanges, setOptionStockChanges] = useState<Record<number, number>>({});

  // Load option groups when component mounts
  useEffect(() => {
    if (menuItem?.id) {
      loadOptionGroups();
    }
  }, [menuItem?.id]);

  const loadOptionGroups = async () => {
    try {
      setLoading(true);
      const groups = await optionGroupsApi.getForMenuItem(Number(menuItem.id));
      setOptionGroups(groups);
    } catch (err) {
      console.error('Failed to load option groups:', err);
      setError('Failed to load option groups');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableTracking = async (group: OptionGroupInventoryStatus, enable: boolean) => {
    try {
      await optionGroupsApi.configureInventory(group.id, {
        enable_option_inventory: enable,
        tracking_priority: enable ? 1 : 0,
        low_stock_threshold: group.low_stock_threshold || 10
      });
      
      // Reload to get updated data
      await loadOptionGroups();
      
      setSuccess(`${enable ? 'Enabled' : 'Disabled'} tracking for ${group.name}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update tracking:', err);
      setError('Failed to update tracking settings');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleStockChange = (optionId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setOptionStockChanges(prev => ({
      ...prev,
      [optionId]: numValue
    }));
  };

  const handleSaveStock = async (optionId: number) => {
    const newStock = optionStockChanges[optionId];
    if (newStock === undefined) return;

    try {
      await optionsApi.updateStock(optionId, {
        stock_quantity: newStock,
        reason_type: 'adjustment',
        reason_details: 'Stock update'
      });
      
      // Clear the change and reload
      setOptionStockChanges(prev => {
        const next = { ...prev };
        delete next[optionId];
        return next;
      });
      
      await loadOptionGroups();
      onSave();
      
      setSuccess('Stock updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update stock:', err);
      setError('Failed to update stock');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSaveAllChanges = async () => {
    try {
      // Save all pending stock changes
      for (const [optionId, newStock] of Object.entries(optionStockChanges)) {
        await optionsApi.updateStock(Number(optionId), {
          stock_quantity: newStock,
          reason_type: 'adjustment',
          reason_details: 'Bulk stock update'
        });
      }
      
      setOptionStockChanges({});
      await loadOptionGroups();
      onSave();
      
      setSuccess('All changes saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save changes:', err);
      setError('Failed to save all changes');
      setTimeout(() => setError(null), 3000);
    }
  };

  const hasPendingChanges = Object.keys(optionStockChanges).length > 0;
  const hasAnyTracking = optionGroups.some(g => g.enable_option_inventory);

  return (
    <>
      {/* Status Summary */}
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-4">Option-Level Inventory Settings</h3>
        
        {/* Status Card */}
        <div className="p-4 bg-gray-50 rounded-md mb-4">
          <div className="flex items-center mb-2">
            <div className={`h-3 w-3 rounded-full mr-2 ${
              menuItem?.total_option_stock === 0 ? 'bg-red-500' : 
              menuItem?.total_option_stock && menuItem.total_option_stock <= 10 ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}></div>
            <span className="font-medium">
              {menuItem?.total_option_stock === 0 ? 'All Options Out of Stock' : 
               menuItem?.total_option_stock && menuItem.total_option_stock <= 10 ? 'Low Stock' :
               'In Stock'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <div>Primary Group: {menuItem?.primary_tracked_option_group_name || 'None configured'}</div>
            <div>Total Available: {menuItem?.total_option_stock || 0} items</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Status is determined by option availability in the primary tracked option group.
          </p>
        </div>

        {/* Messages */}
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
      </div>

      {/* Option Groups Configuration */}
      <h4 className="font-medium text-base mb-3">Configure Option Groups</h4>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c1902f]"></div>
          <p className="text-gray-600 mt-2">Loading option groups...</p>
        </div>
      ) : optionGroups.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No option groups found for this menu item.</p>
          <p className="text-sm text-gray-500 mt-1">
            Add option groups (like sizes or flavors) first to enable option-level inventory tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {optionGroups.map(group => {
            const canTrack = group.min_select > 0;
            const isTracked = group.enable_option_inventory;
            const hasOptions = group.options && group.options.length > 0;

            return (
              <div 
                key={group.id} 
                className={`border rounded-lg p-4 ${isTracked ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
              >
                {/* Group Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="font-medium">{group.name}</h5>
                    <p className="text-sm text-gray-600">
                      {group.min_select > 0 ? `Required (${group.min_select}-${group.max_select})` : 'Optional'}
                      {hasOptions && ` • ${group.options.length} options`}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {isTracked && group.tracking_priority === 1 && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        Primary Tracking
                      </span>
                    )}
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isTracked}
                        onChange={(e) => handleEnableTracking(group, e.target.checked)}
                        disabled={!canTrack}
                        className="mr-2 h-4 w-4 text-[#c1902f] rounded focus:ring-[#c1902f]"
                      />
                      <span className="text-sm font-medium">
                        Enable Tracking
                      </span>
                    </label>
                  </div>
                </div>

                {!canTrack && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    This group cannot track inventory because it's optional. Only required groups can control stock.
                  </div>
                )}

                {/* Options Stock Management - Show inline when tracking is enabled */}
                {isTracked && hasOptions && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h6 className="text-sm font-medium text-gray-700 mb-2">Stock Quantities</h6>
                    <div className="space-y-2">
                      {group.options.map(option => {
                        const hasChange = optionStockChanges[option.id] !== undefined;
                        const currentStock = hasChange ? optionStockChanges[option.id] : (option.stock_quantity || 0);
                        const isLowStock = currentStock > 0 && currentStock <= group.low_stock_threshold;
                        const isOutOfStock = currentStock === 0;

                        return (
                          <div key={option.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                            <span className="text-sm font-medium">{option.name}</span>
                            
                            <div className="flex items-center space-x-3">
                              {/* Stock Status */}
                              <span className={`text-xs font-medium ${
                                isOutOfStock ? 'text-red-600' : 
                                isLowStock ? 'text-yellow-600' : 
                                'text-green-600'
                              }`}>
                                {isOutOfStock ? 'Out of Stock' : 
                                 isLowStock ? 'Low Stock' : 
                                 'In Stock'}
                              </span>

                              {/* Stock Input */}
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">Stock:</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={currentStock}
                                  onChange={(e) => handleStockChange(option.id, e.target.value)}
                                  className={`w-20 px-2 py-1 border rounded text-sm ${
                                    hasChange ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                  }`}
                                />
                              </div>

                              {/* Save Button */}
                              {hasChange && (
                                <button
                                  onClick={() => handleSaveStock(option.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Save
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Low Stock Threshold */}
                    <div className="mt-3 flex items-center justify-between">
                      <label className="text-sm text-gray-700">Low Stock Alert:</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          value={group.low_stock_threshold}
                          onChange={async (e) => {
                            const value = parseInt(e.target.value) || 10;
                            try {
                              await optionGroupsApi.configureInventory(group.id, {
                                enable_option_inventory: true,
                                tracking_priority: group.tracking_priority,
                                low_stock_threshold: value
                              });
                              await loadOptionGroups();
                            } catch (err) {
                              console.error('Failed to update threshold:', err);
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-sm text-gray-600">items</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Save All Button */}
      {hasPendingChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveAllChanges}
            className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#a97c28]"
          >
            Save All Changes ({Object.keys(optionStockChanges).length})
          </button>
        </div>
      )}
    </>
  );
};

export default ItemInventoryModal;
