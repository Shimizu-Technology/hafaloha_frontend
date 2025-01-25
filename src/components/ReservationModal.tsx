// src/components/ReservationModal.tsx

import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import { fetchLayout, updateReservation } from '../services/api';
import SeatPreferenceMapModal from './SeatPreferenceMapModal';
import type { SeatSectionData } from './SeatLayoutCanvas';

interface Reservation {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  party_size?: number;
  status?: string;
  start_time?: string;  // e.g. "2025-01-25T19:00:00"
  created_at?: string;
  seat_preferences?: string[][];   // up to 3 sets
  seat_labels?: string[];          // actual assigned seats
  duration_minutes?: number;
}

interface Props {
  reservation: Reservation;
  onClose: () => void;
  onDelete?: (id: number) => void;
}

export default function ReservationModal({
  reservation,
  onClose,
  onDelete,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  // Basic fields
  const [guestName, setGuestName]       = useState(reservation.contact_name || '');
  const [partySize, setPartySize]       = useState(reservation.party_size || 1);
  const [contactPhone, setContactPhone] = useState(reservation.contact_phone || '');
  const [contactEmail, setContactEmail] = useState(reservation.contact_email || '');
  const [status, setStatus]             = useState(reservation.status || 'booked');
  const [duration, setDuration]         = useState(reservation.duration_minutes ?? 60);

  // We want to handle up to 3 preference sets
  // If reservation.seat_preferences has e.g. [ ["Seat #1","Seat #2"], ["Seat #3"] , ["A1"] ], we'll store that
  const [allSets, setAllSets] = useState<string[][]>(
    reservation.seat_preferences?.length
      ? reservation.seat_preferences
      : [[], [], []]
  );

  // For seat map modal
  const [layoutSections, setLayoutSections] = useState<SeatSectionData[]>([]);
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);

  // Format createdAt
  const createdAtStr = reservation.created_at
    ? new Date(reservation.created_at).toLocaleString('en-US', {
        timeZone: 'Pacific/Guam',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  // Format startTime
  const startTimeDate = reservation.start_time
    ? new Date(reservation.start_time)
    : null;

  const startTimeStr = startTimeDate
    ? startTimeDate.toLocaleString('en-US', {
        timeZone: 'Pacific/Guam',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  // Load layout for seat map usage
  useEffect(() => {
    async function loadLayout() {
      try {
        const layout = await fetchLayout(1);
        const sections: SeatSectionData[] = layout.seat_sections.map((sec: any) => ({
          id: sec.id,
          name: sec.name,
          section_type: sec.section_type === 'table' ? 'table' : 'counter',
          offset_x: sec.offset_x,
          offset_y: sec.offset_y,
          floor_number: sec.floor_number ?? 1,
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
        console.error('Error loading layout:', err);
      }
    }
    loadLayout();
  }, []);

  // Action: Save changes
  async function handleSave() {
    try {
      // Filter out empty sets
      const seat_preferences = allSets.filter(arr => arr.length > 0);
      await updateReservation(reservation.id, {
        contact_name: guestName,
        party_size: partySize,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        status,
        seat_preferences,
        duration_minutes: duration,
      });
      setIsEditing(false);
      onClose();  // or just refresh
    } catch (err) {
      console.error('Failed to update reservation:', err);
      alert('Error updating reservation. Check console.');
    }
  }

  function handleDelete() {
    if (onDelete) {
      onDelete(reservation.id);
    }
  }

  // Seat Map Modal: open => staff can pick up to 3 sets
  function handleOpenSeatMap() {
    setShowSeatMapModal(true);
  }
  function handleCloseSeatMap() {
    setShowSeatMapModal(false);
  }
  function handleSeatMapSave(newSets: string[][]) {
    // staff has possibly chosen 1..3 sets
    setAllSets(newSets);
    setShowSeatMapModal(false);
  }

  // Render seat preferences in view mode
  function renderAllSetsView() {
    if (!reservation.seat_preferences || reservation.seat_preferences.length === 0) {
      return '(none)';
    }
    return reservation.seat_preferences
      .map((arr, idx) => {
        if (!arr.length) return null;
        return `Option ${idx+1}: ${arr.join(', ')}`;
      })
      .filter(Boolean)
      .join(' | ');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg relative px-6 py-5">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <XCircle className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Reservation Details
        </h2>

        {!isEditing ? (
          /* VIEW MODE */
          <div className="space-y-3 text-gray-700">
            <div>
              <strong>Guest:</strong> {reservation.contact_name || '(none)'}
            </div>
            <div>
              <strong>Date/Time:</strong> {startTimeStr || '(none)'}
            </div>
            <div>
              <strong>Party Size:</strong> {reservation.party_size ?? '(none)'}
            </div>
            <div>
              <strong>Duration (min):</strong> {reservation.duration_minutes ?? 60}
            </div>
            <div>
              <strong>Phone:</strong> {reservation.contact_phone || '(none)'}
            </div>
            <div>
              <strong>Email:</strong> {reservation.contact_email || '(none)'}
            </div>
            <div>
              <strong>Status:</strong>{' '}
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
                {reservation.status || 'N/A'}
              </span>
            </div>
            {createdAtStr && (
              <div>
                <strong>Created At:</strong> {createdAtStr}
              </div>
            )}

            {/* seat_preferences => show all 3 options if present */}
            <div>
              <strong>Preferred Seats:</strong>{' '}
              {renderAllSetsView()}
            </div>

            {/* seat_labels => currently assigned seats */}
            {reservation.seat_labels?.length ? (
              <div>
                <strong>Current Seats:</strong> {reservation.seat_labels.join(', ')}
              </div>
            ) : null}
          </div>
        ) : (
          /* EDIT MODE */
          <div className="space-y-4 text-gray-700">
            <div>
              <label className="block text-sm font-semibold mb-1">Guest Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Party Size</label>
              <input
                type="number"
                min={1}
                value={partySize}
                onChange={(e) => setPartySize(+e.target.value || 1)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Duration (minutes)</label>
              <input
                type="number"
                min={30}
                step={30}
                value={duration}
                onChange={(e) => setDuration(+e.target.value || 60)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="booked">booked</option>
                <option value="reserved">reserved</option>
                <option value="seated">seated</option>
                <option value="finished">finished</option>
                <option value="canceled">canceled</option>
                <option value="no_show">no_show</option>
              </select>
            </div>

            {/* seat_preferences => 3 sets => staff opens seat map to choose */}
            <div>
              <label className="block text-sm font-semibold mb-1">Seat Preferences (all 3)</label>
              <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                {allSets.map((arr, idx) => (
                  <div key={idx} className="text-xs italic">
                    Option {idx+1}: {arr.length ? arr.join(', ') : '(none)'}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleOpenSeatMap}
                  className="mt-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                >
                  Edit Seat Preferences
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Edit
              </button>
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-orange-200 text-orange-900 rounded hover:bg-orange-300"
                >
                  Delete
                </button>
              )}
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

      {showSeatMapModal && (
        <SeatPreferenceMapModal
          date={reservation.start_time ? reservation.start_time.slice(0, 10) : ''}
          time={reservation.start_time ? reservation.start_time.slice(11, 16) : ''}
          duration={duration}
          partySize={partySize}
          sections={layoutSections}
          // pass all 3 sets so staff can see/edit them
          initialPreferences={allSets}
          onSave={handleSeatMapSave}
          onClose={handleCloseSeatMap}
        />
      )}
    </div>
  );
}
