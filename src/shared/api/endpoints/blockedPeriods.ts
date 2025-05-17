// src/shared/api/endpoints/blockedPeriods.ts
import { api } from '../apiClient';
import { toast } from 'react-hot-toast';

// Types for blocked periods
export interface BlockedPeriod {
  id?: number;
  restaurant_id: number;
  location_id?: number;
  start_time: string;
  end_time: string;
  reason: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface BlockedPeriodParams {
  restaurant_id: number;
  active?: boolean;
  start_date?: string;
  end_date?: string;
  location_id?: number;
}

// API functions for blocked periods
export const blockedPeriodsApi = {
  /**
   * Get all blocked periods matching filters
   */
  getBlockedPeriods: async (params: BlockedPeriodParams): Promise<BlockedPeriod[]> => {
    try {
      console.log('Fetching blocked periods with params:', params);
      
      // Use URLSearchParams to format query parameters correctly
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      
      // Make direct request with correctly formatted URL query string
      const url = `/api/v1/blocked_periods?${searchParams.toString()}`;
      console.log('Blocked periods request URL:', url);
      
      const response = await api.get<BlockedPeriod[]>(url);
      return response || [];
    } catch (error) {
      console.error('Error fetching blocked periods:', error);
      toast.error('Failed to fetch blocked periods');
      return [];
    }
  },

  /**
   * Get a specific blocked period by ID
   */
  getBlockedPeriod: async (id: number): Promise<BlockedPeriod> => {
    try {
      const response = await api.get<BlockedPeriod>(`/api/v1/blocked_periods/${id}`);
      return response as BlockedPeriod;
    } catch (error) {
      console.error('Failed to fetch blocked period:', error);
      toast.error('Failed to fetch blocked period');
      throw error;
    }
  },

  /**
   * Create a new blocked period
   */
  createBlockedPeriod: async (data: Omit<BlockedPeriod, 'id'>): Promise<BlockedPeriod> => {
    try {
      const response = await api.post<BlockedPeriod>('/api/v1/blocked_periods', data);
      return response as BlockedPeriod;
    } catch (error) {
      console.error('Failed to create blocked period:', error);
      toast.error('Failed to create blocked period');
      throw error;
    }
  },

  /**
   * Update an existing blocked period
   */
  updateBlockedPeriod: async (id: number, data: Partial<BlockedPeriod>): Promise<BlockedPeriod> => {
    try {
      const response = await api.patch<BlockedPeriod>(`/api/v1/blocked_periods/${id}`, data);
      return response as BlockedPeriod;
    } catch (error) {
      console.error('Failed to update blocked period:', error);
      toast.error('Failed to update blocked period');
      throw error;
    }
  },

  /**
   * Delete a blocked period
   */
  deleteBlockedPeriod: async (id: number): Promise<void> => {
    try {
      await api.delete(`/api/v1/blocked_periods/${id}`);
    } catch (error) {
      console.error('Failed to delete blocked period:', error);
      toast.error('Failed to delete blocked period');
      throw error;
    }
  }
};
