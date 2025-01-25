// src/components/ReservationFormModal.tsx
import React, { useState, useEffect } from 'react';
import { fetchAvailability, createReservation, fetchLayout } from '../services/api';
import SeatPreferenceMapModal from './SeatPreferenceMapModal';
import type { SeatSectionData } from './SeatLayoutCanvas';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReservationFormModal({ onClose, onSuccess }: Props) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState('');

  const [timeslots, setTimeslots] = useState<string[]>([]);
  const [allSets, setAllSets] = useState<string[][]>([[], [], []]);
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);

  const [layoutSections, setLayoutSections] = useState<SeatSectionData[]>([]);
  const [layoutLoading, setLayoutLoading] = useState(false);

  // 1) Load timeslots
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

  // 2) Load layout
  useEffect(() => {
    async function loadLayout() {
      setLayoutLoading(true);
      try {
        const layout = await fetchLayout(1); // or your current_layout_id
        const sections: SeatSectionData[] = layout.seat_sections.map((sec: any) => ({
          id: sec.id,
          name: sec.name,
          section_type: sec.section_type === 'table' ? 'table' : 'counter',
          offset_x: sec.offset_x,
          offset_y: sec.offset_y,
          floor_number: sec.floor_number ?? sec.floorNumber ?? 1,
          seats: sec.seats.map((s: any) => ({
            id: s.id,
            label: s.label || '',
            position_x: s.position_x,
            position_y: s.position_y,
            capacity: s.capacity || 1,
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

  // 3) Create reservation => nest seat_preferences under "reservation"
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

    // If you only want the first set:
    // const [option1] = allSets;
    // const seat_prefs_for_db = option1.length ? [option1] : undefined;

    // Or store all sets (filter out empty):
    const seat_prefs_for_db = allSets.filter(arr => arr.length > 0);

    try {
      // The KEY: everything is nested under "reservation: {...}"
      await createReservation({
        reservation: {
          restaurant_id: 1,
          start_time,
          party_size: partySize,
          contact_name: contactName,
          contact_phone: contactPhone,
          contact_email: contactEmail,
          status: 'booked',
          seat_preferences: seat_prefs_for_db.length ? seat_prefs_for_db : [],
          duration_minutes: duration,
        },
      });
      onSuccess();
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation. Check console or try again.');
    }
  }

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

  const [opt1, opt2, opt3] = allSets;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 relative">
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
            {/* Date + Party */}
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
                <input
                  type="number"
                  min={1}
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Select a time --</option>
                {timeslots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
              >
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={120}>120</option>
                <option value={180}>180</option>
                <option value={240}>240</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Enter full name"
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(671) 555-1234"
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="guest@example.com"
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Seat Preferences => 3 sets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seat Preferences (Optional)</label>
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
                  className="mt-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                  disabled={layoutLoading}
                >
                  {opt1.length || opt2.length || opt3.length
                    ? 'Edit Seat Preferences'
                    : 'Select Seat Preferences'
                  }
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
