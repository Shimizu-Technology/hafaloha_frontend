// src/components/admin/MenuManager.tsx

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { useMenuStore } from '../../store/menuStore'; // your zustand store
import type { MenuItem } from '../../types/menu';
import { categories } from '../../data/menu';

interface MenuItemFormData {
  id?: number;
  name: string;
  description: string;
  price: number;
  category: string;
  menu_id?: number;
  image: string;            // existing image URL
  imageFile?: File | null;  // new file if user chooses one
  advance_notice_hours: number;
  seasonal: boolean;
  available_from?: string | null;
  available_until?: string | null;
  promo_label?: string | null;
  featured: boolean;

  // --- NEW for out-of-stock/limited ---
  stock_status: 'in_stock' | 'out_of_stock' | 'limited';
  status_note?: string | null;
}

interface OptionGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  options: OptionRow[];
}

interface OptionRow {
  id: number;
  name: string;
  additional_price: number;
}

export function MenuManager() {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useMenuStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemFormData | null>(null);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Checkboxes for filtering by featured/seasonal
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showSeasonalOnly, setShowSeasonalOnly] = useState(false);

  // Options Modal
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [optionsModalItem, setOptionsModalItem] = useState<MenuItem | null>(null);

  // Filter logic
  const filteredItems = React.useMemo(() => {
    let list = menuItems;

    if (selectedCategory) {
      list = list.filter((item) => item.category === selectedCategory);
    }
    if (showFeaturedOnly) {
      list = list.filter((item) => item.featured);
    }
    if (showSeasonalOnly) {
      list = list.filter((item) => item.seasonal);
    }
    return list;
  }, [menuItems, selectedCategory, showFeaturedOnly, showSeasonalOnly]);

  // Default data for creating a new item
  const initialFormData: MenuItemFormData = {
    name: '',
    description: '',
    price: 0,
    category: categories[0]?.id || 'appetizers',
    image: '',
    imageFile: null,
    menu_id: 1,
    advance_notice_hours: 0,
    seasonal: false,
    available_from: null,
    available_until: null,
    promo_label: 'Limited Time',
    featured: false,

    // NEW: default them
    stock_status: 'in_stock',
    status_note: '',
  };

  // Ensure not more than 4 featured
  function canFeatureThisItem(formData: MenuItemFormData): boolean {
    if (!formData.featured) return true;

    // Check if it's already featured
    const isCurrentlyFeatured = menuItems.find(
      (m) => Number(m.id) === formData.id
    )?.featured;

    if (isCurrentlyFeatured) return true;

    const currentlyFeaturedCount = menuItems.filter((m) => m.featured).length;
    if (currentlyFeaturedCount >= 4) {
      alert('You can only have 4 featured items at a time.');
      return false;
    }
    return true;
  }

  // Edit item
  const handleEdit = (item: MenuItem) => {
    setEditingItem({
      id: Number(item.id),
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      image: item.image || '',
      imageFile: null,
      menu_id: (item as any).menu_id || 1,
      advance_notice_hours: item.advance_notice_hours ?? 0,
      seasonal: !!item.seasonal,
      available_from: item.available_from || null,
      available_until: item.available_until || null,
      promo_label: (item as any).promo_label?.trim() || 'Limited Time',
      featured: !!item.featured,

      // NEW: read from the item
      stock_status: item.stock_status || 'in_stock',
      status_note: item.status_note || '',
    });
    setIsEditing(true);
  };

  // Add new item
  const handleAdd = () => {
    setEditingItem(initialFormData);
    setIsEditing(true);
  };

  // Delete
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteMenuItem(id);
    }
  };

  // Manage Options
  const handleManageOptions = (item: MenuItem) => {
    setOptionsModalItem(item);
    setOptionsModalOpen(true);
  };
  const handleCloseOptionsModal = () => {
    setOptionsModalOpen(false);
    setOptionsModalItem(null);
  };

  // Handle the form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    // If toggling featured => check the 4-limit
    if (!canFeatureThisItem(editingItem)) {
      return;
    }

    // If seasonal but no label => "Limited Time"
    let finalLabel = editingItem.promo_label?.trim() || '';
    if (editingItem.seasonal && !finalLabel) {
      finalLabel = 'Limited Time';
    }

    const payload = {
      ...editingItem,
      promo_label: finalLabel,
    };

    try {
      if (editingItem.id) {
        await updateMenuItem(String(editingItem.id), payload);
      } else {
        await addMenuItem(payload);
      }
    } catch (err) {
      console.error('Failed to save menu item:', err);
    }

    setIsEditing(false);
    setEditingItem(null);
  };

  // If admin checks "Featured Items," uncheck "Seasonal"
  function handleToggleFeatured(checked: boolean) {
    if (checked) {
      setShowSeasonalOnly(false);
    }
    setShowFeaturedOnly(checked);
  }

  // If admin checks "Seasonal Items," uncheck "Featured"
  function handleToggleSeasonal(checked: boolean) {
    if (checked) {
      setShowFeaturedOnly(false);
    }
    setShowSeasonalOnly(checked);
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <button
          onClick={handleAdd}
          className="inline-flex items-center justify-center w-fit min-w-[120px] px-4 py-2
                     bg-[#c1902f] text-white rounded-md
                     hover:bg-[#d4a43f] whitespace-nowrap"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Item
        </button>
      </div>

      {/* Category Filter Row */}
      <div className="mb-3">
        <div className="flex flex-nowrap space-x-3 overflow-x-auto py-2">
          {/* All Categories */}
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

      {/* Additional Filters (Featured, Seasonal) */}
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

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4 flex flex-col flex-1">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-600">{item.description}</p>

                {/* STOCK STATUS BADGES */}
                {item.stock_status === 'out_of_stock' && (
                  <span className="inline-block bg-gray-500 text-white text-xs rounded-full px-2 py-1 mt-1">
                    Out of Stock
                  </span>
                )}
                {item.stock_status === 'limited' && (
                  <span className="inline-block bg-orange-500 text-white text-xs rounded-full px-2 py-1 mt-1">
                    Limited
                  </span>
                )}

                {/* Optional status note */}
                {item.status_note?.trim() && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    {item.status_note}
                  </p>
                )}

                {item.advance_notice_hours >= 24 && (
                  <p className="text-xs text-red-600 mt-1">
                    Requires 24 hours notice
                  </p>
                )}
                {item.seasonal && (
                  <span className="inline-block bg-red-500 text-white text-xs rounded-full px-2 py-1 mt-1">
                    {item.promo_label?.trim() || 'Limited Time'}
                  </span>
                )}
                {item.featured && (
                  <span className="inline-block bg-yellow-500 text-white text-xs rounded-full px-2 py-1 mt-1 ml-2">
                    Featured
                  </span>
                )}
              </div>
              <div className="mt-auto flex justify-between items-center pt-4">
                <span className="text-sm text-gray-500 capitalize">
                  {item.category}
                </span>
                <div className="flex items-center space-x-4">
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
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isEditing && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
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

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
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

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={editingItem.category}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requires 24-hour notice? */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires24"
                  checked={editingItem.advance_notice_hours >= 24}
                  onChange={(e) => {
                    const newVal = e.target.checked ? 24 : 0;
                    setEditingItem({ ...editingItem, advance_notice_hours: newVal });
                  }}
                />
                <label htmlFor="requires24" className="text-sm font-medium text-gray-700">
                  Requires 24-hour notice?
                </label>
              </div>

              {/* Seasonal checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="seasonal"
                  checked={editingItem.seasonal}
                  onChange={(e) => {
                    const turnedOn = e.target.checked;
                    setEditingItem((prev) => {
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
                <label htmlFor="seasonal" className="text-sm font-medium text-gray-700">
                  Seasonal / Limited Time?
                </label>
              </div>

              {/* available_from / available_until */}
              {editingItem.seasonal && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
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
                  <div className="flex-1">
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
              <div>
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
                  placeholder='E.g. "Valentine’s Special" or "4th of July"'
                />
              </div>

              {/* Featured checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={editingItem.featured}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, featured: e.target.checked })
                  }
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                  Featured?
                </label>
              </div>

              {/* =========== NEW STOCK STATUS =========== */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Status
                </label>
                <select
                  value={editingItem.stock_status}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      stock_status: e.target.value as 'in_stock' | 'out_of_stock' | 'limited',
                    })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="limited">Limited</option>
                </select>
              </div>

              {/* =========== NEW STATUS NOTE =========== */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Note (Optional)
                </label>
                <textarea
                  value={editingItem.status_note ?? ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      status_note: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  rows={2}
                  placeholder='E.g. "Supplier delayed; using turkey instead of chicken."'
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image Upload
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setEditingItem({
                        ...editingItem,
                        imageFile: e.target.files[0],
                      });
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

              {/* Manage Options (only if editing existing) */}
              {editingItem.id && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => handleManageOptions(editingItem as unknown as MenuItem)}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Manage Options
                  </button>
                </div>
              )}

              {/* Submit / Cancel */}
              <div className="flex justify-end space-x-2 pt-4">
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
    </div>
  );
}

// --------------------------------------
// OptionGroupsModal (your existing code, unchanged, except any local changes)
// --------------------------------------
function OptionGroupsModal({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // For creating new group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMin, setNewGroupMin] = useState(0);
  const [newGroupMax, setNewGroupMax] = useState(1);
  const [newGroupRequired, setNewGroupRequired] = useState(false);

  // For creating new option
  const [creatingOptionGroupId, setCreatingOptionGroupId] =
    useState<number | null>(null);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState(0);

  React.useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line
  }, [item.id]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/menu_items/${item.id}/option_groups`);
      setOptionGroups(data);
    } catch (err) {
      console.error(err);
      setOptionGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const replaceGroupInState = (updated: OptionGroup) => {
    setOptionGroups((prev) =>
      prev.map((g) => (g.id === updated.id ? updated : g))
    );
  };
  const removeGroupInState = (groupId: number) => {
    setOptionGroups((prev) => prev.filter((g) => g.id !== groupId));
  };
  const addGroupToState = (created: OptionGroup) => {
    setOptionGroups((prev) => [...prev, created]);
  };
  const replaceOptionInState = (groupId: number, updatedOpt: OptionRow) => {
    setOptionGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((o) =>
                o.id === updatedOpt.id ? updatedOpt : o
              ),
            }
          : g
      )
    );
  };
  const removeOptionInState = (groupId: number, optId: number) => {
    setOptionGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.filter((o) => o.id !== optId) }
          : g
      )
    );
  };
  const addOptionToState = (groupId: number, newOpt: OptionRow) => {
    setOptionGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: [...g.options, newOpt] } : g
      )
    );
  };

  // CREATE OptionGroup
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const created = await api.post(`/menu_items/${item.id}/option_groups`, {
        name: newGroupName,
        min_select: newGroupMin,
        max_select: newGroupMax,
        required: newGroupRequired,
      });
      addGroupToState(created);
      // Reset
      setNewGroupName('');
      setNewGroupMin(0);
      setNewGroupMax(1);
      setNewGroupRequired(false);
    } catch (err) {
      console.error(err);
    }
  };

  // UPDATE OptionGroup
  const handleUpdateGroup = async (
    group: OptionGroup,
    changes: Partial<OptionGroup>
  ) => {
    try {
      // Optimistic update
      const updated = { ...group, ...changes };
      replaceGroupInState(updated);

      // Then patch to server
      const serverGroup = await api.patch(`/option_groups/${group.id}`, changes);
      replaceGroupInState(serverGroup);
    } catch (err) {
      console.error(err);
    }
  };

  // DELETE OptionGroup
  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('Delete this option group?')) return;
    try {
      removeGroupInState(groupId);
      await api.delete(`/option_groups/${groupId}`);
    } catch (err) {
      console.error(err);
    }
  };

  // CREATE Option
  const startCreatingOption = (groupId: number) => {
    setCreatingOptionGroupId(groupId);
    setNewOptionName('');
    setNewOptionPrice(0);
  };
  const confirmCreateOption = async () => {
    if (!creatingOptionGroupId || !newOptionName.trim()) {
      setCreatingOptionGroupId(null);
      return;
    }
    try {
      const createdOption = await api.post(
        `/option_groups/${creatingOptionGroupId}/options`,
        {
          name: newOptionName,
          additional_price: newOptionPrice,
        }
      );
      addOptionToState(creatingOptionGroupId, createdOption);

      // Reset
      setCreatingOptionGroupId(null);
      setNewOptionName('');
      setNewOptionPrice(0);
    } catch (err) {
      console.error(err);
    }
  };
  const cancelCreateOption = () => {
    setCreatingOptionGroupId(null);
    setNewOptionName('');
    setNewOptionPrice(0);
  };

  // UPDATE Option
  const handleUpdateOption = async (
    groupId: number,
    option: OptionRow,
    changes: Partial<OptionRow>
  ) => {
    try {
      // Optimistic update
      const updatedOpt = { ...option, ...changes };
      replaceOptionInState(groupId, updatedOpt);

      // Then patch to server
      const serverOpt = await api.patch(`/options/${option.id}`, changes);
      replaceOptionInState(groupId, serverOpt);
    } catch (err) {
      console.error(err);
    }
  };

  // DELETE Option
  const handleDeleteOption = async (groupId: number, optId: number) => {
    if (!window.confirm('Delete this option?')) return;
    try {
      removeOptionInState(groupId, optId);
      await api.delete(`/options/${optId}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Manage Option Groups for: {item.name}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
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

            {optionGroups.length === 0 && (
              <p className="text-sm text-gray-500">No Option Groups yet.</p>
            )}

            {/* Existing Groups */}
            {optionGroups.map((group) => (
              <div key={group.id} className="border rounded-md p-4 mb-4">
                {/* Group header */}
                <div className="flex justify-between items-center">
                  <div>
                    <input
                      type="text"
                      className="text-lg font-semibold border-b focus:outline-none"
                      value={group.name}
                      onChange={(e) =>
                        handleUpdateGroup(group, { name: e.target.value })
                      }
                    />
                    <div className="text-xs text-gray-500 mt-1 flex items-center space-x-3">
                      {/* Min */}
                      <div className="flex items-center">
                        <span>Min:</span>
                        <input
                          type="number"
                          className="w-14 ml-1 border p-1 rounded text-xs"
                          value={group.min_select}
                          onChange={(e) =>
                            handleUpdateGroup(group, {
                              min_select: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      {/* Max */}
                      <div className="flex items-center">
                        <span>Max:</span>
                        <input
                          type="number"
                          className="w-14 ml-1 border p-1 rounded text-xs"
                          value={group.max_select}
                          onChange={(e) =>
                            handleUpdateGroup(group, {
                              max_select: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      {/* Required */}
                      <label className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={group.required}
                          onChange={(e) =>
                            handleUpdateGroup(group, {
                              required: e.target.checked,
                            })
                          }
                        />
                        <span>Required?</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-gray-600 hover:text-red-600"
                    title="Delete this group"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Options */}
                <div className="mt-4 ml-2">
                  {creatingOptionGroupId === group.id ? (
                    // Inline form for new Option
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        className="border p-1 rounded text-sm"
                        placeholder="Option Name"
                        value={newOptionName}
                        onChange={(e) => setNewOptionName(e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="border p-1 rounded w-16 text-sm"
                        placeholder="Price"
                        value={newOptionPrice}
                        onChange={(e) =>
                          setNewOptionPrice(parseFloat(e.target.value) || 0)
                        }
                      />
                      <button
                        onClick={confirmCreateOption}
                        className="px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelCreateOption}
                        className="px-2 py-1 border text-sm rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startCreatingOption(group.id)}
                      className="flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 text-sm rounded"
                    >
                      + Add Option
                    </button>
                  )}

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
                          handleUpdateOption(group.id, opt, { name: e.target.value })
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
                            handleUpdateOption(group.id, opt, {
                              additional_price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-16 ml-1 border-b focus:outline-none text-sm"
                        />
                      </span>
                      {/* Delete option */}
                      <button
                        onClick={() => handleDeleteOption(group.id, opt.id)}
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

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
