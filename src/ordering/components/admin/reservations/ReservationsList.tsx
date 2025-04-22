// src/ordering/components/admin/reservations/ReservationsList.tsx
import { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Users, Phone, Mail } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatPhoneNumber } from '../../../../shared/utils/formatters';

import { useDateFilter } from '../../../../reservations/context/DateFilterContext';
import ReservationModal from '../../../../reservations/components/ReservationModal';
import ReservationFormModal from '../../../../reservations/components/ReservationFormModal';

// Import tenant utilities for proper tenant isolation
import { validateRestaurantContext, addRestaurantIdToParams } from '../../../../shared/utils/tenantUtils';

import {
  fetchReservations as apiFetchReservations,
  deleteReservation as apiDeleteReservation,
} from '../../../../reservations/services/api';

/** Shape of a Reservation. */
interface Reservation {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  party_size?: number;
  status?: string; // e.g. "booked", "seated", etc.
  seat_labels?: string[];
  seat_preferences?: string[][];
  start_time?: string; // e.g. "2025-01-22T18:00:00Z"
  restaurant_id?: number; // Added for tenant isolation
}

// Utility for parse/format:
function parseDateFilter(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatYYYYMMDD(dateObj: Date): string {
  return dateObj.toISOString().split('T')[0];
}

interface ReservationsListProps {
  restaurantId?: string | number;
}

export function ReservationsList({ restaurantId }: ReservationsListProps) {
  // Ensure we have a valid restaurant context
  useEffect(() => {
    validateRestaurantContext(restaurantId);
  }, [restaurantId]);

  // "global" date filter from context
  const { date, setDate } = useDateFilter();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch reservations whenever "date" changes or restaurantId changes
  useEffect(() => {
    fetchReservations();
  }, [date, restaurantId]);

  async function fetchReservations() {
    try {
      setIsLoading(true);
      // The API expects a date string parameter in YYYY-MM-DD format
      // The date from context is already in YYYY-MM-DD format (string)
      // Add restaurant_id to params for tenant isolation
      const params = addRestaurantIdToParams({ date }, restaurantId);
      const data = await apiFetchReservations(params.date);
      
      // Sort earliest -> latest
      const sorted = (data as Reservation[]).slice().sort((a: Reservation, b: Reservation) => {
        const dateA = new Date(a.start_time || '').getTime();
        const dateB = new Date(b.start_time || '').getTime();
        return dateA - dateB;
      });
      
      setReservations(sorted);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Searching
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

  // Row click => open detail
  function handleRowClick(res: Reservation) {
    setSelectedReservation(res);
  }

  // Date nav => previous/next day
  function handlePrevDay() {
    const current = parseDateFilter(date);
    current.setDate(current.getDate() - 1);
    setDate(formatYYYYMMDD(current));
  }
  
  function handleNextDay() {
    const current = parseDateFilter(date);
    current.setDate(current.getDate() + 1);
    setDate(formatYYYYMMDD(current));
  }

  // Creating a new reservation => open form modal
  function handleCreateNewReservation() {
    setShowCreateModal(true);
  }

  // After create => refresh & close modal
  async function handleReservationCreated() {
    setShowCreateModal(false);
    await fetchReservations();
  }

  // After update => refresh & close modal
  async function handleReservationUpdated() {
    setSelectedReservation(null);
    await fetchReservations();
  }

  // Delete => confirm, then delete
  async function handleDeleteReservation(id: number | string) {
    if (window.confirm('Are you sure you want to delete this reservation?')) {
      try {
        // Convert id to number if needed - API expects a number
        const numericId = typeof id === 'string' ? parseInt(id) : id;
        await apiDeleteReservation(numericId);
        setSelectedReservation(null);
        await fetchReservations();
      } catch (err) {
        console.error('Error deleting reservation:', err);
      }
    }
  }

  // Format time for display (e.g. "6:30 PM")
  function formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // Render status badges with consistent styling
  function renderStatusBadge(status?: string) {
    if (!status) return null;
    
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'booked':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'seated':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'completed':
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        break;
      case 'no-show':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'cancelled':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {status}
      </span>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with search, filter, and date navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search reservations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/50 focus:border-hafaloha-gold/50"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          
          {/* Filter button - placeholder for future filter options */}
          <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Date navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevDay}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          
          <DatePicker
            selected={parseDateFilter(date)}
            onChange={(date) => setDate(formatYYYYMMDD(date as Date))}
            dateFormat="MMMM d, yyyy"
            className="border border-gray-300 rounded-md px-4 py-2 text-center focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/50 focus:border-hafaloha-gold/50"
          />
          
          <button
            onClick={handleNextDay}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Create new reservation button */}
        <button
          onClick={handleCreateNewReservation}
          className="px-4 py-2 bg-hafaloha-gold text-white rounded-md hover:bg-hafaloha-gold/90 transition-colors"
        >
          New Reservation
        </button>
      </div>
      
      {/* Reservations table */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-grow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Party
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading reservations...
                  </td>
                </tr>
              ) : searchedReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No reservations found for this date.
                  </td>
                </tr>
              ) : (
                searchedReservations.map((res) => (
                  <tr
                    key={res.id}
                    onClick={() => handleRowClick(res)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(res.start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {res.contact_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        {res.party_size || '?'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {res.contact_phone && (
                        <div className="flex items-center mb-1">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {formatPhoneNumber(res.contact_phone)}
                        </div>
                      )}
                      {res.contact_email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1 text-gray-400" />
                          {res.contact_email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {res.seat_labels?.join(', ') || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(res.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Reservation detail modal */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          // @ts-ignore - The imported component has different props than we're using
          onUpdate={handleReservationUpdated}
          onDelete={() => handleDeleteReservation(selectedReservation.id)}
          // @ts-ignore - The imported component has different props than we're using
          restaurantId={restaurantId}
        />
      )}
      
      {/* Create reservation modal */}
      {showCreateModal && (
        <ReservationFormModal
          onClose={() => setShowCreateModal(false)}
          // @ts-ignore - The imported component has different props than we're using
          onCreated={handleReservationCreated}
          initialDate={date}
          // @ts-ignore - The imported component has different props than we're using
          restaurantId={restaurantId}
        />
      )}
    </div>
  );
}

export default ReservationsList;
