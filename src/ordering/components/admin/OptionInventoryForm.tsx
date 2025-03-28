import React, { useState } from 'react';
import { MenuOption } from '../../types/menu';
import { optionsApi } from '../../../shared/api/endpoints/options';

interface OptionInventoryFormProps {
  option: MenuOption;
  onUpdate: () => void;
}

const OptionInventoryForm: React.FC<OptionInventoryFormProps> = ({ option, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [enableTracking, setEnableTracking] = useState(option.enable_stock_tracking || false);
  const [stockQuantity, setStockQuantity] = useState(option.stock_quantity || 0);
  const [damagedQuantity, setDamagedQuantity] = useState(option.damaged_quantity || 0);
  const [lowStockThreshold, setLowStockThreshold] = useState(option.low_stock_threshold || 10);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await optionsApi.updateInventory(option.id, {
        enable_stock_tracking: enableTracking,
        stock_quantity: enableTracking ? stockQuantity : 0,
        damaged_quantity: enableTracking ? damagedQuantity : 0,
        low_stock_threshold: enableTracking ? lowStockThreshold : undefined
      });
      
      setSuccess('Option inventory settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      onUpdate();
    } catch (err) {
      console.error('Failed to save option inventory settings:', err);
      setError('Failed to save option inventory settings');
      setTimeout(() => setError(null), 3000);
    }
  };

  const availableQuantity = Math.max(0, stockQuantity - damagedQuantity);
  
  const getStatusBadge = () => {
    if (!enableTracking) return null;
    
    if (option.stock_status === 'out_of_stock') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Out of Stock</span>;
    } else if (option.stock_status === 'low_stock') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Low Stock</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">In Stock</span>;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium">{option.name}</h4>
          {getStatusBadge()}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {expanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-4">
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
          
          <div className="mb-4">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableTracking}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setEnableTracking(newValue);
                  
                  // Auto-save when enabling/disabling tracking
                  setTimeout(() => {
                    optionsApi.updateInventory(option.id, {
                      enable_stock_tracking: newValue,
                      stock_quantity: newValue ? stockQuantity : 0,
                      damaged_quantity: newValue ? damagedQuantity : 0,
                      low_stock_threshold: newValue ? lowStockThreshold : undefined
                    }).then(() => {
                      setSuccess(`Inventory tracking ${newValue ? 'enabled' : 'disabled'} successfully`);
                      setTimeout(() => setSuccess(null), 3000);
                      onUpdate();
                    }).catch((err) => {
                      console.error('Failed to update inventory tracking:', err);
                      setError('Failed to update inventory tracking');
                      setTimeout(() => setError(null), 3000);
                      // Revert UI state on error
                      setEnableTracking(!newValue);
                    });
                  }, 100);
                }}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable inventory tracking for this option</span>
            </label>
          </div>
          
          {enableTracking && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
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
                
                <div>
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
                
                <div>
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
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Available Quantity: <span className="font-bold">{availableQuantity}</span>
                </p>
              </div>
            </>
          )}
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionInventoryForm;