// src/shared/api/endpoints/vipCodes.ts

import { api } from '../apiClient';

/**
 * Fetch all VIP codes for a restaurant
 */
export const getVipCodes = async (eventId?: number, options?: { include_archived?: boolean }) => {
  const params: any = {};
  
  if (options?.include_archived) {
    params.include_archived = options.include_archived;
  }
  
  return api.get(`/vip_access/codes`, params);
};

/**
 * Generate individual VIP codes
 */
export const generateIndividualCodes = async (params: {
  count: number;
  name?: string;
  prefix?: string;
  max_uses?: number | null;
}) => {
  return api.post('/vip_access/generate_codes', {
    ...params,
    batch: true
  });
};

/**
 * Generate a group VIP code
 */
export const generateGroupCode = async (params: {
  name?: string;
  prefix?: string;
  max_uses?: number | null;
}) => {
  return api.post('/vip_access/generate_codes', {
    ...params,
    batch: false
  });
};

/**
 * Deactivate a VIP code
 */
export const deactivateVipCode = async (id: number) => {
  return api.delete(`/vip_access/codes/${id}`);
};

/**
 * Reactivate a VIP code
 */
export const reactivateVipCode = async (id: number) => {
  return api.patch(`/vip_access/codes/${id}`, { is_active: true });
};

/**
 * Update a VIP code
 */
export const updateVipCode = async (id: number, data: any) => {
  return api.patch(`/vip_access/codes/${id}`, data);
};

/**
 * Archive a VIP code
 */
export const archiveVipCode = async (id: number) => {
  return api.post(`/vip_access/codes/${id}/archive`);
};

/**
 * Unarchive a VIP code
 */
export const unarchiveVipCode = async (id: number) => {
  return api.patch(`/vip_access/codes/${id}`, { archived: false });
};

/**
 * Get usage details for a VIP code
 */
export const getCodeUsage = async (id: number) => {
  return api.get(`/vip_access/codes/${id}/usage`);
};

/**
 * Validate a VIP code
 */
export const validateVipCode = async (code: string, restaurantId: number) => {
  return api.post(`/restaurants/${restaurantId}/vip_access/validate_code`, { code });
};
