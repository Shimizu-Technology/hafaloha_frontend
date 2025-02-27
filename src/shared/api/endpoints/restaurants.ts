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
