// src/components/dashboard/ReservationsTab.tsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Users, Phone, Mail } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { useDateFilter } from '../../context/DateFilterContext'; // <-- Use our context
import ReservationModal from '../ReservationModal';
import ReservationFormModal from '../ReservationFormModal';

import {
  fetchReservations as apiFetchReservations,
  deleteReservation as apiDeleteReservation,
  updateReservation as apiUpdateReservation,
} from '../../services/api';

/** The shape of a Reservation from the server. */
interface Reservation {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  party_size?: number;
  status?: string; // "booked", "reserved", "seated", etc.
  seat_labels?: string[];
  seat_preferences?: string[][];
  start_time?: string; // e.g. "2025-01-22T18:00:00Z"
}

// Utility for parse/format:
function parseDateFilter(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}
function formatYYYYMMDD(dateObj: Date): string {
  return dateObj.toISOString().split('T')[0];
}

export default function ReservationsTab() {
  // Instead of local state, we use the “global date” from our context:
  const { date, setDate } = useDateFilter();

  // Data
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Searching
  const [searchTerm, setSearchTerm] = useState('');

  // For editing/creating reservations
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch reservations whenever “date” changes
  useEffect(() => {
    fetchReservations();
  }, [date]);

  async function fetchReservations() {
    try {
      const data = await apiFetchReservations({ date });
      // Sort earliest -> latest
      const sorted = data.slice().sort((a, b) => {
        const dateA = new Date(a.start_time || '').getTime();
        const dateB = new Date(b.start_time || '').getTime();
        return dateA - dateB;
      });
      setReservations(sorted);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  }

  // Searching logic
  const searchedReservations = reservations.filter((r) => {
    const name  = r.contact_name?.toLowerCase() ?? '';
    const phone = r.contact_phone ?? '';
    const email = r.contact_email?.toLowerCase() ?? '';
    const sTerm = searchTerm.toLowerCase();
    return (
      name.includes(sTerm) ||
      phone.includes(searchTerm) ||
      email.includes(sTerm)
    );
  });

  // Row click => open detail modal
  function handleRowClick(res: Reservation) {
    setSelectedReservation(res);
  }

  // Date arrow nav => changes the “global” date
  function handlePrevDay() {
    const current = parseDateFilter(date);
    current.setDate(current.getDate() - 1);
    setDate(formatYYYYMMDD(current)); // updates context => triggers re‐fetch
  }
  function handleNextDay() {
    const current = parseDateFilter(date);
    current.setDate(current.getDate() + 1);
    setDate(formatYYYYMMDD(current));
  }

  // Creating a new reservation => open ReservationFormModal
  function handleCreateNewReservation() {
    setShowCreateModal(true);
  }
  function handleCloseCreateModal() {
    setShowCreateModal(false);
  }
  async function handleCreateReservationSuccess() {
    setShowCreateModal(false);
    await fetchReservations();
  }

  // Delete or Edit a reservation
  async function handleDeleteReservation(id: number) {
    try {
      await apiDeleteReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setSelectedReservation(null);
    } catch (err) {
      console.error('Failed to delete reservation:', err);
    }
  }
  async function handleEditReservation(updated: Reservation) {
    try {
      const patchData: any = {
        party_size: updated.party_size,
        contact_name: updated.contact_name,
        contact_phone: updated.contact_phone,
        contact_email: updated.contact_email,
        status: updated.status,
      };
      if (updated.seat_preferences) {
        patchData.seat_preferences = updated.seat_preferences;
      }
      await apiUpdateReservation(updated.id, patchData);
      await fetchReservations();
      setSelectedReservation(null);
    } catch (err) {
      console.error('Failed to update reservation:', err);
    }
  }

  function handleCloseModal() {
    setSelectedReservation(null);
  }

  // Convert context’s date => Date object for react-datepicker
  const parsedDate = parseDateFilter(date);

  return (
    <div className="bg-white shadow rounded-md p-4">
      {/* Date filter / search */}
      <div className="border-b border-gray-200 bg-gray-50 rounded-md p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-auto flex-1">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reservations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 
                           rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Date nav */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevDay}
                className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                title="Previous day"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              {/* The date picker w/ Filter icon */}
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <DatePicker
                  selected={parsedDate}
                  onChange={(selectedDate: Date | null) => {
                    if (!selectedDate) return;
                    setDate(formatYYYYMMDD(selectedDate)); // global date
                  }}
                  dateFormat="MM/dd/yyyy"
                  popperProps={{ strategy: 'fixed' }}
                  className="pl-10 pr-4 py-2 w-36 border border-gray-300 
                             rounded-md focus:ring-2 focus:ring-orange-500 
                             focus:border-orange-500 text-sm"
                />
              </div>

              <button
                onClick={handleNextDay}
                className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                title="Next day"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
          {/* New Reservation button */}
          <div className="flex justify-end">
            <button
              onClick={handleCreateNewReservation}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
            >
              + New Reservation
            </button>
          </div>
        </div>
      </div>

      {/* Reservations table */}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-[700px] table-auto divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Guest
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Party Size
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {searchedReservations.map((res) => {
              const dt = new Date(res.start_time || '');
              const dateStr = dt.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
              });
              const timeStr = dt.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
              const seatLabelText = res.seat_labels?.length
                ? `(Seated at ${res.seat_labels.join(', ')})`
                : '';

              return (
                <tr
                  key={res.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRowClick(res)}
                >
                  <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                    {`${dateStr}, ${timeStr}`}
                  </td>
                  <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                    {res.contact_name ?? 'N/A'}
                    {seatLabelText && (
                      <span className="text-xs text-green-600 ml-1">{seatLabelText}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      {res.party_size ?? 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      {res.contact_phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-1" />
                          {res.contact_phone}
                        </div>
                      )}
                      {res.contact_email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-1" />
                          {res.contact_email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Show colored badges for each status */}
                    {renderStatusBadge(res.status)}
                  </td>
                </tr>
              );
            })}
            {searchedReservations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No reservations found for this date or search term.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reservation detail Modal */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onDelete={handleDeleteReservation}
          onEdit={handleEditReservation}
        />
      )}

      {/* New Reservation Modal => pass date as defaultDate */}
      {showCreateModal && (
        <ReservationFormModal
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateReservationSuccess}
          defaultDate={date} // pass the “global” date
        />
      )}
    </div>
  );
}

/** Helper to show a color-coded badge for each reservation status. */
function renderStatusBadge(status?: string) {
  switch (status) {
    case 'booked':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold
          rounded-full bg-orange-100 text-orange-800">
          booked
        </span>
      );
    case 'reserved':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold
          rounded-full bg-yellow-100 text-yellow-800">
          reserved
        </span>
      );
    case 'seated':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold
          rounded-full bg-green-100 text-green-800">
          seated
        </span>
      );
    case 'finished':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold
          rounded-full bg-gray-300 text-gray-800">
          finished
        </span>
      );
    case 'canceled':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold
          rounded-full bg-red-100 text-red-800">
          canceled
        </span>
      );
    case 'no_show':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold
          rounded-full bg-red-100 text-red-800">
          no_show
        </span>
      );
    default:
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold
          rounded-full bg-gray-100 text-gray-800">
          {status ?? 'N/A'}
        </span>
      );
  }
}
