// src/components/ReservationFormModal.tsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-hot-toast'; // 1) Import toast from react-hot-toast

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
  defaultDate?: string; // e.g. "2025-01-26"
}

export default function ReservationFormModal({ onClose, onSuccess, defaultDate }: Props) {
  // ---------------------------
  // Date Parsing & Formatting
  // ---------------------------
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

  // A small helper to convert "HH:mm" (24h) => "h:mm AM/PM"
  function format12hSlot(slot: string) {
    const [hhStr, mmStr] = slot.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    const d = new Date(2020, 0, 1, hh, mm);
    return d.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // ---------------------------
  // State
  // ---------------------------
  const [date, setDate] = useState(defaultDate || ''); // "YYYY-MM-DD"
  const [time, setTime] = useState('');

  // Party size as a string
  const [partySizeText, setPartySizeText] = useState('2');

  // Contact info
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('+1671'); // prefill with +1671
  const [contactEmail, setContactEmail] = useState('');

  // Reservation duration
  const [duration, setDuration] = useState(60);

  // We'll store available timeslots here
  const [timeslots, setTimeslots] = useState<string[]>([]);

  // If there's exactly 1 timeslot, we hide duration & default to large
  const hideDuration = timeslots.length === 1;

  // Seat preferences
  const [allSets, setAllSets] = useState<string[][]>([[], [], []]);
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);

  // Layout sections
  const [layoutSections, setLayoutSections] = useState<SeatSectionData[]>([]);
  const [layoutLoading, setLayoutLoading] = useState(false);

  // ---------------------------
  // Effects
  // ---------------------------

  // 1) Load default reservation length from the restaurant
  useEffect(() => {
    async function loadRestaurant() {
      try {
        const rest = await fetchRestaurant(1);
        if (rest.default_reservation_length) {
          setDuration(rest.default_reservation_length);
        }
      } catch (err) {
        console.error('Error fetching restaurant:', err);
      }
    }
    loadRestaurant();
  }, []);

  // 2) Load timeslots whenever date or partySize changes
  useEffect(() => {
    const sizeNum = parseInt(partySizeText, 10) || 1;
    if (!date || !sizeNum) {
      setTimeslots([]);
      return;
    }

    async function loadTimes() {
      try {
        const data = await fetchAvailability(date, sizeNum);
        setTimeslots(data.slots || []);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setTimeslots([]);
      }
    }
    loadTimes();
  }, [date, partySizeText]);

  // 3) If only one timeslot => forcibly set a large duration
  useEffect(() => {
    if (hideDuration) {
      setDuration(720); // e.g. 12 hours
    }
  }, [hideDuration]);

  // 4) Load seat layout once
  useEffect(() => {
    async function loadLayout() {
      setLayoutLoading(true);
      try {
        const layout = await fetchLayout(1);
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
            capacity: s.capacity ?? 1,
          })),
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

  // ---------------------------
  // Handlers
  // ---------------------------
  function handlePartySizeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPartySizeText(digitsOnly);
  }

  async function handleCreate() {
    // Basic validation
    if (!contactName) {
      toast.error('Guest name is required.');
      return;
    }
    if (!date || !time) {
      toast.error('Please pick a valid date/time.');
      return;
    }

    const finalPartySize = parseInt(partySizeText, 10) || 1;

    // phone cleanup
    let phoneVal = contactPhone.trim();
    const cleanedPhone = phoneVal.replace(/[-()\s]+/g, '');
    if (cleanedPhone === '+1671') {
      phoneVal = '';
    }

    const start_time = `${date}T${time}:00`;
    const seat_prefs_for_db = allSets.filter((arr) => arr.length > 0);

    try {
      await createReservation({
        reservation: {
          restaurant_id: 1,
          start_time,
          party_size: finalPartySize,
          contact_name: contactName,
          contact_phone: phoneVal,
          contact_email: contactEmail,
          status: 'booked',
          seat_preferences: seat_prefs_for_db,
          duration_minutes: duration,
        },
      });

      toast.success('Reservation created successfully!');
      onSuccess(); // e.g. close modal, reload data
    } catch (err) {
      console.error('Error creating reservation:', err);
      toast.error('Failed to create reservation. Please try again.');
    }
  }

  // Seat map actions
  function handleOpenSeatMap() {
    if (!layoutSections.length) {
      alert('Layout not loaded or no seats available.');
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

  const [opt1, opt2, opt3] = allSets;
  const parsedDate = date ? parseYYYYMMDD(date) : null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        {/* Modal Container */}
        <div className="relative bg-white max-w-lg w-full mx-4 rounded-lg shadow-lg">
          {/* Scrollable content */}
          <div className="p-6 max-h-[85vh] overflow-y-auto relative">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-4 text-gray-900">New Reservation</h2>

            {/* Removed local error block, using toast.error instead */}

            <div className="space-y-4">
              {/* Date & Party in a 2-column grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <DatePicker
                    selected={parsedDate || undefined}
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

                {/* Party Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Party Size
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={partySizeText}
                    onChange={handlePartySizeChange}
                    placeholder="2"
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              {/* Time => 12-hour dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">-- Select a time --</option>
                  {timeslots.map((slot) => (
                    <option key={slot} value={slot}>
                      {format12hSlot(slot)}
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
                    className="w-full p-2 border border-gray-300 rounded text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                  placeholder="+1671"
                />
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>

              {/* Seat preferences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seat Preferences (Optional)
                </label>
                <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                  <p className="text-xs italic">
                    Option 1: {allSets[0].length ? allSets[0].join(', ') : '(none)'}
                  </p>
                  <p className="text-xs italic">
                    Option 2: {allSets[1].length ? allSets[1].join(', ') : '(none)'}
                  </p>
                  <p className="text-xs italic">
                    Option 3: {allSets[2].length ? allSets[2].join(', ') : '(none)'}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenSeatMap}
                    className="mt-2 px-3 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                    disabled={layoutLoading}
                  >
                    {allSets.some(a => a.length)
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
      </div>

      {/* Seat Map Modal */}
      {showSeatMapModal && (
        <SeatPreferenceMapModal
          date={date}
          time={time}
          duration={duration}
          partySize={parseInt(partySizeText || '1', 10)}
          sections={layoutSections}
          initialPreferences={allSets}
          onSave={handleSeatMapSave}
          onClose={handleCloseSeatMap}
        />
      )}
    </>
  );
}
