// src/components/AdminSettings.tsx

import React, { useState, useEffect } from 'react';
import { fetchRestaurant, updateRestaurant } from '../services/api';

interface Restaurant {
  id: number;
  name: string;
  opening_time?: string;  // e.g. "2000-01-01 17:00:00 +1000"
  closing_time?: string;  // e.g. "2000-01-01 21:00:00 +1000"
  default_reservation_length?: number;
  admin_settings?: Record<string, any>;
}

/**
 * Parses a Rails DB time like "2000-01-01 17:00:00 +1000" into "HH:MM" (24h).
 * If it fails, returns an empty string.
 */
function parseDbTime(dbTime: string): string {
  // Try constructing a Date and reading hours/minutes
  const d = new Date(dbTime);
  if (!isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // Fallback: If new Date() doesn't parse well, attempt a regex
  const match = dbTime.match(/(\d{2}):(\d{2}):\d{2}/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  return '';
}

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // The fields we are editing
  const [openTime, setOpenTime]     = useState('');  // e.g. "17:00"
  const [closeTime, setCloseTime]   = useState('');  // e.g. "21:00"
  const [defaultLength, setDefaultLength] = useState(60);

  // Admin settings JSON string
  const [adminSettings, setAdminSettings] = useState('');

  useEffect(() => {
    loadRestaurantData();
  }, []);

  async function loadRestaurantData() {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Hardcoded ID=1; adapt if multiple restaurants
      const rest: Restaurant = await fetchRestaurant(1);

      // Convert DB times to "HH:MM"
      if (rest.opening_time) {
        setOpenTime(parseDbTime(rest.opening_time));
      }
      if (rest.closing_time) {
        setCloseTime(parseDbTime(rest.closing_time));
      }
      if (rest.default_reservation_length) {
        setDefaultLength(rest.default_reservation_length);
      }

      // If the server returns admin_settings as an object, convert to JSON
      if (rest.admin_settings) {
        setAdminSettings(JSON.stringify(rest.admin_settings, null, 2));
      }

    } catch (err) {
      console.error('Error loading restaurant data:', err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Attempt to parse adminSettings JSON
      let parsedAdminSettings: any = {};
      if (adminSettings.trim()) {
        try {
          parsedAdminSettings = JSON.parse(adminSettings);
        } catch (parseErr) {
          setError('Invalid JSON in Admin Settings field.');
          return;
        }
      }

      // For the DB, we typically append ":00" to make "HH:MM:SS"
      const openWithSeconds  = openTime ? openTime + ':00' : '';
      const closeWithSeconds = closeTime ? closeTime + ':00' : '';

      // Call the API
      await updateRestaurant(1, {
        opening_time: openWithSeconds,
        closing_time: closeWithSeconds,
        default_reservation_length: Number(defaultLength),
        admin_settings: parsedAdminSettings,
      });

      setSuccess('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Check console.');
    }
  }

  if (loading) {
    return <div className="p-4">Loading Admin Settings...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Admin Settings</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 max-w-lg">
        {/* Opening Time */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Opening Time
          </label>
          <input
            type="time"
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="border border-gray-300 rounded p-2 w-44"
          />
        </div>

        {/* Closing Time */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Closing Time
          </label>
          <input
            type="time"
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="border border-gray-300 rounded p-2 w-44"
          />
        </div>

        {/* Default Reservation Length */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Default Reservation Length (minutes)
          </label>
          <input
            type="number"
            min={15}
            step={15}
            value={defaultLength}
            onChange={(e) => setDefaultLength(+e.target.value)}
            className="border border-gray-300 rounded p-2 w-44"
          />
        </div>

        {/* Admin Settings (JSON) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Admin Settings (JSON)
          </label>
          <textarea
            value={adminSettings}
            onChange={(e) => setAdminSettings(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded p-2 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            You can store additional config in JSON format (e.g. special rules).
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
