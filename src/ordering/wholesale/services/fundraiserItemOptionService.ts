// src/ordering/wholesale/services/fundraiserItemOptionService.ts
import axios from 'axios';
import { getRequestHeaders, getRestaurantId } from '../../../shared/utils/authUtils';
import { FundraiserOptionGroup, FundraiserOption } from '../types/optionGroups';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Service for managing fundraiser item option groups and options
 */
export const fundraiserItemOptionService = {
  /**
   * Get all option groups for a fundraiser item
   * @param itemId - Fundraiser item ID
   * @param fundraiserId - Fundraiser ID
   * @returns Promise with option groups
   */
  getOptionGroups: async (itemId: number, fundraiserId: number): Promise<FundraiserOptionGroup[]> => {
    try {
      console.log(`[fundraiserItemOptionService] Getting option groups for itemId: ${itemId}, fundraiserId: ${fundraiserId}`);
      
      // Use the shared auth utility to get proper headers including authentication
      const headers = getRequestHeaders();
      
      // Include restaurant_id as query parameter for backend filtering
      const params: Record<string, any> = {};
      const restaurantId = getRestaurantId();
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      const url = `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}/option_groups`;
      console.log(`[fundraiserItemOptionService] API URL: ${url}`);
      console.log(`[fundraiserItemOptionService] Headers:`, headers);
      console.log(`[fundraiserItemOptionService] Params:`, params);
      
      const response = await axios.get(url, { headers, params });
      console.log(`[fundraiserItemOptionService] Response status: ${response.status}`);
      console.log(`[fundraiserItemOptionService] Response data:`, response.data);
      return response.data;
    } catch (error) {
      console.error('[fundraiserItemOptionService] Error fetching option groups:', error);
      if (axios.isAxiosError(error)) {
        console.error(`[fundraiserItemOptionService] Status: ${error.response?.status}, Message: ${error.message}`);
        console.error(`[fundraiserItemOptionService] Response data:`, error.response?.data);
      }
      
      // Return empty array instead of throwing to avoid breaking the UI
      return [];
    }
  },

  /**
   * Get a specific option group for a fundraiser item
   * @param itemId - Fundraiser item ID
   * @param groupId - Option group ID
   * @param fundraiserId - Fundraiser ID
   * @returns Promise with the option group
   */
  getOptionGroup: async (itemId: number, groupId: number, fundraiserId: number): Promise<FundraiserOptionGroup> => {
    try {
      const headers = getRequestHeaders();
      
      // Include restaurant_id as query parameter for backend filtering
      const params: Record<string, any> = {};
      const restaurantId = getRestaurantId();
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      const response = await axios.get(
        `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}/option_groups/${groupId}`,
        { headers, params }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching option group ${groupId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new option group for a fundraiser item
   * @param itemId - Fundraiser item ID
   * @param optionGroup - Option group data
   * @param fundraiserId - Fundraiser ID
   * @returns Promise with the created option group
   */
  createOptionGroup: async (itemId: number, optionGroup: Partial<FundraiserOptionGroup>, fundraiserId: number, options?: Partial<FundraiserOption>[]): Promise<FundraiserOptionGroup> => {
    try {
      const headers = getRequestHeaders();
      
      // Include restaurant_id as query parameter for backend filtering
      const params: Record<string, any> = {};
      const restaurantId = getRestaurantId();
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      // We're explicitly separating the options from the option group data
      // This matches the controller's expected structure exactly
      const payload: {
        fundraiser_item_option_group: {
          name?: string;
          min_select?: number;
          max_select?: number;
          free_option_count?: number;
        };
        options?: Partial<FundraiserOption>[];
      } = {
        // Only pass core option group attributes, not options
        fundraiser_item_option_group: {
          name: optionGroup.name,
          min_select: optionGroup.min_select,
          max_select: optionGroup.max_select,
          free_option_count: optionGroup.free_option_count
        }
      };
      
      // Only add options if they exist
      if (options && options.length > 0) {
        payload.options = options;
      }
      
      const response = await axios.post(
        `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}/option_groups`,
        payload,
        { headers, params }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating option group:', error);
      throw error;
    }
  },

  /**
   * Update an option group for a fundraiser item
   * @param itemId - Fundraiser item ID
   * @param groupId - Option group ID
   * @param optionGroup - Updated option group data
   * @param fundraiserId - Fundraiser ID
   * @returns Promise with the updated option group
   */
  updateOptionGroup: async (itemId: number, groupId: number, optionGroup: Partial<FundraiserOptionGroup>, fundraiserId: number): Promise<FundraiserOptionGroup> => {
    try {
      const headers = getRequestHeaders();
      
      // Include restaurant_id as query parameter for backend filtering
      const params: Record<string, any> = {};
      const restaurantId = getRestaurantId();
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      const response = await axios.patch(
        `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}/option_groups/${groupId}`,
        { fundraiser_item_option_group: optionGroup },
        { headers, params }
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating option group ${groupId}:`, error);
      throw error;
    }
  },

  /**
   * Delete an option group from a fundraiser item
   * @param itemId - Fundraiser item ID
   * @param groupId - Option group ID
   * @param fundraiserId - Fundraiser ID
   * @returns Promise with the deletion result
   */
  deleteOptionGroup: async (itemId: number, groupId: number, fundraiserId: number): Promise<void> => {
    try {
      const headers = getRequestHeaders();
      
      // Include restaurant_id as query parameter for backend filtering
      const params: Record<string, any> = {};
      const restaurantId = getRestaurantId();
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      await axios.delete(
        `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}/option_groups/${groupId}`,
        { headers, params }
      );
    } catch (error) {
      console.error(`Error deleting option group ${groupId}:`, error);
      throw error;
    }
  },

  /**
   * Get all options for a fundraiser item option group
   * @param itemId - Fundraiser item ID
   * @param groupId - Option group ID
   * @param fundraiserId - Fundraiser ID
   * @returns Promise with options
   */
  getOptions: async (itemId: number, groupId: number, fundraiserId: number): Promise<FundraiserOption[]> => {
    try {
      const headers = getRequestHeaders();
      
      // Include restaurant_id as query parameter for backend filtering
      const params: Record<string, any> = {};
      const restaurantId = getRestaurantId();
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      const response = await axios.get(
        `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}/option_groups/${groupId}/options`,
        { headers, params }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching options for group ${groupId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new option for a fundraiser item option group
   * @param itemId - Fundraiser item ID
   * @param groupId - Option group ID
   * @param option - Option data
   * @param fundraiserId - Fundraiser ID
   * @returns Promise with the created option
   */
  createOption: async (itemId: number, groupId: number, option: Partial<FundraiserOption>, fundraiserId: number): Promise<FundraiserOption> => {
    try {
      const headers = getRequestHeaders();
      
      // Include restaurant_id as query parameter for backend filtering
      const params: Record<string, any> = {};
      const restaurantId = getRestaurantId();
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      const response = await axios.post(
        `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}/option_groups/${groupId}/options`,
        { option: option },
        { headers, params }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating option:', error);
      throw error;
    }
  },

  /**
   * Update an option for a fundraiser item option group
   * @param itemId - Fundraiser item ID
   * @param groupId - Option group ID
   * @param optionId - Option ID
   * @param option - Updated option data
   * @param fundraiserId - Fundraiser ID
   * @returns Promise with the updated option
   */
  updateOption: async (
    itemId: number,
    groupId: number,
    optionId: number,
    option: Partial<FundraiserOption>,
    fundraiserId: number
  ): Promise<FundraiserOption> => {
    try {
      const headers = getRequestHeaders();
      
      // Include restaurant_id as query parameter for backend filtering
      const params: Record<string, any> = {};
      const restaurantId = getRestaurantId();
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      const response = await axios.patch(
        `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}/option_groups/${groupId}/options/${optionId}`,
        { option: option },
        { headers, params }
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating option ${optionId}:`, error);
      throw error;
    }
  },

  /**
   * Delete an option from a fundraiser item option group
   * @param itemId - Fundraiser item ID
   * @param groupId - Option group ID
   * @param optionId - Option ID
   * @param fundraiserId - Fundraiser ID
   * @returns Promise with the deletion result
   */
  deleteOption: async (itemId: number, groupId: number, optionId: number, fundraiserId: number): Promise<void> => {
    try {
      const headers = getRequestHeaders();
      
      // Include restaurant_id as query parameter for backend filtering
      const params: Record<string, any> = {};
      const restaurantId = getRestaurantId();
      if (restaurantId) {
        params.restaurant_id = restaurantId;
      }
      
      await axios.delete(
        `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}/option_groups/${groupId}/options/${optionId}`,
        { headers, params }
      );
    } catch (error) {
      console.error(`Error deleting option ${optionId}:`, error);
      throw error;
    }
  }
};

export default fundraiserItemOptionService;
