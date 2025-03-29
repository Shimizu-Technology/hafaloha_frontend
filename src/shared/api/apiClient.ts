// src/shared/api/apiClient.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { isTokenExpired, getRestaurantId } from '../utils/jwt';
import { config } from '../config';
import { useAuthStore } from '../auth/authStore';

// Get base URL from config
const API_BASE_URL = config.apiBaseUrl;

// Endpoints that require restaurant_id parameter for ordering
const ORDERING_RESTAURANT_CONTEXT_ENDPOINTS = [
  'availability',
  'menus',
  'categories',
  'menu_items',
  'option_groups',
  'options',
  'promo_codes'
];

// Endpoints that require restaurant_id parameter for reservations
const RESERVATIONS_RESTAURANT_CONTEXT_ENDPOINTS = [
  'availability',
  'layouts',
  'reservations',
  'waitlist_entries',
  'seat_allocations'
];

// Combine all endpoints that need restaurant context
const RESTAURANT_CONTEXT_ENDPOINTS = [
  ...ORDERING_RESTAURANT_CONTEXT_ENDPOINTS,
  ...RESERVATIONS_RESTAURANT_CONTEXT_ENDPOINTS
];

// Helper to check if an endpoint needs restaurant context
const needsRestaurantContext = (endpoint: string): boolean => {
  return RESTAURANT_CONTEXT_ENDPOINTS.some(e => endpoint.includes(e));
};

// Create an Axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Add request interceptor to handle authentication and restaurant context
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  
  // Check token expiration
  if (token) {
    if (isTokenExpired(token)) {
      // Only logout if we're not already on the login page
      const isLoginPage = window.location.pathname.includes('/login');
      
      if (!isLoginPage) {
        // Token is expired, clear auth state and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Use the auth store to logout
        const authStore = useAuthStore.getState();
        authStore.logout();
      } else {
        // Just clear the token without redirecting
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      // Reject the request
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    
    // Add token to headers
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Add restaurant_id to params for endpoints that need it, regardless of authentication
  if (config.url && needsRestaurantContext(config.url)) {
    // Get restaurant ID from token if available, otherwise use default
    const restaurantId = token ? getRestaurantId(token) : null;
    const defaultId = import.meta.env.VITE_RESTAURANT_ID || '1';
    const finalRestaurantId = restaurantId || defaultId;
    
    if (finalRestaurantId) {
      config.params = config.params || {};
      if (!config.params.restaurant_id) {
        config.params.restaurant_id = finalRestaurantId;
      }
    }
  }
  
  return config;
});

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    // Handle 401 Unauthorized (expired token)
    if (error.response && error.response.status === 401) {
      // Check if this is a VIP validation request
      const isVipValidation = error.config?.url?.includes('/vip_access/validate_code');
      
      // Only proceed with logout if it's not a VIP validation and we're not on login page
      if (!isVipValidation) {
        const token = localStorage.getItem('token');
        const isLoginPage = window.location.pathname.includes('/login');
        
        if (token && !isLoginPage) {
          // Clear auth state and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Use the auth store to logout
          const authStore = useAuthStore.getState();
          authStore.logout();
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Export the axios instance
export const apiClient = axiosInstance;

// Helper function to extract data from response
export const extractData = <T>(response: AxiosResponse<T>): T => {
  return response.data;
};

// Generic API functions
export const api = {
  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: any): Promise<T> {
    const response = await apiClient.get<T>(endpoint, { params });
    return response.data;
  },
  
  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await apiClient.post<T>(endpoint, data);
    return response.data;
  },
  
  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await apiClient.patch<T>(endpoint, data);
    return response.data;
  },
  
  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await apiClient.delete<T>(endpoint);
    return response.data;
  },
  
  /**
   * Upload file
   */
  async upload<T>(endpoint: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST'): Promise<T> {
    const response = await apiClient({
      method,
      url: endpoint,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};
