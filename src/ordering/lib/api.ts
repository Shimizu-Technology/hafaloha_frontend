// src/ordering/lib/api.ts

// 1) Dynamically choose base URL from environment or fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Re-usable fetch wrapper for GET/POST/PATCH/DELETE using the chosen base URL
 * and automatically attaching the Authorization header from localStorage.
 */
export const api = {
  async get(endpoint: string) {
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
  },

  async patch(endpoint: string, data: any) {
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
  },

  async delete(endpoint: string) {
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
  },

  /**
   * For multipart form-data requests (file uploads).
   * We do NOT set 'Content-Type'; the browser auto-adds the boundary.
   */
  async upload(endpoint: string, method: 'POST' | 'PATCH', formData: FormData) {
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
  },
};

/**
 * A convenience method for the special `menu_items/:id/upload_image` endpoint
 */
export async function uploadMenuItemImage(itemId: string, file: File) {
  const formData = new FormData();
  // If your Rails code expects `params[:image]`, just do this:
  formData.append('image', file);

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
  return res.json(); // returns updated MenuItem object (with new image_url)
}
