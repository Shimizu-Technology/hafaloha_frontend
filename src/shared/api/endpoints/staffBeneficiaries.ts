// src/shared/api/endpoints/staffBeneficiaries.ts
import { api } from '../apiClient';

export interface StaffBeneficiary {
  id: number;
  name: string;
  active: boolean;
  restaurant_id: number;
  created_at: string;
  updated_at: string;
}

export const staffBeneficiariesApi = {
  // Get all active staff beneficiaries
  getAll: async (): Promise<StaffBeneficiary[]> => {
    return api.get<StaffBeneficiary[]>('/staff_beneficiaries');
  },
  
  // Create a new staff beneficiary
  create: async (name: string): Promise<StaffBeneficiary> => {
    return api.post<StaffBeneficiary>('/staff_beneficiaries', { name });
  }
};
