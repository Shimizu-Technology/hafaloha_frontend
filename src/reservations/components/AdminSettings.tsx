// src/reservations/components/admin/AdminSettings.tsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import {
  useRestaurant,
  // Restaurant
} from '../hooks/useRestaurant';
import {
  useOperatingHours,
  // OperatingHour
} from '../hooks/useOperatingHours';
import {
  useSpecialEvents,
  // SpecialEvent as HookEvent
} from '../hooks/useSpecialEvents';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Basic shape for the local restaurant fields
interface Restaurant {
  id: number;
  default_reservation_length?: number;
  admin_settings?: Record<string, any>;
  current_seat_count?: number;
}

// OperatingHour shape
interface OperatingHour {
  id: number;
  restaurant_id?: number;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  closed: boolean;
}

// SpecialEvent shape (mirroring what you had but adding `_deleted`)
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

/** Convert Date => "YYYY-MM-DD" or null if no date */
function formatDateYYYYMMDD(d: Date | null): string | null {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Convert a DB time string => "HH:MM" for <input type="time" /> */
function shortTime(dbTime: string | null): string {
  if (!dbTime) return '';
  let parseStr = dbTime;
  if (!parseStr.includes('T')) {
    // If the server doesn’t provide date, prefix a dummy date
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

export default function AdminSettings() {
  // 1) Hooks from your new domain hooks:
  const {
    restaurant,
    fetchRestaurant,
    updateRestaurant,
  } = useRestaurant();

  const {
    operatingHours,
    fetchOperatingHours,
    updateOperatingHour,
  } = useOperatingHours();

  const {
    events,
    fetchSpecialEvents,
    createSpecialEvent,
    updateSpecialEvent,
    deleteSpecialEvent,
  } = useSpecialEvents();

  // 2) Local states
  const [loading, setLoading] = useState(true);

  // From the Restaurant object:
  const [defaultLength, setDefaultLength] = useState<number>(60);
  const [adminSettings, setAdminSettings] = useState('');
  const [seatCount, setSeatCount] = useState(0);

  // For Operating Hours (locally editable draft)
  const [draftHours, setDraftHours] = useState<OperatingHour[]>([]);

  // For Special Events (locally editable draft)
  const [draftEvents, setDraftEvents] = useState<SpecialEvent[]>([]);

  const [showAdvanced, setShowAdvanced] = useState(false);

  // 3) On mount => load all data from the hooks
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      // a) fetch the restaurant (id=1)
      await fetchRestaurant(1);

      // b) fetch operating hours
      await fetchOperatingHours();

      // c) fetch special events
      await fetchSpecialEvents();

      // After all done, set local “draft” states from the hooks’ data
      if (restaurant) {
        if (restaurant.default_reservation_length) {
          setDefaultLength(restaurant.default_reservation_length);
        }
        if (restaurant.admin_settings) {
          // store as JSON string
          setAdminSettings(JSON.stringify(restaurant.admin_settings, null, 2));
        }
        if (restaurant.current_seat_count) {
          setSeatCount(restaurant.current_seat_count);
        }
      }

      if (operatingHours && operatingHours.length) {
        setDraftHours([...operatingHours]); // shallow copy
      }

      if (events && events.length) {
        const mapped = events.map((item) => ({
          id: item.id,
          event_date_obj: parseDateString(item.date ?? null),
          start_time: item.start_time,
          end_time: item.end_time,
          closed: item.closed || false,
          exclusive_booking: item.exclusive_booking || false,
          max_capacity: item.max_capacity || seatCount,
          description: item.description || '',
          _deleted: false,
        })) as SpecialEvent[];
        setDraftEvents(mapped);
      }

    } catch (err) {
      console.error('Error loading settings:', err);
      toast.error('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }

  // 4) Operating Hours changes
  function handleOHChange(hourId: number, field: keyof OperatingHour, value: any) {
    setDraftHours((prev) =>
      prev.map((oh) => (oh.id === hourId ? { ...oh, [field]: value } : oh))
    );
  }

  // 5) Special Events changes
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

  function handleAddEvent() {
    const newEvent: SpecialEvent = {
      id: 0,
      event_date_obj: null,
      start_time: null,
      end_time: null,
      closed: false,
      exclusive_booking: false,
      max_capacity: seatCount,
      description: '',
    };
    setDraftEvents((prev) => [...prev, newEvent]);
  }

  // 6) Save all
  async function handleSaveAll() {
    try {
      // a) parse adminSettings from JSON
      let parsedAdmin: any = {};
      if (adminSettings.trim()) {
        try {
          parsedAdmin = JSON.parse(adminSettings);
        } catch {
          toast.error('Invalid JSON in Admin Settings.');
          return;
        }
      }

      // b) Update restaurant (id=1)
      const restaurantPayload = {
        default_reservation_length: Number(defaultLength),
        admin_settings: parsedAdmin,
      };
      await updateRestaurant(1, restaurantPayload);

      // c) Update operating hours
      for (const oh of draftHours) {
        await updateOperatingHour(oh.id, {
          open_time: oh.open_time,
          close_time: oh.close_time,
          closed: oh.closed,
        });
      }

      // d) Special events
      const toCreate = draftEvents.filter((ev) => ev.id === 0 && !ev._deleted);
      const toUpdate = draftEvents.filter((ev) => ev.id !== 0 && !ev._deleted);
      const toDelete = draftEvents.filter((ev) => ev.id !== 0 && ev._deleted);

      // d.1) Create
      for (const ev of toCreate) {
        const payload = {
          date: formatDateYYYYMMDD(ev.event_date_obj),
          closed: ev.closed,
          exclusive_booking: ev.exclusive_booking,
          max_capacity: ev.max_capacity,
          description: ev.description,
          start_time: ev.start_time,
          end_time: ev.end_time,
        };
        await createSpecialEvent(payload);
      }

      // d.2) Update
      for (const ev of toUpdate) {
        const payload = {
          date: formatDateYYYYMMDD(ev.event_date_obj),
          closed: ev.closed,
          exclusive_booking: ev.exclusive_booking,
          max_capacity: ev.max_capacity,
          description: ev.description,
          start_time: ev.start_time,
          end_time: ev.end_time,
        };
        await updateSpecialEvent(ev.id, payload);
      }

      // d.3) Delete
      for (const ev of toDelete) {
        await deleteSpecialEvent(ev.id);
      }

      toast.success('All settings saved successfully!');
      loadAllData(); // re-fetch to reflect new data
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings. See console for details.');
    }
  }

  if (loading) {
    return <div className="p-4">Loading Admin Settings...</div>;
  }

  return (
    <div className="bg-white shadow rounded-md">
      {/* gold-tinted header */}
      <div className="border-b border-gray-200 bg-hafaloha-gold/5 rounded-t-md px-4 py-3">
        <h2 className="text-xl font-bold text-gray-900">Admin Settings</h2>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-8">
          {/* 1) Operating Hours */}
          <section className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Operating Hours</h2>
            <div className="overflow-x-auto">
              {draftHours.length === 0 ? (
                <p className="text-sm text-gray-600">No operating hours found.</p>
              ) : (
                <table className="min-w-full table-auto border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">Day</th>
                      <th className="px-4 py-2 text-left text-sm">Open Time</th>
                      <th className="px-4 py-2 text-left text-sm">Close Time</th>
                      <th className="px-4 py-2 text-left text-sm">Closed?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftHours.map((oh) => {
                      const openVal = shortTime(oh.open_time);
                      const closeVal = shortTime(oh.close_time);
                      return (
                        <tr key={oh.id} className="border-b last:border-b-0">
                          <td className="px-4 py-2 text-sm">
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
                              className="border border-gray-300 rounded p-1 w-32 text-sm"
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
                              className="border border-gray-300 rounded p-1 w-32 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={oh.closed}
                              onChange={(e) =>
                                handleOHChange(oh.id, 'closed', e.target.checked)
                              }
                              title="If checked, no reservations allowed this day"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* 2) Special Events */}
          <section className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Special Events</h2>
              <button
                onClick={handleAddEvent}
                type="button"
                className="px-3 py-1 bg-hafaloha-gold text-white text-sm rounded hover:bg-hafaloha-coral"
              >
                + Add Event
              </button>
            </div>

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

            <div className="overflow-x-auto">
              {draftEvents.length === 0 ? (
                <p className="text-sm text-gray-600">No special events found.</p>
              ) : (
                <table className="min-w-full table-auto border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-sm">Event Date</th>
                      <th className="px-2 py-2 text-left text-sm" title="Fully close the restaurant?">
                        Fully Closed?
                      </th>
                      {showAdvanced && (
                        <th className="px-2 py-2 text-left text-sm" title="No other bookings if checked.">
                          Private Only
                        </th>
                      )}
                      {showAdvanced && (
                        <th className="px-2 py-2 text-left text-sm" title="Max capacity for the day.">
                          Max Guests
                        </th>
                      )}
                      <th className="px-2 py-2 text-left text-sm">Start</th>
                      <th className="px-2 py-2 text-left text-sm">End</th>
                      <th className="px-2 py-2 text-left text-sm">Description</th>
                      <th className="px-2 py-2 text-sm" />
                    </tr>
                  </thead>
                  <tbody>
                    {draftEvents.map((ev, idx) => {
                      if (ev._deleted) return null;
                      const rowKey = ev.id !== 0 ? `event-${ev.id}` : `new-${idx}`;
                      return (
                        <tr key={rowKey} className="border-b last:border-b-0">
                          <td className="px-2 py-2">
                            <DatePicker
                              selected={ev.event_date_obj}
                              onChange={(date: Date | null) => {
                                handleEventChange(ev.id, 'event_date_obj', date);
                              }}
                              dateFormat="MM/dd/yyyy"
                              isClearable
                              placeholderText="Pick a date"
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={ev.closed}
                              onChange={(e) =>
                                handleEventChange(ev.id, 'closed', e.target.checked)
                              }
                            />
                          </td>
                          {showAdvanced && (
                            <td className="px-2 py-2 text-center">
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
                                className="border border-gray-300 rounded p-1 w-full text-sm"
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
                              className="border border-gray-300 rounded p-1 w-20 text-sm"
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
                              className="border border-gray-300 rounded p-1 w-20 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={ev.description || ''}
                              onChange={(e) =>
                                handleEventChange(ev.id, 'description', e.target.value)
                              }
                              className="border border-gray-300 rounded p-1 w-48 text-sm"
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
                                  setDraftEvents((prev) => prev.filter((x) => x !== ev))
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
            </div>
          </section>

          {/* 3) General Settings */}
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
                  className="border border-gray-300 rounded p-2 w-44 text-sm"
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

          {/* 4) Save Button */}
          <div>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2 bg-hafaloha-gold text-white rounded font-semibold hover:bg-hafaloha-coral"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
