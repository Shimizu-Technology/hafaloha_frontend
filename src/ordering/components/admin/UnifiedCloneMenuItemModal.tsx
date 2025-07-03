import { useState, useEffect } from 'react';
import { X, Save, Layers, Copy, ArrowRight } from 'lucide-react';
import toastUtils from '../../../shared/utils/toastUtils';
import { useCategoryStore } from '../../store/categoryStore';
import { MenuItem } from '../../types/menu';
import { Menu } from '../../../shared/api/endpoints/menus';
import { Category } from '../../../shared/api/endpoints/categories';
import { useMenuStore } from '../../store/menuStore';

interface UnifiedCloneMenuItemModalProps {
  item: MenuItem;
  menus: Menu[];
  isOpen: boolean;
  onClose: () => void;
}

type OperationType = 'clone_same_menu' | 'copy_different_menu' | 'move_different_menu';

export function UnifiedCloneMenuItemModal({ 
  item, 
  menus, 
  isOpen, 
  onClose 
}: UnifiedCloneMenuItemModalProps) {
  // Operation type selection - default to cloning in same menu
  const [operationType, setOperationType] = useState<OperationType>('clone_same_menu');
  
  // Shared state
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Same menu specific state
  const [newName, setNewName] = useState<string>(`${item.name} (Copy)`);
  const [menuCategories, setMenuCategories] = useState<Category[]>([]);
  
  // Different menu specific state
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [targetMenuCategories, setTargetMenuCategories] = useState<Category[]>([]);
  
  const { copyMenuItem, cloneMenuItemInSameMenu, moveMenuItem } = useMenuStore();
  const { categories, fetchCategoriesForMenu } = useCategoryStore();
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOperationType('clone_same_menu');
      setNewName(`${item.name} (Copy)`);
      setSelectedMenuId(null);
      setSelectedCategories(item.category_ids || []);
      
      // Fetch categories for the current menu
      if (item.menu_id) {
        fetchCategoriesForMenu(Number(item.menu_id));
      }
    }
  }, [isOpen, item, fetchCategoriesForMenu]);
  
  // Update menu categories when categories change
  useEffect(() => {
    if (item.menu_id) {
      const filteredCategories = categories.filter(cat => cat.menu_id === Number(item.menu_id));
      setMenuCategories(filteredCategories);
    }
  }, [categories, item.menu_id]);
  
  // Fetch categories when a target menu is selected
  useEffect(() => {
    if (selectedMenuId) {
      fetchCategoriesForMenu(selectedMenuId);
    }
  }, [selectedMenuId, fetchCategoriesForMenu]);
  
  // Update target menu categories when categories change
  useEffect(() => {
    if (selectedMenuId) {
      const filteredCategories = categories.filter(cat => cat.menu_id === selectedMenuId);
      setTargetMenuCategories(filteredCategories);
    }
  }, [categories, selectedMenuId]);
  
  const handleOperation = async () => {
    if (operationType === 'clone_same_menu') {
      // Validate same menu cloning
      if (!newName.trim()) {
        toastUtils.error('Please enter a name for the cloned item');
        return;
      }
      
      if (selectedCategories.length === 0) {
        toastUtils.error('Please select at least one category');
        return;
      }
      
      setLoading(true);
      try {
        await cloneMenuItemInSameMenu(item.id, newName.trim(), selectedCategories);
        toastUtils.success('Item cloned successfully!');
        onClose();
      } catch (error) {
        toastUtils.error('Failed to clone item');
      } finally {
        setLoading(false);
      }
    } else if (operationType === 'copy_different_menu') {
      // Validate copying to different menu
      if (!selectedMenuId) {
        toastUtils.error('Please select a destination menu');
        return;
      }
      
      if (selectedCategories.length === 0) {
        toastUtils.error('Please select at least one category');
        return;
      }
      
      setLoading(true);
      try {
        await copyMenuItem(item.id, selectedMenuId, selectedCategories);
        toastUtils.success('Item copied successfully!');
        onClose();
      } catch (error) {
        toastUtils.error('Failed to copy item');
      } finally {
        setLoading(false);
      }
    } else if (operationType === 'move_different_menu') {
      // Validate moving to different menu
      if (!selectedMenuId) {
        toastUtils.error('Please select a destination menu');
        return;
      }
      
      if (selectedCategories.length === 0) {
        toastUtils.error('Please select at least one category');
        return;
      }
      
      setLoading(true);
      try {
        await moveMenuItem(item.id, selectedMenuId, selectedCategories);
        toastUtils.success('Item moved successfully!');
        onClose();
      } catch (error) {
        toastUtils.error('Failed to move item');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const getOperationDescription = () => {
    switch (operationType) {
      case 'clone_same_menu':
        return `Create a fresh copy of "${item.name}" in the same menu. The copy will have no inventory tracking, no stock quantities, and no audit history - it's a completely fresh start.`;
      case 'copy_different_menu':
        return `Create a fresh copy of "${item.name}" in another menu. The copy will have no inventory tracking, no stock quantities, and no audit history - it's a completely fresh start.`;
      case 'move_different_menu':
        return `Move "${item.name}" to another menu, preserving ALL data including inventory levels, damaged quantities, audit history, and any option-level inventory tracking. The item will no longer exist in the current menu.`;
      default:
        return '';
    }
  };
  
  const getActionButtonText = () => {
    switch (operationType) {
      case 'clone_same_menu':
        return loading ? 'Cloning...' : 'Clone Item';
      case 'copy_different_menu':
        return loading ? 'Copying...' : 'Copy Item';
      case 'move_different_menu':
        return loading ? 'Moving...' : 'Move Item';
      default:
        return 'Process';
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 animate-slideUp">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Menu Item Operations</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="mb-6">
          {/* Operation Type Selection Tabs */}
          <div className="flex border-b mb-4 text-sm">
            <button
              className={`flex items-center px-3 py-2 ${operationType === 'clone_same_menu' 
                ? 'border-b-2 border-[#c1902f] text-[#c1902f] font-medium' 
                : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setOperationType('clone_same_menu')}
            >
              <Layers className="h-4 w-4 mr-2" />
              Clone Here
            </button>
            <button
              className={`flex items-center px-3 py-2 ${operationType === 'copy_different_menu' 
                ? 'border-b-2 border-[#c1902f] text-[#c1902f] font-medium' 
                : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setOperationType('copy_different_menu')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Fresh
            </button>
            <button
              className={`flex items-center px-3 py-2 ${operationType === 'move_different_menu' 
                ? 'border-b-2 border-[#c1902f] text-[#c1902f] font-medium' 
                : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setOperationType('move_different_menu')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Move Complete
            </button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <p className="text-sm text-blue-800">
              {getOperationDescription()}
            </p>
          </div>
          
          {/* Same Menu Form */}
          {operationType === 'clone_same_menu' && (
            <>
              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="Enter name for the cloned item"
                  required
                />
              </div>
              
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select which categories this item should appear in
                </p>
                
                {menuCategories.length === 0 ? (
                  <p className="text-sm text-orange-600">
                    This menu has no categories. Please create categories first.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                    {menuCategories.map(category => (
                      <label key={category.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, category.id]);
                            } else {
                              setSelectedCategories(
                                selectedCategories.filter(id => id !== category.id)
                              );
                            }
                          }}
                        />
                        <span>{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Different Menu Form */}
          {(operationType === 'copy_different_menu' || operationType === 'move_different_menu') && (
            <>
              {/* Destination Menu Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Menu <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMenuId || ''}
                  onChange={(e) => {
                    setSelectedMenuId(Number(e.target.value));
                    setSelectedCategories([]); // Reset categories when menu changes
                  }}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                >
                  <option value="">Select a menu</option>
                  {menus
                    .filter(menu => menu.id !== Number(item.menu_id)) // Filter out current menu
                    .map(menu => (
                      <option key={menu.id} value={menu.id}>
                        {menu.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              {/* Category Selection */}
              {selectedMenuId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categories <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select which categories this item should appear in
                  </p>
                  
                  {targetMenuCategories.length === 0 ? (
                    <p className="text-sm text-orange-600">
                      This menu has no categories. Please create categories first.
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                      {targetMenuCategories.map(category => (
                        <label key={category.id} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, category.id]);
                              } else {
                                setSelectedCategories(
                                  selectedCategories.filter(id => id !== category.id)
                                );
                              }
                            }}
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOperation}
            className="inline-flex items-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f] transition-colors duration-200"
            disabled={loading || 
              (operationType === 'clone_same_menu' && (!newName.trim() || selectedCategories.length === 0)) ||
              (operationType === 'copy_different_menu' && (!selectedMenuId || selectedCategories.length === 0)) ||
              (operationType === 'move_different_menu' && (!selectedMenuId || selectedCategories.length === 0))
            }
          >
            <Save className="h-5 w-5 mr-2" />
            {getActionButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
}
