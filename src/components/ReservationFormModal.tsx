// src/components/ReservationFormModal.tsx
import React, { useState, useEffect } from 'react';
import { fetchAvailability, createReservation } from '../services/api';
import SeatPreferenceWizard from './SeatPreferenceWizard';

interface Props {
  onClose: () => void;
  onSuccess: () => void; // if creation is successful
}

/**
 * Admin's "New Reservation" modal.
 * They can optionally open the "SeatPreferenceWizard" 
 * to pick up to 3 seat sets for seat_preferences.
 */
export default function ReservationFormModal({ onClose, onSuccess }: Props) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState<number>(2);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState('');

  // We'll store timeslots from /availability
  const [timeslots, setTimeslots] = useState<string[]>([]);

  // NEW: seat preferences
  const [seatPreferences, setSeatPreferences] = useState<string[][]>([]);

  // Show/hide seat wizard
  const [showSeatWizard, setShowSeatWizard] = useState(false);

  // fetch timeslots whenever date or partySize changes
  useEffect(() => {
    async function getTimeslots() {
      if (!date || partySize < 1) {
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
    getTimeslots();
  }, [date, partySize]);

  const handleCreate = async () => {
    setError('');

    if (!contactName) {
      setError('Guest name is required.');
      return;
    }
    if (!date || !time) {
      setError('Please pick a valid date/time.');
      return;
    }

    // e.g. "2025-01-20T18:00:00"
    // We rely on the backend to parse it as local Guam time
    const start_time = `${date}T${time}:00`;

    try {
      // We include seat_preferences if any
      await createReservation({
        restaurant_id: 1, // or the admin's restaurant_id
        start_time,
        party_size: partySize,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        status: 'booked',
        seat_preferences: seatPreferences.length > 0 ? seatPreferences : undefined,
      });

      // If successful, close + refresh the parent
      onSuccess();
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation. Check console or try again.');
    }
  };

  // Called by seat wizard upon finishing
  function handleSeatWizardSave(prefs: string[][]) {
    setSeatPreferences(prefs);
    setShowSeatWizard(false);
  }

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
            {/* Date + Party Size */}
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

            {/* Time => dropdown from /availability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Select a time --</option>
                {timeslots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
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

            {/* (Optional) Seat Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seat Preferences (Optional)
              </label>
              {seatPreferences.length > 0 ? (
                <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-gray-600">
                    You have defined {seatPreferences.length} preference set(s).
                  </p>
                  {seatPreferences.map((set, idx) => (
                    <p key={idx} className="text-xs text-gray-800">
                      Choice #{idx + 1}: {set.join(', ')}
                    </p>
                  ))}
                  <button
                    onClick={() => setShowSeatWizard(true)}
                    className="mt-2 text-xs text-blue-600 underline"
                  >
                    Edit Preferences
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSeatWizard(true)}
                  className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                >
                  + Select Seat Preferences
                </button>
              )}
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

      {/* Seat Preference Wizard overlay */}
      {showSeatWizard && (
        <SeatPreferenceWizard
          date={date}
          time={time}
          partySize={partySize}
          initialPreferences={seatPreferences}
          onClose={() => setShowSeatWizard(false)}
          onSave={handleSeatWizardSave}
        />
      )}
    </>
  );
}
