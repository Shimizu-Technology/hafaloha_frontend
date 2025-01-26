// src/components/AdminSettings.tsx

import React, { useState, useEffect } from 'react';
import { 
  fetchRestaurant, 
  updateRestaurant,
  fetchOperatingHours,
  updateOperatingHour
} from '../services/api';

/** Basic Restaurant shape, for general settings */
interface Restaurant {
  id: number;
  default_reservation_length?: number;
  admin_settings?: Record<string, any>;
}

/** OperatingHour shape from the backend */
interface OperatingHour {
  id: number;
  restaurant_id: number;
  day_of_week: number;  // 0=Sunday..6=Saturday
  open_time: string | null;
  close_time: string | null;
  closed: boolean;
}

/**
 * ShortTime util:
 * Convert "2000-01-01 09:00:00 +1000" => "09:00" if possible.
 * If parse fails, tries a fallback regex. If that fails, returns "".
 */
function shortTime(dbTime: string | null): string {
  if (!dbTime) return '';

  // 1) Try new Date(...)
  const d = new Date(dbTime);
  if (!isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // 2) Fallback: find HH:MM by regex
  const match = dbTime.match(/\d{2}:\d{2}/);
  return match ? match[0] : '';
}

// Day-of-week labels
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // ----- General Settings fields -----
  const [defaultLength, setDefaultLength] = useState(60);
  const [adminSettings, setAdminSettings] = useState('');

  // ----- Operating Hours local state -----
  // We'll store an array of draft operating hours that we only save on "Save Settings"
  const [draftHours, setDraftHours] = useState<OperatingHour[]>([]);

  // On mount, load everything
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // 1) Load restaurant => fill defaultLength & adminSettings JSON
      const rest: Restaurant = await fetchRestaurant(1);
      if (rest.default_reservation_length) {
        setDefaultLength(rest.default_reservation_length);
      }
      if (rest.admin_settings) {
        setAdminSettings(JSON.stringify(rest.admin_settings, null, 2));
      }

      // 2) Load operating hours => store them in draftHours
      const oh = await fetchOperatingHours();
      setDraftHours(oh);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load admin settings or operating hours.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * For Operating Hour input changes, we just update `draftHours`
   * without calling the backend yet.
   */
  function handleOHChange(hourId: number, field: keyof OperatingHour, value: any) {
    setDraftHours((prev) => {
      return prev.map((oh) => {
        if (oh.id !== hourId) return oh;
        return { ...oh, [field]: value };
      });
    });
  }

  /**
   * Single “Save Settings” button that:
   * 1) Saves the general restaurant fields (defaultLength, adminSettings)
   * 2) Saves each operating hour row to the server
   */
  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // 1) Parse adminSettings JSON (if present)
      let parsedAdmin: any = {};
      if (adminSettings.trim()) {
        try {
          parsedAdmin = JSON.parse(adminSettings);
        } catch (parseErr) {
          setError('Invalid JSON in Admin Settings field.');
          return;
        }
      }

      // 2) Update the Restaurant (general settings)
      await updateRestaurant(1, {
        default_reservation_length: Number(defaultLength),
        admin_settings: parsedAdmin,
      });

      // 3) Update each OperatingHour in a loop
      //    (Or you could do a Promise.all if you want parallel calls.)
      for (const oh of draftHours) {
        await updateOperatingHour(oh.id, {
          open_time: oh.open_time,
          close_time: oh.close_time,
          closed: oh.closed,
        });
      }

      setSuccess('All settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save some or all settings. Check console.');
    }
  }

  if (loading) {
    return <div className="p-4">Loading Admin Settings...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded">
          {success}
        </div>
      )}

      {/* Single form that wraps everything */}
      <form onSubmit={handleSaveAll} className="space-y-8">

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 1) OPERATING HOURS SECTION */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Operating Hours</h2>

          {draftHours.length === 0 ? (
            <p className="text-sm text-gray-600">
              No operating hours found. You might seed them first.
            </p>
          ) : (
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Day</th>
                  <th className="px-4 py-2 text-left">Open Time</th>
                  <th className="px-4 py-2 text-left">Close Time</th>
                  <th className="px-4 py-2 text-left">Closed?</th>
                </tr>
              </thead>
              <tbody>
                {draftHours.map((oh) => {
                  // Convert "2000-01-01 09:00:00 +1000" => "09:00" for display
                  const openVal  = shortTime(oh.open_time);
                  const closeVal = shortTime(oh.close_time);

                  return (
                    <tr key={oh.id} className="border-t border-gray-200">
                      <td className="px-4 py-2">
                        {DAY_NAMES[oh.day_of_week] || `Day ${oh.day_of_week}`}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          disabled={oh.closed}
                          value={openVal}
                          onChange={(e) => {
                            const newVal = e.target.value ? e.target.value + ':00' : null;
                            handleOHChange(oh.id, 'open_time', newVal);
                          }}
                          className="border border-gray-300 rounded p-1 w-32"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          disabled={oh.closed}
                          value={closeVal}
                          onChange={(e) => {
                            const newVal = e.target.value ? e.target.value + ':00' : null;
                            handleOHChange(oh.id, 'close_time', newVal);
                          }}
                          className="border border-gray-300 rounded p-1 w-32"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={oh.closed}
                          onChange={(e) => {
                            handleOHChange(oh.id, 'closed', e.target.checked);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 2) GENERAL SETTINGS SECTION */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">General Settings</h2>

          <div className="space-y-4 max-w-lg">
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
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* SINGLE SAVE BUTTON (Saves both Hours + General in handleSaveAll) */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <div>
          <button
            type="submit"
            className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
