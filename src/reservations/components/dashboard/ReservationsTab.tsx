// src/reservations/components/dashboard/ReservationsTab.tsx
// Enhanced with multi-location support for Phase 2.1
import { useState, useEffect } from 'react';
import { Search, Users, Phone, Mail, AlertCircle, MapPin } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatPhoneNumber } from '../../../shared/utils/formatters';
import * as tenantUtils from '../../../shared/utils/tenantUtils';
import LocationSelector from '../../../ordering/components/customer/LocationSelector';
import { locationsApi } from '../../../shared/api/endpoints/locations';

import { useDateFilter } from '../../context/DateFilterContext';
import ReservationModal from '../ReservationModal';
import ReservationFormModal from '../ReservationFormModal';

import {
  fetchReservations as apiFetchReservations,
  deleteReservation as apiDeleteReservation,
} from '../../services/api';

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
  location_id?: number;
  location?: {
    id: number;
    name: string;
  };
}

// Utility functions for date formatting and parsing
function parseDateFilter(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatYYYYMMDD(dateObj: Date): string {
  return dateObj.toISOString().split('T')[0];
}

function formatStartTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return 'Unknown';
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) return 'Invalid';
  
  // Format as MM/DD/YYYY, H:MM AM/PM
  const dateStr = d.toLocaleDateString();
  const timeStr = d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  
  return `${dateStr}, ${timeStr}`;
}

export default function ReservationsTab() {
  // Global date filter from context
  const { date, setDate } = useDateFilter();

  // Core state management
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);

  // Modal control state
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (showCreateModal) {
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
      body.style.position = 'fixed'; // Prevent iOS scroll bounce
      body.style.width = '100%';
    } else {
      body.style.overflow = '';
      html.style.overflow = '';
      body.style.position = '';
      body.style.width = '';
    }

    return () => {
      body.style.overflow = '';
      html.style.overflow = '';
      body.style.position = '';
      body.style.width = '';
    };
  }, [showCreateModal]);

  // Status and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate tenant context and check for multiple locations on component mount
  useEffect(() => {
    const restaurantId = tenantUtils.getCurrentRestaurantId();
    if (!tenantUtils.validateRestaurantContext({ id: restaurantId }, false)) {
      setError('Unable to access reservations. Restaurant context is missing.');
      return;
    }
    
    // Check if restaurant has multiple locations
    checkForMultipleLocations();
  }, []);

  // Fetch reservations whenever date or selected location changes
  useEffect(() => {
    if (error) return; // Don't fetch if there's a tenant context error
    fetchReservations();
  }, [date, selectedLocationId, error]);
  
  // Check if restaurant has multiple locations
  const checkForMultipleLocations = async () => {
    try {
      const locationsList = await locationsApi.getLocations({ active: true });
      setHasMultipleLocations(locationsList.length > 1);
      
      // If there's exactly one location, set it as the selected location
      if (locationsList.length === 1) {
        setSelectedLocationId(locationsList[0].id);
      }
    } catch (err) {
      console.error('Error checking for multiple locations:', err);
    }
  };

  async function fetchReservations() {
    // Get restaurant ID from context
    const restaurantId = tenantUtils.getCurrentRestaurantId();
    if (!tenantUtils.validateRestaurantContext({ id: restaurantId }, false)) {
      setError('Unable to access reservations. Restaurant context is missing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add restaurant_id to params for tenant isolation
      const params: Record<string, any> = tenantUtils.addRestaurantIdToParams({ date });
      
      // Add location_id to filter by location if selected
      if (selectedLocationId) {
        params.location_id = selectedLocationId;
      }
      
      const data = await apiFetchReservations(params) as Reservation[];
      
      // Sort earliest -> latest
      const sorted = data.slice().sort((a: Reservation, b: Reservation) => {
        const dateA = new Date(a.start_time || '').getTime();
        const dateB = new Date(b.start_time || '').getTime();
        return dateA - dateB;
      });
      setReservations(sorted);
    } catch (err: any) {
      console.error('Error fetching reservations:', err);
      setError(err.message || 'Failed to load reservations. Please try again.');
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter reservations by search term
  const searchedReservations = reservations.filter((r) => {
    const name = r.contact_name?.toLowerCase() ?? '';
    const phone = r.contact_phone ?? '';
    const email = r.contact_email?.toLowerCase() ?? '';
    const sTerm = searchTerm.toLowerCase();
    return (
      name.includes(sTerm) ||
      phone.includes(searchTerm) ||
      email.includes(sTerm)
    );
  });

  // Row click handler to open reservation detail
  function handleRowClick(res: Reservation) {
    setSelectedReservation(res);
  }

  // Modal control handlers
  function handleCloseCreateModal() {
    setShowCreateModal(false);
  }

  async function handleCreateReservationSuccess() {
    setShowCreateModal(false);
    await fetchReservations();
  }

  function handleModalClose() {
    setSelectedReservation(null);
  }

  // Reservation CRUD operations
  async function handleDeleteReservation(id: number) {
    // Get restaurant ID from context
    const restaurantId = tenantUtils.getCurrentRestaurantId();
    if (!tenantUtils.validateRestaurantContext({ id: restaurantId }, false)) {
      setError('Unable to delete reservation. Restaurant context is missing.');
      return;
    }

    setIsLoading(true);
    try {
      await apiDeleteReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setSelectedReservation(null);
    } catch (err: any) {
      console.error('Failed to delete reservation:', err);
      setError(err.message || 'Failed to delete reservation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReservationUpdated() {
    await fetchReservations();
    setSelectedReservation(null);
  }

  // UI helper functions
  function renderStatusBadge(status?: string) {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';

    switch (status?.toLowerCase()) {
      case 'booked':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'confirmed':
      case 'reserved':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'seated':
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        break;
      case 'finished':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'cancelled':
      case 'canceled':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'no_show':
      case 'no-show':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
    }

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
        {status || 'Unknown'}
      </span>
    );
  }

  return (
    <div className="h-full p-4">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0078d4] border-r-transparent align-[-0.125em]"></div>
          <p className="mt-2 text-sm text-gray-600">Loading reservations...</p>
        </div>
      )}

      {/* Heading + search and filter bar */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0">
        <h2 className="text-2xl font-bold text-gray-900">Reservations</h2>

        <div className="flex items-stretch gap-2">
          {/* Date picker */}
          <div className="relative w-44">
            <DatePicker
              selected={parseDateFilter(date)}
              onChange={(newDate: Date | null) => {
                if (newDate) setDate(formatYYYYMMDD(newDate));
              }}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm"
              dateFormat="MMM d, yyyy"
            />
          </div>
          
          {/* Location selector - only show if multiple locations */}
          {hasMultipleLocations && (
            <div className="relative min-w-[150px]">
              <div className="flex items-center">
                <LocationSelector
                  onLocationChange={(locationId) => setSelectedLocationId(locationId)}
                  initialLocationId={selectedLocationId}
                  showOnlyActive={true}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="relative flex-1 min-w-[140px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        
          {/* Add reservation button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#0078d4] text-white rounded-md text-sm font-medium hover:bg-[#50a3d9]"
          >
            + New Reservation
          </button>
        </div>
      </div>

      {/* Reservations table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full table-auto divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/Time
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              {hasMultipleLocations && (
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              )}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {searchedReservations.length === 0 ? (
              <tr>
                <td colSpan={hasMultipleLocations ? 9 : 8} className="px-4 py-4 text-center text-gray-500">
                  {isLoading ? 'Loading...' : 'No reservations found'}
                </td>
              </tr>
            ) : (
              searchedReservations.map((res) => (
                <tr
                  key={res.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRowClick(res)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">#{res.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatStartTime(res.start_time)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{res.contact_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span className="flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {formatPhoneNumber(res.contact_phone)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {res.contact_email || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {res.party_size}
                    </span>
                  </td>
                  {hasMultipleLocations && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {res.location?.name || '—'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {renderStatusBadge(res.status)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(res);
                      }}
                      className="text-[#0078d4] hover:text-[#50a3d9] mr-3"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reservation detail modal */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={handleModalClose}
          onDelete={handleDeleteReservation}
          onRefreshData={handleReservationUpdated}
        />
      )}

      {/* Create reservation modal */}
      {showCreateModal && (
        <ReservationFormModal
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateReservationSuccess}
        />
      )}
    </div>
  );
}
