// src/shared/utils/authUtils.ts

/**
 * Utility functions for authentication and tenant context management
 */

import { config } from '../config';

/**
 * Get the authentication header for API requests
 * @returns The Authorization header object or empty object if no token
 */
export const getAuthHeader = (): { Authorization?: string } => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get the current restaurant ID from local storage
 * @returns The restaurant ID or undefined if not available
 */
export const getRestaurantId = (): number | undefined => {
  const restaurantId = localStorage.getItem('restaurantId');
  return restaurantId ? parseInt(restaurantId, 10) : undefined;
};

/**
 * Get common headers for API requests including auth and restaurant context
 * @returns Headers object with auth and restaurant context
 */
export const getRequestHeaders = () => {
  const headers: Record<string, string> = {};
  
  // Add authentication token if available
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add restaurant context if available
  const restaurantId = getRestaurantId();
  if (restaurantId) {
    headers['X-Restaurant-ID'] = restaurantId.toString();
  }
  
  return headers;
};

/**
 * Get common parameters for API requests including restaurant context
 * @param additionalParams Additional parameters to include
 * @returns Parameters object with restaurant context
 */
export const getRequestParams = (additionalParams: Record<string, any> = {}) => {
  const params: Record<string, any> = { ...additionalParams };
  
  // Add restaurant context if available
  const restaurantId = getRestaurantId();
  if (restaurantId) {
    params.restaurant_id = restaurantId;
  }
  
  return params;
};
