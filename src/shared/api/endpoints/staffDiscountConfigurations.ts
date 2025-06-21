import { apiClient } from '../apiClient';

export interface StaffDiscountConfiguration {
  id: number;
  name: string;
  code: string;
  discount_percentage: number;
  discount_type: 'percentage' | 'fixed_amount';
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  description?: string;
  ui_color?: string;
  display_label: string;
}

export interface StaffDiscountConfigurationsResponse {
  staff_discount_configurations: StaffDiscountConfiguration[];
}

export const staffDiscountConfigurationsApi = {
  // Get all active discount configurations for the current restaurant
  getActiveConfigurations: async (): Promise<StaffDiscountConfiguration[]> => {
    try {
      const response = await apiClient.get<StaffDiscountConfigurationsResponse>('/staff_discount_configurations');
      return response.data.staff_discount_configurations;
    } catch (error) {
      console.error('Error fetching staff discount configurations:', error);
      throw error;
    }
  },

  // Admin endpoints for managing configurations
  getConfiguration: async (id: number): Promise<StaffDiscountConfiguration> => {
    const response = await apiClient.get<{ staff_discount_configuration: StaffDiscountConfiguration }>(`/staff_discount_configurations/${id}`);
    return response.data.staff_discount_configuration;
  },

  createConfiguration: async (data: Partial<StaffDiscountConfiguration>): Promise<StaffDiscountConfiguration> => {
    const response = await apiClient.post<{ staff_discount_configuration: StaffDiscountConfiguration }>(
      '/staff_discount_configurations',
      { staff_discount_configuration: data }
    );
    return response.data.staff_discount_configuration;
  },

  updateConfiguration: async (id: number, data: Partial<StaffDiscountConfiguration>): Promise<StaffDiscountConfiguration> => {
    const response = await apiClient.patch<{ staff_discount_configuration: StaffDiscountConfiguration }>(
      `/staff_discount_configurations/${id}`,
      { staff_discount_configuration: data }
    );
    return response.data.staff_discount_configuration;
  },

  deleteConfiguration: async (id: number): Promise<void> => {
    await apiClient.delete(`/staff_discount_configurations/${id}`);
  },
}; 