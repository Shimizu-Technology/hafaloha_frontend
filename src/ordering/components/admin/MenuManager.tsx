// src/ordering/components/admin/MenuManager.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, BookOpen, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMenuStore } from '../../store/menuStore';
import type { MenuItem } from '../../types/menu';
import { useCategoryStore } from '../../store/categoryStore'; // to fetch real categories
import { api, uploadMenuItemImage } from '../../lib/api';
import { useLoadingOverlay } from '../../../shared/components/ui/LoadingOverlay';
import { Tooltip } from '../../../shared/components/ui';

// NEW: import your ItemInventoryModal
import ItemInventoryModal from './ItemInventoryModal';

/**
 * Local form data for creating/updating a menu item.
 * We use numeric category_ids to keep it simple.
 */
interface MenuItemFormData {
  id?: number;
  name: string;
  description: string;
  price: number;
  cost_to_make: number;
  category_ids: number[]; // numeric category IDs

  menu_id?: number;
  image: string;
  imageFile?: File | null;  // handle new image uploads
  advance_notice_hours: number;
  seasonal: boolean;
  available_from?: string | null;
  available_until?: string | null;
  promo_label?: string | null;
  featured: boolean;
  stock_status: 'in_stock' | 'out_of_stock' | 'low_stock';
  status_note?: string | null;
  
  // Inventory tracking fields
  enable_stock_tracking?: boolean;
  stock_quantity?: number;
  damaged_quantity?: number;
  low_stock_threshold?: number;
  available_quantity?: number; // Computed: stock_quantity - damaged_quantity
}

/** Option groups (unchanged). */
interface OptionGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  position: number;
  options: OptionRow[];
}
interface OptionRow {
  id: number;
  name: string;
  additional_price: number;
  position: number;
}

/** Helper to format a date for display. */
function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return dateStr; // fallback if invalid
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface MenuManagerProps {
  restaurantId?: string;
}

export function MenuManager({ restaurantId }: MenuManagerProps) {
  const {
    menus,
    menuItems,
    currentMenuId,
    loading,
    fetchMenus,
    fetchAllMenuItemsForAdmin,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    setActiveMenu
  } = useMenuStore();

  const { categories, fetchCategories } = useCategoryStore();

  // The currently selected menu ID for filtering
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  
  // The currently selected category ID for filtering
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Menu selector toggle state - closed by default
  const [menuSelectorOpen, setMenuSelectorOpen] = useState(false);

  // Additional filter checkboxes
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showSeasonalOnly, setShowSeasonalOnly] = useState(false);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemFormData | null>(null);

  // For managing option groups and inventory
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [optionsModalItem, setOptionsModalItem] = useState<MenuItem | null>(null);

  // NEW: inventory modal state
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryModalItem, setInventoryModalItem] = useState<MenuItem | null>(null);

  // On mount => fetch all items (admin) + categories + menus
  useEffect(() => {
    fetchAllMenuItemsForAdmin();
    fetchCategories();
    fetchMenus();
  }, [fetchAllMenuItemsForAdmin, fetchCategories, fetchMenus]);

  // Set the current menu as the default selected menu
  useEffect(() => {
    if (currentMenuId && !selectedMenuId) {
      setSelectedMenuId(currentMenuId);
      // Close the menu selector once we have a selected menu
      setMenuSelectorOpen(false);
    }
  }, [currentMenuId, selectedMenuId]);

  // Refresh menu items when selected menu changes
  useEffect(() => {
    if (selectedMenuId) {
      fetchAllMenuItemsForAdmin();
    }
  }, [selectedMenuId, fetchAllMenuItemsForAdmin]);

  // Filter the items in memory
  const filteredItems = useMemo(() => {
    let list = menuItems;

    // Filter by menu if selected
    if (selectedMenuId) {
      list = list.filter(item => Number(item.menu_id) === selectedMenuId);
    }

    // If a category is selected, only show items that have that category_id
    if (selectedCategory) {
      list = list.filter((item) =>
        item.category_ids?.includes(selectedCategory)
      );
    }
    if (showFeaturedOnly) {
      list = list.filter((item) => item.featured);
    }
    if (showSeasonalOnly) {
      list = list.filter((item) => item.seasonal);
    }
    return list;
  }, [menuItems, selectedMenuId, selectedCategory, showFeaturedOnly, showSeasonalOnly]);

  // Default form data for a new item
  const initialFormData: MenuItemFormData = {
    name: '',
    description: '',
    price: 0,
    cost_to_make: 0,
    category_ids: [],
    image: '',
    imageFile: null,
    menu_id: selectedMenuId || 1,
    advance_notice_hours: 0,
    seasonal: false,
    available_from: null,
    available_until: null,
    promo_label: 'Limited Time',
    featured: false,
    stock_status: 'in_stock',
    status_note: '',
    enable_stock_tracking: false,
    stock_quantity: 0,
    damaged_quantity: 0,
    low_stock_threshold: 10,
    available_quantity: 0,
  };

  /**
   * Function to refresh data after inventory changes
   */
  const refreshAfterInventoryChanges = () => {
    fetchAllMenuItemsForAdmin();
  };

  /**
   * Utility: enforce max 4 featured items
   */
  function canFeatureThisItem(formData: MenuItemFormData): boolean {
    if (!formData.featured) return true;
    const isCurrentlyFeatured = menuItems.find(
      (m) => Number(m.id) === formData.id
    )?.featured;
    // If it was already featured, that's allowed
    if (isCurrentlyFeatured) return true;

    const currentlyFeaturedCount = menuItems.filter((m) => m.featured).length;
    if (currentlyFeaturedCount >= 4) {
      toast.error('You can only have 4 featured items at a time.');
      return false;
    }
    return true;
  }

  /**
   * Handle editing an existing item => fill form data
   */
  const handleEdit = (item: MenuItem) => {
    // Calculate available quantity
    const stockQty = item.stock_quantity || 0;
    const damagedQty = item.damaged_quantity || 0;
    const availableQty = Math.max(0, stockQty - damagedQty);
    
    setEditingItem({
      id: Number(item.id),
      name: item.name,
      description: item.description,
      price: item.price,
      cost_to_make: item.cost_to_make ?? 0,
      category_ids: item.category_ids || [],
      image: item.image || '',
      imageFile: null,
      menu_id: (item as any).menu_id || selectedMenuId || 1,
      advance_notice_hours: item.advance_notice_hours ?? 0,
      seasonal: !!item.seasonal,
      available_from: item.available_from || null,
      available_until: item.available_until || null,
      promo_label: item.promo_label?.trim() || 'Limited Time',
      featured: !!item.featured,
      stock_status:
        item.stock_status === 'limited'
          ? 'low_stock'
          : (item.stock_status as 'in_stock' | 'out_of_stock' | 'low_stock'),
      status_note: item.status_note || '',
      enable_stock_tracking: !!item.enable_stock_tracking,
      stock_quantity: stockQty,
      damaged_quantity: damagedQty,
      low_stock_threshold: item.low_stock_threshold || 10,
      available_quantity: availableQty,
    });
    setIsEditing(true);
  };

  /**
   * Handle adding a new item => blank form
   */
  const handleAdd = () => {
    setEditingItem({
      ...initialFormData,
      menu_id: selectedMenuId || 1
    });
    setIsEditing(true);
  };

  /**
   * Delete item
   */
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteMenuItem(id);
    }
  };

  /**
   * Manage option groups => show the modal
   */
  const handleManageOptions = (item: MenuItem) => {
    setOptionsModalItem(item);
    setOptionsModalOpen(true);
  };
  const handleCloseOptionsModal = () => {
    setOptionsModalOpen(false);
    setOptionsModalItem(null);
  };

  /**
   * Manage inventory => show the modal
   * NEW
   */
  const handleManageInventory = (item: MenuItem) => {
    setInventoryModalItem(item);
    setInventoryModalOpen(true);
  };
  
  const handleCloseInventoryModal = () => {
    setInventoryModalOpen(false);
    const itemBeforeClosing = inventoryModalItem;
    setInventoryModalItem(null);
    
    // Force a full refresh of menu items to get updated inventory and tracking status
    fetchAllMenuItemsForAdmin().then(() => {
      // If we're currently editing an item, update its data to reflect inventory changes
      if (editingItem && editingItem.id && itemBeforeClosing && Number(itemBeforeClosing.id) === editingItem.id) {
        const updatedItem = menuItems.find(item => Number(item.id) === editingItem.id);
        if (updatedItem) {
          const stockQty = updatedItem.stock_quantity || 0;
          const damagedQty = updatedItem.damaged_quantity || 0;
          const availableQty = Math.max(0, stockQty - damagedQty);
          
          setEditingItem({
            ...editingItem,
            enable_stock_tracking: !!updatedItem.enable_stock_tracking,
            stock_quantity: stockQty,
            damaged_quantity: damagedQty,
            low_stock_threshold: updatedItem.low_stock_threshold || 10,
            available_quantity: availableQty,
            // Set stock_status based on the server's response
            stock_status: updatedItem.stock_status as 'in_stock' | 'out_of_stock' | 'low_stock'
          });
        }
      }
    });
  };

  // Use our loading overlay hook
  const { withLoading, LoadingOverlayComponent } = useLoadingOverlay();

  /**
   * Toggles for featured + seasonal filters
   */
  function handleToggleFeatured(checked: boolean) {
    if (checked) setShowSeasonalOnly(false);
    setShowFeaturedOnly(checked);
  }
  function handleToggleSeasonal(checked: boolean) {
    if (checked) setShowFeaturedOnly(false);
    setShowSeasonalOnly(checked);
  }

  // Handle setting a menu as active
  const handleSetActiveMenu = async (id: number) => {
    await setActiveMenu(id);
    // Refresh menu items after setting a menu as active
    await fetchAllMenuItemsForAdmin();
  };

  /**
   * Submit the form => create or update item in the store
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    // Enforce up to 4 featured
    if (!canFeatureThisItem(editingItem)) return;
    
    // Validate that at least one category is selected
    if (editingItem.category_ids.length === 0) {
      toast.error('Please select at least one category for this menu item.');
      return;
    }

    // If seasonal but no label => default "Limited Time"
    let finalLabel = editingItem.promo_label?.trim() || '';
    if (editingItem.seasonal && !finalLabel) {
      finalLabel = 'Limited Time';
    }
    
    // Determine stock status from inventory levels if tracking is enabled
    let derivedStockStatus = editingItem.stock_status;
    if (editingItem.enable_stock_tracking) {
      const stockQty = editingItem.stock_quantity || 0;
      const damagedQty = editingItem.damaged_quantity || 0;
      const availableQty = Math.max(0, stockQty - damagedQty);
      const threshold = editingItem.low_stock_threshold || 10;
      
      if (availableQty <= 0) {
        derivedStockStatus = 'out_of_stock';
      } else if (availableQty <= threshold) {
        derivedStockStatus = 'low_stock';
      } else {
        derivedStockStatus = 'in_stock';
      }
      
      // Also update the available_quantity in the editingItem
      editingItem.available_quantity = availableQty;
    }

    try {
      await withLoading(async () => {
        // First handle the basic item data
        let updatedItem: any;
        
        if (editingItem.id) {
          // Updating existing item
          const { id, imageFile, ...rest } = editingItem;
          if (id) {
            const payload = { 
              ...rest, 
              promo_label: finalLabel,
              stock_status: derivedStockStatus
            };
            updatedItem = await updateMenuItem(String(id), payload);
            
            // If there's a new image file, upload it separately using the dedicated endpoint
            if (imageFile instanceof File) {
              console.log("Uploading image file for menu item:", id);
              await uploadMenuItemImage(String(id), imageFile);
              
              // Fetch the latest data to include the new image URL
              updatedItem = await api.get(`/menu_items/${id}`);
            }
            
            // Update the editing item with the latest data
            if (updatedItem) {
              setEditingItem({
                id: Number(updatedItem.id),
                name: updatedItem.name,
                description: updatedItem.description,
                price: updatedItem.price,
                cost_to_make: updatedItem.cost_to_make ?? 0,
                category_ids: updatedItem.category_ids || [],
                image: updatedItem.image_url || updatedItem.image || '',
                imageFile: null,
                menu_id: (updatedItem as any).menu_id || selectedMenuId || 1,
                advance_notice_hours: updatedItem.advance_notice_hours ?? 0,
                seasonal: !!updatedItem.seasonal,
                available_from: updatedItem.available_from || null,
                available_until: updatedItem.available_until || null,
                promo_label: updatedItem.promo_label?.trim() || 'Limited Time',
                featured: !!updatedItem.featured,
                stock_status: updatedItem.stock_status === 'limited'
                  ? 'low_stock'
                  : (updatedItem.stock_status as 'in_stock' | 'out_of_stock' | 'low_stock'),
                status_note: updatedItem.status_note || '',
              });
            }
          }
        } else {
          // Creating new
          const { imageFile, id, ...rest } = editingItem;
          const payload = { 
            ...rest, 
            promo_label: finalLabel,
            stock_status: derivedStockStatus
          };
          updatedItem = await addMenuItem(payload);
          
          // If there's a new image file and we have the new item ID, upload the image
          if (updatedItem && updatedItem.id && imageFile instanceof File) {
            console.log("Uploading image file for new menu item:", updatedItem.id);
            await uploadMenuItemImage(updatedItem.id, imageFile);
            
            // Fetch the latest data to include the new image URL
            updatedItem = await api.get(`/menu_items/${updatedItem.id}`);
          }
          
          // Close the form after adding a new item so the user can see it in the list
          setIsEditing(false);
          setEditingItem(null);
        }
      });
      
      // For updates, do NOT close automatically – user can keep editing if desired
      // setIsEditing(false);
      // setEditingItem(null);
    } catch (err) {
      console.error('Failed to save menu item:', err);
    } finally {
      // Always refresh the menu items list after any changes
      fetchAllMenuItemsForAdmin();
    }
  };

  /**
   * Helper badge component for small labels.
   */
  function Badge({
    children,
    bgColor = 'bg-gray-500',
    textColor = 'text-white',
  }: {
    children: React.ReactNode;
    bgColor?: string;
    textColor?: string;
  }) {
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold mr-1 mt-1 ${bgColor} ${textColor}`}
      >
        {children}
      </span>
    );
  }

  return (
    <div className="p-4">
      {/* Loading overlay will be shown when isLoading is true */}
      {LoadingOverlayComponent}
      {/* Header section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <p className="text-gray-600 text-sm">Manage menu items, categories, and options</p>
      </div>

      {/* Menu Selection and Add Item - Responsive Layout */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          {/* Menu Selection - Compact Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center mb-4 sm:mb-0">
            <div className="relative inline-block w-full sm:w-64 z-10">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Current Menu</h3>
              
              <button 
                onClick={() => setMenuSelectorOpen(!menuSelectorOpen)}
                className="w-full flex items-center justify-between bg-white text-gray-800 hover:bg-gray-50 
                          px-3 py-2 rounded-md border border-gray-200 shadow-sm transition-all duration-150
                          focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:ring-opacity-50"
                aria-expanded={menuSelectorOpen}
                aria-controls="menu-selector-dropdown"
              >
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-[#c1902f]" />
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {selectedMenuId 
                      ? menus.find(m => m.id === selectedMenuId)?.name || 'Select Menu'
                      : 'Select Menu'}
                  </span>
                  {selectedMenuId && selectedMenuId === currentMenuId && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </div>
                <svg 
                  className={`h-4 w-4 text-gray-500 transition-transform duration-200 ease-in-out ${menuSelectorOpen ? 'transform rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown with animation */}
              <div 
                id="menu-selector-dropdown"
                className={`absolute w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden transition-all duration-200 ease-in-out
                           ${menuSelectorOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                style={{ transformOrigin: 'top' }}
              >
                <div className="py-1 max-h-60 overflow-y-auto">
                  {menus.map(menu => (
                    <button
                      key={menu.id}
                      onClick={async () => {
                        setSelectedMenuId(menu.id);
                        setMenuSelectorOpen(false);
                        // Explicitly fetch menu items when menu changes
                        await fetchAllMenuItemsForAdmin();
                      }}
                      className={`
                        w-full text-left px-3 py-2 text-sm flex items-center justify-between
                        transition-colors duration-150
                        ${selectedMenuId === menu.id 
                          ? 'bg-[#c1902f] bg-opacity-10 text-[#c1902f]' 
                          : 'text-gray-700 hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex items-center">
                        <BookOpen className={`h-4 w-4 mr-2 flex-shrink-0 ${selectedMenuId === menu.id ? 'text-[#c1902f]' : 'text-gray-400'}`} />
                        <span className="truncate">{menu.name}</span>
                      </div>
                      {menu.id === currentMenuId && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800 flex-shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Set active menu button - shown next to dropdown on desktop, below on mobile */}
            {selectedMenuId && selectedMenuId !== currentMenuId && (
              <button
                onClick={() => handleSetActiveMenu(selectedMenuId)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center mt-2 sm:mt-6 sm:ml-4"
              >
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Set as active
              </button>
            )}
          </div>
          
          {/* Add Item Button */}
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
            disabled={!selectedMenuId}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-3">
        <div className="flex flex-nowrap space-x-3 overflow-x-auto py-2">
          {/* "All Categories" */}
          <button
            className={
              !selectedCategory
                ? 'whitespace-nowrap px-4 py-2 rounded-md bg-[#c1902f] text-white'
                : 'whitespace-nowrap px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            onClick={() => setSelectedCategory(null)}
          >
            All Categories
          </button>

          {/* Real categories from the store */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={
                selectedCategory === cat.id
                  ? 'whitespace-nowrap px-4 py-2 rounded-md bg-[#c1902f] text-white'
                  : 'whitespace-nowrap px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Additional Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showFeaturedOnly}
            onChange={(e) => handleToggleFeatured(e.target.checked)}
          />
          <span>Featured Items</span>
        </label>

        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showSeasonalOnly}
            onChange={(e) => handleToggleSeasonal(e.target.checked)}
          />
          <span>Seasonal Items</span>
        </label>
      </div>

      {/* Items Grid or Empty State */}
      {!selectedMenuId ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg shadow-md animate-fadeIn">
          <div className="bg-gray-100 rounded-full p-4 mb-4">
            <BookOpen className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Menu</h3>
          <p className="text-gray-500 max-w-md">
            Please select a menu from the options above to view and manage its items.
          </p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => {
            const fromDate = formatDate(item.available_from);
            const untilDate = formatDate(item.available_until);

            // If seasonal, show a small date info line
            let dateInfo: React.ReactNode = null;
            if (item.seasonal && (fromDate || untilDate)) {
              dateInfo = (
                <p className="text-xs text-gray-600 mt-2">
                  <span className="font-semibold">Starts:</span> {fromDate || '—'}
                  <span className="mx-1 text-gray-400">•</span>
                  <span className="font-semibold">Ends:</span> {untilDate || '—'}
                </p>
              );
            }

            return (
              <div 
                key={item.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col animate-fadeIn"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4 flex flex-col flex-1">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>

                    <div className="mt-2 flex flex-wrap">
                      {/* Stock/featured badges */}
                      {item.stock_status === 'out_of_stock' && (
                        <Badge bgColor="bg-gray-600">Out of Stock</Badge>
                      )}
                      {item.stock_status === 'low_stock' && (
                        <Badge bgColor="bg-orange-500">Low Stock</Badge>
                      )}
                      {(item.advance_notice_hours ?? 0) >= 24 && (
                        <Badge bgColor="bg-red-600">24hr Notice</Badge>
                      )}
                      {item.seasonal && (
                        <Badge bgColor="bg-red-500">
                          {item.promo_label?.trim() || 'Limited Time'}
                        </Badge>
                      )}
                      {item.featured && (
                        <Badge bgColor="bg-yellow-500">Featured</Badge>
                      )}
                      {item.enable_stock_tracking && (
                        <Badge bgColor="bg-blue-500">Inventory Tracked</Badge>
                      )}
                    </div>

                    {/* Optional note */}
                    {item.status_note?.trim() && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {item.status_note}
                      </p>
                    )}

                    {/* Show date range info if seasonal */}
                    {dateInfo}
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base sm:text-lg font-semibold">
                        ${Number(item.price).toFixed(2)}
                      </span>

                      {/* Edit Item */}
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-600 hover:text-[#c1902f]"
                      >
                        <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>

                      {/* NEW: Manage Inventory */}
                      <button
                        onClick={() => handleManageInventory(item)}
                        className="p-2 text-gray-600 hover:text-blue-600"
                        title="Manage Inventory"
                      >
                        <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>

                      {/* Delete Item */}
                      <button
                        onClick={() => {
                          if (typeof item.id === 'string') {
                            const numId = parseInt(item.id, 10);
                            if (!Number.isNaN(numId)) handleDelete(numId);
                          } else {
                            handleDelete(item.id as number);
                          }
                        }}
                        className="p-2 text-gray-600 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-lg shadow-md">
          <div className="bg-gray-100 rounded-full p-4 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
          <p className="text-gray-500 max-w-md">
            {selectedCategory 
              ? "There are no items in this category for the current menu." 
              : "The current menu doesn't have any items yet."}
          </p>
          {(showFeaturedOnly || showSeasonalOnly) && (
            <p className="text-gray-500 mt-2">
              Try removing the filters to see more items.
            </p>
          )}
          <button
            onClick={handleAdd}
            className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Your First Item
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isEditing && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-slideUp">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {editingItem.id ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingItem(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* BASIC INFO */}
              <div>
                <div className="flex items-center mb-2 border-b pb-2">
                  <h4 className="text-md font-semibold">Basic Info</h4>
                  <Tooltip 
                    content="Enter the essential information about this menu item."
                    position="right"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>

                {/* Name & Description */}
                <div className="mb-4">
                  <div className="flex items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Tooltip 
                      content="The name of the dish as it will appear on the menu."
                      position="top"
                      icon
                      iconClassName="ml-1 h-4 w-4"
                    />
                  </div>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="mb-4">
                  <div className="flex items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <Tooltip 
                      content="A brief description of the dish, including key ingredients or preparation methods."
                      position="top"
                      icon
                      iconClassName="ml-1 h-4 w-4"
                    />
                  </div>
                  <textarea
                    value={editingItem.description}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-md"
                    rows={2}
                  />
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Price
                    </label>
                    <Tooltip 
                      content="The base price of the item in dollars. Additional charges may apply for options."
                      position="top"
                      icon
                      iconClassName="ml-1 h-4 w-4"
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>

                {/* Cost to Make */}
                <div className="mb-4">
                  <div className="flex items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Cost to Make
                    </label>
                    <Tooltip 
                      content="The cost to produce this item. Used for profit calculations and reporting."
                      position="top"
                      icon
                      iconClassName="ml-1 h-4 w-4"
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.cost_to_make}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        cost_to_make: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-md"
                  />
                </div>
              </div>

              {/* MULTI-CATEGORY CHECKBOXES */}
              <div>
                <div className="flex items-center mb-2 border-b pb-2">
                  <h4 className="text-md font-semibold">Categories</h4>
                  <Tooltip 
                    content="Assign this item to one or more menu categories. Items can appear in multiple sections of the menu."
                    position="right"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  (Select one or more categories)
                </p>
                <div className="flex flex-wrap gap-3">
                  {categories.map((cat) => {
                    const checked = editingItem.category_ids.includes(cat.id);
                    return (
                      <label key={cat.id} className="inline-flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingItem((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  category_ids: [...prev.category_ids, cat.id],
                                };
                              });
                            } else {
                              setEditingItem((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  category_ids: prev.category_ids.filter((c) => c !== cat.id),
                                };
                              });
                            }
                          }}
                        />
                        <span>{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* AVAILABILITY */}
              <div>
                <div className="flex items-center mb-2 border-b pb-2">
                  <h4 className="text-md font-semibold">Availability</h4>
                  <Tooltip 
                    content="Control when this item is available to customers and whether it requires advance notice."
                    position="right"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>

                {/* 24-hour Notice + Featured toggles */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center">
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingItem.advance_notice_hours >= 24}
                        onChange={(e) => {
                          const newVal = e.target.checked ? 24 : 0;
                          setEditingItem({ ...editingItem, advance_notice_hours: newVal });
                        }}
                      />
                      <span>Requires 24-hour notice?</span>
                    </label>
                    <Tooltip 
                      content="Enable this for items that need to be prepared in advance, like special orders or catering."
                      position="top"
                      icon
                      iconClassName="ml-1 h-4 w-4"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingItem.featured}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, featured: e.target.checked })
                        }
                      />
                      <span>Featured?</span>
                    </label>
                    <Tooltip 
                      content="Featured items appear in the highlighted section of the menu. Limited to 4 items."
                      position="top"
                      icon
                      iconClassName="ml-1 h-4 w-4"
                    />
                  </div>
                </div>

                {/* Seasonal */}
                <div className="mt-4">
                  <div className="flex items-center">
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingItem.seasonal}
                        onChange={(e) => {
                          const turnedOn = e.target.checked;
                          setEditingItem((prev) => {
                            if (!prev) return prev;
                            
                            let newLabel = prev.promo_label;
                            if (turnedOn && (!newLabel || !newLabel.trim())) {
                              newLabel = 'Limited Time';
                            }
                            return {
                              ...prev,
                              seasonal: turnedOn,
                              available_from: turnedOn ? prev.available_from : null,
                              available_until: turnedOn ? prev.available_until : null,
                              promo_label: newLabel,
                            };
                          });
                        }}
                      />
                      <span>Time-based availability? (Seasonal)</span>
                    </label>
                    <Tooltip 
                      content="Use for seasonal items or limited-time promotions that are only available during specific dates."
                      position="top"
                      icon
                      iconClassName="ml-1 h-4 w-4"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    If checked, this item is only available between the specified start & end dates.
                  </p>
                </div>

                {/* Date range if seasonal */}
                {editingItem.seasonal && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available From
                      </label>
                      <input
                        type="date"
                        value={editingItem.available_from ?? ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            available_from: e.target.value || null,
                          })
                        }
                        className="w-full px-4 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Until
                      </label>
                      <input
                        type="date"
                        value={editingItem.available_until ?? ''}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            available_until: e.target.value || null,
                          })
                        }
                        className="w-full px-4 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                )}

                {/* Promo Label */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Label (e.g. "Valentine's Special")
                  </label>
                  <input
                    type="text"
                    value={editingItem.promo_label ?? ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, promo_label: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-md"
                    placeholder={'e.g. "Valentine\'s Special"'}
                  />
                </div>
              </div>

              {/* INVENTORY STATUS */}
              <div>
                <div className="flex items-center mb-2 border-b pb-2">
                  <h4 className="text-md font-semibold">
                    Inventory Status
                  </h4>
                  <Tooltip 
                    content="Manage the current availability of this item based on your inventory."
                    position="right"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  {editingItem.enable_stock_tracking ? (
                    // Inventory tracking is enabled - show automatic status
                    <>
                      {/* Inventory-Controlled Status */}
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Inventory-Controlled Status
                          </label>
                          <Tooltip 
                            content="Status is automatically determined based on available inventory levels."
                            position="top"
                            icon
                            iconClassName="ml-1 h-4 w-4"
                          />
                        </div>
                        
                        {/* Display status based on inventory levels */}
                        <div className="py-2 px-3 border rounded-md bg-gray-50">
                          {(() => {
                            // Calculate available quantity
                            const stockQty = editingItem.stock_quantity || 0;
                            const damagedQty = editingItem.damaged_quantity || 0;
                            const availableQty = Math.max(0, stockQty - damagedQty);
                            const threshold = editingItem.low_stock_threshold || 10;
                            
                            // Determine status and color
                            let statusLabel = "In Stock";
                            let statusColor = "bg-green-500";
                            
                            if (availableQty <= 0) {
                              statusLabel = "Out of Stock";
                              statusColor = "bg-red-500";
                            } else if (availableQty <= threshold) {
                              statusLabel = "Low Stock";
                              statusColor = "bg-yellow-500";
                            }
                            
                            return (
                              <>
                                <div className="flex items-center">
                                  <div className={`h-3 w-3 rounded-full mr-2 ${statusColor}`}></div>
                                  <span className="font-medium">{statusLabel}</span>
                                </div>
                                
                                <div className="text-sm text-gray-600 mt-2">
                                  <div>Available: {availableQty} items</div>
                                  <div>Low Stock Threshold: {threshold} items</div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          Status is automatically determined by inventory levels.
                        </p>
                        
                        <button
                          type="button"
                          onClick={() => {
                            if (editingItem.id) {
                              handleManageInventory({
                                ...editingItem,
                                id: editingItem.id.toString(),
                              } as unknown as MenuItem);
                            }
                          }}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Manage Inventory
                        </button>
                      </div>
                      
                      {/* Status Note */}
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Status Note (Optional)
                          </label>
                          <Tooltip 
                            content="Add a note to explain the current status, such as 'Temporarily using a different sauce' or 'Back in stock next week'."
                            position="top"
                            icon
                            iconClassName="ml-1 h-4 w-4"
                          />
                        </div>
                        <textarea
                          value={editingItem.status_note ?? ''}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, status_note: e.target.value })
                          }
                          className="w-full px-4 py-2 border rounded-md"
                          rows={2}
                          placeholder={'e.g. "Supplier delayed; we\'re using a temporary sauce."'}
                        />
                      </div>
                    </>
                  ) : (
                    // Manual status selection when inventory tracking is disabled
                    <>
                      {/* Stock Status */}
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Inventory Status
                          </label>
                          <Tooltip 
                            content="Set the current availability status. 'Low Stock' shows a warning but still allows ordering. 'Out of Stock' disables ordering."
                            position="top"
                            icon
                            iconClassName="ml-1 h-4 w-4"
                          />
                        </div>
                        <select
                          value={editingItem.stock_status ?? 'in_stock'}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              stock_status: e.target.value as
                                | 'in_stock'
                                | 'out_of_stock'
                                | 'low_stock',
                            })
                          }
                          className="w-full px-4 py-2 border rounded-md"
                        >
                          <option value="in_stock">In Stock</option>
                          <option value="out_of_stock">Out of Stock</option>
                          <option value="low_stock">Low Stock</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          "Low Stock" shows a warning but still allows ordering.
                          "Out of Stock" disables ordering.
                        </p>
                        
                        <button
                          type="button"
                          onClick={() => {
                            if (editingItem.id) {
                              handleManageInventory({
                                ...editingItem,
                                id: editingItem.id.toString(),
                              } as unknown as MenuItem);
                            }
                          }}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Enable Inventory Tracking
                        </button>
                      </div>

                      {/* Status Note */}
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Status Note (Optional)
                          </label>
                          <Tooltip 
                            content="Add a note to explain the current status, such as 'Temporarily using a different sauce' or 'Back in stock next week'."
                            position="top"
                            icon
                            iconClassName="ml-1 h-4 w-4"
                          />
                        </div>
                        <textarea
                          value={editingItem.status_note ?? ''}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, status_note: e.target.value })
                          }
                          className="w-full px-4 py-2 border rounded-md"
                          rows={2}
                          placeholder={'e.g. "Supplier delayed; we\'re using a temporary sauce."'}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* IMAGES */}
              <div>
                <div className="flex items-center mb-2 border-b pb-2">
                  <h4 className="text-md font-semibold">Images</h4>
                  <Tooltip 
                    content="Upload an image of this menu item."
                    position="right"
                    icon
                    iconClassName="ml-1 h-4 w-4"
                  />
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Image Upload
                    </label>
                    <Tooltip 
                      content="Recommended size: 800x600 pixels. JPG or PNG format."
                      position="top"
                      icon
                      iconClassName="ml-1 h-4 w-4"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setEditingItem({ ...editingItem, imageFile: e.target.files[0] });
                      }
                    }}
                    className="w-full px-2 py-2 border rounded-md"
                  />
                  {/* Existing image preview */}
                  {editingItem.image && !editingItem.imageFile && (
                    <div className="mt-2">
                      <img
                        src={editingItem.image}
                        alt="Existing"
                        className="h-10 w-10 object-cover rounded"
                      />
                    </div>
                  )}
                  {/* New file preview */}
                  {editingItem.imageFile && (
                    <div className="mt-2">
                      <img
                        src={URL.createObjectURL(editingItem.imageFile)}
                        alt="Preview"
                        className="h-10 w-10 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* MANAGE OPTIONS (only if editing existing) */}
              {editingItem.id && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingItem.id) {
                        handleManageOptions({
                          ...editingItem,
                          id: editingItem.id.toString(),
                          category_ids: editingItem.category_ids,
                        } as unknown as MenuItem);
                      }
                    }}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Manage Options
                  </button>
                </div>
              )}

              {/* Submit / Cancel */}
              <div className="flex justify-end space-x-2 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Options Modal */}
      {optionsModalOpen && optionsModalItem && (
        <OptionGroupsModal item={optionsModalItem} onClose={handleCloseOptionsModal} />
      )}

      {/* NEW: Inventory Modal */}
      {inventoryModalOpen && inventoryModalItem && (
        <ItemInventoryModal
          open={inventoryModalOpen}
          menuItem={inventoryModalItem}
          onClose={handleCloseInventoryModal}
          onSave={refreshAfterInventoryChanges}
          onEnableTrackingChange={(enabled) => {
            // Immediately update the editing form if we're currently editing this item
            if (editingItem && editingItem.id && inventoryModalItem.id === String(editingItem.id)) {
              // Update the editing item's tracking status and associated fields
              setEditingItem(prev => {
                if (!prev) return prev;
                
                // Set stock status based on whether tracking is enabled and available quantity
                let newStockStatus = prev.stock_status;
                if (enabled) {
                  const stockQty = inventoryModalItem.stock_quantity || 0;
                  const damagedQty = inventoryModalItem.damaged_quantity || 0;
                  const availableQty = Math.max(0, stockQty - damagedQty);
                  const threshold = inventoryModalItem.low_stock_threshold || 10;
                  
                  if (availableQty <= 0) {
                    newStockStatus = 'out_of_stock';
                  } else if (availableQty <= threshold) {
                    newStockStatus = 'low_stock';
                  } else {
                    newStockStatus = 'in_stock';
                  }
                }
                
                return {
                  ...prev,
                  enable_stock_tracking: enabled,
                  stock_status: newStockStatus
                };
              });
            }
          }}
        />
      )}
    </div>
  );
}

/**
 * OptionGroupsModal (unchanged)
 */
function OptionGroupsModal({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const [originalOptionGroups, setOriginalOptionGroups] = useState<OptionGroup[]>([]);
  const [draftOptionGroups, setDraftOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMin, setNewGroupMin] = useState(0);
  const [newGroupMax, setNewGroupMax] = useState(1);
  const [newGroupRequired, setNewGroupRequired] = useState(false);

  const [tempIdCounter, setTempIdCounter] = useState(-1);

  React.useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line
  }, [item.id]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/menu_items/${item.id}/option_groups`);
      const sorted = (data as OptionGroup[]).map((g) => ({
        ...g,
        options: g.options.slice().sort((a, b) => (a.position || 0) - (b.position || 0)),
      }));
      sorted.sort((a, b) => (a.position || 0) - (b.position || 0));

      setOriginalOptionGroups(sorted);
      setDraftOptionGroups(JSON.parse(JSON.stringify(sorted)));
    } catch (err) {
      console.error(err);
      setOriginalOptionGroups([]);
      setDraftOptionGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------
  // Local manipulations (no server calls)
  // -------------------------------------

  // Create local group
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    // Just place the new group at the end by position
    const maxPos = draftOptionGroups.reduce(
      (acc, g) => Math.max(acc, g.position || 0),
      0
    );
    const newGroup: OptionGroup = {
      id: tempIdCounter, // negative => local
      name: newGroupName,
      min_select: newGroupMin,
      max_select: newGroupMax,
      required: newGroupRequired,
      position: maxPos + 1, // appended at the end
      options: [],
    };
    setDraftOptionGroups((prev) => [...prev, newGroup]);

    // Reset
    setNewGroupName('');
    setNewGroupMin(0);
    setNewGroupMax(1);
    setNewGroupRequired(false);
    setTempIdCounter((prevId) => prevId - 1);
  };

  // Update local group
  const handleLocalUpdateGroup = (
    groupId: number,
    changes: Partial<Omit<OptionGroup, 'options'>>
  ) => {
    setDraftOptionGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...changes } : g))
    );
  };

  // Delete local group
  const handleLocalDeleteGroup = (groupId: number) => {
    if (!window.confirm('Delete this option group?')) return;
    setDraftOptionGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Create local option
  const handleLocalCreateOption = (groupId: number) => {
    setDraftOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          const maxOptPos = g.options.reduce(
            (acc, o) => Math.max(acc, o.position || 0),
            0
          );
          const newOpt: OptionRow = {
            id: tempIdCounter,
            name: '',
            additional_price: 0,
            position: maxOptPos + 1, // appended at the end
          };
          return { ...g, options: [...g.options, newOpt] };
        }
        return g;
      })
    );
    setTempIdCounter((prevId) => prevId - 1);
  };

  // Update local option
  const handleLocalUpdateOption = (
    groupId: number,
    optionId: number,
    changes: Partial<OptionRow>
  ) => {
    setDraftOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            options: g.options.map((o) =>
              o.id === optionId ? { ...o, ...changes } : o
            ),
          };
        }
        return g;
      })
    );
  };

  // Delete local option
  const handleLocalDeleteOption = (groupId: number, optId: number) => {
    if (!window.confirm('Delete this option?')) return;
    setDraftOptionGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, options: g.options.filter((o) => o.id !== optId) };
        }
        return g;
      })
    );
  };

  // -------------------------------------
  // Save all changes at once
  // -------------------------------------
  const handleSaveAllChanges = async () => {
    try {
      // Compare draftOptionGroups vs originalOptionGroups
      const draftGroupIds = draftOptionGroups.map((g) => g.id);
      const originalGroupIds = originalOptionGroups.map((g) => g.id);

      // Groups to delete
      const groupsToDelete = originalOptionGroups.filter(
        (og) => !draftGroupIds.includes(og.id)
      );
      // Groups to create
      const groupsToCreate = draftOptionGroups.filter((dg) => dg.id < 0);
      // Groups to update
      const groupsToUpdate = draftOptionGroups.filter(
        (dg) => dg.id > 0 && originalGroupIds.includes(dg.id)
      );

      // Delete removed groups
      for (const gDel of groupsToDelete) {
        await api.delete(`/option_groups/${gDel.id}`);
      }

      // Create new groups
      const newGroupIdMap: Record<number, number> = {};
      for (const gNew of groupsToCreate) {
        const created: any = await api.post(`/menu_items/${item.id}/option_groups`, {
          name: gNew.name,
          min_select: gNew.min_select,
          max_select: gNew.max_select,
          required: gNew.required,
          position: gNew.position,
        });
        newGroupIdMap[gNew.id] = created.id; // negative => real ID
      }

      // Update existing groups
      for (const gUpd of groupsToUpdate) {
        await api.patch(`/option_groups/${gUpd.id}`, {
          name: gUpd.name,
          min_select: gUpd.min_select,
          max_select: gUpd.max_select,
          required: gUpd.required,
          position: gUpd.position,
        });
      }

      // Now handle options
      for (const draftGroup of draftOptionGroups) {
        let realGroupId = draftGroup.id;
        if (realGroupId < 0 && newGroupIdMap[realGroupId]) {
          realGroupId = newGroupIdMap[realGroupId];
        }
        const origGroup = originalOptionGroups.find((og) => og.id === draftGroup.id);
        const origOptions = origGroup?.options || [];

        const draftOptIds = draftGroup.options.map((o) => o.id);
        const origOptIds = origOptions.map((o) => o.id);

        // Options to delete
        const optsToDelete = origOptions.filter((o) => !draftOptIds.includes(o.id));
        // Options to create
        const optsToCreate = draftGroup.options.filter((o) => o.id < 0);
        // Options to update
        const optsToUpdate = draftGroup.options.filter(
          (o) => o.id > 0 && origOptIds.includes(o.id)
        );

        // Delete
        for (const oDel of optsToDelete) {
          await api.delete(`/options/${oDel.id}`);
        }
        // Create
        for (const oNew of optsToCreate) {
          await api.post(`/option_groups/${realGroupId}/options`, {
            name: oNew.name,
            additional_price: oNew.additional_price,
            position: oNew.position,
          });
        }
        // Update
        for (const oUpd of optsToUpdate) {
          await api.patch(`/options/${oUpd.id}`, {
            name: oUpd.name,
            additional_price: oUpd.additional_price,
            position: oUpd.position,
          });
        }
      }

      // Refresh from server
      await fetchGroups();

      // Close
      onClose();
    } catch (err) {
      console.error(err);
      alert('Something went wrong saving changes.');
    }
  };

  // If user closes without saving, we discard local changes
  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn transition-all duration-300">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 animate-slideUp transform-gpu will-change-transform">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Manage Option Groups for: {item.name}
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-6 animate-pulse">
            {/* Skeleton for "Add Option Group" section */}
            <div className="border-b pb-4 mb-4">
              <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
              <div className="flex flex-wrap gap-2">
                <div className="h-9 w-40 bg-gray-200 rounded"></div>
                <div className="h-9 w-20 bg-gray-200 rounded"></div>
                <div className="h-9 w-20 bg-gray-200 rounded"></div>
                <div className="h-9 w-24 bg-gray-200 rounded"></div>
                <div className="h-9 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
            
            {/* Skeleton for option groups */}
            {[1, 2].map((i) => (
              <div key={i} className="border rounded-md p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="w-full">
                    <div className="h-7 w-48 bg-gray-200 rounded mb-2"></div>
                    <div className="flex space-x-4">
                      <div className="h-5 w-24 bg-gray-200 rounded"></div>
                      <div className="h-5 w-24 bg-gray-200 rounded"></div>
                      <div className="h-5 w-32 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 ml-2">
                  <div className="h-8 w-28 bg-gray-200 rounded mb-4"></div>
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center justify-between mt-2">
                      <div className="h-6 w-48 bg-gray-200 rounded"></div>
                      <div className="h-6 w-24 bg-gray-200 rounded"></div>
                      <div className="h-6 w-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Create Group */}
            <div className="border-b pb-4 mb-4">
              <h3 className="font-semibold mb-2">Add Option Group</h3>
              <div className="flex flex-wrap items-center space-x-2 space-y-2">
                <input
                  type="text"
                  className="border p-1 rounded text-sm"
                  placeholder="Group Name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <div className="flex items-center space-x-1 text-xs">
                  <span>Min:</span>
                  <input
                    type="number"
                    className="border p-1 w-14 rounded"
                    value={newGroupMin}
                    onChange={(e) => setNewGroupMin(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <span>Max:</span>
                  <input
                    type="number"
                    className="border p-1 w-14 rounded"
                    value={newGroupMax}
                    onChange={(e) => setNewGroupMax(parseInt(e.target.value) || 0)}
                  />
                </div>
                <label className="flex items-center space-x-1 text-xs">
                  <input
                    type="checkbox"
                    checked={newGroupRequired}
                    onChange={(e) => setNewGroupRequired(e.target.checked)}
                  />
                  <span>Required?</span>
                </label>
                <button
                  onClick={handleCreateGroup}
                  className="px-2 py-1 bg-[#c1902f] text-white text-sm rounded hover:bg-[#d4a43f]"
                >
                  + Create Group
                </button>
              </div>
            </div>

            {draftOptionGroups.length === 0 && (
              <p className="text-sm text-gray-500">No Option Groups yet.</p>
            )}

            {/* Existing Groups */}
            {draftOptionGroups.map((group) => (
              <div key={group.id} className="border rounded-md p-4 mb-4">
                {/* Group header */}
                <div className="flex justify-between items-center">
                  <div>
                    <input
                      type="text"
                      className="text-lg font-semibold border-b focus:outline-none"
                      value={group.name}
                      onChange={(e) =>
                        handleLocalUpdateGroup(group.id, { name: e.target.value })
                      }
                    />
                    <div className="text-xs text-gray-500 mt-1 flex items-center space-x-3">
                      {/* Min & Max & Required */}
                      <div className="flex items-center">
                        <span>Min:</span>
                        <input
                          type="number"
                          className="w-14 ml-1 border p-1 rounded text-xs"
                          value={group.min_select}
                          onChange={(e) =>
                            handleLocalUpdateGroup(group.id, {
                              min_select: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center">
                        <span>Max:</span>
                        <input
                          type="number"
                          className="w-14 ml-1 border p-1 rounded text-xs"
                          value={group.max_select}
                          onChange={(e) =>
                            handleLocalUpdateGroup(group.id, {
                              max_select: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <label className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={group.required}
                          onChange={(e) =>
                            handleLocalUpdateGroup(group.id, {
                              required: e.target.checked,
                            })
                          }
                        />
                        <span>Required?</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLocalDeleteGroup(group.id)}
                    className="p-2 text-gray-600 hover:text-red-600"
                    title="Delete this group"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Options */}
                <div className="mt-4 ml-2">
                  <button
                    onClick={() => handleLocalCreateOption(group.id)}
                    className="flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 text-sm rounded"
                  >
                    + Add Option
                  </button>

                  {group.options.length === 0 && (
                    <p className="text-sm text-gray-400 mt-2">No options yet.</p>
                  )}

                  {group.options.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between mt-2"
                    >
                      {/* Option name */}
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) =>
                          handleLocalUpdateOption(group.id, opt.id, {
                            name: e.target.value,
                          })
                        }
                        className="border-b text-sm flex-1 mr-2 focus:outline-none"
                      />
                      {/* Additional price */}
                      <span className="mr-2 text-sm text-gray-600">
                        $
                        <input
                          type="number"
                          step="0.01"
                          value={opt.additional_price}
                          onChange={(e) =>
                            handleLocalUpdateOption(group.id, opt.id, {
                              additional_price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-16 ml-1 border-b focus:outline-none text-sm"
                        />
                      </span>
                      {/* Delete option */}
                      <button
                        onClick={() => handleLocalDeleteOption(group.id, opt.id)}
                        className="p-1 text-gray-600 hover:text-red-600"
                        title="Delete Option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            Close (Discard)
          </button>
          <button
            onClick={handleSaveAllChanges}
            className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f] transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="h-5 w-5 mr-2 inline" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
