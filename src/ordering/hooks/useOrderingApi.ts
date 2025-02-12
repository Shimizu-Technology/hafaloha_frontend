// src/ordering/hooks/useOrderingApi.ts
import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Provides a set of API functions (get, post, patch, delete, upload, etc.)
 * that automatically attach an Auth0 access token via fetch().
 */
export function useOrderingApi() {
  const { getAccessTokenSilently } = useAuth0();

  const request = useCallback(
    async (
      method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
      endpoint: string,
      body?: any,
      isFormData?: boolean
    ) => {
      const token = await getAccessTokenSilently();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      // For DELETE, assume no JSON returned, so return true
      if (method === 'DELETE') {
        return true;
      }

      return res.json();
    },
    [getAccessTokenSilently]
  );

  const get = useCallback((endpoint: string) => request('GET', endpoint), [request]);
  const post = useCallback((endpoint: string, data: any) => request('POST', endpoint, data), [request]);
  const patch = useCallback((endpoint: string, data: any) => request('PATCH', endpoint, data), [request]);
  const remove = useCallback((endpoint: string) => request('DELETE', endpoint), [request]);

  // For file uploads
  const upload = useCallback(
    (endpoint: string, method: 'POST' | 'PATCH', formData: FormData) =>
      request(method, endpoint, formData, true),
    [request]
  );

  // Optional convenience function for uploading a menu item image
  const uploadMenuItemImage = useCallback(
    async (itemId: string, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return upload(`/menu_items/${itemId}/upload_image`, 'POST', formData);
    },
    [upload]
  );

  return {
    get,
    post,
    patch,
    delete: remove,
    upload,
    uploadMenuItemImage,
  };
}
