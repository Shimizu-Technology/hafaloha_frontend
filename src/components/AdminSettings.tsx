// src/components/AdminSettings.tsx

import React, { useState, useEffect } from 'react';
import {
  fetchRestaurant,
  updateRestaurant,
  fetchOperatingHours,
  fetchSpecialEvents,
  createSpecialEvent,
  updateSpecialEvent,
  deleteSpecialEvent,
  updateOperatingHour,
} from '../services/api'; // <-- Import your needed API calls
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

/** Basic Restaurant shape (including current_seat_count for the UI) */
interface Restaurant {
  id: number;
  default_reservation_length?: number;
  admin_settings?: Record<string, any>;
  current_seat_count?: number; // We'll read this from the backend
}

/** OperatingHour shape from the backend */
interface OperatingHour {
  id: number;
  restaurant_id: number;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  closed: boolean;
}

/** SpecialEvent shape */
interface SpecialEvent {
  id: number;
  event_date_obj: Date | null;
  start_time: string | null;
  end_time: string | null;
  closed: boolean;         
  exclusive_booking: boolean;
  max_capacity: number;
  description: string | null;
  _deleted?: boolean;
}

/** Convert "YYYY-MM-DD" => JS Date */
function parseDateString(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  return null;
}

/** Convert a Date => "YYYY-MM-DD" or null if no date */
function formatDateYYYYMMDD(d: Date | null): string | null {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convert a DB time string (possibly "09:00", "09:00:00", or "2025-01-01T09:00:00Z")
 * => "HH:MM" for <input type="time" />.
 */
function shortTime(dbTime: string | null): string {
  if (!dbTime) return '';
  let parseStr = dbTime;
  if (!parseStr.includes('T')) {
    parseStr = `1970-01-01T${parseStr}`;
  }
  try {
    const d = new Date(parseStr);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  } catch {}
  const match = dbTime.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
}

/** Convert "HH:MM" => "HH:MM:SS" or null if empty */
function toDbTime(inputTime: string): string | null {
  if (!inputTime) return null;
  return inputTime + ':00';
}

// Day-of-week labels
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function AdminSettings() {
  const [loading, setLoading]       = useState(true);
  const [error,   setError]         = useState('');
  const [success, setSuccess]       = useState('');

  // General
  const [defaultLength, setDefaultLength] = useState(60);
  const [adminSettings, setAdminSettings] = useState('');

  // Operating Hours
  const [draftHours, setDraftHours] = useState<OperatingHour[]>([]);

  // Special Events
  const [draftEvents, setDraftEvents] = useState<SpecialEvent[]>([]);

  // Advanced toggle for "Private Only" & "Max Capacity"
  const [showAdvanced, setShowAdvanced] = useState(false);

  // We'll store seatCount from the restaurant to pre-fill max_capacity
  const [seatCount, setSeatCount] = useState(0);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // 1) fetchRestaurant => includes current_seat_count
      const rest: Restaurant = await fetchRestaurant(1);
      if (rest.default_reservation_length) {
        setDefaultLength(rest.default_reservation_length);
      }
      if (rest.admin_settings) {
        setAdminSettings(JSON.stringify(rest.admin_settings, null, 2));
      }

      // If we provided current_seat_count in the backend:
      if (rest.current_seat_count) {
        setSeatCount(rest.current_seat_count);
      }

      // 2) operating hours
      const oh = await fetchOperatingHours();
      setDraftHours(oh);

      // 3) special events
      const se = await fetchSpecialEvents();
      const mapped = se.map((item: any) => ({
        id: item.id,
        event_date_obj:  parseDateString(item.event_date),
        start_time:      item.start_time,
        end_time:        item.end_time,
        closed:          item.closed,
        exclusive_booking: item.exclusive_booking,
        max_capacity:    item.max_capacity,
        description:     item.description,
        _deleted:        false
      })) as SpecialEvent[];
      setDraftEvents(mapped);

    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }

  function handleOHChange(hourId: number, field: keyof OperatingHour, value: any) {
    setDraftHours((prev) =>
      prev.map((oh) => (oh.id === hourId ? { ...oh, [field]: value } : oh))
    );
  }

  function handleEventChange(eventId: number, field: keyof SpecialEvent, value: any) {
    setDraftEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, [field]: value } : ev))
    );
  }

  function handleDeleteEvent(eventId: number) {
    setDraftEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, _deleted: true } : ev))
    );
  }

  // Pre-fill max_capacity with seatCount for new events
  function handleAddEvent() {
    const newEvent: SpecialEvent = {
      id: 0,
      event_date_obj: null,
      start_time: null,
      end_time: null,
      closed: false,
      exclusive_booking: false,
      // Use seatCount to default max_capacity:
      max_capacity: seatCount,
      description: '',
    };
    setDraftEvents((prev) => [...prev, newEvent]);
  }

  async function handleSaveAll() {
    setError('');
    setSuccess('');
    try {
      // 1) Parse adminSettings from JSON
      let parsedAdmin: any = {};
      if (adminSettings.trim()) {
        try {
          parsedAdmin = JSON.parse(adminSettings);
        } catch {
          setError('Invalid JSON in Admin Settings.');
          return;
        }
      }

      // 2) Build Restaurant Payload
      const restaurantPayload = {
        default_reservation_length: Number(defaultLength),
        admin_settings: parsedAdmin,
      };
      // Actually update restaurant
      await updateRestaurant(1, restaurantPayload);

      // 3) Operating Hours => update each if desired
      //    We'll do a loop calling updateOperatingHour:
      for (const oh of draftHours) {
        await updateOperatingHour(oh.id, {
          open_time: oh.open_time,
          close_time: oh.close_time,
          closed: oh.closed,
        });
      }

      // 4) Special Events => figure out which are new, updated, deleted
      const toCreate = draftEvents.filter(ev => ev.id === 0 && !ev._deleted);
      const toUpdate = draftEvents.filter(ev => ev.id !== 0 && !ev._deleted);
      const toDelete = draftEvents.filter(ev => ev.id !== 0 && ev._deleted);

      // 4.1) Create
      for (const ev of toCreate) {
        const payload = {
          event_date: formatDateYYYYMMDD(ev.event_date_obj),
          closed: ev.closed,
          exclusive_booking: ev.exclusive_booking,
          max_capacity: ev.max_capacity,
          description: ev.description,
          start_time: ev.start_time,
          end_time: ev.end_time,
        };
        // Actually post to /admin/special_events
        await createSpecialEvent(payload);
      }

      // 4.2) Update
      for (const ev of toUpdate) {
        const payload = {
          event_date: formatDateYYYYMMDD(ev.event_date_obj),
          closed: ev.closed,
          exclusive_booking: ev.exclusive_booking,
          max_capacity: ev.max_capacity,
          description: ev.description,
          start_time: ev.start_time,
          end_time: ev.end_time,
        };
        await updateSpecialEvent(ev.id, payload);
      }

      // 4.3) Delete
      for (const ev of toDelete) {
        await deleteSpecialEvent(ev.id);
      }

      setSuccess('All settings saved successfully!');
      // Reload to see updated data
      loadAllData();

    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. See console for details.');
    }
  }

  if (loading) {
    return <div className="p-4">Loading Admin Settings...</div>;
  }

  return (
    <div className="p-4 space-y-6">

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

      <div className="space-y-8">
        {/* ─────────────────────────────────────────────────────────────────
            1) Operating Hours
            ───────────────────────────────────────────────────────────────── */}
        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Operating Hours</h2>
          {draftHours.length === 0 ? (
            <p className="text-sm text-gray-600">No operating hours found.</p>
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
                  const openVal  = shortTime(oh.open_time);
                  const closeVal = shortTime(oh.close_time);

                  return (
                    <tr key={oh.id}>
                      <td className="px-4 py-2">
                        {DAY_NAMES[oh.day_of_week] ?? `Day ${oh.day_of_week}`}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          disabled={oh.closed}
                          value={openVal}
                          onChange={(e) => {
                            const newVal = toDbTime(e.target.value);
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
                            const newVal = toDbTime(e.target.value);
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
                          title="If checked, no reservations allowed this day"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────────
            2) Special Events
            ───────────────────────────────────────────────────────────────── */}
        <section className="bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Special Events</h2>
            <button
              onClick={handleAddEvent}
              type="button"
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              + Add Event
            </button>
          </div>

          {/* advanced checkbox for exclusive_booking & max_capacity */}
          <div className="mb-4">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showAdvanced}
                onChange={() => setShowAdvanced(!showAdvanced)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show Advanced Options</span>
            </label>
          </div>

          {draftEvents.length === 0 ? (
            <p className="text-sm text-gray-600">No special events found.</p>
          ) : (
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left">Event Date</th>
                  <th className="px-2 py-2 text-left" title="Fully close the restaurant?">
                    Fully Closed?
                  </th>
                  {showAdvanced && (
                    <th className="px-2 py-2 text-left" title="No other bookings if checked.">
                      Private Only
                    </th>
                  )}
                  {showAdvanced && (
                    <th className="px-2 py-2 text-left" title="Max capacity for the day.">
                      Max Guests
                    </th>
                  )}
                  <th className="px-2 py-2 text-left">Start</th>
                  <th className="px-2 py-2 text-left">End</th>
                  <th className="px-2 py-2 text-left">Description</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {draftEvents.map((ev, idx) => {
                  if (ev._deleted) return null;
                  // stable row key
                  const rowKey = ev.id !== 0 ? `event-${ev.id}` : `new-${idx}`;

                  return (
                    <tr key={rowKey} className="border-t border-gray-200">
                      <td className="px-2 py-2">
                        <DatePicker
                          selected={ev.event_date_obj}
                          onChange={(date: Date | null) => {
                            handleEventChange(ev.id, 'event_date_obj', date);
                          }}
                          dateFormat="MM/dd/yyyy"
                          isClearable
                          placeholderText="Pick a date"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={ev.closed}
                          onChange={(e) => handleEventChange(ev.id, 'closed', e.target.checked)}
                        />
                      </td>
                      {showAdvanced && (
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={ev.exclusive_booking}
                            onChange={(e) =>
                              handleEventChange(ev.id, 'exclusive_booking', e.target.checked)
                            }
                          />
                        </td>
                      )}
                      {showAdvanced && (
                        <td className="px-2 py-2 w-20">
                          <input
                            type="number"
                            min={0}
                            value={ev.max_capacity}
                            onChange={(e) =>
                              handleEventChange(ev.id, 'max_capacity', +e.target.value)
                            }
                            className="border border-gray-300 rounded p-1 w-full"
                          />
                        </td>
                      )}
                      <td className="px-2 py-2">
                        <input
                          type="time"
                          disabled={ev.closed}
                          value={shortTime(ev.start_time)}
                          onChange={(e) =>
                            handleEventChange(ev.id, 'start_time', toDbTime(e.target.value))
                          }
                          className="border border-gray-300 rounded p-1 w-20"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="time"
                          disabled={ev.closed}
                          value={shortTime(ev.end_time)}
                          onChange={(e) =>
                            handleEventChange(ev.id, 'end_time', toDbTime(e.target.value))
                          }
                          className="border border-gray-300 rounded p-1 w-20"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={ev.description || ''}
                          onChange={(e) =>
                            handleEventChange(ev.id, 'description', e.target.value)
                          }
                          className="border border-gray-300 rounded p-1 w-48"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        {ev.id !== 0 ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setDraftEvents((prev) =>
                                prev.filter((x) => x !== ev)
                              )
                            }
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────────
            3) General Settings
            ───────────────────────────────────────────────────────────────── */}
        <section className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">General Settings</h2>
          <div className="space-y-4 max-w-lg">
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
                Additional config in JSON format (e.g. special rules).
              </p>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
