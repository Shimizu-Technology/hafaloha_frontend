// src/reservations/components/ReservationModal.tsx

import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import SeatPreferenceMapModal from './SeatPreferenceMapModal';
import type { SeatSectionData } from './SeatLayoutCanvas';

// New domain hooks (adjust paths as necessary):
import { useLayouts } from '../hooks/useLayouts';              // for fetchLayout, maybe updateSeat
import { useSeatAllocations } from '../hooks/useSeatAllocations';  // for fetchSeatAllocations, seatAllocationReserve
import { useReservations } from '../hooks/useReservations';    // for updateReservation, etc.

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
  const [guestName, setGuestName] = useState(reservation.contact_name || '');
  // Store the party size as a string for free editing in edit mode
  const [partySizeText, setPartySizeText] = useState(String(reservation.party_size || 1));
  const [contactPhone, setContactPhone]   = useState(reservation.contact_phone || '');
  const [contactEmail, setContactEmail]   = useState(reservation.contact_email || '');
  const [status, setStatus]               = useState(reservation.status || 'booked');
  const [duration, setDuration]           = useState(reservation.duration_minutes ?? 60);

  // seat_preferences => local state
  const [allSets, setAllSets] = useState<string[][]>(
    reservation.seat_preferences?.length ? reservation.seat_preferences : [[], [], []]
  );

  // For seat layout + allocations
  const [layoutSections, setLayoutSections] = useState<SeatSectionData[]>([]);
  const [occupiedSeatLabels, setOccupiedSeatLabels] = useState<Set<string>>(new Set());

  // For seat map modal
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);

  // Hooks from domain files:
  const { fetchLayout } = useLayouts();                // or fetchLayout(layoutId: number)
  const { fetchSeatAllocations, seatAllocationReserve } = useSeatAllocations(); 
  const { updateReservation } = useReservations();     // or the relevant method name in your useReservations

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

  // ----------------- Load layout + seat allocations for the reservation date ------------------
  useEffect(() => {
    async function loadLayoutAndAllocations() {
      if (!fetchLayout || !fetchSeatAllocations) return; // safeguard if hooks are missing

      try {
        // 1) Layout (example: load layout #1 or the currently active layout)
        const layout = await fetchLayout(1);  // or whatever ID your layout has
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

        // 2) Occupied seats
        if (reservation.start_time) {
          const isoDateOnly = reservation.start_time.slice(0, 10);
          // fetch seat allocations for that date
          const seatAllocs = await fetchSeatAllocations({ date: isoDateOnly });

          // Build a seatId -> label map from the layout data
          const seatIdToLabel: Record<number, string> = {};
          sections.forEach((sec) => {
            sec.seats.forEach((seat) => {
              seatIdToLabel[seat.id] = seat.label;
            });
          });

          // Make a set of currently occupied seat labels
          const occSet = new Set<string>();
          seatAllocs.forEach((alloc: any) => {
            const occupantStatus = alloc.occupant_status;
            const released = alloc.released_at;
            // If occupant_status is "reserved", "seated", or "occupied" and not released => seat is taken
            if (
              !released &&
              (occupantStatus === 'reserved' ||
               occupantStatus === 'seated' ||
               occupantStatus === 'occupied')
            ) {
              const lbl = seatIdToLabel[alloc.seat_id];
              if (lbl) occSet.add(lbl);
            }
          });
          setOccupiedSeatLabels(occSet);
        }
      } catch (err) {
        console.error('Error loading data in ReservationModal:', err);
        toast.error('Failed to load seat data.');
      }
    }
    loadLayoutAndAllocations();
  }, [reservation.start_time, fetchLayout, fetchSeatAllocations]);

  // ---------- Digit-only filter for Party Size (in edit mode) ----------
  function handlePartySizeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPartySizeText(digitsOnly);
  }
  function getPartySize(): number {
    return parseInt(partySizeText, 10) || 1;
  }

  // ---------- Save changes (Edit mode -> Update) ----------
  async function handleSave() {
    try {
      // Filter out empty seat-preference sets
      const seat_preferences = allSets.filter((arr) => arr.length > 0);

      await updateReservation(reservation.id, {
        contact_name:   guestName,
        party_size:     getPartySize(),
        contact_phone:  contactPhone,
        contact_email:  contactEmail,
        status,
        seat_preferences,
        duration_minutes: duration,
      });

      toast.success('Reservation updated!');
      setIsEditing(false);
      onClose();
    } catch (err) {
      console.error('Failed to update reservation:', err);
      toast.error('Error updating reservation. Please try again.');
    }
  }

  // ---------- If user clicks Delete ----------
  function handleDelete() {
    if (!onDelete) return;
    // Typically you'd confirm first
    onDelete(reservation.id);
    toast.success('Reservation deleted.');
  }

  // ---------- Seat Map Modal ----------
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

  // ---------- Attempt seat assignment from a preference set ----------
  async function handleAssignSeatsFromOption(optionIndex: number) {
    // seat_labels from seat_preferences
    const seatLabels = reservation.seat_preferences?.[optionIndex];
    if (!seatLabels || seatLabels.length === 0) {
      toast.error('No seats found in that preference.');
      return;
    }
    if (!reservation.start_time) {
      toast.error('This reservation has no start_time, cannot assign seats.');
      return;
    }

    try {
      // seatAllocationReserve from your new hook:
      await seatAllocationReserve({
        occupant_type: 'reservation',
        occupant_id:   reservation.id,
        seat_labels,
        start_time:    reservation.start_time,
      });
      // Then update the reservation to "reserved"
      await updateReservation(reservation.id, { status: 'reserved' });

      toast.success(`Assigned seats from Option ${optionIndex + 1}!`);
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      console.error('Error assigning seats:', err);
      // handle errors
      toast.error('Failed to assign seats. Check console.');
    }
  }

  function isOptionFullyFree(seatLabels: string[]): boolean {
    return seatLabels.every((lbl) => !occupiedSeatLabels.has(lbl));
  }

  // seat_preferences from the server
  const seatPrefs = reservation.seat_preferences || [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="relative bg-white max-w-md w-full mx-4 rounded-lg shadow-lg">
        {/* Scrollable container */}
        <div className="p-6 max-h-[85vh] overflow-y-auto relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>

          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Reservation Details
          </h2>

          {/* VIEW MODE vs EDIT MODE */}
          {!isEditing ? (
            // ==================== VIEW MODE ====================
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
                <strong>Duration (min):</strong>{' '}
                {reservation.duration_minutes ?? 60}
              </div>
              <div>
                <strong>Phone:</strong> {reservation.contact_phone || '(none)'}
              </div>
              <div>
                <strong>Email:</strong> {reservation.contact_email || '(none)'}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-hafaloha-gold/10 text-hafaloha-gold">
                  {reservation.status || 'N/A'}
                </span>
              </div>
              {reservation.created_at && (
                <div>
                  <strong>Created At:</strong> {createdAtStr}
                </div>
              )}

              {/* seat_preferences => up to 3 sets */}
              <div>
                <strong>Preferred Seats:</strong>{' '}
                {seatPrefs.length ? (
                  seatPrefs.map((arr, idx) => {
                    const joined = arr.join(', ');
                    const canAssign =
                      reservation.status === 'booked' &&
                      arr.length > 0 &&
                      isOptionFullyFree(arr);

                    return (
                      <div key={idx} className="my-1">
                        <span className="font-semibold mr-1">
                          Option {idx + 1}:
                        </span>
                        {joined || '(none)'}
                        {/* If seats exist & are free => show "Assign" */}
                        {canAssign && (
                          <button
                            onClick={() => handleAssignSeatsFromOption(idx)}
                            className="
                              ml-2 text-xs px-2 py-1
                              bg-hafaloha-pink/10
                              text-hafaloha-pink
                              rounded
                              hover:bg-hafaloha-pink/20
                            "
                          >
                            Assign
                          </button>
                        )}
                        {!isOptionFullyFree(arr) && arr.length > 0 && (
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

              {reservation.seat_labels?.length ? (
                <div>
                  <strong>Current Seats:</strong>{' '}
                  {reservation.seat_labels.join(', ')}
                </div>
              ) : null}

              {/* Buttons for VIEW MODE */}
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-hafaloha-gold text-white rounded hover:bg-hafaloha-coral"
                >
                  Edit
                </button>
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
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
              </div>
            </div>
          ) : (
            // ==================== EDIT MODE ====================
            <div className="space-y-4 text-gray-700">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Guest Name
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="
                    w-full p-2 border border-gray-300
                    rounded
                    focus:ring-2 focus:ring-hafaloha-gold focus:border-hafaloha-gold
                  "
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Party Size
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={partySizeText}
                  onChange={handlePartySizeChange}
                  className="
                    w-full p-2 border border-gray-300
                    rounded
                    focus:ring-2 focus:ring-hafaloha-gold focus:border-hafaloha-gold
                  "
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={30}
                  step={30}
                  value={duration}
                  onChange={(e) => setDuration(+e.target.value || 60)}
                  className="
                    w-full p-2 border border-gray-300
                    rounded
                    focus:ring-2 focus:ring-hafaloha-gold focus:border-hafaloha-gold
                  "
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="
                    w-full p-2 border border-gray-300
                    rounded
                    focus:ring-2 focus:ring-hafaloha-gold focus:border-hafaloha-gold
                  "
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="
                    w-full p-2 border border-gray-300
                    rounded
                    focus:ring-2 focus:ring-hafaloha-gold focus:border-hafaloha-gold
                  "
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="
                    w-full p-2 border border-gray-300
                    rounded
                    focus:ring-2 focus:ring-hafaloha-gold focus:border-hafaloha-gold
                  "
                >
                  <option value="booked">booked</option>
                  <option value="reserved">reserved</option>
                  <option value="seated">seated</option>
                  <option value="finished">finished</option>
                  <option value="canceled">canceled</option>
                  <option value="no_show">no_show</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Seat Preferences
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
                    className="
                      mt-2 px-3 py-2 bg-gray-100
                      border border-gray-300
                      rounded hover:bg-gray-200
                      text-sm
                    "
                  >
                    Edit Seat Preferences
                  </button>
                </div>
              </div>

              {/* Buttons for EDIT MODE */}
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={handleSave}
                  className="
                    px-4 py-2
                    bg-hafaloha-gold
                    text-white
                    rounded
                    hover:bg-hafaloha-coral
                  "
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="
                    px-4 py-2
                    bg-gray-200
                    text-gray-800
                    rounded
                    hover:bg-gray-300
                  "
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* If staff wants to open seat map modal */}
      {showSeatMapModal && (
        <SeatPreferenceMapModal
          date={reservation.start_time ? reservation.start_time.slice(0, 10) : ''}
          time={reservation.start_time ? reservation.start_time.slice(11, 16) : ''}
          duration={duration}
          partySize={getPartySize()}
          sections={layoutSections}
          initialPreferences={allSets}
          onSave={handleSeatMapSave}
          onClose={handleCloseSeatMap}
        />
      )}
    </div>
  );
}
