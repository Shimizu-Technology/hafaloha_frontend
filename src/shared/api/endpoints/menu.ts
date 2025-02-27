// src/shared/api/endpoints/menu.ts

import { api } from '../apiClient';
import { uploadFile, objectToFormData } from '../utils';

/**
 * Fetch all menu items
 */
export const fetchMenuItems = async () => {
  return api.get('/menu_items');
};

/**
 * Fetch a specific menu item
 */
export const fetchMenuItem = async (id: number) => {
  return api.get(`/menu_items/${id}`);
};

/**
 * Create a new menu item
 */
export const createMenuItem = async (data: any) => {
  return api.post('/menu_items', data);
};

/**
 * Update an existing menu item
 */
export const updateMenuItem = async (id: number, data: any) => {
  return api.patch(`/menu_items/${id}`, data);
};

/**
 * Delete a menu item
 */
export const deleteMenuItem = async (id: number) => {
  return api.delete(`/menu_items/${id}`);
};

/**
 * Upload an image for a menu item
 */
export const uploadMenuItemImage = async (itemId: string, file: File) => {
  return uploadFile(`/menu_items/${itemId}/upload_image`, file, 'image');
};

/**
 * Create or update a menu item with image
 * This simplifies the process of creating/updating menu items with images
 */
export const saveMenuItemWithImage = async (
  data: Record<string, any>,
  imageFile?: File | null,
  itemId?: string | number
) => {
  // If there's no image file, use regular JSON request
  if (!imageFile) {
    const endpoint = itemId ? `/menu_items/${itemId}` : '/menu_items';
    
    if (itemId) {
      return api.patch(endpoint, { menu_item: data });
    } else {
      return api.post(endpoint, { menu_item: data });
    }
  }
  
  // If there is an image file, use multipart/form-data
  const formData = objectToFormData({ menu_item: data });
  formData.append('menu_item[image]', imageFile);
  
  const endpoint = itemId ? `/menu_items/${itemId}` : '/menu_items';
  const method = itemId ? 'PATCH' : 'POST';
  
  return api.upload(endpoint, formData, method);
};

/**
 * Fetch all categories
 */
export const fetchCategories = async () => {
  return api.get('/categories');
};

/**
 * Fetch all option groups
 */
export const fetchOptionGroups = async () => {
  return api.get('/option_groups');
};

/**
 * Fetch all options
 */
export const fetchOptions = async () => {
  return api.get('/options');
};
