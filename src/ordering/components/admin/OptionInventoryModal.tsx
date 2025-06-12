import React, { useState, useEffect } from 'react';
import { MenuItem, OptionGroup, MenuOption } from '../../types/menu';
import { optionGroupsApi, OptionGroupInventoryStatus, OptionGroupInventoryConfig } from '../../../shared/api/endpoints/optionGroups';
import { optionsApi, OptionStockUpdate, MarkOptionAsDamaged, OptionStockAudit } from '../../../shared/api/endpoints/options';
import { Package, AlertCircle, Plus, Minus, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface OptionInventoryModalProps {
  open: boolean;
  onClose: () => void;
  menuItem: MenuItem;
  onSave: () => void;
}

const OptionInventoryModal: React.FC<OptionInventoryModalProps> = ({
  open,
  onClose,
  menuItem,
  onSave
}) => {
  const [optionGroups, setOptionGroups] = useState<OptionGroupInventoryStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  
  // Track local changes to option stock
  const [optionStockChanges, setOptionStockChanges] = useState<Record<number, number>>({});
  
  // Track which option's quick actions are open
  const [activeOptionId, setActiveOptionId] = useState<number | null>(null);
  const [damageQuantity, setDamageQuantity] = useState<number>(1);
  const [damageReason, setDamageReason] = useState<string>('damaged');

  const loadOptionGroups = async () => {
    try {
      setLoading(true);
      const groups = await optionGroupsApi.getForMenuItem(Number(menuItem.id));
      setOptionGroups(groups);
      
      // Auto-expand groups that have tracking enabled
      const expandedIds = new Set<number>();
      groups.forEach(group => {
        if (group.enable_option_inventory) {
          expandedIds.add(group.id);
        }
      });
      setExpandedGroups(expandedIds);
    } catch (err) {
      console.error('Failed to load option groups:', err);
      setError('Failed to load option groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && menuItem) {
      loadOptionGroups();
    }
  }, [open, menuItem]);

  const toggleGroupExpanded = (groupId: number) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
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

  const handleSaveStock = async (option: any) => {
    const newStock = optionStockChanges[option.id];
    if (newStock === undefined) return;

    try {
      await optionsApi.updateStock(option.id, {
        stock_quantity: newStock,
        reason_type: 'adjustment',
        reason_details: 'Initial stock setup'
      });
      
      // Clear the change and reload
      setOptionStockChanges(prev => {
        const next = { ...prev };
        delete next[option.id];
        return next;
      });
      
      await loadOptionGroups();
      
      setSuccess(`Updated stock for ${option.name}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update stock:', err);
      setError('Failed to update stock');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMarkDamaged = async (option: any) => {
    try {
      await optionsApi.markAsDamaged(option.id, {
        quantity: damageQuantity,
        reason: damageReason
      });
      
      // Reset form and reload
      setDamageQuantity(1);
      setDamageReason('damaged');
      setActiveOptionId(null);
      
      await loadOptionGroups();
      
      setSuccess(`Marked ${damageQuantity} ${option.name} as damaged`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to mark as damaged:', err);
      setError('Failed to mark as damaged');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const hasAnyTracking = optionGroups.some(g => g.enable_option_inventory);
  const hasPendingChanges = Object.keys(optionStockChanges).length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-center items-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-auto max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Option-Level Inventory
              </h2>
              <p className="text-sm text-gray-600 mt-1">{menuItem.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              How Option-Level Inventory Works
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enable tracking for option groups that should control inventory (e.g., sizes)</li>
              <li>• Set stock quantities for each option within tracked groups</li>
              <li>• The menu item becomes unavailable when all tracked options are out of stock</li>
              <li>• Only required option groups (where customers must choose) can be tracked</li>
            </ul>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c1902f]"></div>
              <p className="text-gray-600 mt-2">Loading option groups...</p>
            </div>
          ) : optionGroups.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No option groups found for this menu item.</p>
              <p className="text-sm text-gray-500 mt-1">
                Add option groups using the "Manage Options" button on the menu item.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {optionGroups.map(group => {
                const isExpanded = expandedGroups.has(group.id);
                const canTrack = group.min_select > 0;
                const isTracked = group.enable_option_inventory;
                const hasOptions = group.options && group.options.length > 0;

                return (
                  <div 
                    key={group.id} 
                    className={`border rounded-lg ${isTracked ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                  >
                    {/* Group Header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleGroupExpanded(group.id)}
                          className="flex items-center flex-1 text-left"
                        >
                          <div className="mr-3">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                          <div>
                            <h3 className="font-medium text-lg">{group.name}</h3>
                            <p className="text-sm text-gray-600">
                              {group.min_select > 0 ? `Required (${group.min_select}-${group.max_select})` : 'Optional'}
                              {hasOptions && ` • ${group.options.length} options`}
                            </p>
                          </div>
                        </button>
                        
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
                              className="mr-2 h-5 w-5 text-[#c1902f] rounded focus:ring-[#c1902f]"
                            />
                            <span className="text-sm font-medium">
                              {isTracked ? 'Tracking Enabled' : 'Enable Tracking'}
                            </span>
                          </label>
                        </div>
                      </div>

                      {!canTrack && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm text-yellow-800">
                            <AlertTriangle className="inline h-4 w-4 mr-1" />
                            This group cannot track inventory because it's optional. Only required groups can control stock.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Options List - Only show if expanded and tracking is enabled */}
                    {isExpanded && isTracked && hasOptions && (
                      <div className="border-t border-gray-200 bg-white">
                        <div className="p-4">
                          <h4 className="font-medium text-sm text-gray-700 mb-3">Stock Quantities</h4>
                          <div className="space-y-3">
                            {group.options.map(option => {
                              const hasChange = optionStockChanges[option.id] !== undefined;
                              const currentStock = hasChange ? optionStockChanges[option.id] : (option.stock_quantity || 0);
                              const isLowStock = currentStock > 0 && currentStock <= group.low_stock_threshold;
                              const isOutOfStock = currentStock === 0;

                              return (
                                <div key={option.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">{option.name}</span>
                                    </div>
                                    {option.damaged_quantity > 0 && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {option.damaged_quantity} damaged
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    {/* Stock Status Indicator */}
                                    <div className="text-sm">
                                      {isOutOfStock ? (
                                        <span className="text-red-600 font-medium">Out of Stock</span>
                                      ) : isLowStock ? (
                                        <span className="text-yellow-600 font-medium">Low Stock</span>
                                      ) : (
                                        <span className="text-green-600 font-medium">In Stock</span>
                                      )}
                                    </div>

                                    {/* Stock Input */}
                                    <div className="flex items-center space-x-2">
                                      <label className="text-sm text-gray-600">Stock:</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={currentStock}
                                        onChange={(e) => handleStockChange(option.id, e.target.value)}
                                        className={`w-20 px-2 py-1 border rounded ${
                                          hasChange ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                        }`}
                                      />
                                    </div>

                                    {/* Save Button for Individual Option */}
                                    {hasChange && (
                                      <button
                                        onClick={() => handleSaveStock(option)}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                      >
                                        Save
                                      </button>
                                    )}

                                    {/* Quick Actions */}
                                    <div className="relative">
                                      <button
                                        onClick={() => setActiveOptionId(activeOptionId === option.id ? null : option.id)}
                                        className="p-1 text-gray-500 hover:text-gray-700"
                                        title="More actions"
                                      >
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                        </svg>
                                      </button>

                                      {/* Quick Actions Dropdown */}
                                      {activeOptionId === option.id && (
                                        <div className="absolute right-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-10">
                                          <div className="p-4">
                                            <h5 className="font-medium mb-3">Mark as Damaged</h5>
                                            <div className="space-y-2">
                                              <input
                                                type="number"
                                                min="1"
                                                max={option.stock_quantity}
                                                value={damageQuantity}
                                                onChange={(e) => setDamageQuantity(parseInt(e.target.value) || 1)}
                                                className="w-full px-2 py-1 border rounded"
                                                placeholder="Quantity"
                                              />
                                              <input
                                                type="text"
                                                value={damageReason}
                                                onChange={(e) => setDamageReason(e.target.value)}
                                                className="w-full px-2 py-1 border rounded"
                                                placeholder="Reason"
                                              />
                                              <div className="flex space-x-2">
                                                <button
                                                  onClick={() => handleMarkDamaged(option)}
                                                  className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                                >
                                                  Mark Damaged
                                                </button>
                                                <button
                                                  onClick={() => setActiveOptionId(null)}
                                                  className="flex-1 px-3 py-1 border text-sm rounded hover:bg-gray-50"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Low Stock Threshold Setting */}
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700">
                                Low Stock Alert Threshold
                              </label>
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
                                  className="w-20 px-2 py-1 border border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-600">items</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show message if no options */}
                    {isExpanded && isTracked && !hasOptions && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm text-gray-600 text-center">
                          No options found. Add options using "Manage Options" to set stock quantities.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {hasAnyTracking && (
                <p className="text-sm text-gray-600">
                  Option-level tracking is active. Menu item tracking is disabled.
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              {hasPendingChanges && (
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#a97c28] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : `Save All Changes (${Object.keys(optionStockChanges).length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionInventoryModal; 