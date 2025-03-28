import { api } from '../index';
import { MenuOption, OptionInventoryUpdate, OptionStockAudit } from '../../../ordering/types/menu';

export const optionsApi = {
  /**
   * Update an option's inventory settings
   */
  updateInventory: async (optionId: number, data: OptionInventoryUpdate): Promise<MenuOption> => {
    return api.patch<MenuOption>(`/options/${optionId}/update_inventory`, { option: data });
  },

  /**
   * Get stock audit history for an option
   */
  getStockAudits: async (optionId: number): Promise<OptionStockAudit[]> => {
    return api.get<OptionStockAudit[]>(`/options/${optionId}/stock_audits`);
  },

  /**
   * Mark option items as damaged
   */
  markAsDamaged: async (optionId: number, quantity: number, reason: string): Promise<MenuOption> => {
    return api.post<MenuOption>(`/options/${optionId}/mark_as_damaged`, {
      quantity,
      reason
    });
  }
};