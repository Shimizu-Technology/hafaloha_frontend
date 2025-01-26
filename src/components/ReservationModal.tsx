import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import {
  fetchLayout,
  fetchSeatAllocations,
  updateReservation,
  seatAllocationReserve,
} from '../services/api';
import SeatPreferenceMapModal from './SeatPreferenceMapModal';
import type { SeatSectionData } from './SeatLayoutCanvas';

interface Reservation {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  party_size?: number;
  status?: string;
  start_time?: string;      // e.g. "2025-01-25T19:00:00Z"
  created_at?: string;
  seat_preferences?: string[][];
  seat_labels?: string[];
  duration_minutes?: number;
}

interface Props {
  reservation: Reservation;
  onClose: () => void;
  onDelete?: (id: number) => void;
  onRefreshData?: () => void; // triggers parent to re-fetch seat data
}

export default function ReservationModal({
  reservation,
  onClose,
  onDelete,
  onRefreshData,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  // Basic fields
  const [guestName, setGuestName]       = useState(reservation.contact_name || '');
  const [partySize, setPartySize]       = useState(reservation.party_size || 1);
  const [contactPhone, setContactPhone] = useState(reservation.contact_phone || '');
  const [contactEmail, setContactEmail] = useState(reservation.contact_email || '');
  const [status, setStatus]             = useState(reservation.status || 'booked');
  const [duration, setDuration]         = useState(reservation.duration_minutes ?? 60);

  // If seat_preferences is populated, store it; else default to 3 empty arrays
  const [allSets, setAllSets] = useState<string[][]>(
    reservation.seat_preferences?.length ? reservation.seat_preferences : [[], [], []]
  );

  // Layout & seat allocations for the date
  const [layoutSections, setLayoutSections] = useState<SeatSectionData[]>([]);
  const [occupiedSeatLabels, setOccupiedSeatLabels] = useState<Set<string>>(new Set());

  // For seat map modal
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
  const startTimeDate = reservation.start_time ? new Date(reservation.start_time) : null;
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

  /**
   * 1) Load the seat layout (to know seat_id => seat_label).
   * 2) Fetch seat allocations for the same date as the reservation’s start_time
   *    to see which seats are currently taken (reserved or seated).
   */
  useEffect(() => {
    async function loadLayoutAndAllocations() {
      try {
        // 1) Layout:
        const layout = await fetchLayout(1); // or your active layout ID
        // Build seat sections with seat labels
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

        // 2) Occupied seats for the date:
        if (reservation.start_time) {
          // Extract just the YYYY-MM-DD part:
          const isoDateOnly = reservation.start_time.slice(0, 10);
          // fetchSeatAllocations({ date: 'YYYY-MM-DD' })
          const seatAllocs = await fetchSeatAllocations({ date: isoDateOnly });

          // Build a map from seat_id => seat_label
          const seatIdToLabel: Record<number, string> = {};
          sections.forEach((sec) => {
            sec.seats.forEach((seat) => {
              seatIdToLabel[seat.id] = seat.label;
            });
          });

          // Make a set of currently occupied seat labels
          // (We consider occupant_status in ["reserved","seated","occupied"] or any
          //  seats that haven't been released_at)
          const occSet = new Set<string>();
          seatAllocs.forEach((alloc: any) => {
            const status = alloc.occupant_status; 
            const released = alloc.released_at;
            // If it's not released, and status is "reserved"/"seated"/"occupied" => mark as taken
            if (!released && (status === 'reserved' || status === 'seated' || status === 'occupied')) {
              const lbl = seatIdToLabel[alloc.seat_id];
              if (lbl) {
                occSet.add(lbl);
              }
            }
          });
          setOccupiedSeatLabels(occSet);
        }
      } catch (err) {
        console.error('Error loading data in ReservationModal:', err);
      }
    }
    loadLayoutAndAllocations();
  }, [reservation.start_time]);

  /** Save changes (guest name, phone, seat_prefs, etc.) */
  async function handleSave() {
    try {
      // Filter out empty sets
      const seat_preferences = allSets.filter((arr) => arr.length > 0);
      await updateReservation(reservation.id, {
        contact_name:   guestName,
        party_size:     partySize,
        contact_phone:  contactPhone,
        contact_email:  contactEmail,
        status,
        seat_preferences,
        duration_minutes: duration,
      });
      setIsEditing(false);
      onClose();
    } catch (err) {
      console.error('Failed to update reservation:', err);
      alert('Error updating reservation. Check console.');
    }
  }

  /** If user clicks Delete */
  function handleDelete() {
    if (onDelete) {
      onDelete(reservation.id);
    }
  }

  /** Open/close the seat map modal */
  function handleOpenSeatMap() {
    setShowSeatMapModal(true);
  }
  function handleCloseSeatMap() {
    setShowSeatMapModal(false);
  }
  function handleSeatMapSave(newSets: string[][]) {
    setAllSets(newSets);
    setShowSeatMapModal(false);
  }

  /**
   * Assign seats from a given preference set (no page reload).
   */
  async function handleAssignSeatsFromOption(optionIndex: number) {
    const seatLabels = reservation.seat_preferences?.[optionIndex];
    if (!seatLabels || seatLabels.length === 0) {
      alert('No seats found in that preference.');
      return;
    }
    if (!reservation.start_time) {
      alert('This reservation has no start_time, cannot assign seats.');
      return;
    }

    try {
      await seatAllocationReserve({
        occupant_type: 'reservation',
        occupant_id:   reservation.id,
        seat_labels: seatLabels,  // rename the key => value
        start_time:    reservation.start_time,
      });
      // Then update the reservation to "reserved"
      await updateReservation(reservation.id, { status: 'reserved' });

      alert(`Assigned seats from Option ${optionIndex + 1}!`);

      if (onRefreshData) {
        onRefreshData(); // triggers parent to refresh seat data
      }
      // optional: onClose();
    } catch (err: any) {
      console.error('Error assigning seats:', err);
      if (err.response?.status === 422) {
        alert('Some seats are already taken. Please choose another preference.');
      } else {
        alert('Failed to assign seats. Check console.');
      }
    }
  }

  /**
   * For each seat‐preference set, we hide the "Assign" button if
   * ANY seat in that preference is in `occupiedSeatLabels`.
   */
  function isOptionFullyFree(seatLabels: string[]): boolean {
    return seatLabels.every((lbl) => !occupiedSeatLabels.has(lbl));
  }

  // ------------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg relative px-6 py-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <XCircle className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-900">Reservation Details</h2>

        {/*  VIEW MODE vs EDIT MODE */}
        {!isEditing ? (
          // ================== VIEW MODE ==================
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

            {/* seat_preferences => up to 3 sets */}
            <div>
              <strong>Preferred Seats:</strong>{' '}
              {reservation.seat_preferences?.length ? (
                reservation.seat_preferences.map((arr, idx) => {
                  const joinedLabels = arr.join(', ');
                  const canAssign = isOptionFullyFree(arr); 
                  const showAssign = (reservation.status === 'booked') && arr.length > 0 && canAssign;
                  
                  return (
                    <div key={idx} className="my-1">
                      <span className="font-semibold mr-1">Option {idx + 1}:</span>
                      {joinedLabels || '(none)'}
                      {/* If seats exist & status === 'booked' & seats not occupied => "Assign" */}
                      {showAssign && (
                        <button
                          className="ml-2 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                          onClick={() => handleAssignSeatsFromOption(idx)}
                        >
                          Assign
                        </button>
                      )}
                      {/* If seats are occupied, show a small hint (optional) */}
                      {!canAssign && arr.length > 0 && (
                        <span className="ml-2 text-xs text-red-500">
                          (Some seat(s) taken)
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                '(none)'
              )}
            </div>

            {/* seat_labels => currently assigned seats */}
            {reservation.seat_labels?.length ? (
              <div>
                <strong>Current Seats:</strong> {reservation.seat_labels.join(', ')}
              </div>
            ) : null}
          </div>
        ) : (
          // ================== EDIT MODE ==================
          <div className="space-y-4 text-gray-700">
            {/* Guest Name */}
            <div>
              <label className="block text-sm font-semibold mb-1">Guest Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            {/* Party Size */}
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
            {/* Duration (minutes) */}
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
            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold mb-1">Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            {/* Status */}
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

            {/* seat_preferences => up to 3 sets => staff can open seat map if needed */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                Seat Preferences (up to 3)
              </label>
              <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                {allSets.map((arr, idx) => (
                  <div key={idx} className="text-xs italic">
                    Option {idx + 1}: {arr.length ? arr.join(', ') : '(none)'}
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

        {/* Bottom Buttons */}
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

      {/* If staff wants to open seat map modal */}
      {showSeatMapModal && (
        <SeatPreferenceMapModal
          date={reservation.start_time ? reservation.start_time.slice(0, 10) : ''}
          time={reservation.start_time ? reservation.start_time.slice(11, 16) : ''}
          duration={duration}
          partySize={partySize}
          sections={layoutSections}
          initialPreferences={allSets}
          onSave={handleSeatMapSave}
          onClose={handleCloseSeatMap}
        />
      )}
    </div>
  );
}
