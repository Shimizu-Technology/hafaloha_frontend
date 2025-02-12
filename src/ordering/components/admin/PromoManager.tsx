// src/ordering/components/admin/PromoManager.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Tag } from 'lucide-react';

// Import the new hook instead of the old zustand store
import { usePromos } from '../../hooks/usePromos';

interface PromoFormData {
  code: string;
  discountPercent: number;
  validUntil: string;
  maxUses?: number;
  description?: string;
}

export function PromoManager() {
  // Destructure from the new hook
  const {
    promoCodes,
    fetchPromoCodes,
    addPromoCode,
    updatePromoCode,
    deletePromoCode,
    loading,
    error,
  } = usePromos();

  const [isEditing, setIsEditing] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoFormData | null>(null);

  useEffect(() => {
    // Load promo codes on mount
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  // Default form for a new promo
  const initialFormData: PromoFormData = {
    code: '',
    discountPercent: 10,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    maxUses: undefined,
    description: '',
  };

  // Edit existing
  const handleEdit = (promo: any) => {
    // Convert the existing promo into the form data shape
    setEditingPromo({
      ...promo,
      // Convert to YYYY-MM-DD
      validUntil: new Date(promo.validUntil).toISOString().split('T')[0],
    });
    setIsEditing(true);
  };

  // Add new
  const handleAdd = () => {
    setEditingPromo(initialFormData);
    setIsEditing(true);
  };

  // Submit create/update
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;

    // Rebuild final data
    const promoData = {
      ...editingPromo,
      validUntil: new Date(editingPromo.validUntil).toISOString(), // store full date/time if you wish
      currentUses: 0,
    };

    // Check if this code already exists => update, else add
    const existing = promoCodes.find((p) => p.code === promoData.code);
    if (existing) {
      updatePromoCode(promoData);
    } else {
      addPromoCode(promoData);
    }

    setIsEditing(false);
    setEditingPromo(null);
  };

  const handleDelete = (code: string) => {
    if (window.confirm('Are you sure you want to delete this promo code?')) {
      deletePromoCode(code);
    }
  };

  // Helpers to check expiry
  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();
  const isAlmostExpired = (validUntil: string) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(validUntil).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Promo Code Management</h2>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Promo Code
        </button>
      </div>

      {/* Loading / Error */}
      {loading && <div>Loading promo codes…</div>}
      {error && <div className="text-red-600">Error: {error}</div>}

      {/* Edit/Add Modal */}
      {isEditing && editingPromo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {editingPromo.code ? 'Edit Promo Code' : 'Add New Promo Code'}
              </h3>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingPromo(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={editingPromo.code}
                  onChange={(e) =>
                    setEditingPromo({
                      ...editingPromo,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  required
                  pattern="[A-Z0-9]+"
                  title="Only uppercase letters and numbers allowed"
                />
              </div>
              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editingPromo.discountPercent}
                  onChange={(e) =>
                    setEditingPromo({
                      ...editingPromo,
                      discountPercent: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              {/* Valid Until */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={editingPromo.validUntil}
                  onChange={(e) =>
                    setEditingPromo({
                      ...editingPromo,
                      validUntil: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              {/* Max Uses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Uses (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingPromo.maxUses || ''}
                  onChange={(e) =>
                    setEditingPromo({
                      ...editingPromo,
                      maxUses: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  placeholder="Unlimited if empty"
                />
              </div>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={editingPromo.description || ''}
                  onChange={(e) =>
                    setEditingPromo({
                      ...editingPromo,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-md"
                  rows={3}
                  placeholder="Enter description or terms of use"
                />
              </div>
              {/* Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingPromo(null);
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

      {/* Promo Codes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promoCodes.map((promo) => (
          <div
            key={promo.code}
            className={`bg-white rounded-lg shadow-md p-6 ${
              isExpired(promo.validUntil) ? 'opacity-50' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Tag className="h-5 w-5 text-[#c1902f]" />
                  <h3 className="text-lg font-semibold">{promo.code}</h3>
                </div>
                {promo.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {promo.description}
                  </p>
                )}
              </div>
              <span className="text-lg font-semibold text-[#c1902f]">
                {promo.discountPercent}% OFF
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                Valid until: {new Date(promo.validUntil).toLocaleDateString()}
                {isExpired(promo.validUntil) && (
                  <span className="ml-2 text-red-600">Expired</span>
                )}
                {isAlmostExpired(promo.validUntil) && (
                  <span className="ml-2 text-yellow-600">Expiring soon</span>
                )}
              </p>
              {promo.maxUses && (
                <p>
                  Uses: {promo.currentUses} / {promo.maxUses}
                  {promo.currentUses >= promo.maxUses && (
                    <span className="ml-2 text-red-600">Limit reached</span>
                  )}
                </p>
              )}
            </div>
            {/* Edit/Delete Buttons */}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => handleEdit(promo)}
                className="p-2 text-gray-600 hover:text-[#c1902f]"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDelete(promo.code)}
                className="p-2 text-gray-600 hover:text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions to check expiry
function isExpired(validUntil: string) {
  return new Date(validUntil) < new Date();
}
function isAlmostExpired(validUntil: string) {
  const daysUntilExpiry = Math.ceil(
    (new Date(validUntil).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
}
