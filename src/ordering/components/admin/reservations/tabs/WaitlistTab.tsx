// src/ordering/components/admin/reservations/tabs/WaitlistTab.tsx
import { useEffect, useState } from 'react';
import { Search, Clock, Users, Phone, AlertCircle, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatPhoneNumber } from '../../../../../shared/utils/formatters';
import { useRestaurantStore } from '../../../../../shared/store/restaurantStore';
import { useLocationDateStore } from '../../../../../shared/store/locationDateStore';
import LocationSelector from '../../../../../ordering/components/customer/LocationSelector';
import { locationsApi } from '../../../../../shared/api/endpoints/locations';
import { fetchWaitlistEntries } from '../../../../../shared/api/endpoints/reservations';
import WaitlistForm from '../forms/WaitlistForm';

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  party_size?: number;
  check_in_time?: string;
  status?: string; // "waiting", "seated", "removed", "no_show", etc.
  seat_labels?: string[];
  location_id?: number;
  location?: {
    id: number;
    name: string;
  };
  estimated_wait_time?: number;
  notes?: string;
}

// Utility functions
function formatYYYYMMDD(dateObj: Date): string {
  return dateObj.toISOString().split('T')[0];
}

export default function WaitlistTab() {
  // Use shared location and date store instead of local state
  const { 
    selectedDate: date, 
    setSelectedDate: setDate,
    selectedLocationId,
    setSelectedLocationId 
  } = useLocationDateStore();

  // Core state management
  const restaurant = useRestaurantStore(state => state.restaurant);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);

  // Modal control state
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);

  // Status and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for multiple locations on component mount
  useEffect(() => {
    // Validate restaurant context
    if (!restaurant || !restaurant.id) {
      setError('Unable to access waitlist. Restaurant context is missing.');
      return;
    }
    
    // Check if restaurant has multiple locations
    checkForMultipleLocations();
  }, [restaurant]);

  // Fetch waitlist whenever date or selected location changes
  useEffect(() => {
    if (error || !restaurant) return; // Don't fetch if there's a tenant context error
    fetchWaitlistData();
  }, [date, selectedLocationId, error, restaurant]);
  
  // Check if restaurant has multiple locations
  const checkForMultipleLocations = async () => {
    try {
      const response = await locationsApi.getLocations({ active: true });
      if (response) {
        const locationsList = Array.isArray(response) ? response : [];
        setHasMultipleLocations(locationsList.length > 1);
        
        // If there's exactly one location, set it as the selected location
        if (locationsList.length === 1) {
          setSelectedLocationId(locationsList[0].id);
        }
      }
    } catch (err) {
      console.error('Error checking for multiple locations:', err);
    }
  };

  async function fetchWaitlistData() {
    // Validate restaurant context
    if (!restaurant || !restaurant.id) {
      setError('Unable to access waitlist. Restaurant context is missing.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add parameters for API request
      const params: Record<string, any> = { 
        date,
        restaurant_id: restaurant.id 
      };
      
      // Add location_id to filter by location if selected (handling null from the shared store)
      if (selectedLocationId !== null) {
        params.location_id = selectedLocationId;
      }
      
      const response = await fetchWaitlistEntries(JSON.stringify(params));
      
      if (response) {
        const data = Array.isArray(response) ? response : [];
        
        // Sort by check-in time, most recent first
        const sorted = data.slice().sort((a: WaitlistEntry, b: WaitlistEntry) => {
          const timeA = new Date(a.check_in_time || '').getTime();
          const timeB = new Date(b.check_in_time || '').getTime();
          return timeB - timeA; // Newest first
        });
        
        setWaitlist(sorted);
      } else {
        setWaitlist([]);
      }
    } catch (err: any) {
      console.error('Error fetching waitlist:', err);
      setError(err.message || 'Failed to load waitlist. Please try again.');
      setWaitlist([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter waitlist by search term
  const searchedWaitlist = waitlist.filter((w) => {
    const name = w.contact_name?.toLowerCase() ?? '';
    const phone = w.contact_phone ?? '';
    const sTerm = searchTerm.toLowerCase();
    return (
      name.includes(sTerm) ||
      phone.includes(sTerm)
    );
  });

  // Modal control handlers
  function handleCloseAddEntryModal() {
    setShowAddEntryModal(false);
  }

  async function handleAddEntrySuccess() {
    setShowAddEntryModal(false);
    await fetchWaitlistData();
  }

  // Format wait time in minutes to a more readable format
  function formatWaitTime(minutes?: number): string {
    if (!minutes) return 'N/A';
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr ${remainingMinutes} min`;
  }

  /**
   * Renders a color-coded badge 
   * Function to render status badges with appropriate colors
   */
  function renderWaitlistStatusBadge(status?: string) {
    if (!status) return <span className="text-gray-400 text-xs italic">-</span>;

    switch (status.toLowerCase()) {
      case 'waiting':
        return (
          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-hafaloha-gold/10 text-hafaloha-gold border border-hafaloha-gold/20 shadow-sm">
            waiting
          </span>
        );
      case 'seated':
        return (
          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-700 border border-green-200 shadow-sm">
            seated
          </span>
        );
      case 'removed':
        return (
          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
            removed
          </span>
        );
      case 'no_show':
      case 'no-show':
        return (
          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-red-100 text-red-700 border border-red-200 shadow-sm">
            no-show
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
            {status || 'N/A'}
          </span>
        );
    }
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

      {/* Page header with title and action button */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Waitlist</h2>
        
        {/* Add to waitlist button (full width on mobile, normal on desktop) */}
        <button
          onClick={() => setShowAddEntryModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-hafaloha-gold text-white rounded-md text-sm font-medium hover:bg-hafaloha-gold/90 transition-colors flex items-center justify-center"
        >
          <span className="mr-1">+</span> Add to Waitlist
        </button>
      </div>

      {/* Filters section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date picker with navigation arrows */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <div className="flex items-center space-x-2">
              {/* Previous day button */}
              <button
                onClick={() => {
                  const prevDay = new Date(date);
                  prevDay.setDate(prevDay.getDate() - 1);
                  setIsLoading(true);
                  setDate(formatYYYYMMDD(prevDay));
                }}
                className="p-2 rounded-md bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 active:bg-hafaloha-gold/30 transition-colors border border-hafaloha-gold/20"
                aria-label="Previous day"
                title="Previous day"
              >
                <ChevronLeft className="h-4 w-4 text-hafaloha-gold" />
              </button>
              
              {/* Date picker with icon */}
              <div className="relative flex-1 sm:w-48">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) {
                      setIsLoading(true);
                      setDate(e.target.value);
                      // Small delay to allow transition to show
                      setTimeout(() => {
                        // This will be overridden by the actual loading state from the API
                        // but helps create a smoother visual transition
                      }, 50);
                    }
                  }}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-1 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold outline-none"
                />
              </div>
              
              {/* Next day button */}
              <button
                onClick={() => {
                  const nextDay = new Date(date);
                  nextDay.setDate(nextDay.getDate() + 1);
                  setIsLoading(true);
                  setDate(formatYYYYMMDD(nextDay));
                }}
                className="p-2 rounded-md bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 active:bg-hafaloha-gold/30 transition-colors border border-hafaloha-gold/20"
                aria-label="Next day"
                title="Next day"
              >
                <ChevronRight className="h-4 w-4 text-hafaloha-gold" />
              </button>
            </div>
          </div>
          
          {/* Location selector - only show if multiple locations */}
          {hasMultipleLocations && (
            <div className="relative flex-1 sm:flex-none sm:w-56">
              <LocationSelector
                onLocationChange={(locationId: number) => setSelectedLocationId(locationId)}
                initialLocationId={selectedLocationId !== null ? selectedLocationId : undefined}
                showOnlyActive={true}
                className="w-full"
              />
            </div>
          )}

          {/* Search bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-1 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold outline-none"
              placeholder="Search by name or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content container with min-height to prevent layout shifts */}
      <div className="flex-1 min-h-[400px] flex flex-col relative transition-all duration-300 ease-in-out">
        {/* Loading state with skeleton loader */}
        <div className={`rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden absolute inset-0 transition-opacity duration-300 ${isLoading ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="divide-y divide-gray-100">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="h-8 w-24 bg-gray-100 rounded animate-pulse self-end"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Waitlist table with transition */}
        <div className={`overflow-x-auto transition-opacity duration-300 rounded-lg border border-gray-100 bg-white shadow-sm ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          <table className="w-full table-auto divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Joined
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Guest
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Party Size
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wait Time
              </th>
              {hasMultipleLocations && (
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              )}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {searchedWaitlist.length === 0 ? (
              <tr>
                <td colSpan={hasMultipleLocations ? 7 : 6} className="px-4 py-4 text-center text-gray-500">
                  No waitlist entries found
                </td>
              </tr>
            ) : (
              searchedWaitlist.map((w) => {
                const joined = new Date(w.check_in_time || '');
                const joinedDisplay = isNaN(joined.getTime())
                  ? 'N/A'
                  : joined.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                const seatLabelText = w.seat_labels?.length
                  ? `(Seated at ${w.seat_labels.join(', ')})`
                  : '';

                return (
                  <tr
                    key={w.id}
                    className="hover:bg-hafaloha-gold/5 cursor-pointer transition-colors relative"
                    onClick={() => {
                      // Future functionality: Add handling for row click to view/edit waitlist entry
                      console.log('Clicked waitlist entry:', w);
                    }}
                  >
                    {/* Time Joined */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        {joinedDisplay}
                      </div>
                    </td>

                    {/* Guest */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {w.contact_name ?? 'N/A'}
                      {seatLabelText && (
                        <span className="text-xs text-green-600 ml-1">
                          {seatLabelText}
                        </span>
                      )}
                    </td>

                    {/* Party Size */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-2" />
                        {w.party_size ?? 1}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {w.contact_phone ? (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-1" />
                          {formatPhoneNumber(w.contact_phone)}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>

                    {/* Wait Time */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatWaitTime(w.estimated_wait_time)}
                    </td>

                    {/* Location - only if multiple locations */}
                    {hasMultipleLocations && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {w.location?.name || 'N/A'}
                      </td>
                    )}

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderWaitlistStatusBadge(w.status)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add to waitlist modal */}
      {showAddEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <WaitlistForm
            onClose={handleCloseAddEntryModal}
            onSuccess={handleAddEntrySuccess}
          />
        </div>
      )}
    </div>
  );
}
