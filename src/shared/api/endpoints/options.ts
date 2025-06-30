import { apiClient } from '../apiClient';

export interface OptionInventoryStatus {
  inventory_tracking_enabled: boolean;
  stock_quantity: number;
  damaged_quantity: number;
  available_stock: number;
  in_stock: boolean;
  out_of_stock: boolean;
  low_stock: boolean;
}

export interface UpdateIndividualOptionStockParams {
  stock_quantity: number;
  reason?: string;
}

export interface MarkOptionDamagedParams {
  quantity: number;
  reason: string;
}

export interface RestockOptionParams {
  quantity: number;
  reason?: string;
}

export interface OptionAuditEntry {
  id: number;
  option_id: number;
  action: string;
  quantity_before: number;
  quantity_after: number;
  damaged_before?: number;
  damaged_after?: number;
  reason?: string;
  user_name?: string;
  created_at: string;
  order_id?: number;
}

export interface BatchUpdateOptionsParams {
  option_ids: number[];
  updates: {
    is_available?: boolean;
    additional_price?: number;
    name?: string;
    is_preselected?: boolean;
  };
}

export interface BatchUpdatePositionsParams {
  positions: Array<{
    id: number;
    position: number;
  }>;
}

export const optionsApi = {
  /**
   * Get inventory status for an individual option
   */
  getInventoryStatus: async (optionId: number): Promise<OptionInventoryStatus> => {
    const response = await apiClient.get(`/options/${optionId}/inventory_status`);
    return response.data;
  },

  /**
   * Update stock quantity for an individual option
   */
  updateStock: async (
    optionId: number,
    params: UpdateIndividualOptionStockParams
  ): Promise<{ 
    success: boolean; 
    message: string; 
    option: any; 
  }> => {
    const response = await apiClient.patch(`/options/${optionId}/update_stock`, params);
    return response.data;
  },

  /**
   * Mark an individual option as damaged
   */
  markDamaged: async (
    optionId: number,
    params: MarkOptionDamagedParams
  ): Promise<{ 
    success: boolean; 
    message: string; 
    option: any; 
  }> => {
    const response = await apiClient.post(`/options/${optionId}/mark_damaged`, params);
    return response.data;
  },

  /**
   * Restock an individual option
   */
  restock: async (
    optionId: number,
    params: RestockOptionParams
  ): Promise<{ 
    success: boolean; 
    message: string; 
    option: any; 
  }> => {
    const response = await apiClient.post(`/options/${optionId}/restock`, params);
    return response.data;
  },

  /**
   * Get audit history for an individual option
   */
  getAuditHistory: async (
    optionId: number,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<OptionAuditEntry[]> => {
    const response = await apiClient.get(`/options/${optionId}/audit_history`, { params });
    return response.data;
  },

  /**
   * Batch update multiple options
   */
  batchUpdate: async (params: BatchUpdateOptionsParams): Promise<{ 
    success: boolean; 
    message: string; 
  }> => {
    const response = await apiClient.patch('/options/batch_update', params);
    return response.data;
  },

  /**
   * Batch update option positions
   */
  batchUpdatePositions: async (params: BatchUpdatePositionsParams): Promise<{ 
    success: boolean; 
    message: string; 
  }> => {
    const response = await apiClient.patch('/options/batch_update_positions', params);
    return response.data;
  }
}; 