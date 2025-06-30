import { apiClient } from '../apiClient';
import { OptionGroup } from '../../../ordering/types/menu';

export interface EnableInventoryTrackingParams {
  menu_item_id: number;
}

export interface UpdateOptionQuantitiesParams {
  quantities: Record<string, number>; // optionId -> quantity
}

export interface UpdateOptionStockParams {
  operation: 'add' | 'remove';
  quantity: number;
  reason: string;
  details?: string;
}

export interface OptionGroupInventoryStatus {
  option_group: OptionGroup;
  total_stock: number;
  total_damaged: number;
  options_summary: Array<{
    option_id: number;
    name: string;
    stock_quantity: number;
    damaged_quantity: number;
    available_quantity: number;
  }>;
}

export interface OptionStockAudit {
  id: number;
  option_id: number;
  option_name: string;
  action: string;
  quantity_before: number;
  quantity_after: number;
  damaged_before?: number;
  damaged_after?: number;
  reason?: string;
  user_name?: string;
  created_at: string;
}

export interface UpdatedMenuItem {
  id: string;
  name: string;
  stock_quantity: number;
  // Add other MenuItem properties as needed
}

export interface UpdatededOption {
  id: number;
  name: string;
  stock_quantity: number;
  damaged_quantity?: number;
  // Add other Option properties as needed
}

export const optionGroupsApi = {
  /**
   * Enable inventory tracking for an option group
   */
  enableInventoryTracking: async (
    optionGroupId: number, 
    params: EnableInventoryTrackingParams
  ): Promise<{ success: boolean; message: string; option_group: OptionGroup }> => {
    const response = await apiClient.post(
      `/option_groups/${optionGroupId}/enable_inventory_tracking`,
      params
    );
    return response.data;
  },

  /**
   * Disable inventory tracking for an option group
   */
  disableInventoryTracking: async (
    optionGroupId: number
  ): Promise<{ success: boolean; message: string; option_group: OptionGroup }> => {
    const response = await apiClient.delete(
      `/option_groups/${optionGroupId}/disable_inventory_tracking`
    );
    return response.data;
  },

  /**
   * Update option quantities for an option group
   */
  updateOptionQuantities: async (
    optionGroupId: number,
    params: UpdateOptionQuantitiesParams
  ): Promise<{ 
    success: boolean; 
    message: string; 
    option_group: OptionGroup;
    menu_item: UpdatedMenuItem; // Updated menu item with new totals
  }> => {
    const response = await apiClient.patch(
      `/option_groups/${optionGroupId}/update_option_quantities`,
      params
    );
    return response.data;
  },

  /**
   * Mark options as damaged
   */
  markOptionsDamaged: async (
    optionGroupId: number,
    params: {
      option_damages: Array<{
        option_id: number;
        quantity: number;
        reason: string;
      }>;
    }
  ): Promise<{ 
    success: boolean; 
    message: string; 
    option_group: OptionGroup;
  }> => {
    const response = await apiClient.patch(
      `/option_groups/${optionGroupId}/mark_options_damaged`,
      params
    );
    return response.data;
  },

  /**
   * Get inventory status for an option group
   */
  getInventoryStatus: async (
    optionGroupId: number
  ): Promise<OptionGroupInventoryStatus> => {
    const response = await apiClient.get(
      `/option_groups/${optionGroupId}/inventory_status`
    );
    return response.data;
  },

  /**
   * Get audit history for an option group
   */
  getAuditHistory: async (
    optionGroupId: number,
    params?: {
      limit?: number;
      offset?: number;
      option_id?: number;
    }
  ): Promise<OptionStockAudit[]> => {
    const response = await apiClient.get(
      `/option_groups/${optionGroupId}/audit_history`,
      { params }
    );
    return response.data;
  },

  /**
   * Update individual option stock - FE-004 Implementation
   */
  updateOptionStock: async (
    optionId: number,
    params: UpdateOptionStockParams
  ): Promise<{ 
    success: boolean; 
    message: string; 
    data: { new_quantity: number; option: UpdatededOption };
  }> => {
    const response = await apiClient.patch(
      `/options/${optionId}/update_stock`,
      params
    );
    return response.data;
  }
}; 