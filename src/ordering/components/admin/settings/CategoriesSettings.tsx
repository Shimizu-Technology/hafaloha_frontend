// src/ordering/components/admin/settings/CategoriesSettings.tsx

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../../lib/api';

interface Category {
  id: number;
  name: string;
  position?: number; // stored in DB but hidden from the UI
}

interface CategoriesSettingsProps {
  restaurantId?: string;
}

export function CategoriesSettings({ restaurantId }: CategoriesSettingsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For new category form (just name)
  const [newName, setNewName] = useState('');

  // For editing an existing category (just name)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Category[]>('/admin/categories');
      // data.sort((a: Category, b: Category) => (a.position || 0) - (b.position || 0));
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const response = await api.post<Category>('/admin/categories', {
        category: {
          name: newName,
          position: 0,
        },
      });
      setCategories([...categories, response]);
      setNewName('');
      toast.success('Created category');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      setCategories(categories.filter((c) => c.id !== id));
      toast.success('Deleted category');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCategory) return;
    const { id, name } = editingCategory;
    if (!name.trim()) return;

    try {
      const response = await api.patch<Category>(`/admin/categories/${id}`, {
        category: { name, position: 0 },
      });
      setCategories(
        categories.map((c) => (c.id === response.id ? response : c))
      );
      setEditingCategory(null);
      toast.success('Updated category');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  }

  return (
    <div>
      <h4 className="text-lg font-semibold mb-3">Manage Categories</h4>

      {error && <p className="text-red-600 mb-3">{error}</p>}
      {loading && <p className="text-gray-500 mb-3">Loading...</p>}

      {/* New Category Form - Mobile Optimized */}
      <form
        onSubmit={handleCreate}
        className="mb-6 space-y-3"
      >
        <div className="w-full">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            New Category Name
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border p-2 rounded flex-1"
              placeholder="e.g. Beverages"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#c1902f] text-white rounded hover:bg-[#d4a43f]"
            >
              Add Category
            </button>
          </div>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-[#c1902f] border-r-2 border-b-2 border-gray-200"></div>
          <p className="mt-2 text-sm text-gray-500">Loading categories...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Categories List - Mobile Optimized */}
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const isEditing = editingCategory && editingCategory.id === cat.id;

                if (isEditing) {
                  // Inline editing row
                  return (
                    <tr key={cat.id} className="border-b">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) =>
                            setEditingCategory({
                              ...editingCategory,
                              name: e.target.value,
                            })
                          }
                          className="border p-2 rounded w-full"
                          autoFocus
                        />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={handleEditSubmit}
                          className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm mr-2"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="px-3 py-1.5 border rounded text-sm"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                } else {
                  // Normal row (read-only)
                  return (
                    <tr key={cat.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium">{cat.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditingCategory(cat)}
                          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="px-3 py-1.5 text-red-600 border border-red-600 rounded text-sm hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                }
              })}

              {categories.length === 0 && !loading && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                    No categories yet. Add your first category above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 
        NOTE: The 'position' column is stored in DB but 
        hidden from this UI. We'll always set position=0 for now.
      */}
    </div>
  );
}
