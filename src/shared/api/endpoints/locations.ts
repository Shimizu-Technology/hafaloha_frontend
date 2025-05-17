// src/shared/api/endpoints/locations.ts

import { apiClient as api } from '../apiClient';
import { Location as LocationType, LocationPayload } from '../../types/Location';

// Re-export the Location type for easier imports
export type Location = LocationType;

const BASE_URL = '/locations';

export const locationsApi = {
  /**
   * Get all locations for the current restaurant
   * @param params Optional filter parameters
   * @returns Promise with locations array
   */
  getLocations: async (params?: { active?: boolean; restaurant_id?: number; is_active?: boolean }): Promise<Location[]> => {
    try {
      const response = await api.get(BASE_URL, { params });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  },

  /**
   * Get a specific location by ID
   * @param id Location ID
   * @returns Promise with location object
   */
  getLocation: async (id: number): Promise<Location> => {
    const response = await api.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Create a new location
   * @param location Location data
   * @returns Promise with created location
   */
  createLocation: async (location: LocationPayload): Promise<Location> => {
    const response = await api.post(BASE_URL, location);
    return response.data;
  },

  /**
   * Update an existing location
   * @param id Location ID
   * @param location Location data
   * @returns Promise with updated location
   */
  updateLocation: async (id: number, location: Partial<LocationPayload>): Promise<Location> => {
    const response = await api.patch(`${BASE_URL}/${id}`, location);
    return response.data;
  },

  /**
   * Delete a location
   * @param id Location ID
   * @returns Promise with no content
   */
  deleteLocation: async (id: number): Promise<void> => {
    await api.delete(`${BASE_URL}/${id}`);
  },

  /**
   * Set a location as the default
   * @param id Location ID
   * @returns Promise with updated location
   */
  setDefaultLocation: async (id: number): Promise<Location> => {
    const response = await api.post(`${BASE_URL}/${id}/set_default`);
    return response.data;
  }
};
