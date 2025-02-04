// src/components/admin/MenuManager.tsx
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { useMenuStore } from '../../store/menuStore';
import type { MenuItem } from '../../types/menu';
import { categories } from '../../data/menu';
import { uploadMenuItemImage } from '../../lib/api';

interface MenuItemFormData {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  menu_id?: number;
  image: string;
  imageFile?: File | null;  
}

export function MenuManager() {
  const {
    menuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    refreshItemInState,
  } = useMenuStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemFormData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category === selectedCategory)
    : menuItems;

  // Default form data
  const initialFormData: MenuItemFormData = {
    id: '',
    name: '',
    description: '',
    price: 0,
    category: categories[0].id,
    image: '',
    imageFile: null,
    menu_id: 1
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem({ ...item, imageFile: null });
    setIsEditing(true);
  };

  const handleAdd = () => {
    setEditingItem(initialFormData);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (editingItem.id) {
      // Editing existing
      await updateMenuItem(editingItem.id, editingItem);
      if (editingItem.imageFile) {
        const updated = await uploadMenuItemImage(editingItem.id, editingItem.imageFile);
        refreshItemInState(updated);
      }
    } else {
      // Creating new
      const newId = editingItem.name.toLowerCase().replace(/\s+/g, '-');
      await addMenuItem({ ...editingItem, id: newId });
      // If immediate upload is needed, you'd do the two-step approach shown earlier
    }

    setIsEditing(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteMenuItem(id);
    }
  };

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

      {/* Modal for Add/Edit */}
      {isEditing && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
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
                  onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md"
                  rows={3}
                  required
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
                  onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
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
                  onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
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
                      setEditingItem({ ...editingItem, imageFile: e.target.files[0] });
                    }
                  }}
                  className="w-full px-2 py-2 border rounded-md"
                />

                {/* Existing image preview (no new file) */}
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

              {/* Buttons */}
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

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          // 1) Make the card a flex-col container, full height
          <div 
            key={item.id} 
            className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-48 object-cover"
            />
            {/* 2) Everything below the image in a flex-col that can stretch */}
            <div className="p-4 flex flex-col flex-1">
              {/* The name and description area */}
              <div>
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>

              {/* Put the bottom row at the bottom via mt-auto */}
              <div className="mt-auto flex justify-between items-center pt-4">
                <span className="text-sm text-gray-500 capitalize">
                  {item.category}
                </span>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold">
                    ${Number(item.price).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-gray-600 hover:text-[#c1902f]"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
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
    </div>
  );
}
