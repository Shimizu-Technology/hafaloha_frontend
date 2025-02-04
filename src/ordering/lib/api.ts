// src/lib/api.ts
const API_BASE_URL = 'http://localhost:3000';

export const api = {
  async get(endpoint: string) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
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
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
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
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
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
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
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
        // Let the browser set the Content-Type boundary
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json();
  }
};

/**
 * A convenience method for the special menu_items/:id/upload_image endpoint
 */
export async function uploadMenuItemImage(itemId: string, file: File) {
  const formData = new FormData();
  // The Rails controller typically expects params[:image], or (with strong params) params[:menu_item][:image].
  // But in your code you do def upload_image => file = params[:image].
  // If it needs 'menu_item[image]', adjust accordingly. If it expects just 'image', keep this:
  formData.append('image', file);

  const res = await fetch(`${API_BASE_URL}/menu_items/${itemId}/upload_image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json(); // returns the updated MenuItem, presumably with { image_url: ... }
}
