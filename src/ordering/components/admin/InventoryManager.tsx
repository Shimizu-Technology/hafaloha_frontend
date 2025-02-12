// src/ordering/components/admin/InventoryManager.tsx
import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

import { useInventory } from '../../hooks/useInventory';

export function InventoryManager() {
  // Destructure from the new hook
  const {
    inventory,
    fetchInventory,
    updateInventoryStatus,
    loading,
    error,
  } = useInventory();

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleStatusChange = (
    itemId: string,
    inStock: boolean,
    lowStock: boolean
  ) => {
    updateInventoryStatus(itemId, { inStock, lowStock });
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto p-6">Loading inventory…</div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-red-600">
        Error loading inventory: {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Inventory Management</h2>

      <div className="grid gap-6">
        {Object.values(inventory).map((item) => (
          <div key={item.itemId} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">{item.itemId}</h3>
                <div className="flex items-center mt-2">
                  {item.inStock ? (
                    item.lowStock ? (
                      <span className="flex items-center text-yellow-600">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        In Stock
                      </span>
                    )
                  ) : (
                    <span className="flex items-center text-red-600">
                      <XCircle className="h-5 w-5 mr-2" />
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              <div className="space-x-2">
                <button
                  onClick={() => handleStatusChange(item.itemId, true, false)}
                  className={`px-4 py-2 rounded-md ${
                    item.inStock && !item.lowStock
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-green-50'
                  }`}
                >
                  In Stock
                </button>
                <button
                  onClick={() => handleStatusChange(item.itemId, true, true)}
                  className={`px-4 py-2 rounded-md ${
                    item.lowStock
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-yellow-50'
                  }`}
                >
                  Low Stock
                </button>
                <button
                  onClick={() => handleStatusChange(item.itemId, false, false)}
                  className={`px-4 py-2 rounded-md ${
                    !item.inStock
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-red-50'
                  }`}
                >
                  Out of Stock
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
