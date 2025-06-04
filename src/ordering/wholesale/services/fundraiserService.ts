// src/ordering/wholesale/services/fundraiserService.ts

import axios from 'axios';
import { config } from '../../../shared/config';
import { getRequestHeaders, getRequestParams } from '../../../shared/utils/authUtils';

// Types
export interface Fundraiser {
  id: number;
  restaurant_id: number;
  name: string;
  slug: string;
  description: string;
  banner_image_url: string;
  active: boolean;
  featured: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  fundraiser_participants?: FundraiserParticipant[];
  fundraiser_items?: FundraiserItem[];
  // For file uploads - not stored in the database
  image?: File;
}

export interface FundraiserParticipant {
  id: number;
  fundraiser_id: number;
  name: string;
  team: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FundraiserItem {
  id: number;
  fundraiser_id: number;
  name: string;
  description: string;
  // Custom properties for customizations support
  customizations?: Record<string, string[]>;
  customizationPrices?: Record<string, number>;
  basePrice?: number;
  price: number;
  image_url?: string;
  category?: string;
  enable_stock_tracking?: boolean;
  stock_quantity?: number;
  available_quantity?: number;
  low_stock: boolean;
  out_of_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface FundraiserListResponse {
  fundraisers: Fundraiser[];
  meta: {
    total_count: number;
    total_pages: number;
    current_page: number;
    per_page: number;
  };
}

export interface FundraiserParams {
  page?: number;
  per_page?: number;
  active?: boolean;
  featured?: boolean;
  current?: boolean;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

// API service
const fundraiserService = {
  // Get all fundraisers with optional filtering
  getFundraisers: async (params: FundraiserParams = {}): Promise<FundraiserListResponse> => {
    const requestParams = getRequestParams(params);
    const headers = getRequestHeaders();
    const response = await axios.get(`${config.apiBaseUrl}/api/wholesale/fundraisers`, { 
      params: requestParams,
      headers
    });
    return response.data;
  },

  // Get a specific fundraiser by ID
  getFundraiser: async (id: number): Promise<Fundraiser> => {
    const headers = getRequestHeaders();
    const response = await axios.get(`${config.apiBaseUrl}/api/wholesale/fundraisers/${id}`, { headers });
    return response.data;
  },

  // Get a specific fundraiser by slug
  getFundraiserBySlug: async (slug: string): Promise<Fundraiser> => {
    const headers = getRequestHeaders();
    const params = getRequestParams();
    const response = await axios.get(`${config.apiBaseUrl}/api/wholesale/fundraisers/by_slug/${slug}`, { 
      headers,
      params
    });
    return response.data;
  },

  // Create a new fundraiser
  createFundraiser: async (fundraiserData: Partial<Fundraiser>): Promise<Fundraiser> => {
    const headers = getRequestHeaders();
    const restaurantId = getRequestParams().restaurant_id;
    
    // Ensure restaurant_id is set in the fundraiser data
    const enhancedData = {
      ...fundraiserData,
      restaurant_id: fundraiserData.restaurant_id || restaurantId
    };
    
    // Check if there's a file to upload
    if (enhancedData.image instanceof File) {
      // Use FormData for file uploads
      const formData = new FormData();
      
      // Add all fundraiser data except the image to formData
      Object.entries(enhancedData).forEach(([key, value]) => {
        if (key !== 'image' && key !== 'banner_image_url' && value !== undefined) {
          formData.append(`fundraiser[${key}]`, value as string);
        }
      });
      
      // Add the image file
      formData.append('fundraiser[image]', enhancedData.image);
      
      // Use multipart/form-data content type for file uploads
      const uploadHeaders = {
        ...headers,
        'Content-Type': 'multipart/form-data'
      };
      
      const response = await axios.post(
        `${config.apiBaseUrl}/api/wholesale/fundraisers`,
        formData,
        { headers: uploadHeaders }
      );
      return response.data;
    } else {
      // Regular JSON request without file
      const response = await axios.post(
        `${config.apiBaseUrl}/api/wholesale/fundraisers`, 
        { fundraiser: enhancedData },
        { headers }
      );
      return response.data;
    }
  },

  // Update an existing fundraiser
  updateFundraiser: async (id: number, fundraiserData: Partial<Fundraiser>): Promise<Fundraiser> => {
    const headers = getRequestHeaders();
    const restaurantId = getRequestParams().restaurant_id;
    
    // Ensure restaurant_id is preserved in the fundraiser data
    const enhancedData = {
      ...fundraiserData,
      restaurant_id: fundraiserData.restaurant_id || restaurantId
    };
    
    // Check if there's a file to upload
    if (enhancedData.image instanceof File) {
      // Use FormData for file uploads
      const formData = new FormData();
      
      // Add all fundraiser data except the image to formData
      Object.entries(enhancedData).forEach(([key, value]) => {
        if (key !== 'image' && key !== 'banner_image_url' && value !== undefined) {
          formData.append(`fundraiser[${key}]`, value as string);
        }
      });
      
      // Add the image file
      formData.append('fundraiser[image]', enhancedData.image);
      
      // Use multipart/form-data content type for file uploads
      const uploadHeaders = {
        ...headers,
        'Content-Type': 'multipart/form-data'
      };
      
      const response = await axios.put(
        `${config.apiBaseUrl}/api/wholesale/fundraisers/${id}`,
        formData,
        { headers: uploadHeaders }
      );
      return response.data;
    } else {
      // Regular JSON request without file
      const response = await axios.put(
        `${config.apiBaseUrl}/api/wholesale/fundraisers/${id}`, 
        { fundraiser: enhancedData },
        { headers }
      );
      return response.data;
    }
  },

  // Delete a fundraiser
  deleteFundraiser: async (id: number): Promise<void> => {
    const headers = getRequestHeaders();
    await axios.delete(`${config.apiBaseUrl}/api/wholesale/fundraisers/${id}`, { headers });
  },

  // Get participants for a specific fundraiser
  getParticipants: async (fundraiserId: number): Promise<FundraiserParticipant[]> => {
    const headers = getRequestHeaders();
    const params = getRequestParams();
    const response = await axios.get(
      `${config.apiBaseUrl}/api/wholesale/fundraisers/${fundraiserId}/participants`,
      { headers, params }
    );
    return response.data.participants;
  },

  // Get items for a specific fundraiser
  getItems: async (fundraiserId: number): Promise<FundraiserItem[]> => {
    const headers = getRequestHeaders();
    const params = getRequestParams();
    const response = await axios.get(
      `${config.apiBaseUrl}/api/wholesale/fundraisers/${fundraiserId}/items`,
      { headers, params }
    );
    return response.data.items;
  }
};

export default fundraiserService;
