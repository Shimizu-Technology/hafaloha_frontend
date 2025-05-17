// src/ordering/components/admin/reservations/modals/ReservationModal.tsx

import { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import toastUtils from '../../../../../shared/utils/toastUtils';
import { formatPhoneNumber } from '../../../../../shared/utils/formatters';
import { validateRestaurantContext } from '../../../../../shared/utils/tenantUtils';
import { useRestaurantStore } from '../../../../../shared/store/restaurantStore';

// Import API endpoints
import { updateReservation, deleteReservation } from '../../../../../shared/api/endpoints/reservations';
import { fetchLayout } from '../../../../../shared/api/endpoints/layouts';
import { fetchRestaurant } from '../../../../../shared/api/endpoints/restaurants';

// Types
interface Reservation {
  id: number;
  reservation_number?: string; // Formatted reservation number
  restaurant_id?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  party_size?: number;
  status?: string;
  start_time?: string;      // e.g. "2025-01-25T19:00:00Z"
  created_at?: string;
  special_requests?: string;
  seat_preferences?: string[][];
  seat_labels?: string[];
  duration_minutes?: number;
  location_id?: number;
  location?: {
    id: number;
    name: string;
  };
}

interface SeatSectionData {
  id: number | string;
  name: string;
  section_type: 'table' | 'counter';
  offset_x: number;
  offset_y: number;
  floor_number?: number;
  seats: {
    id: number;
    label: string;
    position_x: number;
    position_y: number;
    capacity?: number;
  }[];
}

interface Props {
  reservation: Reservation;
  onClose: () => void;
  onDelete?: (id: number) => void;
  onRefreshData?: () => void; // triggers parent to re-fetch data
  restaurantId?: number; // Added for tenant isolation
}

export default function ReservationModal({
  reservation,
  onClose,
  onDelete,
  onRefreshData,
  restaurantId,
}: Props) {
  // Error state for tenant validation
  const [error, setError] = useState<string | null>(null);
  
  // State variables
  const [isEditing, setIsEditing] = useState(false);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Basic fields
  const [guestName, setGuestName] = useState(reservation.contact_name || '');
  const [partySizeText, setPartySizeText] = useState(String(reservation.party_size || 1));
  const [contactPhone, setContactPhone] = useState(reservation.contact_phone || '');
  const [contactEmail, setContactEmail] = useState(reservation.contact_email || '');
  const [specialRequests, setSpecialRequests] = useState(reservation.special_requests || '');
  const [status, setStatus] = useState(reservation.status || 'booked');
  const [duration, setDuration] = useState(reservation.duration_minutes ?? 60);

  // Seat preferences
  const [allSets, setAllSets] = useState<string[][]>(
    reservation.seat_preferences?.length ? reservation.seat_preferences : [[], [], []]
  );

  // Layout & seat allocations
  const [layoutSections, setLayoutSections] = useState<SeatSectionData[]>([]);
  const [occupiedSeatLabels, setOccupiedSeatLabels] = useState<Set<string>>(new Set());
  
  // For seat map modal
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);

  // Format dates
  const createdAtStr = reservation.created_at
    ? new Date(reservation.created_at).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const startTimeDate = reservation.start_time ? new Date(reservation.start_time) : null;
  const startTimeStr = startTimeDate
    ? startTimeDate.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  // Get restaurant from store for tenant validation
  const { restaurant } = useRestaurantStore();
  
  // Helper function to get status color classes
  function getStatusColorClass(status: string): string {
    switch(status?.toLowerCase()) {
      case 'booked':
        return 'bg-blue-100 text-blue-800';
      case 'reserved':
        return 'bg-green-100 text-green-800';
      case 'seated':
        return 'bg-purple-100 text-purple-800';
      case 'finished':
        return 'bg-gray-100 text-gray-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'canceled':
        return 'bg-orange-100 text-orange-800';
      case 'no_show':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // -- Validate restaurant context for tenant isolation --
  useEffect(() => {
    if (!restaurantId) {
      const validationResult = validateRestaurantContext(restaurant);
      if (!validationResult) {
        setError('Restaurant context is required');
        return;
      }
    }
  }, [restaurantId, restaurant]);

  // Fetch layout data for seat preferences if reservation has them
  useEffect(() => {
    async function loadLayoutForSeats() {
      try {
        // Get effective restaurant_id from props, reservation, or store
        const effectiveRestaurantId = restaurantId || reservation.restaurant_id || restaurant?.id;
        
        // Exit if we don't have a restaurant ID 
        if (!effectiveRestaurantId) {
          console.error('Missing restaurant context for layout fetch');
          return;
        }
        
        // Fetch layout data
        setLayoutLoading(true);
        
        try {
          // First get the restaurant to find the active layout ID
          const restaurantResponse = await fetchRestaurant(effectiveRestaurantId);
          // Type-safe handling of restaurant data
          const restaurantData = restaurantResponse && typeof restaurantResponse === 'object' && 'data' in restaurantResponse 
            ? restaurantResponse.data as { active_layout_id?: number }
            : { active_layout_id: undefined };
          
          if (restaurantData && restaurantData.active_layout_id) {
            // Use fetchLayout with the active layout ID
            const layoutResponse = await fetchLayout(restaurantData.active_layout_id);
            // Type-safe handling of layout data
            const layoutData = layoutResponse && typeof layoutResponse === 'object' && 'data' in layoutResponse 
              ? layoutResponse.data as { sections?: SeatSectionData[] }
              : { sections: undefined };
            
            // Set layout data if available with safe handling
            if (layoutData.sections && Array.isArray(layoutData.sections)) {
              // Explicitly cast to expected type to satisfy TypeScript
              setLayoutSections(layoutData.sections as SeatSectionData[]);
            }
          }
        } catch (err) {
          console.error('Error fetching layout data:', err);
        }
      } catch (err) {
        console.error('Error loading layout:', err);
      } finally {
        setLayoutLoading(false);
      }
    }
    
    // Only load layout if we have seat preferences to display
    if (reservation.seat_preferences && reservation.seat_preferences.length > 0) {
      loadLayoutForSeats();
    }
  }, [reservation, restaurantId]);

  // Handle party size input
  function handlePartySizeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPartySizeText(digitsOnly);
  }

  // Convert partySizeText to number
  function getPartySize(): number {
    return parseInt(partySizeText, 10) || 1;
  }

  // Save changes
  async function handleSave() {
    try {
      setIsProcessingAction(true);
      
      // Get effective restaurant_id from props, reservation or store
      const effectiveRestaurantId = restaurantId || reservation.restaurant_id || restaurant?.id;
      
      // Exit if we don't have a restaurant ID
      if (!effectiveRestaurantId) {
        setError('Restaurant context is required');
        setIsProcessingAction(false);
        return;
      }
      
      // Filter out empty seat-preference sets
      const seat_preferences = allSets.filter((arr) => arr.length > 0);
      
      // Prepare the reservation data with tenant isolation
      const reservationData = {
        restaurant_id: effectiveRestaurantId,
        contact_name: guestName,
        party_size: getPartySize(),
        contact_phone: contactPhone,
        contact_email: contactEmail,
        special_requests: specialRequests,
        status,
        seat_preferences,
        duration_minutes: duration,
      };
      
      try {
        await updateReservation(reservation.id, reservationData);
      } catch (err) {
        console.error('Error updating reservation:', err);
        toastUtils.error('Failed to update reservation');
        throw err;
      }
      
      toastUtils.success('Reservation updated!');
      setIsEditing(false);
      if (onRefreshData) onRefreshData();
      onClose();
    } catch (err) {
      console.error('Failed to update reservation:', err);
      toastUtils.error('Error updating reservation. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  }

  // Delete the reservation
  async function handleDelete() {
    if (!onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this reservation? This action cannot be undone.')) {
      try {
        setIsProcessingAction(true);
        // Use the deleteReservation API function
        await deleteReservation(reservation.id);
        onDelete(reservation.id);
        toastUtils.success('Reservation deleted.');
      } catch (err) {
        console.error('Error deleting reservation:', err);
        toastUtils.error('Failed to delete reservation');
      } finally {
        setIsProcessingAction(false);
      }
    }
  }

  // Update reservation status
  async function updateStatus(newStatus: string, isRejectAction: boolean = false) {
    try {
      setIsProcessingAction(true);
      
      // Get effective restaurant_id from props or reservation
      const effectiveRestaurantId = restaurantId || reservation.restaurant_id;
      
      // Exit if we don't have a restaurant ID
      if (!effectiveRestaurantId) {
        setError('Restaurant context is required');
        return;
      }
      
      // Create a more complete update object with any existing data needed for validations
      // This ensures all possible validations pass when changing status
      const updateData = {
        restaurant_id: effectiveRestaurantId,
        status: newStatus,
        // Include other fields that might be required for validation
        party_size: reservation.party_size,
        contact_name: reservation.contact_name,
        contact_phone: reservation.contact_phone,
        contact_email: reservation.contact_email
      };

      console.log(`Updating reservation ${reservation.id} status to ${newStatus}`, updateData);
      
      const response = await updateReservation(reservation.id, updateData);
      console.log('Update response:', response);
      
      // Update local status state
      setStatus(newStatus);
      
      // Show a more specific success message based on the status change
      if (newStatus === 'reserved') {
        toastUtils.success('Reservation confirmed! The customer will be notified.');
      } else if (newStatus === 'canceled') {
        // Check if this was triggered from the reject button or cancel button
        const action = isRejectAction ? 'rejected' : 'canceled';
        toastUtils.success(`Reservation ${action}.`);
      } else {
        toastUtils.success(`Reservation status updated to "${newStatus}"`);
      }
      
      // Refresh data in parent component if callback provided
      if (onRefreshData) onRefreshData();
      onClose();
    } catch (err: any) {
      console.error('Failed to update reservation status:', err);
      toastUtils.error(`Failed to update reservation status: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessingAction(false);
    }
  }

  // Status action handlers
  async function handleApproveReservation() {
    await updateStatus('reserved');
  }

  async function handleRejectReservation() {
    // Use 'canceled' instead of 'rejected' as it's one of the allowed status values
    // The DB constraint only allows: booked, reserved, seated, finished, canceled, no_show
    await updateStatus('canceled', true); // true indicates this is a rejection, not just a cancellation
  }

  async function handleCancelReservation() {
    await updateStatus('canceled');
  }

  // Open seat map
  function handleOpenSeatMap() {
    setShowSeatMapModal(true);
  }

  // Close seat map
  function handleCloseSeatMap() {
    setShowSeatMapModal(false);
  }

  // Save seat preferences from seat map
  function handleSeatMapSave(preferences: string[][]) {
    setAllSets(preferences);
    setShowSeatMapModal(false);
  }

  // Check if all seats in a preference are available
  function isOptionFullyFree(seatLabels: string[]): boolean {
    return seatLabels.every((lbl) => !occupiedSeatLabels.has(lbl));
  }
  
  // Check if an option can be assigned (used for showing the Assign button)
  function canAssignOption(seatLabels: string[]): boolean {
    return reservation.status === 'booked' && seatLabels.length > 0 && isOptionFullyFree(seatLabels);
  }

  // Handle assigning seats from a preference option
  async function handleAssignSeatsFromOption(optionIndex: number) {
    // Implementation will be added later
    toastUtils.success('Seat assignment feature will be implemented soon');
  }

  // Error display
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="relative bg-white max-w-md w-full mx-4 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Main reservation modal
  return (
    <div className="fixed inset-0 z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black opacity-40" />
      
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-2 sm:p-4">
        <div className="relative bg-white max-w-lg w-full sm:mx-4 rounded-lg shadow-lg my-2 sm:my-4">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Reservation Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content container */}
          <div className="max-h-[75vh] overflow-y-auto p-4 sm:p-6">
            {/* Processing indicator */}
            {isProcessingAction && (
              <div className="mb-4 flex items-center justify-center py-2 text-hafaloha-gold">
                <div className="animate-spin h-5 w-5 border-2 border-hafaloha-gold border-r-transparent rounded-full mr-2"></div>
                <span>Processing...</span>
              </div>
            )}

            {!isEditing ? (
              // View mode
              <div className="space-y-5 text-gray-700">
                {/* Status Badge */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`
                      px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColorClass(status)}
                    `}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                    <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                      {reservation.reservation_number ? reservation.reservation_number : `#${reservation.id}`}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {createdAtStr}
                  </div>
                </div>
                
                {/* Action buttons based on status - Moved to top */}
                {status === 'booked' && (
                  <div className="mt-3 mb-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleApproveReservation}
                      className="w-full sm:w-auto sm:flex-1 px-4 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium text-center"
                      disabled={isProcessingAction}
                    >
                      Approve Reservation
                    </button>
                    <button
                      onClick={handleRejectReservation}
                      className="w-full sm:w-auto sm:flex-1 px-4 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium text-center"
                      disabled={isProcessingAction}
                    >
                      Reject Reservation
                    </button>
                  </div>
                )}
            
              {/* Guest Info Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">Guest Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Guest */}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Name</p>
                    <p className="font-medium">{reservation.contact_name || '—'}</p>
                  </div>
                  {/* Phone */}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Phone</p>
                    <p className="font-medium">{reservation.contact_phone ? formatPhoneNumber(reservation.contact_phone) : '—'}</p>
                  </div>
                  {/* Email */}
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className="font-medium overflow-hidden text-ellipsis">{reservation.contact_email || '—'}</p>
                  </div>
                </div>
              </div>
            
              {/* Reservation Details Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">Reservation Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Location */}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Location</p>
                    <p className="font-medium flex items-center">
                      {(reservation.location?.name || reservation.location_id) && (
                        <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                      )}
                      {reservation.location?.name || 
                      (reservation.location_id ? `Location ID: ${reservation.location_id}` : '—')}
                    </p>
                  </div>
                  {/* Start time */}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                    <p className="font-medium">{startTimeStr || '—'}</p>
                  </div>
                  {/* Party size */}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Party Size</p>
                    <p className="font-medium">{reservation.party_size ?? '—'}</p>
                  </div>
                  {/* Duration */}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Duration</p>
                    <p className="font-medium">{reservation.duration_minutes ? `${reservation.duration_minutes} min` : '60 min'}</p>
                  </div>
                </div>
              </div>

              {/* Special Requests Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">Special Requests</h3>
                {reservation.special_requests ? (
                  <p className="text-sm">{reservation.special_requests}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No special requests</p>
                )}
              </div>
                
              {/* Seat preferences and assignments section - COMMENTED OUT (NOT CURRENTLY IN USE) 
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-700 mb-3 pb-1 border-b border-gray-200">Seating</h3>
                
                - Seat preferences 
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Preferences</p>
                  {allSets.filter(set => set.length > 0).length > 0 ? (
                    <div className="space-y-2">
                      {allSets.filter(set => set.length > 0).map((preference, idx) => (
                        <div key={idx} className="flex items-center">
                          <span className="text-xs bg-hafaloha-gold/10 text-hafaloha-gold px-2 py-0.5 rounded-full mr-2">
                            Option {idx + 1}
                          </span>
                          <span className="text-sm">{preference.join(', ')}</span>
                          {canAssignOption(preference) && (
                            <button
                              onClick={() => handleAssignSeatsFromOption(idx)}
                              className="ml-2 px-2 py-1 text-xs bg-hafaloha-gold/20 text-hafaloha-gold rounded-md hover:bg-hafaloha-gold/30 transition-colors"
                            >
                              Assign
                            </button>
                          )}
                          {!isOptionFullyFree(preference) && preference.length > 0 && (
                            <span className="ml-2 text-xs text-red-500 italic">
                              (Some seats unavailable)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No preferences specified</p>
                  )}
                </div>

                - Current seats 
                <div>
                  <p className="text-sm text-gray-500 mb-2">Current Assignment</p>
                  {reservation.seat_labels && reservation.seat_labels.length > 0 ? (
                    <div className="bg-green-50 text-green-800 px-3 py-2 rounded-md text-sm">
                      {reservation.seat_labels.join(', ')}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Not yet seated</p>
                  )}
                </div>
              </div>
              */}

              {/* View mode buttons */}
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  disabled={isProcessingAction}
                >
                  Close
                </button>
                
                {/* Only show cancel button if not already canceled/rejected */}
                {status !== 'canceled' && status !== 'rejected' && (
                  <button
                    onClick={handleCancelReservation}
                    className="w-full sm:w-auto px-4 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
                    disabled={isProcessingAction}
                  >
                    Cancel Reservation
                  </button>
                )}
                
                {/* Delete button removed - using cancel reservation instead */}
                
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto px-4 py-3 bg-hafaloha-gold text-white rounded-md hover:bg-hafaloha-gold/90 transition-colors font-medium"
                  disabled={isProcessingAction}
                >
                  Edit
                </button>
              </div>
            </div>
          ) : (
            // ==================== EDIT MODE ====================
            <div className="space-y-3 sm:space-y-4">
              {/* Guest Name */}
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
                    rounded-md text-base
                    focus:ring-2 focus:ring-hafaloha-gold/40 focus:border-hafaloha-gold
                  "
                />
              </div>
              {/* Party Size => text-based numeric */}
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
                    rounded-md text-base
                    focus:ring-2 focus:ring-hafaloha-gold/40 focus:border-hafaloha-gold
                  "
                />
              </div>
              {/* Duration (minutes) */}
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
                    rounded-md text-base
                    focus:ring-2 focus:ring-hafaloha-gold/40 focus:border-hafaloha-gold
                  "
                />
              </div>
              {/* Phone */}
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
                    rounded-md text-base
                    focus:ring-2 focus:ring-hafaloha-gold/40 focus:border-hafaloha-gold
                  "
                />
              </div>
              {/* Email */}
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
                    rounded-md text-base
                    focus:ring-2 focus:ring-hafaloha-gold/40 focus:border-hafaloha-gold
                  "
                />
              </div>
              {/* Special Requests */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Special Requests
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  className="
                    w-full p-2 border border-gray-300
                    rounded-md text-base
                    focus:ring-2 focus:ring-hafaloha-gold/40 focus:border-hafaloha-gold
                  "
                  placeholder="Any special requests or notes from the guest"
                />
              </div>
              {/* Status */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="
                    w-full p-2 border border-gray-300
                    rounded-md text-base
                    focus:ring-2 focus:ring-hafaloha-gold/40 focus:border-hafaloha-gold
                  "
                >
                  <option value="booked">booked</option>
                  <option value="reserved">reserved</option>
                  <option value="rejected">rejected</option>
                  <option value="seated">seated</option>
                  <option value="finished">finished</option>
                  <option value="canceled">canceled</option>
                  <option value="no_show">no_show</option>
                </select>
              </div>
              {/* seat_preferences - COMMENTED OUT (NOT CURRENTLY IN USE) 
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
                    className="mt-3 w-full sm:w-auto px-4 py-2.5 bg-hafaloha-gold/20 text-hafaloha-gold rounded-md hover:bg-hafaloha-gold/30 transition-colors font-medium text-sm"
                  >
                    Edit Seat Preferences
                  </button>
                </div>
              </div>
              */}

              {/* Edit mode buttons */}
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-full sm:w-auto px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                  disabled={isProcessingAction}
                >
                  Cancel
                </button>
                {/* Seat Map button commented out - not currently in use
                <button
                  onClick={handleOpenSeatMap}
                  className="w-full sm:w-auto px-4 py-3 bg-hafaloha-gold/20 text-hafaloha-gold rounded-md hover:bg-hafaloha-gold/30 transition-colors font-medium"
                  disabled={isProcessingAction}
                >
                  Seat Map
                </button>
                */}
                <button
                  onClick={handleSave}
                  className="w-full sm:w-auto px-4 py-3 bg-hafaloha-gold text-white rounded-md hover:bg-hafaloha-gold/90 transition-colors font-medium"
                  disabled={isProcessingAction}
                >
                  Save Changes
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Seat map modal - COMMENTED OUT (NOT CURRENTLY IN USE)
      {showSeatMapModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-lg w-full mx-auto my-auto">
            <h2 className="text-xl font-bold mb-4">Seat Preferences</h2>
            <p className="text-gray-700 mb-4">
              Seat preference selection will be implemented soon.
            </p>
            <div className="flex flex-col sm:flex-row justify-end mt-6">
              <button
                className="w-full sm:w-auto px-4 py-3 bg-hafaloha-gold text-white rounded-md hover:bg-hafaloha-gold/90 transition-colors text-base font-medium"
                onClick={handleCloseSeatMap}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      */}
    </div>
  );
}
