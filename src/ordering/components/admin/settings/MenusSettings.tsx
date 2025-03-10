// src/ordering/components/admin/settings/MenusSettings.tsx

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, Copy, X, Save, ExternalLink, Book } from 'lucide-react';
import { useMenuStore } from '../../../store/menuStore';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { Menu } from '../../../../shared/api/endpoints/menus';
import { Tooltip, SettingsHeader } from '../../../../shared/components/ui';
import { Link } from 'react-router-dom';

interface MenusSettingsProps {
  restaurantId?: string;
}

export function MenusSettings({ restaurantId }: MenusSettingsProps) {
  const {
    menus,
    menuItems,
    currentMenuId,
    loading,
    error,
    fetchMenus,
    fetchAllMenuItemsForAdmin,
    createMenu,
    updateMenu,
    deleteMenu,
    setActiveMenu,
    cloneMenu
  } = useMenuStore();

  const { restaurant } = useRestaurantStore();

  // Local state for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingMenu, setEditingMenu] = useState<Partial<Menu>>({ name: '' });
  
  // Fetch menus and menu items on component mount
  useEffect(() => {
    const initializeData = async () => {
      // First fetch the menus
      await fetchMenus();
      // Then fetch all menu items to ensure we have items for all menus, not just the active one
      await fetchAllMenuItemsForAdmin();
    };
    
    initializeData();
  }, [fetchMenus, fetchAllMenuItemsForAdmin]);

  // Handle opening the create menu modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingMenu({ name: '' });
    setIsModalOpen(true);
  };

  // Handle opening the edit menu modal
  const handleOpenEditModal = (menu: Menu) => {
    setModalMode('edit');
    setEditingMenu({ ...menu });
    setIsModalOpen(true);
  };

  // Handle saving a menu (create or update)
  const handleSaveMenu = async () => {
    if (!editingMenu.name?.trim()) {
      alert('Menu name is required');
      return;
    }

    if (modalMode === 'create' && restaurant?.id) {
      await createMenu(editingMenu.name, restaurant.id);
    } else if (modalMode === 'edit' && editingMenu.id) {
      await updateMenu(editingMenu.id, { name: editingMenu.name });
    }

    setIsModalOpen(false);
  };

  // Handle deleting a menu
  const handleDeleteMenu = async (id: number) => {
    if (id === currentMenuId) {
      alert('Cannot delete the active menu. Please set another menu as active first.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this menu? This will also delete all menu items associated with it.')) {
      await deleteMenu(id);
    }
  };

  // Local state for optimistic UI updates
  const [optimisticActiveMenuId, setOptimisticActiveMenuId] = useState<number | null>(null);
  
  // Use optimistic ID if available, otherwise use the one from the store
  const effectiveCurrentMenuId = optimisticActiveMenuId !== null ? optimisticActiveMenuId : currentMenuId;
  
  // Update optimistic state when store changes
  useEffect(() => {
    setOptimisticActiveMenuId(currentMenuId);
  }, [currentMenuId]);

  // Handle setting a menu as active with optimistic UI update
  const handleSetActiveMenu = async (id: number) => {
    // Immediately update local state for optimistic UI
    setOptimisticActiveMenuId(id);
    
    try {
      // Update the store in the background
      await setActiveMenu(id);
    } catch (error) {
      console.error("Failed to set active menu:", error);
      // Revert to previous state if there's an error
      setOptimisticActiveMenuId(currentMenuId);
    }
  };

  // Local state for clone operation
  const [cloningMenuId, setCloningMenuId] = useState<number | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Force refresh of menu counts after data changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      // Fetch data again after a slight delay to ensure backend has processed everything
      const refreshTimeout = setTimeout(() => {
        fetchMenus();
        fetchAllMenuItemsForAdmin();
      }, 1000);
      
      return () => clearTimeout(refreshTimeout);
    }
  }, [refreshTrigger, fetchMenus, fetchAllMenuItemsForAdmin]);

  // Handle cloning a menu with better error handling
  const handleCloneMenu = async (id: number) => {
    if (!window.confirm('Are you sure you want to clone this menu? This will create a copy of the menu and all its items.')) {
      return;
    }
    
    // Set the menu as currently being cloned - for UI feedback
    setCloningMenuId(id);
    setCloneError(null);
    
    try {
      const clonedMenu = await cloneMenu(id);
      
      if (clonedMenu) {
        // Trigger an immediate refresh of menus
        await fetchMenus();
        
        // Force a refresh of menu items to ensure we get the cloned items
        await fetchAllMenuItemsForAdmin();
        
        // Set a trigger to check again after a slight delay
        // This helps in case the backend takes a moment to process all the associations
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error cloning menu:", error);
      
      // Only show error message for errors other than 422
      // Since 422 errors might actually succeed on refresh
      if (error && typeof error === 'object' && 'status' in error && error.status !== 422) {
        setCloneError("Failed to clone menu. Please try again.");
      } else {
        // For 422 errors, which might actually succeed on refresh, silently refresh the data
        await fetchMenus();
        await fetchAllMenuItemsForAdmin();
        setRefreshTrigger(prev => prev + 1);
      }
    } finally {
      setCloningMenuId(null);
    }
  };

  // Count menu items for each menu
  const getMenuItemCount = (menuId: number) => {
    return menuItems.filter(item => Number(item.menu_id) === menuId).length;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <SettingsHeader 
          title="Menu Management"
          description="Create and manage menus for your restaurant."
          icon={<Book className="h-6 w-6" />}
        />
        
        <button 
          onClick={handleOpenCreateModal}
          className="inline-flex items-center px-3 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f] w-auto"
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-1" />
          Create New Menu
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && <p>Loading menus...</p>}

      {!loading && menus.length === 0 && (
        <div className="bg-gray-50 p-6 text-center rounded-lg">
          <p className="text-gray-500">No menus found. Create your first menu to get started.</p>
        </div>
      )}

      {menus.length > 0 && (
        <>
          {/* Desktop view - Table */}
          <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Menu Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {menus.map(menu => (
                  <tr 
                    key={menu.id} 
                    className="h-16 transition-colors duration-300 ease-in-out"
                    style={{ 
                      backgroundColor: menu.id === effectiveCurrentMenuId ? 'rgba(254, 240, 138, 0.5)' : 'white'
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {menu.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 flex items-center">
                        {menu.id === effectiveCurrentMenuId ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {getMenuItemCount(menu.id)} items
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <div className="w-5 h-5 flex items-center justify-center">
                          {menu.id !== effectiveCurrentMenuId ? (
                            <Tooltip content="Set as Active Menu">
                              <button 
                                onClick={() => handleSetActiveMenu(menu.id)}
                                className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                                disabled={loading}
                              >
                                <Check className="h-5 w-5" />
                              </button>
                            </Tooltip>
                          ) : null}
                        </div>
                        
                        <Tooltip content="Edit Menu">
                          <button 
                            onClick={() => handleOpenEditModal(menu)}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200"
                            disabled={loading}
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                        </Tooltip>
                        
                        <Tooltip content="Clone Menu">
                          <button 
                            onClick={() => handleCloneMenu(menu.id)}
                            className="text-orange-600 hover:text-orange-900 transition-colors duration-200"
                            disabled={loading}
                          >
                            <Copy className="h-5 w-5" />
                          </button>
                        </Tooltip>
                        
                        <Tooltip content={menu.id === currentMenuId ? "Cannot delete active menu" : "Delete Menu"}>
                          <button 
                            onClick={() => handleDeleteMenu(menu.id)}
                            className={`transition-colors duration-200 ${menu.id === currentMenuId ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                            disabled={loading || menu.id === currentMenuId}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view - Cards */}
          <div className="sm:hidden space-y-4">
            {menus.map(menu => (
              <div 
                key={menu.id} 
                className="bg-white rounded-lg shadow p-4 transition-all duration-300 ease-in-out"
                style={{
                  borderLeft: menu.id === effectiveCurrentMenuId ? '4px solid #10b981' : '4px solid transparent'
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">{menu.name}</h4>
                  <div className="h-6 flex items-center">
                    {menu.id === effectiveCurrentMenuId ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                    {getMenuItemCount(menu.id)} items
                  </span>
                </div>
                
                <div className="flex justify-between border-t pt-3">
                  <div className="w-20 h-8 flex items-center">
                    {menu.id !== effectiveCurrentMenuId ? (
                      <button 
                        onClick={() => handleSetActiveMenu(menu.id)}
                        className="flex items-center text-blue-600 text-sm transition-colors duration-200"
                        disabled={loading}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Set Active
                      </button>
                    ) : null}
                  </div>
                  
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => handleOpenEditModal(menu)}
                      className="text-indigo-600 transition-colors duration-200"
                      disabled={loading}
                      aria-label="Edit Menu"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    
                    <button 
                      onClick={() => handleCloneMenu(menu.id)}
                      className="text-orange-600 transition-colors duration-200"
                      disabled={loading}
                      aria-label="Clone Menu"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteMenu(menu.id)}
                      className={`transition-colors duration-200 ${menu.id === currentMenuId ? 'text-gray-400 cursor-not-allowed' : 'text-red-600'}`}
                      disabled={loading || menu.id === currentMenuId}
                      aria-label={menu.id === currentMenuId ? "Cannot delete active menu" : "Delete Menu"}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Menu Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {modalMode === 'create' ? 'Create New Menu' : 'Edit Menu'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Menu Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingMenu.name || ''}
                onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-md"
                placeholder="e.g., Regular Menu, Holiday Special, etc."
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMenu}
                className="inline-flex items-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f] transition-colors duration-200"
                disabled={loading}
              >
                <Save className="h-5 w-5 mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information about menu management */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">About Menu Management</h4>
        <p className="text-sm text-blue-700">
          Create multiple menus for different occasions or events. Set one menu as active to display to customers.
          You can clone an existing menu to create a new one with all the same items, then modify it as needed.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          Use the Menu Manager to add, edit, or remove items from your menus.
        </p>
      </div>
    </div>
  );
}
