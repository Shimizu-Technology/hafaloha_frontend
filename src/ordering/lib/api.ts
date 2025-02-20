// src/ordering/lib/api.ts
import { useLoadingStore } from '../store/loadingStore';

// Dynamically choose base URL from environment or fallback:
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  // GET with global spinner
  async get(endpoint: string) {
    useLoadingStore.getState().startLoading();
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  /**
   * Special GET that does NOT show the global spinner overlay.
   */
  async getBackground(endpoint: string) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json();
  },

  async post(endpoint: string, data: any) {
    useLoadingStore.getState().startLoading();
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  // PATCH JSON
  async patch(endpoint: string, data: any) {
    useLoadingStore.getState().startLoading();
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  // DELETE
  async delete(endpoint: string) {
    useLoadingStore.getState().startLoading();
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return true;
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  /**
   * For multipart form-data requests (file uploads).
   * We do NOT set 'Content-Type'; the browser auto-adds the boundary.
   */
  async upload(endpoint: string, method: 'POST' | 'PATCH', formData: FormData) {
    useLoadingStore.getState().startLoading();
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  /**
   * For verifying phone => POST /verify_phone with { code }
   */
  async verifyPhone(code: string) {
    useLoadingStore.getState().startLoading();
    try {
      const res = await fetch(`${API_BASE_URL}/verify_phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json(); // { message, user }
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  /**
   * For resending a new verification code => POST /resend_code
   */
  async resendCode() {
    useLoadingStore.getState().startLoading();
    try {
      const res = await fetch(`${API_BASE_URL}/resend_code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json(); // { message: "...", ... }
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },
};

/**
 * Convenience method for the special menu_items/:id/upload_image endpoint
 */
export async function uploadMenuItemImage(itemId: string, file: File) {
  const formData = new FormData();
  formData.append('image', file);

  useLoadingStore.getState().startLoading();
  try {
    const res = await fetch(`${API_BASE_URL}/menu_items/${itemId}/upload_image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json(); // returns updated MenuItem
  } finally {
    useLoadingStore.getState().stopLoading();
  }
}
