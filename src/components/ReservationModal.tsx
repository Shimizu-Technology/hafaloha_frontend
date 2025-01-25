import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';

interface Reservation {
  id: number;
  contact_name?:  string;
  contact_phone?: string;
  contact_email?: string;
  party_size?:    number;
  status?:        string;  
  start_time?:    string;
  created_at?:    string;  
  seat_preferences?: string[][]; 
  seat_labels?:   string[];
  duration_minutes?: number; // <--- NEW
}

/** 
 * Props:
 *  - onEdit, onDelete are optional but if provided, the modal shows Edit/Delete.
 */
interface Props {
  reservation: Reservation;
  onClose: () => void;
  onEdit?:   (updated: Reservation) => void;
  onDelete?: (id: number) => void;
}

export default function ReservationModal({
  reservation,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  // Basic fields
  const [guestName, setGuestName]       = useState(reservation.contact_name || '');
  const [partySize, setPartySize]       = useState(reservation.party_size || 1);
  const [contactPhone, setContactPhone] = useState(reservation.contact_phone || '');
  const [contactEmail, setContactEmail] = useState(reservation.contact_email || '');
  const [status, setStatus]             = useState(reservation.status || 'booked');

  // NEW: duration
  const [duration, setDuration] = useState(
    reservation.duration_minutes !== undefined ? reservation.duration_minutes : 60
  );

  // seat prefs
  const [pref1, setPref1] = useState('');
  const [pref2, setPref2] = useState('');
  const [pref3, setPref3] = useState('');

  useEffect(() => {
    if (reservation.seat_preferences) {
      const [p1, p2, p3] = reservation.seat_preferences;
      setPref1(p1 ? p1.join(', ') : '');
      setPref2(p2 ? p2.join(', ') : '');
      setPref3(p3 ? p3.join(', ') : '');
    }
  }, [reservation.seat_preferences]);

  // Format createdAt
  let createdAtStr = '';
  if (reservation.created_at) {
    const cDate = new Date(reservation.created_at);
    createdAtStr = cDate.toLocaleString('en-US', {
      timeZone: 'Pacific/Guam',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Format startTime
  let startTimeStr = '';
  if (reservation.start_time) {
    const d = new Date(reservation.start_time);
    startTimeStr = d.toLocaleString('en-US', {
      timeZone: 'Pacific/Guam',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function handleSave() {
    if (!onEdit) return;
    const newPrefs: string[][] = [];
    if (pref1.trim()) newPrefs.push(pref1.split(',').map(s => s.trim()));
    if (pref2.trim()) newPrefs.push(pref2.split(',').map(s => s.trim()));
    if (pref3.trim()) newPrefs.push(pref3.split(',').map(s => s.trim()));

    onEdit({
      ...reservation,
      contact_name:  guestName,
      party_size:    partySize,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      status,
      seat_preferences: newPrefs,
      duration_minutes: duration, // <--- pass it back
    });
    setIsEditing(false);
  }

  // A small helper for color-coded status labels
  function renderStatusPill(st?: string) {
    const s = st || '';
    let bg   = 'bg-gray-100', text = 'text-gray-800', label = s;
    if      (s === 'booked')   { bg='bg-orange-100'; text='text-orange-800'; }
    else if (s === 'reserved') { bg='bg-yellow-100'; text='text-yellow-800'; }
    else if (s === 'seated')   { bg='bg-green-100';  text='text-green-800';  }
    else if (s === 'finished') { bg='bg-gray-300';   text='text-gray-800';   }
    else if (s === 'canceled') { bg='bg-red-100';    text='text-red-800';    }
    else if (s === 'no_show')  { bg='bg-red-100';    text='text-red-800';    }

    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${bg} ${text}`}>
        {label || 'N/A'}
      </span>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg relative px-6 py-5">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <XCircle className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-900">Reservation Details</h2>

        {!isEditing ? (
          <div className="space-y-3 text-gray-700">
            <div><strong>Guest:</strong> {reservation.contact_name || 'N/A'}</div>
            <div><strong>Date/Time:</strong> {startTimeStr || 'N/A'}</div>
            <div><strong>Party Size:</strong> {reservation.party_size ?? 'N/A'}</div>
            <div><strong>Duration (min):</strong> {reservation.duration_minutes ?? 60}</div>
            <div><strong>Phone:</strong> {reservation.contact_phone || 'N/A'}</div>
            <div><strong>Email:</strong> {reservation.contact_email || 'N/A'}</div>
            <div><strong>Status:</strong> {renderStatusPill(reservation.status)}</div>

            {createdAtStr && (
              <div><strong>Created At:</strong> {createdAtStr}</div>
            )}
            {/* seat_preferences if any */}
            {!!reservation.seat_preferences?.length && (
              <div>
                <strong>Preferred Seats:</strong>
                <ul className="list-disc ml-6 text-sm">
                  {reservation.seat_preferences.map((set, i) => (
                    <li key={i}>{set.join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* seat_labels if occupant is actually assigned seats */}
            {!!reservation.seat_labels?.length && (
              <div>
                <strong>Current Seats:</strong> {reservation.seat_labels.join(', ')}
              </div>
            )}
          </div>
        ) : (
          // Editing form
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
            {/* seat prefs editing: pref1/pref2/pref3 */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                Preference #1 (comma‐separated)
              </label>
              <input
                type="text"
                value={pref1}
                onChange={(e) => setPref1(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Preference #2</label>
              <input
                type="text"
                value={pref2}
                onChange={(e) => setPref2(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Preference #3</label>
              <input
                type="text"
                value={pref3}
                onChange={(e) => setPref3(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-2">
          {!isEditing ? (
            <>
              {onEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(reservation.id)}
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
    </div>
  );
}
