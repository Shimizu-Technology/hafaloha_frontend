import React, { useState, useEffect } from 'react';
import { MenuItem as MenuItemType, MenuItemStockAudit } from '../../../ordering/types/menu';
import { menuItemsApi } from '../../../shared/api/endpoints/menuItems';
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
  // State for inventory tracking toggle
  const [enableTracking, setEnableTracking] = useState(false);
  
  // State for stock quantities
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [damagedQuantity, setDamagedQuantity] = useState<number>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);
  
  // State for "Mark as damaged" form
  const [damageQuantity, setDamageQuantity] = useState<number>(1);
  const [damageReason, setDamageReason] = useState<string>('');
  
  // State for "Update stock" form
  const [newStockQuantity, setNewStockQuantity] = useState<number>(0);
  const [reasonType, setReasonType] = useState<'restock' | 'adjustment' | 'other'>('restock');
  const [reasonDetails, setReasonDetails] = useState<string>('');
  
  // State for audit history
  const [auditHistory, setAuditHistory] = useState<MenuItemStockAudit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load menu item data when opened
  useEffect(() => {
    if (open && menuItem) {
      setEnableTracking(menuItem.enable_stock_tracking || false);
      setStockQuantity(menuItem.stock_quantity || 0);
      setDamagedQuantity(menuItem.damaged_quantity || 0);
      setLowStockThreshold(menuItem.low_stock_threshold || 10);
      setNewStockQuantity(menuItem.stock_quantity || 0);
      
      // Only load audit history if tracking is enabled
      if (menuItem.enable_stock_tracking) {
        loadAuditHistory();
      }
    }
  }, [open, menuItem]);

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
    
    try {
      // When disabling inventory tracking, explicitly set values to 0/undefined
      // This ensures the database clears these values when tracking is off
      await menuItemsApi.update(menuItem.id, {
        enable_stock_tracking: enableTracking,
        stock_quantity: enableTracking ? stockQuantity : 0,
        damaged_quantity: enableTracking ? damagedQuantity : 0,
        low_stock_threshold: enableTracking ? lowStockThreshold : undefined
      });
      
      setSuccess('Inventory settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      // Callback to notify the parent component about the save
      onSave();
    } catch (err) {
      console.error('Failed to save inventory settings:', err);
      setError('Failed to save inventory settings');
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
    
    try {
      await menuItemsApi.markAsDamaged(menuItem.id, {
        quantity: damageQuantity,
        reason: damageReason
      });
      
      setSuccess('Items marked as damaged successfully');
      setDamageQuantity(1);
      setDamageReason('');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh the data
      loadAuditHistory();
      onSave();
    } catch (err) {
      console.error('Failed to mark items as damaged:', err);
      setError('Failed to mark items as damaged');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateStock = async () => {
    if (!menuItem) return;
    
    if (newStockQuantity < 0) {
      setError('Stock quantity cannot be negative');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      await menuItemsApi.updateStock(menuItem.id, {
        stock_quantity: newStockQuantity,
        reason_type: reasonType,
        reason_details: reasonDetails
      });
      
      setSuccess('Stock updated successfully');
      setReasonDetails('');
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh the data
      loadAuditHistory();
      onSave();
    } catch (err) {
      console.error('Failed to update stock:', err);
      setError('Failed to update stock');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!menuItem) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-center items-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-auto max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Inventory Management: {menuItem.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                    
                    // Immediately save the change to the database
                    if (menuItem) {
                      try {
                        // When disabling inventory tracking, explicitly set values to 0/undefined
                        await menuItemsApi.update(menuItem.id, {
                          enable_stock_tracking: newValue,
                          stock_quantity: newValue ? stockQuantity : 0,
                          damaged_quantity: newValue ? damagedQuantity : 0,
                          low_stock_threshold: newValue ? lowStockThreshold : undefined
                        });
                        
                        setSuccess('Inventory tracking ' + (newValue ? 'enabled' : 'disabled') + ' successfully');
                        setTimeout(() => setSuccess(null), 3000);
                        
                        // Refresh data
                        onSave();
                      } catch (err) {
                        console.error('Failed to update inventory tracking:', err);
                        setError('Failed to update inventory tracking');
                        setTimeout(() => setError(null), 3000);
                        
                        // Revert the UI if the API call fails
                        setEnableTracking(!newValue);
                      }
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#c1902f]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c1902f]"></div>
                <span className="ml-3 text-gray-900 font-medium">Enable Inventory Tracking</span>
              </label>
            </div>
            <p className="text-sm text-gray-500">
              When enabled, you can track stock quantities, set low stock thresholds, and mark items as damaged.
            </p>
          </div>
          
          {enableTracking && (
            <>
              <h3 className="font-semibold text-lg mb-4">Inventory Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={stockQuantity}
                    min={0}
                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Damaged Quantity</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={damagedQuantity}
                    min={0}
                    onChange={(e) => setDamagedQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={lowStockThreshold}
                    min={1}
                    onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 1)}
                  />
                  <p className="mt-1 text-xs text-gray-500">When stock falls below this number, item will be marked as 'low stock'</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-800">
                  Available Quantity: <span className="font-bold">{(stockQuantity - damagedQuantity) > 0 ? (stockQuantity - damagedQuantity) : 0}</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Mark as Damaged</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={damageQuantity}
                    min={1}
                    onChange={(e) => setDamageQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div className="md:col-span-8">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Damage</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={damageReason}
                    placeholder="e.g., Dropped on floor, Expired, etc."
                    onChange={(e) => setDamageReason(e.target.value)}
                  />
                </div>
                
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Stock Quantity</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={newStockQuantity}
                    min={0}
                    onChange={(e) => setNewStockQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={reasonType}
                    onChange={(e) => setReasonType(e.target.value as 'restock' | 'adjustment' | 'other')}
                  >
                    <option value="restock">Restock</option>
                    <option value="adjustment">Inventory Adjustment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Details (Optional)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={reasonDetails}
                    placeholder="Additional details about the update"
                    onChange={(e) => setReasonDetails(e.target.value)}
                  />
                </div>
                
                <div className="md:col-span-3 flex justify-end">
                  <button
                    className="bg-[#c1902f] hover:bg-[#a97c28] text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleUpdateStock}
                    disabled={newStockQuantity < 0}
                  >
                    Update Stock
                  </button>
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
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Qty</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Qty</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
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

export default ItemInventoryModal;
