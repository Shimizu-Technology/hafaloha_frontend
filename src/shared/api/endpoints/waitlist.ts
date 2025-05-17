// src/shared/api/endpoints/waitlist.ts

import { api } from '../apiClient';

/**
 * Add a new entry to the waitlist
 */
export const addWaitlistEntry = async (data: any) => {
  return api.post('/waitlist_entries', data);
};

/**
 * Update an existing waitlist entry
 */
export const updateWaitlistEntry = async (id: number, data: any) => {
  return api.patch(`/waitlist_entries/${id}`, data);
};

/**
 * Remove an entry from the waitlist
 */
export const removeWaitlistEntry = async (id: number) => {
  return api.delete(`/waitlist_entries/${id}`);
};

/**
 * Notify a waitlist entry that their table is ready
 */
export const notifyWaitlistEntry = async (id: number) => {
  return api.post(`/waitlist_entries/${id}/notify`);
};
