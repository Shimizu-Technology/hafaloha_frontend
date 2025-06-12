import { apiClient } from '../apiClient';

// Option inventory update parameters
export interface OptionStockUpdate {
  stock_quantity: number;
  reason_type: 'restock' | 'adjustment' | 'other';
  reason_details?: string;
}

// Mark option as damaged parameters
export interface MarkOptionAsDamaged {
  quantity: number;
  reason: string;
}

// Option stock audit record
export interface OptionStockAudit {
  id: number;
  option_id?: number;
  previous_quantity: number;
  new_quantity: number;
  quantity_change: number;
  reason: string;
  user_id?: number;
  user?: { id: number; name: string };
  order_id?: number;
  order?: { id: number; order_number: string };
  created_at: string;
  updated_at?: string;
}

export const optionsApi = {
  // Update stock quantity for an option
  updateStock: async (id: number, params: OptionStockUpdate): Promise<void> => {
    await apiClient.patch(`/api/admin/options/${id}/update_stock`, params);
  },

  // Mark option quantity as damaged
  markAsDamaged: async (id: number, params: MarkOptionAsDamaged): Promise<void> => {
    await apiClient.post(`/api/admin/options/${id}/mark_as_damaged`, params);
  },

  // Get stock audit history for an option
  getStockAudits: async (id: number): Promise<OptionStockAudit[]> => {
    const response = await apiClient.get(`/api/admin/options/${id}/stock_audits`);
    return response.data;
  },
}; 