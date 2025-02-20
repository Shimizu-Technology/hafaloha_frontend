// src/ordering/components/admin/settings/CategoriesSettings.tsx
//
// Explanation:
// - We keep a hidden "position" usage so it always defaults to 0 in the code.
// - We do NOT display or edit 'position' in the table or the form. 
//   That way, the database field remains available for future reordering logic,
//   but it's invisible to admins right now.

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../../lib/api';

// Categories can have a "position" column for custom ordering. 
// Currently, we keep it hidden from the UI. 
interface Category {
  id: number;
  name: string;
  position?: number; // not shown in the UI, but still stored in DB
}

export function CategoriesSettings() {
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
      const data = await api.get('/admin/categories');
      // If you want to sort by position behind the scenes, you can do:
      // data.sort((a:Category,b:Category) => (a.position||0) - (b.position||0));
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
      // We still set 'position' under the hood, but always 0 or some default
      const response = await api.post('/admin/categories', {
        category: {
          name: newName,
          position: 0  // hidden from user, always zero for now
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
      // Same approach: we keep 'position' but default to 0
      const response = await api.patch(`/admin/categories/${id}`, {
        category: { name, position: 0 },
      });
      setCategories(categories.map((c) => (c.id === response.id ? response : c)));
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

      {/* New Category Form */}
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 mb-4 items-start sm:items-end">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            New Category Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border p-2 rounded w-52"
            placeholder="e.g. Beverages"
          />
        </div>
        <button
          type="submit"
          className="mt-2 sm:mt-auto px-4 py-2 bg-[#c1902f] text-white rounded hover:bg-[#d4a43f] h-10"
        >
          Add
        </button>
      </form>

      {/* Categories List */}
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm text-gray-700">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const isEditing = editingCategory && editingCategory.id === cat.id;

              if (isEditing) {
                // Inline editing row
                return (
                  <tr key={cat.id} className="border-b">
                    <td className="px-4 py-2">
                      <form onSubmit={handleEditSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) =>
                            setEditingCategory({ ...editingCategory, name: e.target.value })
                          }
                          className="border p-2 rounded w-40 sm:w-60"
                        />
                      </form>
                    </td>
                    <td className="px-4 py-2 space-x-2 sm:space-x-3">
                      <button
                        onClick={handleEditSubmit}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="px-3 py-1 border rounded text-sm"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              } else {
                // Normal row (read-only)
                return (
                  <tr key={cat.id} className="border-b">
                    <td className="px-4 py-2">
                      <span className="font-medium">{cat.name}</span>
                    </td>
                    <td className="px-4 py-2 space-x-2 sm:space-x-3">
                      <button
                        onClick={() => setEditingCategory(cat)}
                        className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="px-2 py-1 text-red-600 border border-red-600 rounded text-sm hover:bg-red-50"
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
                <td colSpan={2} className="px-4 py-4 text-center text-gray-500">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 
        NOTE: The 'position' column is still stored in the DB but 
        is hidden from this UI. If, in the future, you want to enable 
        custom ordering, you can show a numeric input or drag-and-drop 
        UI that sets 'position'. Right now we always set it to 0.
      */}
    </div>
  );
}
