// src/ordering/components/admin/reservations/forms/SeatPreferenceWizard.tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchSeatAllocations } from '../../../../../shared/api/endpoints/seats';
import { useRestaurantStore } from '../../../../../shared/store/restaurantStore';
import toastUtils from '../../../../../shared/utils/toastUtils';

// Type definitions
interface DBSeat {
  id: number;
  label: string;
  section_id?: number;
  position_x?: number;
  position_y?: number;
}

interface SeatAllocation {
  seat_id: number;
  occupant_status: string; // "reserved", "occupied", etc.
  start_time?: string;
  end_time?: string;
}

interface Props {
  date: string;
  time?: string; // Made optional since it's not being used in the component's logic
  partySize: number;
  initialPreferences: string[][];
  onClose: () => void;
  onSave: (prefs: string[][]) => void;
}

/**
 * A wizard component that allows staff to select seat preferences for a reservation.
 * Shows seats for the chosen date/time, color-coded by status,
 * and lets staff pick 1–3 preference sets.
 */
export default function SeatPreferenceWizard({
  date,
  // time parameter is received but not used in this implementation
  partySize,
  initialPreferences,
  onClose,
  onSave,
}: Props) {
  // State for preferences (up to 3 sets of chosen seat labels)
  const [prefs, setPrefs] = useState<string[][]>(initialPreferences || [[], [], []]);
  
  // State for seat allocations and all available seats
  const [seatAllocs, setSeatAllocs] = useState<SeatAllocation[]>([]);
  const [allSeats, setAllSeats] = useState<DBSeat[]>([]);
  
  // Track which preference set we're currently editing (0, 1, or 2)
  const [activePrefIndex, setActivePrefIndex] = useState(0);
  
  // State for tenant validation error
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load seat data when component mounts
  useEffect(() => {
    // Get restaurant from store instead of using validateRestaurantContext directly
    const restaurant = useRestaurantStore.getState().restaurant;
    
    // Check if restaurant context is valid
    if (!restaurant || !restaurant.id) {
      setError('Restaurant context is required to access seat preferences');
      setIsLoading(false);
      return;
    }
    
    async function loadSeatData() {
      try {
        setIsLoading(true);
        
        // Fetch seat allocations for the given date with tenant isolation
        const allocResponse = await fetchSeatAllocations({ 
          date,
          restaurant_id: restaurant?.id?.toString() || ''
        });
        
        if (allocResponse && typeof allocResponse === 'object' && 'data' in allocResponse) {
          const allocs = Array.isArray(allocResponse.data) ? allocResponse.data : [];
          setSeatAllocs(allocs);
        } else {
          // If no data, set empty array
          setSeatAllocs([]);
        }
        
        // In a real implementation, you would also fetch all seats
        // This is just placeholder data for demonstration
        setAllSeats([
          { id: 1, label: "A1", section_id: 1 },
          { id: 2, label: "A2", section_id: 1 },
          { id: 3, label: "A3", section_id: 1 },
          { id: 4, label: "B1", section_id: 2 },
          { id: 5, label: "B2", section_id: 2 },
          { id: 6, label: "B3", section_id: 2 },
          { id: 7, label: "C1", section_id: 3 },
          { id: 8, label: "C2", section_id: 3 },
          { id: 9, label: "C3", section_id: 3 },
          { id: 10, label: "D1", section_id: 4 },
          { id: 11, label: "D2", section_id: 4 },
          { id: 12, label: "D3", section_id: 4 },
        ]);
      } catch (err) {
        console.error('Error loading seat data:', err);
        toastUtils.error('Failed to load seat data');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSeatData();
  }, [date]);

  // Determine seat availability status
  function getSeatStatus(seatId: number): "free" | "reserved" | "occupied" {
    // Check seat allocations for the current time slot
    // In a production app, you would check if the reservation time overlaps with an allocation
    const alloc = seatAllocs.find(a => a.seat_id === seatId);
    if (!alloc) return "free";
    
    if (alloc.occupant_status === "seated" || alloc.occupant_status === "occupied") {
      return "occupied";
    } else if (alloc.occupant_status === "reserved") {
      return "reserved";
    }
    
    return "free";
  }

  // Get seat status by label instead of ID
  function getSeatStatusByLabel(label: string) {
    const seat = allSeats.find(s => s.label === label);
    if (!seat) return "free"; // fallback
    return getSeatStatus(seat.id);
  }

  // Check if a seat is currently selected in the active preference set
  function isSeatChosen(seatLabel: string) {
    const current = prefs[activePrefIndex] || [];
    return current.includes(seatLabel);
  }

  // Handle seat selection/deselection
  function handleSeatClick(seatLabel: string) {
    const seatStatus = getSeatStatusByLabel(seatLabel);
    if (seatStatus !== "free") {
      toastUtils.error(`Seat ${seatLabel} is not available at that time.`);
      return;
    }

    setPrefs(prev => {
      const clone = [...prev];
      // Ensure we have an array for activePrefIndex
      if (!clone[activePrefIndex]) {
        clone[activePrefIndex] = [];
      }
      
      const arr = clone[activePrefIndex];
      if (arr.includes(seatLabel)) {
        // Remove the seat if already selected
        clone[activePrefIndex] = arr.filter(s => s !== seatLabel);
      } else {
        // Add the seat if not already selected
        clone[activePrefIndex] = [...arr, seatLabel];
      }
      
      return clone;
    });
  }

  // Get the appropriate background color based on seat status
  function getSeatColor(label: string) {
    const status = getSeatStatusByLabel(label);
    if (status === "occupied") return "bg-red-500";
    if (status === "reserved") return "bg-amber-400";
    return "bg-green-500"; // free
  }

  // Save preferences and close the wizard
  function handleSave() {
    // Filter out empty arrays
    const final = prefs.filter(arr => arr && arr.length > 0);
    onSave(final);
  }

  // Switch between preference sets (1st, 2nd, 3rd)
  function handlePrefSwitch(idx: number) {
    setActivePrefIndex(idx);
    // Ensure we have an array at that index
    setPrefs(prev => {
      const clone = [...prev];
      if (!clone[idx]) {
        clone[idx] = [];
      }
      return clone;
    });
  }

  // If we have a tenant validation error
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold text-red-600 mb-4">Error</h3>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl p-6 rounded-lg shadow-lg relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="text-xl font-bold mb-4">
          Select Seat Preferences (Party of {partySize})
        </h3>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
          </div>
        ) : (
          <>
            {/* Preference tabs */}
            <div className="flex space-x-2 mb-6">
              {[0, 1, 2].map(idx => (
                <button
                  key={idx}
                  onClick={() => handlePrefSwitch(idx)}
                  className={`
                    px-4 py-2 rounded-md transition-colors
                    ${activePrefIndex === idx 
                      ? 'bg-gold text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                  `}
                >
                  {idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd'} Choice
                </button>
              ))}
            </div>

            {/* Seat Legend */}
            <div className="flex items-center space-x-4 mb-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-green-500 mr-1"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-amber-400 mr-1"></div>
                <span>Reserved</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-red-500 mr-1"></div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-green-500 ring-2 ring-blue-500 mr-1"></div>
                <span>Selected</span>
              </div>
            </div>

            {/* Seat grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 mb-6">
              {allSeats.map(seat => {
                const statusColor = getSeatColor(seat.label);
                const chosen = isSeatChosen(seat.label);
                return (
                  <div
                    key={seat.id}
                    onClick={() => handleSeatClick(seat.label)}
                    className={`
                      cursor-pointer text-white font-medium rounded-md
                      flex items-center justify-center h-12
                      shadow transition-all
                      ${statusColor}
                      ${chosen ? 'ring-3 ring-blue-500 transform scale-105' : ''}
                      ${getSeatStatusByLabel(seat.label) !== 'free' ? 'opacity-60' : 'hover:opacity-90'}
                    `}
                  >
                    {seat.label}
                  </div>
                );
              })}
            </div>

            {/* Selected preferences display */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Current Selections:</h4>
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(idx => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">
                      {idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd'} Choice
                    </div>
                    {prefs[idx] && prefs[idx].length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {prefs[idx].map(seat => (
                          <span 
                            key={seat} 
                            className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-sm"
                          >
                            {seat}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">No seats selected</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gold hover:bg-amber-600 text-white rounded-md shadow transition"
              >
                Save Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
