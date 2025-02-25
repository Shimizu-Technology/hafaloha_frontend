// src/ordering/lib/api.ts

import { useLoadingStore } from '../store/loadingStore';

// Dynamically pick base URL from environment variable or default:
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
   * Useful for background refreshes or silent queries
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

  // POST JSON
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
      return true; // or return res.json() if the backend returns something
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  /**
   * For file uploads via multipart/form-data.
   * We do NOT set 'Content-Type'; browser auto-adds boundaries.
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
      return res.json();
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  // -------------------------------------------
  //  Analytics Endpoints
  // -------------------------------------------

  /**
   * GET /admin/analytics/customer_orders?start=YYYY-MM-DD&end=YYYY-MM-DD
   */
  async getCustomerOrdersReport(start?: string, end?: string) {
    useLoadingStore.getState().startLoading();
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end)   params.set('end', end);

      const res = await fetch(
        `${API_BASE_URL}/admin/analytics/customer_orders?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json(); // e.g. { start_date, end_date, results: [...] }
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  /**
   * GET /admin/analytics/revenue_trend?interval=day|week|month&start=...&end=...
   */
  async getRevenueTrend(interval = 'day', start?: string, end?: string) {
    useLoadingStore.getState().startLoading();
    try {
      const params = new URLSearchParams({ interval });
      if (start) params.set('start', start);
      if (end)   params.set('end', end);

      const res = await fetch(
        `${API_BASE_URL}/admin/analytics/revenue_trend?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json(); // { data: [ { label, revenue }, ... ], etc. }
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  /**
   * GET /admin/analytics/top_items?limit=5&start=...&end=...
   */
  async getTopItems(limit = 5, start?: string, end?: string) {
    useLoadingStore.getState().startLoading();
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (start) params.set('start', start);
      if (end)   params.set('end', end);

      const res = await fetch(
        `${API_BASE_URL}/admin/analytics/top_items?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json(); // { top_items: [...] }
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },

  /**
   * GET /admin/analytics/income_statement?year=YYYY
   */
  async getIncomeStatement(year?: number) {
    useLoadingStore.getState().startLoading();
    try {
      const y = year || new Date().getFullYear();
      const res = await fetch(
        `${API_BASE_URL}/admin/analytics/income_statement?year=${y}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json(); // { income_statement: [...] }
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },
};

/**
 * If you have a special helper for menu item images:
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
