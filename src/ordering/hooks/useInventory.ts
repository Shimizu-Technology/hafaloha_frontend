// src/ordering/hooks/useInventory.ts
import { useState, useCallback } from 'react';
import { useOrderingApi } from './useOrderingApi';

export interface InventoryStatus {
  itemId: string;
  inStock: boolean;
  lowStock?: boolean;
  quantity?: number;
}

export function useInventory() {
  const { get, patch } = useOrderingApi();
  const [inventory, setInventory] = useState<Record<string, InventoryStatus>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GET /inventory_status
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list: InventoryStatus[] = await get('/inventory_status');
      const record: Record<string, InventoryStatus> = {};
      list.forEach((inv) => {
        record[inv.itemId] = inv;
      });
      setInventory(record);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  // PATCH /inventory_status/:itemId
  const updateInventoryStatus = useCallback(
    async (itemId: string, status: Partial<InventoryStatus>) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await patch(`/inventory_status/${itemId}`, status);
        setInventory((prev) => ({
          ...prev,
          [itemId]: { ...prev[itemId], ...updated },
        }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [patch]
  );

  return {
    inventory,
    loading,
    error,
    fetchInventory,
    updateInventoryStatus,
  };
}
