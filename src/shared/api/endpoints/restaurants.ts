// src/shared/api/endpoints/restaurants.ts

import { api } from '../apiClient';

/**
 * Fetch a specific restaurant by ID
 */
export const fetchRestaurant = async (id: number) => {
  return api.get(`/restaurants/${id}`);
};

/**
 * Fetch all restaurants
 */
export const fetchRestaurants = async () => {
  return api.get('/restaurants');
};

/**
 * Update a restaurant
 */
export const updateRestaurant = async (id: number, data: any) => {
  return api.patch(`/restaurants/${id}`, data);
};

/**
 * Upload restaurant images
 */
export const uploadRestaurantImages = async (id: number, formData: FormData) => {
  return api.upload(`/restaurants/${id}`, formData, 'PATCH');
};

/**
 * Fetch restaurant settings
 */
export const fetchRestaurantSettings = async (id: number) => {
  return api.get(`/restaurants/${id}/settings`);
};

/**
 * Update restaurant settings
 */
export const updateRestaurantSettings = async (id: number, data: any) => {
  return api.patch(`/restaurants/${id}/settings`, data);
};

/**
 * Toggle VIP-only mode for a restaurant
 */
export const toggleVipMode = async (id: number, enabled: boolean) => {
  return api.patch(`/restaurants/${id}/toggle_vip_mode`, { vip_only_mode: enabled });
  // Note: The backend expects vip_only_mode parameter but internally maps it to vip_enabled
};
