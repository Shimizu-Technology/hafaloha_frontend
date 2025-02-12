// src/ordering/components/admin/MenuManager.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

import type { MenuItem } from '../../hooks/useMenu'; // or your domain type
import { useMenu } from '../../hooks/useMenu';        // NEW HOOK
import { useOrderingApi } from '../../hooks/useOrderingApi'; // for OptionGroupsModal
import { categories } from '../../data/menu';

// --------------------------------------
// Local Types
// --------------------------------------
interface MenuItemFormData {
  // If your backend uses numeric IDs, you can keep number here, 
  // but then convert to string when calling your CRUD methods if needed.
  id?: string | number;
  name: string;
  description: string;
  price: number;
  category: string;
  menu_id?: number;
  image: string;
  imageFile?: File | null;
  advance_notice_hours: number;
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

// --------------------------------------
// Main: MenuManager
// --------------------------------------
export function MenuManager() {
  // 1) Use the new "useMenu" hook
  const {
    menuItems,
    loading: menuLoading,
    error: menuError,
    fetchMenuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
  } = useMenu();

  // 2) Local component states
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemFormData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [optionsModalItem, setOptionsModalItem] = useState<MenuItem | null>(null);

  // 3) Filter items by category
  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category === selectedCategory)
    : menuItems;

  // 4) On mount, fetch menu items
  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  // 5) Provide a default blank form for adding a new item
  const initialFormData: MenuItemFormData = {
    name: '',
    description: '',
    price: 0,
    category: categories[0].id,
    image: '',
    imageFile: null,
    menu_id: 1,
    advance_notice_hours: 0,
  };

  // --------------------------------------
  // Editing / Adding items
  // --------------------------------------
  const handleEdit = (item: MenuItem) => {
    // Convert item ID from string to number if you track it that way
    // or keep it as string if your hooks do so
    setEditingItem({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category || categories[0].id,
      image: item.image || '',
      imageFile: null,
      menu_id: item.menu_id || 1,
      advance_notice_hours: (item as any).advance_notice_hours ?? 0,
    });
    setIsEditing(true);
  };

  const handleAdd = () => {
    setEditingItem(initialFormData);
    setIsEditing(true);
  };

  // --------------------------------------
  // Submit create/update
  // --------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (editingItem.id) {
      // If updating an existing item
      await updateMenuItem(String(editingItem.id), editingItem);
    } else {
      // Creating new
      await addMenuItem({ ...editingItem });
    }

    setIsEditing(false);
    setEditingItem(null);
  };

  // --------------------------------------
  // Delete an item
  // --------------------------------------
  const handleDelete = async (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteMenuItem(String(id));
    }
  };

  // --------------------------------------
  // Manage Options (open modal)
  // --------------------------------------
  const handleManageOptions = (item: MenuItem) => {
    setOptionsModalItem(item);
    setOptionsModalOpen(true);
  };

  const handleCloseOptionsModal = () => {
    setOptionsModalOpen(false);
    setOptionsModalItem(null);
  };

  // --------------------------------------
  // Render
  // --------------------------------------
  return (
    <div className="max-w-7xl mx-auto p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Item
        </button>
      </div>

      {/* Loading/Error States */}
      {menuLoading && <div className="mb-4">Loading menu items...</div>}
      {menuError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          Error: {menuError}
        </div>
      )}

      {/* Category Filters */}
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded-md ${
            !selectedCategory
              ? 'bg-[#c1902f] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setSelectedCategory(null)}
        >
          All Categories
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`px-4 py-2 rounded-md ${
              selectedCategory === cat.id
                ? 'bg-[#c1902f] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Add/Edit Item Modal */}
      {isEditing && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
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
                  onChange={e =>
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
                  onChange={e =>
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
                  onChange={e =>
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
                  onChange={e =>
                    setEditingItem({ ...editingItem, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  required
                >
                  {categories.map(cat => (
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
                    setEditingItem({
                      ...editingItem,
                      advance_notice_hours: newVal,
                    });
                  }}
                />
                <label
                  htmlFor="requires24"
                  className="block text-sm font-medium text-gray-700"
                >
                  Requires 24-hour notice?
                </label>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image Upload
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
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

              {/* Manage Options Button (only if editing existing item) */}
              {editingItem.id && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      handleManageOptions(editingItem as unknown as MenuItem)
                    }
                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Manage Options
                  </button>
                </div>
              )}

              {/* Submit/Cancel Buttons */}
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
                  className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
                >
                  <Save className="h-5 w-5 mr-2 inline-block" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* The Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
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
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
                {(item as any).advance_notice_hours >= 24 && (
                  <p className="text-xs text-red-600 mt-1">
                    Requires 24 hours notice
                  </p>
                )}
              </div>
              <div className="mt-auto flex justify-between items-center pt-4">
                <span className="text-sm text-gray-500 capitalize">
                  {item.category}
                </span>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold">
                    ${Number(item.price).toFixed(2)}
                  </span>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-gray-600 hover:text-[#c1902f]"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* OptionGroups Modal */}
      {optionsModalOpen && optionsModalItem && (
        <OptionGroupsModal
          item={optionsModalItem}
          onClose={handleCloseOptionsModal}
        />
      )}
    </div>
  );
}

// --------------------------------------
// OptionGroupsModal
// --------------------------------------
function OptionGroupsModal({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const { get, post, patch, delete: remove } = useOrderingApi();

  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline create group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMin, setNewGroupMin] = useState(0);
  const [newGroupMax, setNewGroupMax] = useState(1);
  const [newGroupRequired, setNewGroupRequired] = useState(false);

  // For inline create option
  const [creatingOptionGroupId, setCreatingOptionGroupId] = useState<number | null>(
    null
  );
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState(0);

  // -------------------------------------
  // Fetch Option Groups once
  // -------------------------------------
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await get(`/menu_items/${item.id}/option_groups`);
        setOptionGroups(data);
      } catch (err) {
        console.error(err);
        setOptionGroups([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [item.id, get]);

  // -------------------------------------
  // Helpers to update local state
  // -------------------------------------
  const replaceGroupInState = (updated: OptionGroup) => {
    setOptionGroups((current) =>
      current.map((g) => (g.id === updated.id ? updated : g))
    );
  };

  const removeGroupInState = (groupId: number) => {
    setOptionGroups((current) => current.filter((g) => g.id !== groupId));
  };

  const addGroupToState = (created: OptionGroup) => {
    setOptionGroups((current) => [...current, created]);
  };

  const replaceOptionInState = (groupId: number, updatedOpt: OptionRow) => {
    setOptionGroups((current) =>
      current.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.map((o) => (o.id === updatedOpt.id ? updatedOpt : o)),
        };
      })
    );
  };

  const removeOptionInState = (groupId: number, optId: number) => {
    setOptionGroups((current) =>
      current.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.filter((o) => o.id !== optId),
        };
      })
    );
  };

  const addOptionToState = (groupId: number, newOpt: OptionRow) => {
    setOptionGroups((current) =>
      current.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, options: [...g.options, newOpt] };
      })
    );
  };

  // -------------------------------------
  // CREATE OptionGroup
  // -------------------------------------
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const created = await post(`/menu_items/${item.id}/option_groups`, {
        name: newGroupName,
        min_select: newGroupMin,
        max_select: newGroupMax,
        required: newGroupRequired,
      });
      addGroupToState(created);
      // Reset fields
      setNewGroupName('');
      setNewGroupMin(0);
      setNewGroupMax(1);
      setNewGroupRequired(false);
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------
  // UPDATE OptionGroup
  // -------------------------------------
  const handleUpdateGroup = async (
    group: OptionGroup,
    changes: Partial<OptionGroup>
  ) => {
    try {
      // Immediately update local state
      const updated = { ...group, ...changes };
      replaceGroupInState(updated);
      // Send patch to server
      const serverGroup = await patch(`/option_groups/${group.id}`, changes);
      replaceGroupInState(serverGroup);
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------
  // DELETE OptionGroup
  // -------------------------------------
  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('Delete this option group?')) return;
    try {
      removeGroupInState(groupId);
      await remove(`/option_groups/${groupId}`);
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------
  // CREATE Option
  // -------------------------------------
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
      const groupId = creatingOptionGroupId;
      const createdOption = await post(`/option_groups/${groupId}/options`, {
        name: newOptionName,
        additional_price: newOptionPrice,
      });
      addOptionToState(groupId, createdOption);
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

  // -------------------------------------
  // UPDATE Option
  // -------------------------------------
  const handleUpdateOption = async (
    groupId: number,
    option: OptionRow,
    changes: Partial<OptionRow>
  ) => {
    try {
      // local update
      const updatedOpt = { ...option, ...changes };
      replaceOptionInState(groupId, updatedOpt);

      // server patch
      const serverOpt = await patch(`/options/${option.id}`, changes);
      replaceOptionInState(groupId, serverOpt);
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------
  // DELETE Option
  // -------------------------------------
  const handleDeleteOption = async (groupId: number, optId: number) => {
    if (!window.confirm('Delete this option?')) return;
    try {
      removeOptionInState(groupId, optId);
      await remove(`/options/${optId}`);
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------
  // Render modal
  // -------------------------------------
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        {/* Title Bar */}
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
            {/* Inline Add Group */}
            <div className="border-b pb-4 mb-4">
              <h3 className="font-semibold mb-2">Add Option Group</h3>
              <div className="flex flex-wrap items-center space-x-2 space-y-2">
                <input
                  type="text"
                  className="border p-1 rounded text-sm"
                  placeholder="Group Name"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
                <div className="flex items-center space-x-1 text-xs">
                  <span>Min:</span>
                  <input
                    type="number"
                    className="border p-1 w-14 rounded"
                    value={newGroupMin}
                    onChange={e => setNewGroupMin(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <span>Max:</span>
                  <input
                    type="number"
                    className="border p-1 w-14 rounded"
                    value={newGroupMax}
                    onChange={e => setNewGroupMax(parseInt(e.target.value) || 0)}
                  />
                </div>
                <label className="flex items-center space-x-1 text-xs">
                  <input
                    type="checkbox"
                    checked={newGroupRequired}
                    onChange={e => setNewGroupRequired(e.target.checked)}
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
                <div className="flex justify-between items-center">
                  <div>
                    {/* Editable group name */}
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

                  {/* Delete group */}
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-gray-600 hover:text-red-600"
                    title="Delete this group"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Options List */}
                <div className="mt-4 ml-2">
                  {creatingOptionGroupId === group.id ? (
                    // Inline form for new option
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
                    <p className="text-sm text-gray-400 mt-2">
                      No options yet.
                    </p>
                  )}

                  {group.options.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center justify-between mt-2"
                    >
                      {/* Editable option name */}
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) =>
                          handleUpdateOption(group.id, opt, {
                            name: e.target.value,
                          })
                        }
                        className="border-b text-sm flex-1 mr-2 focus:outline-none"
                      />

                      {/* Editable additional_price */}
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
