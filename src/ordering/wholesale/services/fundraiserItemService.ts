// src/ordering/wholesale/services/fundraiserItemService.ts

import axios from 'axios';
import { getRequestHeaders, getRequestParams } from '../../../shared/utils/authUtils';
import { FundraiserItem, ItemsResponse } from '../types/fundraiserItem';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const fundraiserItemService = {
  /**
   * Get all items for a fundraiser
   */
  getItems: async (fundraiserId: number, params = {}): Promise<ItemsResponse> => {
    const headers = getRequestHeaders();
    const requestParams = getRequestParams(params);
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/items`,
      { headers, params: requestParams }
    );
    
    return response.data;
  },
  
  /**
   * Get a specific item
   */
  getItem: async (fundraiserId: number, itemId: number): Promise<FundraiserItem> => {
    const headers = getRequestHeaders();
    const params = getRequestParams();
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}`,
      { headers, params }
    );
    
    return response.data;
  },
  
  /**
   * Create a new item
   */
  createItem: async (fundraiserId: number, itemData: Partial<FundraiserItem>): Promise<FundraiserItem> => {
    const headers = getRequestHeaders();
    
    const response = await axios.post(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/items`,
      itemData,
      { headers }
    );
    
    return response.data;
  },
  
  /**
   * Update an existing item
   */
  updateItem: async (fundraiserId: number, itemId: number, itemData: Partial<FundraiserItem>): Promise<FundraiserItem> => {
    const headers = getRequestHeaders();
    
    const response = await axios.put(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}`,
      itemData,
      { headers }
    );
    
    return response.data;
  },
  
  /**
   * Delete an item
   */
  deleteItem: async (fundraiserId: number, itemId: number): Promise<void> => {
    const headers = getRequestHeaders();
    
    await axios.delete(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/${itemId}`,
      { headers }
    );
  },
  
  /**
   * Get items by IDs (for cart)
   */
  getItemsByIds: async (fundraiserId: number, itemIds: number[]): Promise<FundraiserItem[]> => {
    const headers = getRequestHeaders();
    const params = getRequestParams({ ids: itemIds.join(',') });
    
    const response = await axios.get(
      `${API_URL}/wholesale/fundraisers/${fundraiserId}/items/by_ids`,
      { headers, params }
    );
    
    return response.data.items;
  }
};

export default fundraiserItemService;
