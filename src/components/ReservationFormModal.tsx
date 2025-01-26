// src/components/ReservationFormModal.tsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import {
  fetchAvailability,
  createReservation,
  fetchLayout,
  fetchRestaurant
} from '../services/api';
import SeatPreferenceMapModal from './SeatPreferenceMapModal';
import type { SeatSectionData } from './SeatLayoutCanvas';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string; // optional, e.g. "2025-01-26"
}

export default function ReservationFormModal({ onClose, onSuccess, defaultDate }: Props) {
  // --------------------------------------------
  // Helpers for date parsing & formatting
  // --------------------------------------------
  function parseYYYYMMDD(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }
  function formatYYYYMMDD(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // --------------------------------------------

  const [date, setDate] = useState(defaultDate || '');  // "YYYY-MM-DD"
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Start with 60, then override with restaurant.default_reservation_length
  const [duration, setDuration] = useState(60);

  const [error, setError] = useState('');
  const [timeslots, setTimeslots] = useState<string[]>([]);

  // If timeslots = exactly 1 => we hide the duration field & default a big duration
  const hideDuration = timeslots.length === 1;

  // For seat preferences
  const [allSets, setAllSets] = useState<string[][]>([[], [], []]);
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);

  // For seat layout
  const [layoutSections, setLayoutSections] = useState<SeatSectionData[]>([]);
  const [layoutLoading, setLayoutLoading] = useState(false);

  // 1) Load default reservation length from the restaurant
  useEffect(() => {
    async function loadRestaurant() {
      try {
        const rest = await fetchRestaurant(1);
        if (rest.default_reservation_length) {
          setDuration(rest.default_reservation_length);
        }
      } catch (err) {
        console.error('Error fetching restaurant for default length:', err);
      }
    }
    loadRestaurant();
  }, []);

  // 2) Load timeslots whenever date or partySize changes
  useEffect(() => {
    async function loadTimes() {
      if (!date || !partySize) {
        setTimeslots([]);
        return;
      }
      try {
        const data = await fetchAvailability(date, partySize);
        setTimeslots(data.slots || []);
      } catch (err) {
        console.error('Availability fetch error:', err);
        setTimeslots([]);
      }
    }
    loadTimes();
  }, [date, partySize]);

  // 3) If only one timeslot => forcibly set a large duration
  useEffect(() => {
    if (hideDuration) {
      // e.g. 12 hours = 720 minutes
      setDuration(720);
    }
  }, [hideDuration]);

  // 4) Load seat layout once
  useEffect(() => {
    async function loadLayout() {
      setLayoutLoading(true);
      try {
        const layout = await fetchLayout(1); // or use the active layout ID
        // transform layout data into SeatSectionData
        const sections: SeatSectionData[] = layout.seat_sections.map((sec: any) => ({
          id: sec.id,
          name: sec.name,
          section_type: sec.section_type === 'table' ? 'table' : 'counter',
          offset_x: sec.offset_x,
          offset_y: sec.offset_y,
          floor_number: sec.floor_number ?? 1,
          seats: sec.seats.map((s: any) => ({
            id: s.id,
            label: s.label,
            position_x: s.position_x,
            position_y: s.position_y,
            capacity: s.capacity ?? 1
          }))
        }));
        setLayoutSections(sections);
      } catch (err) {
        console.error('Error fetching layout:', err);
      } finally {
        setLayoutLoading(false);
      }
    }
    loadLayout();
  }, []);

  // 5) Actually create the reservation
  async function handleCreate() {
    setError('');

    if (!contactName) {
      setError('Guest name is required.');
      return;
    }
    if (!date || !time) {
      setError('Please pick a valid date/time.');
      return;
    }

    const start_time = `${date}T${time}:00`;
    const seat_prefs_for_db = allSets.filter((arr) => arr.length > 0);

    try {
      await createReservation({
        reservation: {
          restaurant_id: 1,
          start_time,
          party_size: partySize,
          contact_name: contactName,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          status: 'booked',
          seat_preferences: seat_prefs_for_db,
          duration_minutes: duration,
        },
      });
      onSuccess(); // e.g. close modal, reload reservations, etc.
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation. Please try again.');
    }
  }

  // 6) Seat Map
  function handleOpenSeatMap() {
    if (!layoutSections.length) {
      alert('Layout not loaded yet or no seats available.');
      return;
    }
    setShowSeatMapModal(true);
  }

  function handleCloseSeatMap() {
    setShowSeatMapModal(false);
  }

  function handleSeatMapSave(threeSets: string[][]) {
    setAllSets(threeSets);
    setShowSeatMapModal(false);
  }

  // For easier display
  const [opt1, opt2, opt3] = allSets;

  // Convert "YYYY-MM-DD" => Date or null
  const parsedDate = date ? parseYYYYMMDD(date) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">New Reservation</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Date & Party */}
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                {/* Use react-datepicker instead of <input type="date" /> */}
                <DatePicker
                  selected={parsedDate || undefined}  // undefined if null
                  onChange={(selected: Date | null) => {
                    if (selected) {
                      setDate(formatYYYYMMDD(selected));
                    } else {
                      setDate('');
                    }
                  }}
                  dateFormat="MM/dd/yyyy"
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                  placeholderText="Select date"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
                <input
                  type="number"
                  min={1}
                  value={partySize}
                  onChange={(e) => setPartySize(+e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="">-- Select a time --</option>
                {timeslots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration => hide if exactly 1 timeslot */}
            {!hideDuration && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(+e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  {[30, 60, 90, 120, 180, 240, 360, 480, 720].map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Contact info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Seat preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seat Preferences (Optional)
              </label>
              <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                <p className="text-xs italic">
                  Option 1: {opt1.length ? opt1.join(', ') : '(none)'}
                </p>
                <p className="text-xs italic">
                  Option 2: {opt2.length ? opt2.join(', ') : '(none)'}
                </p>
                <p className="text-xs italic">
                  Option 3: {opt3.length ? opt3.join(', ') : '(none)'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenSeatMap}
                  className="mt-2 px-3 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                  disabled={layoutLoading}
                >
                  {opt1.length || opt2.length || opt3.length
                    ? 'Edit Seat Preferences'
                    : 'Select Seat Preferences'}
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-end space-x-2">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Create
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Seat Preference Map Modal */}
      {showSeatMapModal && (
        <SeatPreferenceMapModal
          date={date}
          time={time}
          duration={duration}
          partySize={partySize}
          sections={layoutSections}
          initialPreferences={allSets}
          onSave={handleSeatMapSave}
          onClose={handleCloseSeatMap}
        />
      )}
    </>
  );
}
