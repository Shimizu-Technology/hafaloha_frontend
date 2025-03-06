// src/shared/api/endpoints/vipAccess.ts

import { api } from '../apiClient';

interface VipCodeValidationResponse {
  valid: boolean;
  message?: string;
}

/**
 * Validates a VIP access code with the restaurant's server
 * @param restaurantId The ID of the restaurant
 * @param code The VIP code to validate
 * @returns Response indicating if the code is valid and a message if applicable
 */
export const validateVipCode = async (restaurantId: number, code: string): Promise<VipCodeValidationResponse> => {
  return api.post<VipCodeValidationResponse>(`/restaurants/${restaurantId}/vip_access/validate_code`, { code });
};
