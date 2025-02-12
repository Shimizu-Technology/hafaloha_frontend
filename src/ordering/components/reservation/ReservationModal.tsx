// src/ordering/components/reservation/ReservationModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  Mail,
  MapPin,
  Share2,
} from 'lucide-react';

// Replace the old import from api.ts
// import { fetchAvailability, createReservation } from '../../../reservations/services/api';

// Instead, import your domain hook from the new reservations side:
import { useReservations } from '../../../reservations/hooks/useReservations';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReservationData {
  date: string;
  time: string;
  partySize: number;
  duration: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface ConfirmationData extends ReservationData {
  confirmed: boolean;
}

export function ReservationModal({ isOpen, onClose }: ReservationModalProps) {
  // 1) HOOKS
  const { fetchAvailability, createReservation } = useReservations();

  const [formData, setFormData] = useState<ReservationData>({
    date: '',
    time: '',
    partySize: 1,
    duration: '1 hour',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);

  // For storing fetched time slots from the backend
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Fetch availability whenever date/partySize changes
  useEffect(() => {
    if (!formData.date || !formData.partySize) {
      setTimeSlots([]);
      return;
    }

    (async () => {
      try {
        const data = await fetchAvailability(formData.date, formData.partySize);
        // Suppose data.slots = ["17:00", "17:30", ...]
        setTimeSlots(data.slots || []);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setTimeSlots([]);
      }
    })();
  }, [formData.date, formData.partySize, fetchAvailability]);

  // 2) If not open, bail out after hooks
  if (!isOpen) return null;

  // 3) "Share" button logic & other handlers
  function handleShare() {
    if (!confirmation) return;
    const text = `I just made a reservation at Håfaloha!\n\nDate: ${confirmation.date}
Time: ${confirmation.time}
Party Size: ${confirmation.partySize} people`;
    if (navigator.share) {
      navigator.share({ title: 'Håfaloha Reservation', text }).catch(console.error);
    }
  }

  async function handleSubmitReal(e: React.FormEvent) {
    e.preventDefault();
    // basic validation
    if (!formData.date || !formData.time) {
      alert('Please fill out date and time');
      return;
    }

    try {
      const start_time = `${formData.date}T${formData.time}:00`;

      await createReservation({
        reservation: {
          restaurant_id: 1,
          start_time,
          party_size: formData.partySize,
          contact_name: `${formData.firstName} ${formData.lastName}`.trim(),
          contact_phone: formData.phone,
          contact_email: formData.email,
          status: 'booked',
          duration_minutes: parseDuration(formData.duration),
        },
      });

      // If successful => show confirmation
      setConfirmation({ ...formData, confirmed: true });
    } catch (err) {
      console.error('Failed to create reservation:', err);
      alert('Reservation failed. Check console for details.');
    }
  }

  function parseDuration(durStr: string): number {
    // e.g. "1 hour" => 60, "1.5 hours" => 90
    const num = parseFloat(durStr);
    if (isNaN(num)) return 60;
    return Math.round(num * 60);
  }

  // 4) If user has a `confirmation`, render the "Confirmed" screen
  if (confirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="relative bg-white rounded-lg w-full max-w-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="pt-8 px-6 pb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mt-4">Reservation Confirmed!</h2>
            <p className="mt-2 text-sm text-gray-600">Thank you! We look forward to serving you.</p>

            {/* Confirmation Details */}
            <div className="mt-6 space-y-6 text-left max-w-md mx-auto">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#c1902f]" />
                  Date &amp; Time
                </h4>
                <p className="mt-1 text-gray-600">
                  {confirmation.date} at {confirmation.time}
                </p>
                <p className="text-sm text-gray-500">{confirmation.duration}</p>
              </div>
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#c1902f]" />
                  Party Size
                </h4>
                <p className="mt-1 text-gray-600">
                  {confirmation.partySize} {confirmation.partySize === 1 ? 'person' : 'people'}
                </p>
              </div>
              {(confirmation.phone || confirmation.email) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#c1902f]" />
                    Contact Info
                  </h4>
                  {confirmation.phone && (
                    <p className="mt-1 text-gray-600">{confirmation.phone}</p>
                  )}
                  {confirmation.email && (
                    <p className="text-gray-600">{confirmation.email}</p>
                  )}
                </div>
              )}
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#c1902f]" />
                  Location
                </h4>
                <p className="mt-1 text-gray-600">
                  955 Pale San Vitores Rd
                  <br />
                  Tamuning, Guam 96913
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none rounded-md bg-[#c1902f] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#d4a43f]"
              >
                Done
              </button>
              <button
                onClick={handleShare}
                className="flex-1 sm:flex-none rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <Share2 className="h-4 w-4 inline-block mr-2" />
                Share Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5) Otherwise => the main "Make a Reservation" form
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white rounded-lg w-full max-w-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="pt-8 px-6 pb-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Make a Reservation</h2>
          <p className="text-gray-600">Book your seat for an unforgettable dining experience</p>
        </div>

        <div className="px-6 pb-8">
          <form onSubmit={handleSubmitReal} className="space-y-4">
            {/* Row: date / partySize */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                />
              </div>
              {/* Party Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Party Size</label>
                <select
                  value={formData.partySize}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      partySize: parseInt(e.target.value, 10),
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((size) => (
                    <option key={size} value={size}>
                      {size} {size === 1 ? 'person' : 'people'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: time (loaded from timeSlots) / duration */}
            <div className="grid grid-cols-2 gap-4">
              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <select
                  required
                  value={formData.time}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, time: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                >
                  <option value="">Select a time</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {formatTime(slot)}
                    </option>
                  ))}
                </select>
              </div>
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, duration: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                >
                  <option value="1 hour">1 hour</option>
                  <option value="1.5 hours">1.5 hours</option>
                  <option value="2 hours">2 hours</option>
                </select>
              </div>
            </div>

            {/* Row: firstName / lastName */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                />
              </div>
            </div>

            {/* Row: phone / email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="671-123-4567"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full rounded-md bg-[#c1902f] px-3 py-2
                           text-sm font-semibold text-white shadow-sm
                           hover:bg-[#d4a43f]"
              >
                Reserve Now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helper to format "17:30" => "5:30 PM"
function formatTime(t: string) {
  const [hh, mm] = t.split(':').map(Number);
  if (isNaN(hh)) return t;
  const date = new Date(2020, 0, 1, hh, mm);
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
