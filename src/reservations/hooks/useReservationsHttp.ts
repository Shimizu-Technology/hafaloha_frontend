// src/reservations/hooks/useReservationsHttp.ts
import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Provides generic REST methods that attach an Auth0 token.
 */
export function useReservationsHttp() {
  const { getAccessTokenSilently } = useAuth0();

  const request = useCallback(
    async (
      method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
      endpoint: string,
      body?: any
    ) => {
      const token = await getAccessTokenSilently();

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      // For JSON requests
      if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body:
          body instanceof FormData
            ? body
            : body
            ? JSON.stringify(body)
            : undefined,
      });

      if (!res.ok) {
        // Convert error to text for debugging
        throw new Error(await res.text());
      }

      // For DELETE, assume no JSON returned
      if (method === 'DELETE') {
        return true;
      }

      return res.json();
    },
    [getAccessTokenSilently]
  );

  const get = useCallback((endpoint: string, params?: Record<string, any>) => {
    // If you need query params, you can build them here.
    // Or let the caller embed them in `endpoint`.
    return request('GET', endpoint);
  }, [request]);

  const post = useCallback((endpoint: string, data: any) => {
    return request('POST', endpoint, data);
  }, [request]);

  const patch = useCallback((endpoint: string, data: any) => {
    return request('PATCH', endpoint, data);
  }, [request]);

  const remove = useCallback((endpoint: string) => {
    return request('DELETE', endpoint);
  }, [request]);

  return {
    get,
    post,
    patch,
    delete: remove,
  };
}
