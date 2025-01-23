// src/components/ReservationModal.tsx

import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import type { Reservation } from '../types'; // or define the interface locally

interface Props {
  reservation: Reservation;
  onClose: () => void;
  onDelete: (id: number) => void;
  onEdit: (updated: Reservation) => void;
}

export default function ReservationModal({
  reservation,
  onClose,
  onDelete,
  onEdit,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  // Basic fields
  const [partySize, setPartySize] = useState(reservation.party_size || 1);
  const [contactName, setContactName] = useState(reservation.contact_name || '');
  const [contactPhone, setContactPhone] = useState(reservation.contact_phone || '');
  const [contactEmail, setContactEmail] = useState(reservation.contact_email || '');
  const [status, setStatus] = useState(reservation.status || 'booked');

  // Up to 3 seat preference fields (each is a single string).
  // We'll store them temporarily as strings like "A1,A2" or "A1 A2" and parse on Save.
  const [pref1, setPref1] = useState('');
  const [pref2, setPref2] = useState('');
  const [pref3, setPref3] = useState('');

  // On mount (or whenever reservation changes), we can set the initial preferences
  useEffect(() => {
    if (!reservation.seat_preferences) return;
    // seat_preferences is an array of arrays, e.g. [["A1","A2"],["B5"]]
    // We'll just join each sub-array with a comma for editing
    const [p1, p2, p3] = reservation.seat_preferences;
    setPref1(p1 ? p1.join(',') : '');
    setPref2(p2 ? p2.join(',') : '');
    setPref3(p3 ? p3.join(',') : '');
  }, [reservation]);

  // Helper: parse a string like "A1,A2" => ["A1","A2"]
  function parseSeatPref(str: string): string[] {
    // Trim, split by comma, remove empties
    return str
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  const handleSave = () => {
    // Convert pref1/2/3 into arrays
    const seatPrefs: string[][] = [];
    if (pref1.trim()) seatPrefs.push(parseSeatPref(pref1));
    if (pref2.trim()) seatPrefs.push(parseSeatPref(pref2));
    if (pref3.trim()) seatPrefs.push(parseSeatPref(pref3));

    onEdit({
      ...reservation,
      party_size: partySize,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      status: status,
      seat_preferences: seatPrefs,
    });
  };

  // We'll parse the date/time for display in Guam
  const dt = new Date(reservation.start_time || '');
  const dateStr = dt.toLocaleDateString('en-US', {
    timeZone: 'Pacific/Guam',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = dt.toLocaleTimeString('en-US', {
    timeZone: 'Pacific/Guam',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateTimeDisplay = `${dateStr} at ${timeStr}`;

  // Helper for color-coded status chip
  const statusChip = (s?: string) => {
    switch (s) {
      case 'booked':
        return (
          <span className="inline-block px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">
            booked
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-block px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
            canceled
          </span>
        );
      case 'seated':
        return (
          <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
            seated
          </span>
        );
      case 'reserved':
        return (
          <span className="inline-block px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
            reserved
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-1 rounded-full bg-gray-200 text-gray-800 text-xs font-semibold">
            {s || 'N/A'}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg relative px-6 py-5">
        {/* Close Icon (top-right) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <XCircle className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-900">Reservation Details</h2>

        {!isEditing ? (
          <div className="space-y-3 text-gray-700">
            <div>
              <span className="font-semibold">Guest:</span>{' '}
              {reservation.contact_name || 'N/A'}
            </div>
            <div>
              <span className="font-semibold">Date/Time:</span>{' '}
              {dateTimeDisplay}
            </div>
            <div>
              <span className="font-semibold">Party Size:</span>{' '}
              {reservation.party_size ?? 'N/A'}
            </div>
            <div>
              <span className="font-semibold">Phone:</span>{' '}
              {reservation.contact_phone || 'N/A'}
            </div>
            <div>
              <span className="font-semibold">Email:</span>{' '}
              {reservation.contact_email || 'N/A'}
            </div>
            <div className="flex items-center">
              <span className="font-semibold mr-1">Status:</span>
              {statusChip(reservation.status)}
            </div>

            {/* Read-only seat preferences */}
            {reservation.seat_preferences && reservation.seat_preferences.length > 0 && (
              <div>
                <span className="font-semibold">Preferred Seats:</span>
                <ul className="list-disc list-inside ml-4 text-sm mt-1">
                  {reservation.seat_preferences.map((prefSet, idx) => (
                    <li key={idx}>
                      {prefSet.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          // Simple inline editing form
          <div className="space-y-3 text-gray-700">
            <div>
              <label className="block text-sm font-semibold mb-1">Guest Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Party Size</label>
                <input
                  type="number"
                  min={1}
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                >
                  <option value="booked">booked</option>
                  <option value="reserved">reserved</option>
                  <option value="canceled">canceled</option>
                  <option value="seated">seated</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Seat Preferences Fields */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                Seat Preference #1 (comma‐separated)
              </label>
              <input
                type="text"
                value={pref1}
                onChange={(e) => setPref1(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                placeholder="e.g. A1,A2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Seat Preference #2 (optional)
              </label>
              <input
                type="text"
                value={pref2}
                onChange={(e) => setPref2(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                placeholder="e.g. B1,B2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Seat Preference #3 (optional)
              </label>
              <input
                type="text"
                value={pref3}
                onChange={(e) => setPref3(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500"
                placeholder="e.g. C1"
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex justify-end space-x-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(reservation.id!)}
                className="px-4 py-2 bg-orange-200 text-orange-900 rounded hover:bg-orange-300"
              >
                Delete
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
