import { apiClient } from '../apiClient';

// Option group inventory configuration parameters
export interface OptionGroupInventoryConfig {
  enable_option_inventory: boolean;
  low_stock_threshold?: number;
  tracking_priority?: number;
}

// Option group inventory status response
export interface OptionGroupInventoryStatus {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  enable_option_inventory: boolean;
  low_stock_threshold: number;
  tracking_priority: number;
  total_available_stock: number;
  has_low_stock_options: boolean;
  all_options_out_of_stock: boolean;
  options: Array<{
    id: number;
    name: string;
    stock_quantity: number;
    damaged_quantity: number;
    available_quantity: number;
    available: boolean;
  }>;
}

export const optionGroupsApi = {
  // Configure inventory settings for an option group
  configureInventory: async (id: number, config: OptionGroupInventoryConfig): Promise<void> => {
    await apiClient.patch(`/api/admin/option_groups/${id}/configure_inventory`, { option_group: config });
  },

  // Get inventory status for an option group
  getInventoryStatus: async (id: number): Promise<OptionGroupInventoryStatus> => {
    const response = await apiClient.get(`/api/admin/option_groups/${id}/inventory_status`);
    return response.data;
  },

  // Get all option groups for a menu item with inventory status
  getForMenuItem: async (menuItemId: number): Promise<OptionGroupInventoryStatus[]> => {
    const response = await apiClient.get(`/api/admin/menu_items/${menuItemId}/option_groups/inventory_status`);
    return response.data;
  },
}; 