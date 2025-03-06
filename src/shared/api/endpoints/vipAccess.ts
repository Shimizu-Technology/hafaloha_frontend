import { api } from '../apiClient';

interface VipCodeValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validates a VIP access code for a restaurant
 * @param restaurantId The ID of the restaurant
 * @param code The VIP code to validate
 * @returns A promise that resolves to a validation result
 */
export const validateVipCode = async (
  restaurantId: number,
  code: string
): Promise<VipCodeValidationResult> => {
  try {
    const response = await api.post<VipCodeValidationResult>(
      `/vip_access/validate?restaurant_id=${restaurantId}`,
      { code }
    );
    return response;
  } catch (error: any) {
    // If the error has a response with a message, use that
    if (error.response?.data?.message) {
      return {
        valid: false,
        message: error.response.data.message
      };
    }
    
    // Otherwise, throw the error to be handled by the caller
    throw error;
  }
};

/**
 * Generates VIP access codes for a special event
 * @param specialEventId The ID of the special event
 * @param restaurantId The ID of the restaurant (used by apiClient interceptor)
 * @param params The parameters for generating codes
 * @returns A promise that resolves to the generated codes
 */
export const generateVipCodes = async (
  specialEventId: number,
  restaurantId: number,
  params: {
    batch?: boolean;
    count?: number;
    name?: string;
    max_uses?: number | null;
  }
) => {
  try {
    return await api.post(
      `/admin/special_events/${specialEventId}/vip_access_codes`,
      params
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Gets VIP access codes for a special event
 * @param specialEventId The ID of the special event
 * @param restaurantId The ID of the restaurant (used by apiClient interceptor)
 * @returns A promise that resolves to the VIP codes
 */
export const getVipCodes = async (specialEventId: number, restaurantId: number) => {
  try {
    return await api.get(
      `/admin/special_events/${specialEventId}/vip_access_codes`
    );
  } catch (error) {
    throw error;
  }
};
