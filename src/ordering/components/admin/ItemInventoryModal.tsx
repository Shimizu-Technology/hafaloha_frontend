import React, { useState, useEffect, useCallback } from 'react';
import { MenuItem as MenuItemType, MenuItemStockAudit, OptionGroup } from '../../../ordering/types/menu';
import { menuItemsApi } from '../../../shared/api/endpoints/menuItems';
import { optionGroupsApi, OptionStockAudit } from '../../../shared/api/endpoints/optionGroups';
import { useMenuStore } from '../../store/menuStore';
import { format } from 'date-fns';

interface ItemInventoryModalProps {
  open: boolean;
  onClose: () => void;
  menuItem?: MenuItemType;
  onSave: () => void;
  onEnableTrackingChange?: (enableTracking: boolean) => void;
}

// OptionInventoryGrid Sub-component Props
interface OptionInventoryGridProps {
  optionGroup?: OptionGroup;
  totalStock: number;
  optionQuantities: Record<string, number>;
  onQuantityChange: (optionId: string, newQuantity: number) => void;
  onSave: () => void;
  validationErrors: string[];
  lowStockThreshold: number;
  onLowStockThresholdChange: (threshold: number) => void;
}

// OptionStockUpdateForm Sub-component Props - FE-004 Implementation
interface OptionStockUpdateFormProps {
  optionGroup?: OptionGroup;
  optionQuantities: Record<string, number>;
  onOptionStockUpdate: (optionId: string, operation: 'add' | 'remove', amount: number, reasonType: string, reasonDetails: string) => void;
}

// OptionAuditHistory Sub-component Props - FE-005 Implementation
interface OptionAuditHistoryProps {
  optionGroup?: OptionGroup;
  loading: boolean;
  onRefresh: () => void;
}

// OptionInventoryGrid Sub-component - FE-002 Implementation
const OptionInventoryGrid: React.FC<OptionInventoryGridProps> = ({
  optionGroup,
  totalStock,
  optionQuantities,
  onQuantityChange,
  onSave,
  validationErrors,
  lowStockThreshold,
  onLowStockThresholdChange
}) => {
  if (!optionGroup || !optionGroup.options) {
    return null;
  }

  const totalOptionQuantity = Object.values(optionQuantities).reduce((sum, qty) => sum + qty, 0);
  // For option-level tracking, allow inventory adjustments - validate based on individual option constraints instead
  const hasNegativeQuantities = Object.values(optionQuantities).some(qty => qty < 0);
  const hasInvalidQuantities = Object.values(optionQuantities).some(qty => !Number.isInteger(qty) || qty > 999999);
  const isValid = !hasNegativeQuantities && !hasInvalidQuantities;

  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-md bg-blue-50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-gray-800">
          Option Quantities for "{optionGroup.name}"
        </h4>
        <div className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
          Total: {totalOptionQuantity} / {totalStock} 
          {totalOptionQuantity === totalStock ? ' ✓' : ' ⚠️'}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          {validationErrors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Option Quantity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {optionGroup.options.map((option) => {
          const currentQuantity = optionQuantities[option.id.toString()] || 0;
          
          return (
            <div key={option.id} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {option.name}
                {(option.additional_price || 0) > 0 && (
                  <span className="text-xs text-gray-500 ml-1">
                    (+${(option.additional_price || 0).toFixed(2)})
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                value={currentQuantity}
                onChange={(e) => {
                  const newQuantity = parseInt(e.target.value) || 0;
                  onQuantityChange(option.id.toString(), newQuantity);
                }}
                className={`w-full border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                  isValid 
                    ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                }`}
                placeholder="0"
              />
              
              {/* Stock Level Indicator with Damaged Info */}
              <div className="mt-1 text-xs space-y-1">
                {/* Available Stock Status */}
                <div>
                  {currentQuantity === 0 && (
                    <span className="text-red-500">Out of Stock</span>
                  )}
                  {currentQuantity > 0 && currentQuantity <= 5 && (
                    <span className="text-yellow-600">Low Stock ({currentQuantity})</span>
                  )}
                  {currentQuantity > 5 && (
                    <span className="text-green-600">In Stock ({currentQuantity})</span>
                  )}
                </div>
                
                {/* Damaged Quantity Display */}
                {option.damaged_quantity && option.damaged_quantity > 0 && (
                  <div className="text-orange-600">
                    Damaged: {option.damaged_quantity}
                  </div>
                )}
                
                {/* Available Stock Calculation */}
                {option.damaged_quantity !== undefined && option.stock_quantity !== undefined && (
                  <div className="text-gray-600">
                    Available: {Math.max(0, (option.stock_quantity || 0) - (option.damaged_quantity || 0))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Information */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Options:</span>
            <span className="font-medium ml-1">{optionGroup.options.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Assigned:</span>
            <span className="font-medium ml-1">{totalOptionQuantity}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Damaged:</span>
            <span className="font-medium ml-1 text-orange-600">
              {optionGroup.options.reduce((sum, option) => sum + (option.damaged_quantity || 0), 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Menu Item Stock:</span>
            <span className="font-medium ml-1">{totalStock}</span>
          </div>
          <div>
            <span className="text-gray-600">Difference:</span>
            <span className={`font-medium ml-1 ${
              totalOptionQuantity === totalStock ? 'text-green-600' : 'text-orange-600'
            }`}>
              {totalOptionQuantity - totalStock}
            </span>
          </div>
        </div>
        
        {/* Available Stock Summary */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-sm">
            <span className="text-gray-600">Total Available (Stock - Damaged):</span>
            <span className="font-medium ml-1 text-green-600">
              {optionGroup.options.reduce((sum, option) => {
                const available = Math.max(0, (option.stock_quantity || 0) - (option.damaged_quantity || 0));
                return sum + available;
              }, 0)}
            </span>
          </div>
        </div>
        
        {/* Low Stock Threshold Setting */}
        <div className="mt-3 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Low Stock Threshold
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="999"
                value={lowStockThreshold}
                onChange={(e) => onLowStockThresholdChange(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">items</span>
            </div>
          </div>
          
          {/* Low Stock Status */}
          {(() => {
            const totalAvailable = optionGroup.options.reduce((sum, option) => {
              const available = Math.max(0, (option.stock_quantity || 0) - (option.damaged_quantity || 0));
              return sum + available;
            }, 0);
            const isLowStock = totalAvailable <= lowStockThreshold;
            
            return (
              <div className={`text-xs px-2 py-1 rounded-md ${
                isLowStock 
                  ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                  : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
                {isLowStock ? (
                  <>⚠️ Low Stock: {totalAvailable} available (threshold: {lowStockThreshold})</>
                ) : (
                  <>✅ Stock OK: {totalAvailable} available (threshold: {lowStockThreshold})</>
                )}
              </div>
            );
          })()}
          
          <p className="text-xs text-gray-500 mt-1">
            When total available stock falls below this number, items will be marked as 'low stock'
          </p>
        </div>
      </div>

      {/* Help Text - Updated for option-level tracking */}
      <p className="mt-3 text-xs text-gray-500">
        Tip: Adjust quantities to set your desired inventory levels. 
        Changes that don't match the current menu item stock will be treated as inventory adjustments and logged in the audit trail.
      </p>

      {/* Save Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={onSave}
          disabled={!isValid}
          className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Save Option Quantities
        </button>
      </div>
    </div>
  );
};

// OptionStockUpdateForm Sub-component - FE-004 Implementation
const OptionStockUpdateForm: React.FC<OptionStockUpdateFormProps> = ({
  optionGroup,
  optionQuantities,
  onOptionStockUpdate
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [stockOperation, setStockOperation] = useState<'add' | 'remove'>('add');
  const [stockAdjustmentAmount, setStockAdjustmentAmount] = useState<number>(0);
  const [reasonType, setReasonType] = useState<'restock' | 'adjustment' | 'other'>('restock');
  const [reasonDetails, setReasonDetails] = useState<string>('');

  if (!optionGroup || !optionGroup.options) {
    return null;
  }

  const selectedOption = optionGroup.options.find(option => option.id.toString() === selectedOptionId);
  const currentStock = selectedOptionId ? (optionQuantities[selectedOptionId] || 0) : 0;
  const newTotal = stockOperation === 'add' 
    ? currentStock + stockAdjustmentAmount 
    : Math.max(0, currentStock - stockAdjustmentAmount);

  const handleUpdateStock = () => {
    if (selectedOptionId && stockAdjustmentAmount > 0) {
      onOptionStockUpdate(selectedOptionId, stockOperation, stockAdjustmentAmount, reasonType, reasonDetails);
      
      // Reset form
      setStockAdjustmentAmount(0);
      setReasonDetails('');
    }
  };

  const isFormValid = selectedOptionId && 
                     stockAdjustmentAmount > 0 && 
                     (stockOperation === 'add' || stockAdjustmentAmount <= currentStock);

  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-md bg-yellow-50">
      <h4 className="font-medium text-gray-800 mb-4">Update Option Stock</h4>
      
      {/* Option Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Option to Update
        </label>
        <select
          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
          value={selectedOptionId}
          onChange={(e) => setSelectedOptionId(e.target.value)}
        >
          <option value="">Choose an option...</option>
          {optionGroup.options.map((option) => {
            const currentStock = optionQuantities[option.id.toString()] || 0;
            const damagedQty = option.damaged_quantity || 0;
            const availableQty = Math.max(0, currentStock - damagedQty);
            
            return (
              <option key={option.id} value={option.id.toString()}>
                {option.name} (Stock: {currentStock}
                {damagedQty > 0 && `, Damaged: ${damagedQty}`}, Available: {availableQty})
                {(option.additional_price || 0) > 0 && ` - +$${(option.additional_price || 0).toFixed(2)}`}
              </option>
            );
          })}
        </select>
      </div>

      {selectedOptionId && (
        <>
          {/* Current Stock Display */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-gray-700">
              <span className="font-medium">{selectedOption?.name}</span> - Stock: 
              <span className="font-bold ml-1">
                {selectedOption?.damaged_quantity !== undefined && selectedOption?.damaged_quantity > 0 
                  ? `${currentStock} total (${selectedOption.damaged_quantity} damaged, ${Math.max(0, currentStock - selectedOption.damaged_quantity)} available)`
                  : `${currentStock} available`
                }
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Operation Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center justify-center px-3 py-2 rounded-md cursor-pointer text-sm font-medium text-center
                    ${stockOperation === 'add'
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
                    ${stockOperation === 'remove'
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
            
            {/* Quantity Input */}
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
                onChange={(e) => setStockAdjustmentAmount(parseInt(e.target.value) || 0)}
              />
              {stockOperation === 'remove' && (
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {Math.max(0, currentStock - (selectedOption?.damaged_quantity || 0))} items
                  {selectedOption?.damaged_quantity && selectedOption.damaged_quantity > 0 && 
                    ` (${selectedOption.damaged_quantity} damaged, not removable)`
                  }
                </p>
              )}
            </div>
            
            {/* Reason Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason Type
              </label>
              <select
                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                value={reasonType}
                onChange={(e) => {
                  const selectedType = e.target.value as 'restock' | 'adjustment' | 'other';
                  setReasonType(selectedType);
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
          </div>

          {/* Reason Details */}
          <div className="mb-4">
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

          {/* Preview and Action */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                New stock for <span className="font-medium">{selectedOption?.name}</span> will be:{' '}
                <span className="font-bold">
                  {newTotal} items
                </span>
                {selectedOption?.damaged_quantity && selectedOption.damaged_quantity > 0 && (
                  <span className="text-gray-500 text-xs block">
                    ({selectedOption.damaged_quantity} will remain as damaged)
                  </span>
                )}
              </p>
            </div>
            <button
              className={`py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                stockOperation === 'add'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              }`}
              onClick={handleUpdateStock}
              disabled={!isFormValid}
            >
              {stockOperation === 'add' ? 'Add' : 'Remove'} Stock
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// OptionAuditHistory Sub-component - FE-005 Implementation
const OptionAuditHistory: React.FC<OptionAuditHistoryProps> = ({
  optionGroup,
  loading,
  onRefresh
}) => {
  const [optionAuditHistory, setOptionAuditHistory] = useState<OptionStockAudit[]>([]);
  const [loadingOptionAudits, setLoadingOptionAudits] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Load option audit history
  const loadOptionAuditHistory = useCallback(async () => {
    if (!optionGroup || !selectedOptionId) {
      setOptionAuditHistory([]);
      return;
    }

    setLoadingOptionAudits(true);
    setError(null);

    try {
      const audits = await optionGroupsApi.getAuditHistory(
        parseInt(optionGroup.id.toString()),
        { option_id: parseInt(selectedOptionId) }
      );
      setOptionAuditHistory(audits);
    } catch (err) {
      console.error('Failed to load option audit history:', err);
      setError('Failed to load option audit history');
    } finally {
      setLoadingOptionAudits(false);
    }
  }, [optionGroup, selectedOptionId]);

  // Load audit history when option selection changes
  useEffect(() => {
    loadOptionAuditHistory();
  }, [loadOptionAuditHistory]);

  if (!optionGroup || !optionGroup.options) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Option Audit History</h3>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Option Selection for Audit History */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Option for Audit History
        </label>
        <select
          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
          value={selectedOptionId}
          onChange={(e) => setSelectedOptionId(e.target.value)}
        >
          <option value="">-- Select an option --</option>
          {optionGroup.options.map((option) => (
            <option key={option.id} value={option.id.toString()}>
              {option.name}
              {option.additional_price > 0 && ` (+$${option.additional_price})`}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {/* Audit History Table */}
      {selectedOptionId && (
        <div>
          {loadingOptionAudits ? (
            <p className="text-gray-500">Loading option audit history...</p>
          ) : optionAuditHistory.length > 0 ? (
            <div className="max-h-[300px] overflow-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Previous Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {optionAuditHistory.map((audit) => (
                    <tr key={audit.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(audit.created_at), 'MMMM do, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {audit.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {audit.quantity_before}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {audit.quantity_after}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {audit.quantity_after - audit.quantity_before > 0 ? (
                          <span className="text-green-600">
                            +{audit.quantity_after - audit.quantity_before}
                          </span>
                        ) : (
                          <span className="text-red-600">
                            {audit.quantity_after - audit.quantity_before}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {audit.reason || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No audit history available for this option</p>
          )}
        </div>
      )}
    </div>
  );
};

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
  
  // State for option-level low stock threshold
  const [optionLowStockThreshold, setOptionLowStockThreshold] = useState<number>(10);
  
  // State for "Mark as damaged" form
  const [damageQuantity, setDamageQuantity] = useState<number>(1);
  const [damageReason, setDamageReason] = useState<string>('fell');
  const [otherDamageReason, setOtherDamageReason] = useState<string>('');
  const [damageReasonOptions, setDamageReasonOptions] = useState<string[]>(['fell', 'bad/spoiled', 'other']);
  // FE-009: Option-specific damage state
  const [damageTarget, setDamageTarget] = useState<'menu_item' | 'option'>('menu_item');
  const [selectedDamageOptionId, setSelectedDamageOptionId] = useState<string>('');
  // FE-010: Option-specific stock update state
  const [stockTarget, setStockTarget] = useState<'menu_item' | 'option'>('menu_item');
  const [selectedStockOptionId, setSelectedStockOptionId] = useState<string>('');
  
  // State for "Update stock" form
  const [stockOperation, setStockOperation] = useState<'add' | 'remove'>('add');
  const [stockAdjustmentAmount, setStockAdjustmentAmount] = useState<number>(0);
  const [reasonType, setReasonType] = useState<'restock' | 'adjustment' | 'other'>('restock');
  const [reasonDetails, setReasonDetails] = useState<string>('');
  
  // State for audit history
  const [auditHistory, setAuditHistory] = useState<MenuItemStockAudit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [loading, setLoading] = useState(false);
  // FE-011: Unified audit history state
  const [optionAudits, setOptionAudits] = useState<OptionStockAudit[]>([]);
  const [loadingOptionAudits, setLoadingOptionAudits] = useState(false);
  
  // Enhanced option-level state variables for FE-006: Option-Level State Management
  const [selectedOptionGroupId, setSelectedOptionGroupId] = useState<string>('');
  const [optionQuantities, setOptionQuantities] = useState<Record<string, number>>({});
  const [optionDamagedQuantities, setOptionDamagedQuantities] = useState<Record<string, number>>({});
  const [hasOptionTracking, setHasOptionTracking] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // FE-007: Enhanced validation state for comprehensive option validation
  const [optionValidationErrors, setOptionValidationErrors] = useState<Record<string, string[]>>({});
  const [validationSummary, setValidationSummary] = useState<{
    hasErrors: boolean;
    totalErrors: number;
    criticalErrors: string[];
    warningErrors: string[];
  }>({ hasErrors: false, totalErrors: 0, criticalErrors: [], warningErrors: [] });
  
  // FE-006: Enhanced state management for options
  const [optionAvailability, setOptionAvailability] = useState<Record<string, boolean>>({});
  const [optionLoadingStates, setOptionLoadingStates] = useState<Record<string, boolean>>({});
  const [optionErrorStates, setOptionErrorStates] = useState<Record<string, string | null>>({});
  const [optionChangesTracking, setOptionChangesTracking] = useState<Record<string, boolean>>({});
  const [selectedOptionGroup, setSelectedOptionGroup] = useState<OptionGroup | null>(null);
  const [originalOptionQuantities, setOriginalOptionQuantities] = useState<Record<string, number>>({});
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Access menu store for real-time inventory updates
  const { 
    startInventoryPolling, 
    stopInventoryPolling,
    startOptionInventoryPolling,
    stopOptionInventoryPolling 
  } = useMenuStore();
  
  // State for option-specific polling
  const [optionPollingId, setOptionPollingId] = useState<string>('');

  // FE-006: Helper functions for enhanced option state management
  const updateOptionLoadingState = (optionId: string, isLoading: boolean) => {
    setOptionLoadingStates(prev => ({ ...prev, [optionId]: isLoading }));
  };

  const updateOptionErrorState = (optionId: string, error: string | null) => {
    setOptionErrorStates(prev => ({ ...prev, [optionId]: error }));
  };

  const updateOptionAvailability = (optionId: string, quantity: number) => {
    setOptionAvailability(prev => ({ ...prev, [optionId]: quantity > 0 }));
  };

  const markOptionAsChanged = (optionId: string, hasChanged: boolean = true) => {
    setOptionChangesTracking(prev => ({ ...prev, [optionId]: hasChanged }));
  };

  const resetOptionChanges = () => {
    setOptionChangesTracking(prev => {
      const reset: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => { reset[key] = false; });
      return reset;
    });
  };

  const hasUnsavedOptionChanges = () => {
    return Object.values(optionChangesTracking).some(changed => changed);
  };

  const getChangedOptionIds = () => {
    return Object.keys(optionChangesTracking).filter(
      optionId => optionChangesTracking[optionId]
    );
  };

  // FE-009: Helper function for damage form validation
  const getAvailableStockForDamage = () => {
    // For option-tracking items, always use option-level logic
    if (hasOptionTracking && selectedDamageOptionId) {
      const optionStock = optionQuantities[selectedDamageOptionId] || 0;
      return optionStock;
    }
    return Math.max(0, stockQuantity - damagedQuantity); // Menu item level - subtract damaged
  };

  const getSelectedOptionName = () => {
    if (!selectedDamageOptionId || !hasOptionTracking) return '';
    const selectedGroup = menuItem?.option_groups?.find(g => g.id.toString() === selectedOptionGroupId);
    const selectedOption = selectedGroup?.options?.find(opt => opt.id.toString() === selectedDamageOptionId);
    return selectedOption?.name || '';
  };

  // FE-010: Helper functions for stock update form
  const getAvailableStockForUpdate = () => {
    // For option-tracking items, always use option-level logic
    if (hasOptionTracking && selectedStockOptionId) {
      const optionStock = optionQuantities[selectedStockOptionId] || 0;
      return optionStock;
    }
    return Math.max(0, stockQuantity - damagedQuantity); // Menu item level - subtract damaged
  };

  // Helper function to get stock breakdown for display
  const getStockBreakdown = (stockQty: number, damagedQty: number = 0) => {
    const available = Math.max(0, stockQty - damagedQty);
    return {
      stock: stockQty,
      damaged: damagedQty,
      available
    };
  };

  // Helper function to format stock display text
  const formatStockDisplay = (stockQty: number, damagedQty: number = 0, showDetailed: boolean = true) => {
    const breakdown = getStockBreakdown(stockQty, damagedQty);
    
    if (!showDetailed || damagedQty === 0) {
      return `${breakdown.available} available`;
    }
    
    return `${breakdown.stock} total (${breakdown.damaged} damaged, ${breakdown.available} available)`;
  };

  const getSelectedStockOptionName = () => {
    if (!selectedStockOptionId || !hasOptionTracking) return '';
    const selectedGroup = menuItem?.option_groups?.find(g => g.id.toString() === selectedOptionGroupId);
    const selectedOption = selectedGroup?.options?.find(opt => opt.id.toString() === selectedStockOptionId);
    return selectedOption?.name || '';
  };

  const getNewStockTotal = () => {
    const currentStock = getAvailableStockForUpdate();
    if (stockOperation === 'add') {
      return currentStock + stockAdjustmentAmount;
    } else {
      return Math.max(0, currentStock - stockAdjustmentAmount);
    }
  };

  // FE-011: Helper functions for unified audit display
  const getOptionNameById = (optionId: string) => {
    if (!hasOptionTracking || !selectedOptionGroupId) return '';
    const selectedGroup = menuItem?.option_groups?.find(g => g.id.toString() === selectedOptionGroupId);
    const option = selectedGroup?.options?.find(opt => opt.id.toString() === optionId);
    return option?.name || '';
  };

  const getFilteredAuditHistory = () => {
    // Enhanced source detection: Use backend tracking_method field with fallback
    const detectAuditSource = (audit: any) => {
      const reason = audit.reason || '';
      
      // Primary: Use the tracking_method field from backend if available
      if (audit.tracking_method) {
        if (audit.tracking_method === 'option_level') {
          return {
            source: 'option' as const,
            option_name: null // Simplified - no need to show specific option in source column
          };
        } else {
          return {
            source: 'menu_item' as const,
            option_name: null
          };
        }
      }
      
      // Fallback: Pattern detection for older audits without tracking_method field
      const optionPattern = /\(([SMLXL0-9]+)\)|[-–]\s*([SMLXL0-9]+)(?:\s|$)/i;
      const hasOptionIndicator = optionPattern.test(reason);
      
      // Check for other option-level keywords
      const optionKeywords = ['option', 'size', 'variant', 'choice'];
      const hasOptionKeyword = optionKeywords.some(keyword => 
        reason.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // If we have clear option indicators, mark as option-level
      if (hasOptionIndicator || hasOptionKeyword) {
        return {
          source: 'option' as const,
          option_name: null // Simplified - no need to show specific option in source column
        };
      }
      
      // Check if this audit has an option_id field (direct option audit)
      if (audit.option_id) {
        return {
          source: 'option' as const,
          option_name: null // Simplified - no need to show specific option in source column
        };
      }
      
      // Default to menu item level
      return {
        source: 'menu_item' as const,
        option_name: null
      };
    };

    // Process menu item audits with enhanced source detection
    const processedMenuItemAudits = auditHistory.map(audit => {
      const sourceInfo = detectAuditSource(audit);
      return {
        ...audit,
        ...sourceInfo
      };
    });

    // Process option audits (if any)
    const optionAuditsWithSource = optionAudits.map(audit => ({
      ...audit,
      source: 'option' as const,
      option_name: getOptionNameById(audit.option_id?.toString() || ''),
      // Map option audit fields to match menu item audit structure
      previous_quantity: audit.quantity_before,
      new_quantity: audit.quantity_after,
      created_at: audit.created_at
    }));

    // Return all audits combined
    return [...processedMenuItemAudits, ...optionAuditsWithSource];
  };

  // FE-008: Option inventory synchronization helper functions
  
  /**
   * Distribute menu item stock quantity changes proportionally to options
   * This maintains the relative distribution of stock across options
   */
  const distributeStockToOptions = (newMenuItemStock: number, currentOptionQuantities: Record<string, number>) => {
    const currentTotal = Object.values(currentOptionQuantities).reduce((sum, qty) => sum + qty, 0);
    
    // If no current stock, distribute evenly
    if (currentTotal === 0) {
      const optionIds = Object.keys(currentOptionQuantities);
      if (optionIds.length === 0) return currentOptionQuantities;
      
      const evenDistribution = Math.floor(newMenuItemStock / optionIds.length);
      const remainder = newMenuItemStock % optionIds.length;
      
      const newQuantities: Record<string, number> = {};
      optionIds.forEach((optionId, index) => {
        newQuantities[optionId] = evenDistribution + (index < remainder ? 1 : 0);
      });
      
      return newQuantities;
    }
    
    // Distribute proportionally based on current ratios
    const newQuantities: Record<string, number> = {};
    let distributedTotal = 0;
    
    // Calculate proportional distribution
    Object.entries(currentOptionQuantities).forEach(([optionId, currentQty]) => {
      const proportion = currentQty / currentTotal;
      const newQty = Math.floor(newMenuItemStock * proportion);
      newQuantities[optionId] = newQty;
      distributedTotal += newQty;
    });
    
    // Distribute any remainder to options with the highest original quantities
    const remainder = newMenuItemStock - distributedTotal;
    if (remainder > 0) {
      const sortedOptions = Object.entries(currentOptionQuantities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, remainder);
      
      sortedOptions.forEach(([optionId]) => {
        newQuantities[optionId] += 1;
      });
    }
    
    return newQuantities;
  };

  /**
   * Synchronize option quantities with menu item stock changes
   * Called when menu item stock is updated to keep options in sync
   */
  const synchronizeOptionsWithMenuItemStock = async (newMenuItemStock: number) => {
    if (!hasOptionTracking || !selectedOptionGroupId) {
      return; // No option tracking enabled, nothing to synchronize
    }
    
    try {
      // Calculate new option quantities based on proportional distribution
      const newOptionQuantities = distributeStockToOptions(newMenuItemStock, optionQuantities);
      
      // Update local state immediately for better UX
      setOptionQuantities(newOptionQuantities);
      setOriginalOptionQuantities({ ...newOptionQuantities });
      
      // Update availability for all options
      Object.entries(newOptionQuantities).forEach(([optionId, quantity]) => {
        updateOptionAvailability(optionId, quantity);
      });
      
      // Save the new option quantities to the backend
      const result = await optionGroupsApi.updateOptionQuantities(
        parseInt(selectedOptionGroupId),
        { quantities: newOptionQuantities }
      );
      
      // Check for success by presence of option_group and valid message
      if (!result.option_group || !result.message) {
        console.error('Failed to synchronize option quantities:', result.message || 'Unknown error');
        // Revert local state if backend update failed
        setOptionQuantities(optionQuantities);
        setOriginalOptionQuantities({ ...optionQuantities });
      }
      
      return !!(result.option_group && result.message);
    } catch (err) {
      console.error('Error synchronizing options with menu item stock:', err);
      // Revert local state if synchronization failed
      setOptionQuantities(optionQuantities);
      setOriginalOptionQuantities({ ...optionQuantities });
      return false;
    }
  };

  /**
   * Check if option quantities are out of sync with menu item stock
   * Returns true if synchronization is needed
   */
  const isOptionInventoryOutOfSync = (menuItemStock: number, currentOptionQuantities: Record<string, number>) => {
    const optionTotal = Object.values(currentOptionQuantities).reduce((sum, qty) => sum + qty, 0);
    return optionTotal !== menuItemStock;
  };

  /**
   * Handle conflicts when option quantities don't match menu item stock
   * Provides resolution strategies for data inconsistencies
   */
  const resolveInventoryConflict = async (menuItemStock: number, currentOptionQuantities: Record<string, number>) => {
    if (!hasOptionTracking || !selectedOptionGroupId) {
      return { resolved: true, strategy: 'no_options' };
    }
    
    const optionTotal = Object.values(currentOptionQuantities).reduce((sum, qty) => sum + qty, 0);
    
    if (optionTotal === menuItemStock) {
      return { resolved: true, strategy: 'already_synced' };
    }
    
    try {
      // Strategy: Adjust option quantities to match menu item stock
      const adjustedQuantities = distributeStockToOptions(menuItemStock, currentOptionQuantities);
      
      // Update local state
      setOptionQuantities(adjustedQuantities);
      setOriginalOptionQuantities({ ...adjustedQuantities });
      
      // Update availability
      Object.entries(adjustedQuantities).forEach(([optionId, quantity]) => {
        updateOptionAvailability(optionId, quantity);
      });
      
      // Save to backend
      const result = await optionGroupsApi.updateOptionQuantities(
        parseInt(selectedOptionGroupId),
        { quantities: adjustedQuantities }
      );
      
      // Check for success by presence of option_group and valid message
      if (result.option_group && result.message) {
        return { 
          resolved: true, 
          strategy: 'distributed_proportionally',
          previousTotal: optionTotal,
          newTotal: menuItemStock,
          adjustedQuantities
        };
      } else {
        return { 
          resolved: false, 
          strategy: 'backend_update_failed',
          error: result.message 
        };
      }
    } catch (err) {
      console.error('Failed to resolve inventory conflict:', err);
      return { 
        resolved: false, 
        strategy: 'exception_occurred',
        error: (err as any).message 
      };
    }
  };

  // Enhanced initialize option-level state based on menu item data - FE-006
  const initializeOptionState = (menuItem: MenuItemType) => {
    console.log('[OPTION STATE INIT] Initializing option state for menuItem:', menuItem.id);
    console.log('[OPTION STATE INIT] Option groups:', menuItem.option_groups?.map((g: any) => ({ id: g.id, name: g.name, tracking: g.enable_inventory_tracking })));
    console.log('[OPTION STATE INIT] Full option groups data:', JSON.stringify(menuItem.option_groups, null, 2));
    
    if (!menuItem.option_groups) {
      console.log('[OPTION STATE INIT] No option groups found, resetting state');
      // Reset all option-related state when no option groups exist
      setHasOptionTracking(false);
      setSelectedOptionGroupId('');
      setOptionQuantities({});
      setOptionDamagedQuantities({});
      setValidationErrors([]); // FE-007: Reset validation errors
      setOptionValidationErrors({}); // FE-007: Reset option-specific validation errors
      setValidationSummary({ hasErrors: false, totalErrors: 0, criticalErrors: [], warningErrors: [] }); // FE-007: Reset validation summary
      setOptionAvailability({});
      setOptionLoadingStates({});
      setOptionErrorStates({});
      setOptionChangesTracking({});
      setSelectedOptionGroup(null);
      setOriginalOptionQuantities({});
      return;
    }

    // Check if any option group has inventory tracking enabled
    const inventoryTrackedGroup = menuItem.option_groups.find(
      (group: any) => group.enable_inventory_tracking
    );

    console.log('[OPTION STATE INIT] Inventory tracked group found:', inventoryTrackedGroup ? { id: inventoryTrackedGroup.id, name: inventoryTrackedGroup.name } : 'none');

    if (inventoryTrackedGroup) {
      console.log('[OPTION STATE INIT] Setting up option tracking state');
      setHasOptionTracking(true);
      setSelectedOptionGroupId(inventoryTrackedGroup.id.toString());
      setSelectedOptionGroup(inventoryTrackedGroup);
      
      // Initialize option quantities and enhanced state tracking
      const quantities: Record<string, number> = {};
      const damagedQuantities: Record<string, number> = {};
      const availability: Record<string, boolean> = {};
      const loadingStates: Record<string, boolean> = {};
      const errorStates: Record<string, string | null> = {};
      const changesTracking: Record<string, boolean> = {};
      
              inventoryTrackedGroup.options?.forEach((option: any) => {
        const optionId = option.id.toString();
        const stockQty = option.stock_quantity || 0;
        const damagedQty = option.damaged_quantity || 0;
        
        quantities[optionId] = stockQty;
        damagedQuantities[optionId] = damagedQty;
        availability[optionId] = stockQty > 0; // Available if stock > 0
        loadingStates[optionId] = false; // Not loading initially
        errorStates[optionId] = null; // No errors initially
        changesTracking[optionId] = false; // No changes initially
      });
      
      setOptionQuantities(quantities);
      setOptionDamagedQuantities(damagedQuantities);
      setOptionAvailability(availability);
      setOptionLoadingStates(loadingStates);
      setOptionErrorStates(errorStates);
      setOptionChangesTracking(changesTracking);
      setOriginalOptionQuantities({ ...quantities }); // Deep copy for tracking changes
      
      // Initialize option-level low stock threshold from menu item threshold
      setOptionLowStockThreshold(menuItem.low_stock_threshold || 10);
    } else {
      // Reset all option-related state when no tracking is enabled
      setHasOptionTracking(false);
      setSelectedOptionGroupId('');
      setOptionQuantities({});
      setOptionDamagedQuantities({});
      setValidationErrors([]); // FE-007: Reset validation errors
      setOptionValidationErrors({}); // FE-007: Reset option-specific validation errors
      setValidationSummary({ hasErrors: false, totalErrors: 0, criticalErrors: [], warningErrors: [] }); // FE-007: Reset validation summary
      setOptionAvailability({});
      setOptionLoadingStates({});
      setOptionErrorStates({});
      setOptionChangesTracking({});
      setSelectedOptionGroup(null);
      setOriginalOptionQuantities({});
    }
  };

  // Load menu item data when opened and start polling for real-time updates
  useEffect(() => {
    if (open && menuItem) {

      
      // Update local state to match the menuItem
      setEnableTracking(menuItem.enable_stock_tracking || false);
      setStockQuantity(menuItem.stock_quantity || 0);
      setDamagedQuantity(menuItem.damaged_quantity || 0);
      setLowStockThreshold(menuItem.low_stock_threshold || 10);
      setStockAdjustmentAmount(0); // Reset adjustment amount when opening modal
      
      // Initialize option-level state
      initializeOptionState(menuItem);
      
      // Only load audit history when modal opens and tracking is already enabled
      // Since menuItem is no longer in dependency array, this only runs when modal opens
      if (menuItem.enable_stock_tracking === true) {
        loadAuditHistory();
      } else {
        setAuditHistory([]);
      }
      
      // Start polling for real-time inventory updates
      startInventoryPolling(menuItem.id);
      
      // Start option-specific polling if option tracking is enabled
      if (hasOptionTracking && selectedOptionGroupId) {
        console.debug(`[ItemInventoryModal] Starting option inventory polling for item ${menuItem.id}, group ${selectedOptionGroupId}`);
        const pollingId = startOptionInventoryPolling(menuItem.id, parseInt(selectedOptionGroupId));
        setOptionPollingId(pollingId);
      }
    }
    
    // Clean up polling when the modal closes
    return () => {
      stopInventoryPolling();
      if (optionPollingId) {
        stopOptionInventoryPolling(optionPollingId);
        setOptionPollingId('');
      }
    };
  }, [open, hasOptionTracking, selectedOptionGroupId, startInventoryPolling, stopInventoryPolling, startOptionInventoryPolling, stopOptionInventoryPolling, optionPollingId]);

  // Load and refresh inventory data when menuItem changes
  useEffect(() => {
    if (menuItem && open) {
      // Update local state when menuItem is refreshed (e.g., by polling)
      setEnableTracking(menuItem.enable_stock_tracking || false);
      setStockQuantity(menuItem.stock_quantity || 0);
      setDamagedQuantity(menuItem.damaged_quantity || 0);
      setLowStockThreshold(menuItem.low_stock_threshold || 10);
      setStockAdjustmentAmount(0); // Reset to zero when the menuItem changes
    }
  }, [menuItem, open]);

  // Handle option tracking state changes for polling
  useEffect(() => {
    if (!open || !menuItem) return;

    // Stop existing option polling if any
    if (optionPollingId) {
      console.debug(`[ItemInventoryModal] Stopping previous option polling: ${optionPollingId}`);
      stopOptionInventoryPolling(optionPollingId);
      setOptionPollingId('');
    }

    // Start new option polling if option tracking is enabled
    if (hasOptionTracking && selectedOptionGroupId) {
      console.debug(`[ItemInventoryModal] Starting option inventory polling for group ${selectedOptionGroupId}`);
      const pollingId = startOptionInventoryPolling(menuItem.id, parseInt(selectedOptionGroupId));
      setOptionPollingId(pollingId);
    }
  }, [hasOptionTracking, selectedOptionGroupId, open, menuItem, startOptionInventoryPolling, stopOptionInventoryPolling]);

  // Function to refresh inventory data with optimizations to prevent page shaking
  const refreshInventoryData = useCallback(async (options: {
    refreshAuditHistory?: boolean;
    notifyParent?: boolean;
    skipParentNotification?: boolean;
    skipConflictResolution?: boolean; // NEW: Skip auto-sync when we've just made targeted updates
  } = {}) => {
    const { 
      refreshAuditHistory = false, 
      notifyParent = false, 
      skipParentNotification = false,
      skipConflictResolution = false // NEW: Default to false to maintain existing behavior
    } = options;

    if (!menuItem) return null;

    try {
             // Get fresh menu item data from the server
       const updatedItem = await menuItemsApi.getById(menuItem.id);
      
      // Only check for option inventory conflicts if we're not skipping conflict resolution
      if (hasOptionTracking && selectedOptionGroupId && !skipConflictResolution) {
        const menuItemStock = updatedItem.stock_quantity || 0;
        const isOutOfSync = isOptionInventoryOutOfSync(menuItemStock, optionQuantities);
        
        if (isOutOfSync) {
          console.warn('Inventory synchronization issue detected. Attempting to resolve...');
          
          // Attempt to resolve the conflict
          const resolution = await resolveInventoryConflict(menuItemStock, optionQuantities);
          
          if (resolution.resolved) {
            console.log('Inventory synchronization resolved:', resolution.strategy);
            if (resolution.strategy === 'distributed_proportionally') {
              setSuccess(`Inventory synchronized: ${resolution.previousTotal} → ${resolution.newTotal} distributed across options`);
              setTimeout(() => setSuccess(null), 4000);
            }
          } else {
            console.error('Failed to resolve inventory synchronization:', resolution.error);
            setError(`Inventory sync issue detected. ${resolution.error || 'Please check option quantities manually.'}`);
            setTimeout(() => setError(null), 5000);
          }
        }
      } else if (skipConflictResolution) {
        console.log('Skipping automatic conflict resolution due to recent targeted update');
      }
      
      // Update local state with the latest values using functional updates
      // to ensure we're working with the most current state
      setEnableTracking(updatedItem.enable_stock_tracking || false);
      setStockQuantity(updatedItem.stock_quantity || 0);
      setDamagedQuantity(updatedItem.damaged_quantity || 0);
      setLowStockThreshold(updatedItem.low_stock_threshold || 10);
      setStockAdjustmentAmount(0); // Reset adjustment amount after refresh
      
      // Update option state if menu item has changed
      if (updatedItem.option_groups) {
        initializeOptionState(updatedItem);
      }
      
      // Only refresh audit history if specifically requested
      if (refreshAuditHistory) {
        // If we just enabled tracking, add a small delay to avoid race condition
        const isEnablingTracking = updatedItem.enable_stock_tracking && !menuItem.enable_stock_tracking;
        
        if (isEnablingTracking) {
          // Small delay to ensure database transaction is committed
          setTimeout(() => {
            loadAuditHistory(true); // Force load since this is intentional
            // FE-011: Also load option audit history if option tracking is enabled
            if (hasOptionTracking && selectedOptionGroupId) {
              loadOptionAuditHistory();
            }
          }, 300);
        } else {
          // Normal case - load immediately
        loadAuditHistory();
          // FE-011: Also load option audit history if option tracking is enabled
          if (hasOptionTracking && selectedOptionGroupId) {
            loadOptionAuditHistory();
          }
        }
      }
      
      // Only notify parent if specifically requested and not explicitly skipped
      if (notifyParent && !skipParentNotification && onSave) {
        onSave();
      }
      
      return updatedItem;
    } catch (err) {
      console.error('Failed to refresh inventory data:', err);
      return null;
    }
  }, [menuItem?.id, hasOptionTracking, selectedOptionGroupId]);

  const loadAuditHistory = async (force: boolean = false) => {
    if (!menuItem) return;
    
    // RACE CONDITION FIX: Always check if inventory tracking is enabled before loading audit history
    // This prevents 422 errors when audit history is called before tracking is fully enabled
    if (!menuItem.enable_stock_tracking) {
      setAuditHistory([]);
      return;
    }
    
    // Prevent multiple simultaneous calls unless forced
    if (loadingAudits && !force) {
      return;
    }
    
    setLoadingAudits(true);
    try {
      const audits = await menuItemsApi.getStockAudits(menuItem.id);
      setAuditHistory(audits);
    } catch (err: any) {
      console.error('Failed to load audit history:', err);
      
      // If inventory tracking is not enabled, this is expected - just clear the history
      if (err?.response?.status === 422) {
        const errorMessage = err?.response?.data?.errors?.[0] || '';
        if (errorMessage.includes('Inventory tracking is not enabled') || 
            errorMessage.includes('not enabled for this item')) {
          setAuditHistory([]);
          return; // Don't show error message for this expected case
        }
      }
      
      // For other errors, show an error message but don't interrupt the user experience
      console.warn('Non-critical error loading audit history:', err?.response?.data?.errors || err.message);
      setAuditHistory([]); // Clear history on any error
    } finally {
      setLoadingAudits(false);
    }
  };

  // FE-011: Load option audit history for all options in the tracked group
  const loadOptionAuditHistory = async () => {
    if (!hasOptionTracking || !selectedOptionGroupId) {
      setOptionAudits([]);
      return;
    }
    
    // RACE CONDITION FIX: Check if menu item inventory tracking is enabled
    // Option tracking requires menu item tracking to be enabled first
    if (!menuItem?.enable_stock_tracking) {
      console.debug('Skipping option audit history load - menu item inventory tracking not enabled');
      setOptionAudits([]);
      return;
    }

    setLoadingOptionAudits(true);
    
    // CACHE BUSTING: Clear existing audit data first to force fresh display
    setOptionAudits([]);
    
    try {
      // Get all audits for the option group with high limit to ensure we get all records
      const audits = await optionGroupsApi.getAuditHistory(
        parseInt(selectedOptionGroupId),
        { limit: 1000 } // High limit to get all records
      );
      setOptionAudits(audits);
    } catch (error: any) {
      console.error('Failed to load option audit history:', error);
      
      // If option inventory tracking is not enabled, this is expected - just clear the history
      if (error?.response?.status === 422) {
        console.debug('Option audit history not available - option inventory tracking not enabled');
        setOptionAudits([]);
      } else {
        // For other errors, just clear the audits without showing an error message
        setOptionAudits([]);
      }
    } finally {
      setLoadingOptionAudits(false);
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
        stock_quantity: enableTracking ? stockQuantity : 0,
        damaged_quantity: enableTracking ? damagedQuantity : 0,
        low_stock_threshold: enableTracking ? lowStockThreshold : undefined
      };
      
      // When disabling inventory tracking, explicitly set values to 0/undefined
      // This ensures the database clears these values when tracking is off
      await menuItemsApi.update(menuItem.id, updatedValues);
      
      // Refresh inventory data without refreshing audit history and skip parent notification
      // to prevent race conditions with the parent's onSave callback
      await refreshInventoryData({ 
        refreshAuditHistory: false,
        notifyParent: false, // Changed from true to false
        skipParentNotification: true // NEW: Explicitly skip parent notification
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
    
    // FE-009: Validate available stock based on damage target
    const availableStock = getAvailableStockForDamage();
    if (damageQuantity > availableStock) {
      const targetName = damageTarget === 'option' ? getSelectedOptionName() : 'menu item';
      setError(`Cannot damage ${damageQuantity} items. Only ${availableStock} available for ${targetName}`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // FE-009: Validate option selection when targeting specific option
    if (damageTarget === 'option' && !selectedDamageOptionId) {
      setError('Please select an option to mark as damaged');
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
    
    // Store original state for rollback
    const originalDamagedQuantity = damagedQuantity;
    const originalOptionDamagedQuantities = { ...optionDamagedQuantities };
    const originalOptionQuantities = { ...optionQuantities };
    
    // FE-009: Handle option-specific vs menu item damage
    if (damageTarget === 'option' && selectedDamageOptionId && hasOptionTracking) {
      // Option-specific damage
      const newOptionDamagedQuantities = { ...optionDamagedQuantities };
      const newOptionQuantities = { ...optionQuantities };
      
      // Update damaged quantity for the specific option
      newOptionDamagedQuantities[selectedDamageOptionId] = (newOptionDamagedQuantities[selectedDamageOptionId] || 0) + damageQuantity;
      
      // Reduce available stock for the specific option
      newOptionQuantities[selectedDamageOptionId] = Math.max(0, (newOptionQuantities[selectedDamageOptionId] || 0) - damageQuantity);
      
      // Update menu item totals
      const newMenuItemDamaged = damagedQuantity + damageQuantity;
      const newMenuItemStock = stockQuantity - damageQuantity;
      
      // Apply optimistic updates
      setOptionDamagedQuantities(newOptionDamagedQuantities);
      setOptionQuantities(newOptionQuantities);
      setDamagedQuantity(newMenuItemDamaged);
      setStockQuantity(newMenuItemStock);
      updateOptionAvailability(selectedDamageOptionId, newOptionQuantities[selectedDamageOptionId]);
      
      setSuccess(`${damageQuantity} ${getSelectedOptionName()} items marked as damaged`);
      
      try {
        // Use the option-specific damage API
        await optionGroupsApi.markOptionsDamaged(parseInt(selectedOptionGroupId), {
          option_damages: [{
            option_id: parseInt(selectedDamageOptionId),
            quantity: damageQuantity,
            reason: finalReason
          }]
        });
        
        // Refresh inventory data
        await refreshInventoryData({ 
          refreshAuditHistory: true,
          notifyParent: true
        });
        
      } catch (err) {
        console.error('Failed to mark option as damaged:', err);
        setError('Failed to mark option as damaged');
        
        // Revert optimistic updates
        setOptionDamagedQuantities(originalOptionDamagedQuantities);
        setOptionQuantities(originalOptionQuantities);
        setDamagedQuantity(originalDamagedQuantity);
        setStockQuantity(stockQuantity);
        updateOptionAvailability(selectedDamageOptionId, originalOptionQuantities[selectedDamageOptionId] || 0);
        
        setTimeout(() => setSuccess(null), 0);
        setTimeout(() => setError(null), 3000);
        return;
      }
    } else {
      // Menu item level damage (original behavior)
    const newDamagedQuantity = damagedQuantity + damageQuantity;
    setDamagedQuantity(newDamagedQuantity);
    
      // FE-008: Synchronize option damaged quantities if option tracking is enabled
      if (hasOptionTracking && selectedOptionGroupId) {
        // Distribute damage proportionally across options based on their current stock
        const newOptionDamagedQuantities = { ...optionDamagedQuantities };
        const totalStock = Object.values(optionQuantities).reduce((sum, qty) => sum + qty, 0);
        
        if (totalStock > 0) {
          // Distribute damage proportionally
          let remainingDamage = damageQuantity;
          const sortedOptions = Object.entries(optionQuantities)
            .filter(([, qty]) => qty > 0) // Only options with stock
            .sort(([, a], [, b]) => b - a); // Sort by stock quantity descending
          
          // Distribute damage proportionally
          sortedOptions.forEach(([optionId, stockQty], index) => {
            if (remainingDamage <= 0) return;
            
            const proportion = stockQty / totalStock;
            let damageForOption = Math.floor(damageQuantity * proportion);
            
            // Give remainder to the first few options
            if (index < (damageQuantity % sortedOptions.length)) {
              damageForOption += 1;
            }
            
            // Don't exceed available stock for this option
            damageForOption = Math.min(damageForOption, stockQty);
            
            if (damageForOption > 0) {
              newOptionDamagedQuantities[optionId] = (newOptionDamagedQuantities[optionId] || 0) + damageForOption;
              remainingDamage -= damageForOption;
            }
          });
        }
        
        setOptionDamagedQuantities(newOptionDamagedQuantities);
      }
      
    setSuccess('Items marked as damaged successfully');
    
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
      
    } catch (err) {
      console.error('Failed to mark items as damaged:', err);
      setError('Failed to mark items as damaged');
        
        // Revert optimistic updates
        setDamagedQuantity(originalDamagedQuantity);
        if (hasOptionTracking) {
          setOptionDamagedQuantities(originalOptionDamagedQuantities);
        }
        
      setTimeout(() => setSuccess(null), 0); // Clear success message
      setTimeout(() => setError(null), 3000);
        return;
      }
    }
    
    // Reset form
    setDamageQuantity(1);
    setDamageReason('fell');
    setOtherDamageReason('');
    setSelectedDamageOptionId('');
    setDamageTarget('menu_item');
    
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleUpdateStock = async () => {
    if (!menuItem) return;
    
    // FE-010: Handle option-specific stock updates
    if (stockTarget === 'option' && selectedStockOptionId) {
      // Delegate to the existing option stock update handler
      const finalReason = reasonType === 'other' ? reasonDetails : reasonType;
      await handleOptionStockUpdate(
        selectedStockOptionId,
        stockOperation,
        stockAdjustmentAmount,
        reasonType,
        finalReason
      );
      
      // Reset the adjustment amount and clear selection
      setStockAdjustmentAmount(0);
      setReasonDetails('');
      return;
    }
    
    // Original menu item level logic
    const currentStock = getAvailableStockForUpdate();
    const calculatedNewQuantity =
      stockOperation === 'add'
        ? currentStock + stockAdjustmentAmount
        : currentStock - stockAdjustmentAmount;
    
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
    const originalOptionQuantities = { ...optionQuantities };
    setStockQuantity(calculatedNewQuantity);
    
    // FE-008: Synchronize option quantities if option tracking is enabled
    if (hasOptionTracking && selectedOptionGroupId) {
      const newOptionQuantities = distributeStockToOptions(calculatedNewQuantity, optionQuantities);
      setOptionQuantities(newOptionQuantities);
      
      // Update availability for all options
      Object.entries(newOptionQuantities).forEach(([optionId, quantity]) => {
        updateOptionAvailability(optionId, quantity);
      });
    }
    
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
      
      // DISABLED: Auto-sync was causing unwanted redistribution - users should manually adjust options
      // if (hasOptionTracking && selectedOptionGroupId) {
      //   const syncResult = await synchronizeOptionsWithMenuItemStock(calculatedNewQuantity);
      //   if (!syncResult) {
      //     setError('Stock updated but failed to synchronize options. Please check option quantities.');
      //     setTimeout(() => setError(null), 5000);
      //   }
      // }
      
      // Refresh inventory data in the background with minimal UI disruption
      await refreshInventoryData({ 
        refreshAuditHistory: true, // We need audit history for stock updates
        notifyParent: true
      });
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update stock:', err);
      setError('Failed to update stock');
      
      // Revert optimistic updates
      setStockQuantity(originalStockQuantity);
      if (hasOptionTracking) {
        setOptionQuantities(originalOptionQuantities);
        // Revert availability updates
        Object.entries(originalOptionQuantities).forEach(([optionId, quantity]) => {
          updateOptionAvailability(optionId, quantity);
        });
      }
      
      setTimeout(() => setSuccess(null), 0); // Clear success message
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle option group selection for inventory tracking
  const handleOptionGroupSelect = async (optionGroupId: string) => {
    console.log('[TRACKING MODE SWITCH] Starting handleOptionGroupSelect with optionGroupId:', optionGroupId);
    if (!menuItem) return;

    setSelectedOptionGroupId(optionGroupId);
    
    if (optionGroupId === '') {
      console.log('[TRACKING MODE SWITCH] Disabling option tracking');
      // Disable option tracking - find currently tracked group and disable it
      const currentlyTrackedGroup = menuItem.option_groups?.find(
        (group: any) => group.enable_inventory_tracking === true
      );
      
      if (currentlyTrackedGroup) {
        try {
          console.log('[TRACKING MODE SWITCH] Calling API to disable tracking for group:', currentlyTrackedGroup.id);
          await optionGroupsApi.disableInventoryTracking(currentlyTrackedGroup.id);
          console.log('[TRACKING MODE SWITCH] API call successful, updating local state');
          setSuccess('Option inventory tracking disabled successfully');
          
          // Update local state immediately
          setHasOptionTracking(false);
          setOptionQuantities({});
          setOptionDamagedQuantities({});
          setValidationErrors([]);
          
          // Notify parent to refresh menu item data after a brief delay to ensure backend has committed
          console.log('[TRACKING MODE SWITCH] Calling onSave to notify parent, onSave exists:', !!onSave);
          if (onSave) {
                         setTimeout(() => {
               console.log('[TRACKING MODE SWITCH] Delayed onSave call executing now');
               onSave();
             }, 1000); // 1 second delay to allow backend to commit
          }
          
          setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
          console.error('Failed to disable option tracking:', err);
          setError('Failed to disable option inventory tracking');
          setTimeout(() => setError(null), 3000);
        }
      } else {
        console.log('[TRACKING MODE SWITCH] No currently tracked group found, updating local state only');
        setHasOptionTracking(false);
        setOptionQuantities({});
        setOptionDamagedQuantities({});
        setValidationErrors([]);
      }
      return;
    }

    try {
      console.log('[TRACKING MODE SWITCH] Enabling option tracking for group:', optionGroupId);
      
      // First, check if another option group already has tracking enabled and disable it
      const currentlyTrackedGroup = menuItem.option_groups?.find(
        (group: any) => group.enable_inventory_tracking === true && group.id.toString() !== optionGroupId
      );
      
      if (currentlyTrackedGroup) {
        console.log('[TRACKING MODE SWITCH] Found existing tracked group:', currentlyTrackedGroup.id, 'disabling first');
        try {
          await optionGroupsApi.disableInventoryTracking(currentlyTrackedGroup.id);
          console.log('[TRACKING MODE SWITCH] Successfully disabled existing tracking for group:', currentlyTrackedGroup.id);
        } catch (disableErr) {
          console.error('Failed to disable existing option tracking:', disableErr);
          setError('Failed to switch option groups. Please try again.');
          setTimeout(() => setError(null), 3000);
          return;
        }
      }
      
      // Now enable inventory tracking for the selected option group
      const result = await optionGroupsApi.enableInventoryTracking(
        parseInt(optionGroupId), 
        { menu_item_id: parseInt(menuItem.id) }
      );

      console.log('[TRACKING MODE SWITCH] API response:', result);

      // Check for success by presence of option_group and valid message
      if (result.option_group && result.message) {
        console.log('[TRACKING MODE SWITCH] API call successful, updating local state');
        setHasOptionTracking(true);
        setSelectedOptionGroupId(optionGroupId);
        setSuccess('Option inventory tracking enabled successfully');
        
        // Initialize quantities from the API response
        const updatedGroup = result.option_group;
        const quantities: Record<string, number> = {};
        const damagedQuantities: Record<string, number> = {};
        
        updatedGroup.options?.forEach((option: any) => {
          quantities[option.id.toString()] = option.stock_quantity || 0;
          damagedQuantities[option.id.toString()] = option.damaged_quantity || 0;
        });
        
        console.log('[TRACKING MODE SWITCH] Setting option quantities:', quantities);
        setOptionQuantities(quantities);
        setOptionDamagedQuantities(damagedQuantities);
        setOriginalOptionQuantities({ ...quantities });
        validateOptionQuantities(quantities, stockQuantity);
        
        // Notify parent to refresh menu item data after a brief delay to ensure backend has committed
        console.log('[TRACKING MODE SWITCH] Calling onSave to notify parent, onSave exists:', !!onSave);
        if (onSave) {
          setTimeout(() => {
            console.log('[TRACKING MODE SWITCH] Delayed onSave call executing now');
            onSave();
            // TIMING FIX: Also refresh audit history after backend commits
            setTimeout(() => {
              loadOptionAuditHistory();
            }, 500); // Additional delay for audit history
          }, 1000); // 1 second delay to allow backend to commit
        }
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        console.error('[TRACKING MODE SWITCH] API call failed:', result.message || 'Unknown error');
        setError(result.message || 'Failed to enable option inventory tracking');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err: any) {
      console.error('Failed to enable option tracking:', err);
      const errorMessage = err.response?.data?.message || 'Failed to enable option inventory tracking';
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Auto-sync menu item stock with option quantities total
  // DEPRECATED: This function was causing automatic redistribution issues
  // It's now replaced by targeted single option updates and menu item stock adjustments
  /*
  const syncMenuItemStockWithOptions = (optionQuantities: Record<string, number>) => {
    if (!hasOptionTracking) return;
    
    const newTotal = Object.values(optionQuantities).reduce((sum, qty) => sum + qty, 0);
    if (newTotal !== stockQuantity) {
      console.log('[OPTION SYNC] Auto-updating menu item stock from', stockQuantity, 'to', newTotal);
      setStockQuantity(newTotal);
      // Note: We'll save this when the user saves option quantities
    }
  };
  */

  // Enhanced handle individual option quantity changes with real-time validation - FE-007
  const handleOptionQuantityChange = (optionId: string, newQuantity: number) => {
    // Allow the raw input (including negative numbers) for validation
    const inputQuantity = newQuantity;
    
    // Get original quantity for change tracking
    const originalQuantity = originalOptionQuantities[optionId] || 0;
    
    // Clear any existing general error for this option
    updateOptionErrorState(optionId, null);
    
    // Real-time individual option validation
    const singleValidation = validateSingleOption(optionId, inputQuantity);
    
    // Update quantities (allow invalid values for real-time feedback)
    const updatedQuantities = {
      ...optionQuantities,
      [optionId]: inputQuantity
    };
    
    setOptionQuantities(updatedQuantities);
    
    // Update availability based on new quantity (only if quantity is valid and positive)
    if (singleValidation.isValid) {
      updateOptionAvailability(optionId, inputQuantity);
    } else {
      // If invalid, mark as unavailable
      updateOptionAvailability(optionId, 0);
    }
    
    // Track if this option has changed from its original value
    markOptionAsChanged(optionId, inputQuantity !== originalQuantity);
    
    // Comprehensive validation of all option quantities (calculate new total for display only)
    const newStockTotal = Object.values(updatedQuantities).reduce((sum, qty) => sum + qty, 0);
    const fullValidation = validateOptionQuantities(updatedQuantities, newStockTotal);
    
    // Update option-specific error state based on validation
    if (!singleValidation.isValid) {
      updateOptionErrorState(optionId, singleValidation.errors.join(', '));
    }
    
    return {
      singleValidation,
      fullValidation,
      updatedQuantities
    };
  };

  // Enhanced save option quantities with confirmation for significant changes - FE-007
  const handleSaveOptionQuantities = async () => {
    if (!selectedOptionGroupId) {
      setError('No option group selected');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Calculate current total for validation
    const currentTotal = Object.values(optionQuantities).reduce((sum, qty) => sum + qty, 0);
    
    // Comprehensive pre-save validation
    const validation = validateOptionQuantities(optionQuantities, hasOptionTracking ? currentTotal : stockQuantity);
    
    if (!validation.isValid) {
      setError(`Cannot save: ${validation.summary.criticalErrors.length} critical error(s) found. Please fix all errors before saving.`);
      setTimeout(() => setError(null), 5000);
      return;
    }

    // Check if there are actually changes to save
    const hasOptionChanges = hasUnsavedOptionChanges();
    
    if (!hasOptionChanges) {
      setSuccess('No changes to save');
      setTimeout(() => setSuccess(null), 2000);
      return;
    }

    const changedOptionIds = getChangedOptionIds();

    // Check for significant changes that need confirmation
    const significantChanges = changedOptionIds.filter(optionId => {
      const originalQuantity = originalOptionQuantities[optionId] || 0;
      const newQuantity = optionQuantities[optionId];
      const changeAmount = Math.abs(newQuantity - originalQuantity);
      return changeAmount > 5 || (originalQuantity > 0 && (changeAmount / originalQuantity) > 0.3);
    });

    let adjustmentReason = '';
    
    // For significant changes, ask for a reason
    if (significantChanges.length > 0 && validation.hasWarnings) {
      const totalChange = Math.abs(currentTotal - stockQuantity);
      const changeType = currentTotal > stockQuantity ? 'increase' : 'decrease';
      
      const userInput = prompt(
        `You're making a significant inventory ${changeType} of ${totalChange} units.\n\n` +
        `This will be recorded in the audit logs. Please provide a reason for this adjustment:\n\n` +
        `Examples: "Received new shipment", "Found damaged items", "Inventory recount", "Manager adjustment"`
      );
      
      // If user cancels, don't proceed
      if (userInput === null) {
        return;
      }
      
      // If no reason provided, use a default
      if (userInput.trim() === '') {
        adjustmentReason = `Manual inventory adjustment (${changeType} of ${totalChange} units)`;
      } else {
        adjustmentReason = userInput.trim();
      }
    }

    try {
      // Set loading state for changed options
      changedOptionIds.forEach(optionId => {
        updateOptionLoadingState(optionId, true);
        updateOptionErrorState(optionId, null);
      });

      let result;

      // Use single option update if only one option changed
      if (changedOptionIds.length === 1) {
        const changedOptionId = changedOptionIds[0];
        const newQuantity = optionQuantities[changedOptionId];
        const originalQuantity = originalOptionQuantities[changedOptionId] || 0;
        
        console.log('Using single option update for option:', changedOptionId, 'with quantity:', newQuantity);
        
        result = await optionGroupsApi.updateSingleOptionQuantity(
          parseInt(selectedOptionGroupId),
          {
            option_id: parseInt(changedOptionId),
            quantity: newQuantity,
            reason: adjustmentReason || `Option quantity adjusted from ${originalQuantity} to ${newQuantity}`
          }
        );
      } else {
        // Use bulk update if multiple options changed
        console.log('Using bulk option update for options:', changedOptionIds);
        
        // Only send quantities for changed options
        const changedQuantities = Object.fromEntries(
          changedOptionIds.map(optionId => [optionId, optionQuantities[optionId]])
        );
        
        result = await optionGroupsApi.updateOptionQuantities(
          parseInt(selectedOptionGroupId),
          { 
            quantities: changedQuantities,
            reason: adjustmentReason || 'Bulk inventory adjustment'
          }
        );
      }

      // Check for success
      if (result.option_group && result.message) {
        const successMessage = adjustmentReason 
          ? 'Inventory adjustment completed and logged successfully'
          : 'Option quantities updated successfully';
        setSuccess(successMessage);
        
        // Update original quantities to reflect saved state
        setOriginalOptionQuantities({ ...optionQuantities });
        
        // Reset change tracking
        resetOptionChanges();
        
        // Update availability for all options
        Object.entries(optionQuantities).forEach(([optionId, quantity]) => {
          updateOptionAvailability(optionId, quantity);
        });
        
        // Refresh inventory data to get updated information
        // Skip conflict resolution to prevent unwanted redistribution after targeted updates
        await refreshInventoryData({
          refreshAuditHistory: false, // Don't refresh immediately - we'll do it with a delay
          notifyParent: true,
          skipConflictResolution: true // NEW: Prevent auto-redistribution after targeted option updates
        });
        
        // TIMING FIX: Delay audit history refresh to ensure database commits are complete
        setTimeout(async () => {
          await loadOptionAuditHistory(); // Reload option audit history after delay
        }, 1000); // 1000ms delay to ensure backend transactions are committed
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        // Set error for each changed option
        changedOptionIds.forEach(optionId => {
          updateOptionErrorState(optionId, 'Failed to update');
        });
        setError(result.message || 'Failed to update option quantities');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save option quantities:', err);
      
      // Set error for each changed option
      changedOptionIds.forEach(optionId => {
        updateOptionErrorState(optionId, 'Update failed');
      });
      
      const errorMessage = (err as any).response?.data?.message || 'Failed to update option quantities';
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      // Clear loading state for all changed options
      changedOptionIds.forEach(optionId => {
        updateOptionLoadingState(optionId, false);
      });
    }
  };

  // Enhanced comprehensive option quantity validation - FE-007
  const validateOptionQuantities = (quantities: Record<string, number>, totalStock: number) => {
    const globalErrors: string[] = [];
    const optionErrors: Record<string, string[]> = {};
    const criticalErrors: string[] = [];
    const warningErrors: string[] = [];
    
    // Global validation: Total sum check (enhanced messaging for option-level tracking)
    const total = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    if (hasOptionTracking) {
      // For option-level tracking, provide clearer messaging about inventory adjustments
      if (total !== stockQuantity) {
        const difference = total - stockQuantity;
        const isIncrease = difference > 0;
        const changeType = isIncrease ? 'increase' : 'decrease';
        const changeAmount = Math.abs(difference);
        
        // Determine if this is a significant change (more than 20% or more than 10 units)
        const isSignificantChange = changeAmount > 10 || (stockQuantity > 0 && (changeAmount / stockQuantity) > 0.2);
        
        let message;
        if (isIncrease) {
          message = `Inventory adjustment: Adding ${changeAmount} units (${total - stockQuantity} net increase). This will be recorded in audit logs.`;
        } else {
          message = `Inventory adjustment: Removing ${changeAmount} units (${stockQuantity - total} net decrease). This will be recorded in audit logs.`;
        }
        
        // For option-level tracking, this is informational/warning only, not a critical error
        globalErrors.push(message);
        warningErrors.push(message); // Add to warnings so it doesn't block saving
        
        // Mark significant changes as requiring special attention
        if (isSignificantChange) {
          warningErrors.push(`Significant inventory ${changeType} detected (${changeAmount} units). Consider providing a reason for this adjustment.`);
        }
      }
    } else if (!hasOptionTracking && total !== totalStock) {
      // For menu-level tracking, keep strict validation
      const error = `Option quantities (${total}) must equal menu item stock (${totalStock})`;
      globalErrors.push(error);
      criticalErrors.push(error);
    }
    
    // Individual option validation with change detection
    Object.entries(quantities).forEach(([optionId, quantity]) => {
      const errors: string[] = [];
      const originalQuantity = originalOptionQuantities[optionId] || 0;
      const changeAmount = Math.abs(quantity - originalQuantity);
      
      // Non-negative validation
      if (quantity < 0) {
        errors.push('Quantity cannot be negative');
        criticalErrors.push(`Option ${optionId}: Quantity cannot be negative`);
      }
      
      // Reasonable maximum validation (prevent extremely large numbers)
      if (quantity > 999999) {
        errors.push('Quantity too large (max: 999,999)');
        criticalErrors.push(`Option ${optionId}: Quantity too large`);
      }
      
      // Integer validation
      if (!Number.isInteger(quantity)) {
        errors.push('Quantity must be a whole number');
        criticalErrors.push(`Option ${optionId}: Must be whole number`);
      }
      
      // Zero quantity warning (not an error, but worth noting)
      if (quantity === 0 && originalQuantity > 0) {
        errors.push('Setting to zero - option will become unavailable');
        warningErrors.push(`Option ${optionId}: Will become unavailable (removing ${originalQuantity} units)`);
      }
      
      // Significant individual option change detection
      if (changeAmount > 0) {
        const isSignificantOptionChange = changeAmount > 5 || (originalQuantity > 0 && (changeAmount / originalQuantity) > 0.3);
        if (isSignificantOptionChange) {
          const changeType = quantity > originalQuantity ? 'increase' : 'decrease';
          warningErrors.push(`Option ${optionId}: Significant ${changeType} of ${changeAmount} units detected`);
        }
      }
      
      // Store per-option errors
      if (errors.length > 0) {
        optionErrors[optionId] = errors;
      }
    });
    
    // Business rule validation: At least one option should have stock
    const hasAnyStock = Object.values(quantities).some(qty => qty > 0);
    if (!hasAnyStock && Object.keys(quantities).length > 0) {
      const error = 'At least one option should have stock available';
      globalErrors.push(error);
      warningErrors.push(error);
    }
    
    // Update validation state
    setValidationErrors(globalErrors);
    setOptionValidationErrors(optionErrors);
    setValidationSummary({
      hasErrors: criticalErrors.length > 0,
      totalErrors: criticalErrors.length + warningErrors.length,
      criticalErrors,
      warningErrors
    });
    
    return {
      isValid: criticalErrors.length === 0,
      hasWarnings: warningErrors.length > 0,
      globalErrors,
      optionErrors,
      summary: {
        hasErrors: criticalErrors.length > 0,
        totalErrors: criticalErrors.length + warningErrors.length,
        criticalErrors,
        warningErrors
      }
    };
  };

  // Individual option validation helper - FE-007
  const validateSingleOption = (optionId: string, quantity: number, optionName?: string) => {
    const errors: string[] = [];
    
    if (quantity < 0) {
      errors.push('Cannot be negative');
    }
    
    if (quantity > 999999) {
      errors.push('Too large (max: 999,999)');
    }
    
    if (!Number.isInteger(quantity)) {
      errors.push('Must be whole number');
    }
    
    // Update individual option error state
    setOptionValidationErrors(prev => ({
      ...prev,
      [optionId]: errors.length > 0 ? errors : []
    }));
    
    return {
      isValid: errors.length === 0,
      errors,
      optionId,
      optionName
    };
  };

  // Enhanced handle option stock updates - FE-006
  const handleOptionStockUpdate = async (
    optionId: string, 
    operation: 'add' | 'remove', 
    amount: number, 
    reasonType: string, 
    reasonDetails: string
  ) => {
    if (!menuItem || !selectedOptionGroupId) {
      setError('No option group selected for stock update');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      // Set loading state for this specific option
      updateOptionLoadingState(optionId, true);
      updateOptionErrorState(optionId, null);
      setLoading(true);
      
      // Call the individual option stock update API
      const result = await optionGroupsApi.updateOptionStock(
        parseInt(optionId),
        { 
          operation,
          quantity: amount,
          reason: reasonType,
          details: reasonDetails
        }
      );

      // Check for success by presence of data and valid message
      if (result.data && result.message) {
        // Update the local state with the new quantity
        const newQuantity = result.data.new_quantity || 0;
        
        // Optimistic update for better UX
        setOptionQuantities(prev => ({
          ...prev,
          [optionId]: newQuantity
        }));
        
        // Update availability for this option
        updateOptionAvailability(optionId, newQuantity);
        
        // Update the original quantities to reflect the new baseline
        setOriginalOptionQuantities(prev => ({
          ...prev,
          [optionId]: newQuantity
        }));
        
        // Mark this option as unchanged since it's now saved
        markOptionAsChanged(optionId, false);

        // Refresh the entire inventory data to sync everything (without immediate audit history)
        await refreshInventoryData({
          refreshAuditHistory: false, // Don't refresh immediately - we'll do it with a delay
          notifyParent: true
        });
        
        // TIMING FIX: Delay audit history refresh to ensure database commits are complete
        setTimeout(async () => {
          await loadOptionAuditHistory(); // Reload option audit history after delay
        }, 1000); // 1000ms delay to ensure backend transactions are committed
        
        setSuccess(`Successfully ${operation === 'add' ? 'added' : 'removed'} ${amount} items`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        updateOptionErrorState(optionId, 'Update failed');
        throw new Error('Failed to update option stock');
      }
    } catch (err) {
      console.error('Failed to update option stock:', err);
      updateOptionErrorState(optionId, (err as any).message || 'Update failed');
      setError((err as any).message || 'Failed to update option stock');
      setTimeout(() => setError(null), 3000);
    } finally {
      updateOptionLoadingState(optionId, false);
      setLoading(false);
    }
  };

  // Initialize modal when opened or when menuItem changes
  useEffect(() => {
    if (open && menuItem) {
      console.log('[INVENTORY MODAL] Modal opened or menuItem changed, refreshing data...');
      console.log('[INVENTORY MODAL] MenuItems option groups:', menuItem.option_groups?.map((g: any) => ({ id: g.id, name: g.name, tracking: g.enable_inventory_tracking })));
      // Call refreshInventoryData directly to avoid dependency loop
      (async () => {
        const {
          refreshAuditHistory = true,
          notifyParent = false,
          checkSynchronization = true,
          skipParentNotification = false
        } = { refreshAuditHistory: true, notifyParent: false };
        
        if (!menuItem?.id) return;
        
        try {
          // Fetch the latest menu item data
          const updatedItem = await menuItemsApi.getById(menuItem.id);
          
          // Update local state with the latest values
          setEnableTracking(updatedItem.enable_stock_tracking || false);
          setStockQuantity(updatedItem.stock_quantity || 0);
          setDamagedQuantity(updatedItem.damaged_quantity || 0);
          setLowStockThreshold(updatedItem.low_stock_threshold || 10);
          setStockAdjustmentAmount(0);
          
          // Update option state if menu item has changed
          if (updatedItem.option_groups) {
            initializeOptionState(updatedItem);
          }
          
          // Only refresh audit history if specifically requested
          if (refreshAuditHistory) {
            const isEnablingTracking = updatedItem.enable_stock_tracking && !menuItem.enable_stock_tracking;
            
            if (isEnablingTracking) {
              setTimeout(() => {
                loadAuditHistory(true);
                if (hasOptionTracking && selectedOptionGroupId) {
                  // TIMING FIX: Additional delay for option audit history when first enabling tracking
                  setTimeout(() => {
                    loadOptionAuditHistory();
                  }, 800);
                }
              }, 300);
            } else {
              loadAuditHistory();
              if (hasOptionTracking && selectedOptionGroupId) {
                // TIMING FIX: Small delay for option audit history even in normal loading
                setTimeout(() => {
                  loadOptionAuditHistory();
                }, 500);
              }
            }
          }
          
                     // Only notify parent if specifically requested and not explicitly skipped
           if (notifyParent && !skipParentNotification && onSave) {
             onSave();
           }
        } catch (err) {
          console.error('Failed to refresh inventory data:', err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menuItem?.id, menuItem?.enable_stock_tracking, menuItem?.stock_quantity]);

  // Debug radio button state changes
  useEffect(() => {
    console.log('[RADIO BUTTONS DEBUG] State changed - hasOptionTracking:', hasOptionTracking, 'selectedOptionGroupId:', selectedOptionGroupId);
    console.log('[RADIO BUTTONS DEBUG] Menu item option groups:', menuItem?.option_groups?.map((g: any) => ({ id: g.id, name: g.name, tracking: g.enable_inventory_tracking })));
  }, [hasOptionTracking, selectedOptionGroupId, menuItem?.option_groups]);

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
                    
                    // Immediately notify the parent component about the change
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
                        
                        // Update local state to reflect the changes immediately
                        if (!newValue) {
                          // When disabling tracking, reset all inventory values
                          setStockQuantity(0);
                          setDamagedQuantity(0);
                          setLowStockThreshold(10);
                          
                          // Reset option tracking state as well
                          setHasOptionTracking(false);
                          setSelectedOptionGroupId('');
                          setOptionQuantities({});
                          setOptionDamagedQuantities({});
                          setValidationErrors([]);
                          setOptionValidationErrors({});
                          setValidationSummary({ hasErrors: false, totalErrors: 0, criticalErrors: [], warningErrors: [] });
                        }
                        
                        // Refresh inventory data with minimal UI disruption
                        // Skip audit history during toggle - it will be loaded when component re-renders
                        await refreshInventoryData({
                          refreshAuditHistory: false, // Changed: Don't load audit history during toggle to prevent race condition
                          notifyParent: false, // Skip parent notification to prevent race condition
                          skipParentNotification: true // Explicitly skip since parent already notified via onEnableTrackingChange
                        });
                        
                        setTimeout(() => setSuccess(null), 3000);
                      } catch (err) {
                        console.error('Failed to update inventory tracking:', err);
                        setError('Failed to update inventory tracking');
                        setTimeout(() => setSuccess(null), 0); // Clear success message
                        setTimeout(() => setError(null), 3000);
                        
                        // Revert the UI if the API call fails
                        setEnableTracking(!newValue);
                        if (onEnableTrackingChange) {
                          onEnableTrackingChange(!newValue);
                        }
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
          
          {enableTracking && (
            <>
              {/* Inventory Tracking Mode Selection - Always show when tracking is enabled */}
              <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h4 className="font-medium text-blue-900 mb-3">📋 Choose Inventory Tracking Method</h4>
                <p className="text-sm text-blue-700 mb-4">
                  {menuItem.option_groups && menuItem.option_groups.length > 0 
                    ? "This item has option groups. Choose how you want to track inventory:"
                    : "Choose how you want to track inventory for this item:"
                  }
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    !hasOptionTracking 
                      ? 'border-blue-500 bg-blue-100' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}>
                    <input
                      type="radio"
                      name="tracking-mode"
                      checked={!hasOptionTracking}
                      onChange={() => {
                        console.log('[RADIO BUTTON] Menu Item Level clicked, hasOptionTracking:', hasOptionTracking);
                        if (hasOptionTracking) {
                          console.log('[RADIO BUTTON] Switching to Menu Item Level - calling handleOptionGroupSelect with empty string');
                          handleOptionGroupSelect('');
                        }
                      }}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Menu Item Level</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Track inventory for the entire menu item. Simpler management.
                      </div>
                    </div>
                  </label>
                  
                  <label className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    hasOptionTracking 
                      ? 'border-blue-500 bg-blue-100' 
                      : menuItem.option_groups && menuItem.option_groups.length > 0
                        ? 'border-gray-300 bg-white hover:border-gray-400'
                        : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                  }`}>
                    <input
                      type="radio"
                      name="tracking-mode"
                      checked={hasOptionTracking}
                      disabled={!menuItem.option_groups || menuItem.option_groups.length === 0}
                      onChange={() => {
                        console.log('[RADIO BUTTON] Option Level clicked, hasOptionTracking:', hasOptionTracking);
                        console.log('[RADIO BUTTON] Option groups available:', menuItem.option_groups?.length);
                        if (!hasOptionTracking && menuItem.option_groups && menuItem.option_groups.length > 0) {
                          const firstGroupId = menuItem.option_groups[0].id.toString();
                          console.log('[RADIO BUTTON] Switching to Option Level - calling handleOptionGroupSelect with:', firstGroupId);
                          handleOptionGroupSelect(firstGroupId);
                        }
                      }}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Option Level</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {menuItem.option_groups && menuItem.option_groups.length > 0
                          ? "Track inventory separately for each option. More detailed control."
                          : "Not available - this item has no option groups defined."
                        }
                      </div>
                    </div>
                  </label>
                </div>
                
                {!menuItem.option_groups || menuItem.option_groups.length === 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-700">
                      💡 <strong>Tip:</strong> To enable option-level tracking, first add option groups to this menu item (e.g., sizes, colors, flavors).
                    </p>
                  </div>
                )}
              </div>
              
              {/* Option Group Selection - Only show if option level is selected */}
              {hasOptionTracking && menuItem.option_groups && menuItem.option_groups.length > 0 && (
                <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <h4 className="font-medium text-gray-800 mb-3">Option-Level Inventory Tracking</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Track Inventory by Option Group (Optional)
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                        value={selectedOptionGroupId}
                        onChange={(e) => handleOptionGroupSelect(e.target.value)}
                      >
                        <option value="">Use menu item level tracking</option>
                        {menuItem.option_groups.map((group) => (
                          <option key={group.id} value={group.id.toString()}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Select an option group to track inventory at the individual option level (e.g., shirt sizes, drink flavors)
                      </p>
                    </div>
                    
                    {hasOptionTracking && (
                      <div>
                        <p className="text-sm text-green-700 font-medium">
                          ✓ Option-level tracking enabled
                        </p>
                        <p className="text-xs text-gray-500">
                          Individual option quantities will override menu item inventory
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Menu Item Level Settings */}
              {!hasOptionTracking && (
                <>
                  <h3 className="font-semibold text-lg mb-4">Menu Item Inventory Settings</h3>
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
                </>
              )}
              
              {/* Option Level Settings */}
              {hasOptionTracking && selectedOptionGroupId && (
                <>
                  <h3 className="font-semibold text-lg mb-4">Option Level Inventory Management</h3>
                  
                  <OptionInventoryGrid 
                    optionGroup={menuItem.option_groups?.find(g => g.id.toString() === selectedOptionGroupId)}
                    totalStock={stockQuantity}
                    optionQuantities={optionQuantities}
                    onQuantityChange={handleOptionQuantityChange}
                    onSave={handleSaveOptionQuantities}
                    validationErrors={validationErrors}
                    lowStockThreshold={optionLowStockThreshold}
                    onLowStockThresholdChange={setOptionLowStockThreshold}
                  />
                  
                  <OptionStockUpdateForm
                    optionGroup={menuItem.option_groups?.find(g => g.id.toString() === selectedOptionGroupId)}
                    optionQuantities={optionQuantities}
                    onOptionStockUpdate={handleOptionStockUpdate}
                  />
                </>
              )}
              
              <hr className="my-6" />
              
              <h3 className="font-semibold text-lg mb-4">Mark Items as Damaged</h3>
              
              {/* FE-009: Damage Target Selection - Only show for menu-item-level tracking */}
              {!hasOptionTracking && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">Damage Target</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <label className="flex items-center p-3 rounded-md bg-blue-100 border-2 border-blue-300 text-blue-800">
                      <div className="flex-1">
                        <div className="font-medium">Menu Item Level</div>
                        <div className="text-sm opacity-75">Mark damage for the entire menu item</div>
                        <div className="text-xs mt-1">
                          {formatStockDisplay(stockQuantity, damagedQuantity)}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              {/* For option-level tracking, automatically use option-specific damage */}
              {hasOptionTracking && selectedOptionGroupId && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <h4 className="font-medium text-purple-800 mb-2">Option-Level Damage</h4>
                  <p className="text-sm text-purple-700">
                    This item uses option-level tracking. Damage will be recorded for the specific option you select.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                {/* FE-009: Option Selection (for option-level tracking items) */}
                {hasOptionTracking && selectedOptionGroupId && (
                <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Option to Damage
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                      value={selectedDamageOptionId}
                      onChange={(e) => setSelectedDamageOptionId(e.target.value)}
                    >
                      <option value="">Select an option...</option>
                      {menuItem?.option_groups
                        ?.find(g => g.id.toString() === selectedOptionGroupId)
                        ?.options?.map((option) => {
                          const stockQty = optionQuantities[option.id.toString()] || 0;
                          const damagedQty = option.damaged_quantity || 0;
                          const availableStock = Math.max(0, stockQty - damagedQty);
                          
                          let displayText = `${option.name} (${stockQty} total`;
                          if (damagedQty > 0) {
                            displayText += `, ${damagedQty} damaged, ${availableStock} available)`;
                          } else {
                            displayText += `, ${availableStock} available)`;
                          }
                          
                          return (
                            <option 
                              key={option.id} 
                              value={option.id.toString()}
                              disabled={availableStock <= 0}
                            >
                              {displayText}
                            </option>
                          );
                        })}
                    </select>
                    {selectedDamageOptionId && (
                      <p className="mt-1 text-xs text-gray-500">
                        Available: {optionQuantities[selectedDamageOptionId] || 0} items
                      </p>
                    )}
                  </div>
                )}
                
                <div className={hasOptionTracking && selectedOptionGroupId ? "md:col-span-4" : "md:col-span-6"}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity to Mark as Damaged
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                    value={damageQuantity}
                    min={1}
                    max={getAvailableStockForDamage()}
                    onChange={(e) =>
                      setDamageQuantity(parseInt(e.target.value) || 0)
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum: {getAvailableStockForDamage()} items
                    {hasOptionTracking && selectedDamageOptionId && ` (${getSelectedOptionName()})`}
                    {!hasOptionTracking && damagedQuantity > 0 && ` (${damagedQuantity} already damaged)`}
                  </p>
                                  </div>
                
                <div className={hasOptionTracking && selectedOptionGroupId ? "md:col-span-4" : "md:col-span-6"}>
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
                    disabled={
                      damageQuantity <= 0 || 
                      !damageReason.trim() ||
                      damageQuantity > getAvailableStockForDamage() ||
                      (hasOptionTracking && !selectedDamageOptionId)
                    }
                  >
                    Mark as Damaged
                    {hasOptionTracking && selectedDamageOptionId && ` (${getSelectedOptionName()})`}
                  </button>
                </div>
              </div>
              
              <hr className="my-6" />
              
              <hr className="my-6" />
              
              {/* FE-011: Unified Audit History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Inventory Audit History</h3>
                  <button
                    onClick={() => {
                      loadAuditHistory(true); // Force refresh
                      if (hasOptionTracking && selectedOptionGroupId) {
                        loadOptionAuditHistory();
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
                    disabled={loadingAudits || loadingOptionAudits}
                  >
                    {(loadingAudits || loadingOptionAudits) ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>



                {/* Unified Audit Table */}
                {(loadingAudits || loadingOptionAudits) ? (
                <p className="text-gray-500">Loading audit history...</p>
                ) : (() => {
                  const filteredAudits = getFilteredAuditHistory();
                  const sortedAudits = filteredAudits.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  );
                  
                  return sortedAudits.length > 0 ? (
                    <div className="max-h-[400px] overflow-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Source
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Previous Qty
                        </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          New Qty
                        </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Change
                        </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                          {sortedAudits.map((audit, index) => (
                            <tr key={`${audit.source}-${audit.id}-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(audit.created_at), 'MMMM do, yyyy h:mm a')}
                          </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {audit.source === 'menu_item' ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Menu Item
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Option
                                  </span>
                                )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {audit.previous_quantity ?? 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {audit.new_quantity ?? 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {(() => {
                              const prev = audit.previous_quantity ?? 0;
                              const current = audit.new_quantity ?? 0;
                              const change = current - prev;
                              
                              if (change > 0) {
                                return (
                                  <span className="text-green-600">
                                    +{change}
                                  </span>
                                );
                              } else if (change < 0) {
                                return (
                                  <span className="text-red-600">
                                    {change}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-gray-500">
                                    0
                                  </span>
                                );
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {audit.reason || (audit.source === 'option' ? (audit as any).action : '') || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No audit history available</p>
                   );
                 })()}
              </div>
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
