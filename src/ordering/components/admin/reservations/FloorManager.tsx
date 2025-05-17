// src/ordering/components/admin/reservations/FloorManager.tsx
import { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Plus as LucidePlus, 
  Minus, 
  UserRound, 
  X, 
  Users2, 
  CheckSquare, 
  CheckCircle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

// Using native date input for better scroll positioning

import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { useLocationDateStore } from '../../../../shared/store/locationDateStore';
import { validateRestaurantContext } from '../../../../shared/utils/tenantUtils';
import { MobileSelect } from '../../../../shared/components/ui/MobileSelect';
import { LayoutData, layoutsApi } from '../../../services/api-layouts';
import { 
  fetchSeatAllocations, 
  seatAllocationMultiCreate,
  seatAllocationArrive,
  seatAllocationFinish,
  seatAllocationNoShow,
  seatAllocationCancel,
  updateReservation,
  SeatAllocation, 
  Reservation, 
  WaitlistEntry 
} from '../../../services/api-reservations';
import { Location, locationsApi } from '../../../../reservations/services/locations-api';

// Using types imported from api-reservations.ts

// Table and seat constants for consistent rendering (matched with SeatLayoutEditor)
const TABLE_SIZE = 100; // diameter in px - matches TABLE_DIAMETER in SeatLayoutEditor
const SEAT_SIZE = 64;  // diameter in px - matches SEAT_DIAMETER in SeatLayoutEditor

// Grid sizing constants - matched with SeatLayoutEditor
const GRID_SIZE = 25; // Grid size in pixels (matches the SVG grid pattern)

interface FloorManagerProps {
  date: string;
  dateObj: Date;
  onDateChange: (date: Date | null) => void;
  isLoadingSchedule: boolean;
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  onRefreshData: () => void;
  onTabChange?: (tab: string) => void;
}

/**
 * FloorManager Component - Handles the visual representation and interaction with
 * the restaurant floor plan, tables, and seating allocations
 */
export function FloorManager({
  date,
  dateObj,
  onDateChange,
  isLoadingSchedule,
  reservations,
  waitlist,
  onRefreshData
  // onTabChange - unused in this implementation
}: FloorManagerProps) {
  const { restaurant } = useRestaurantStore();
  
  // Use shared location store instead of local state
  const { selectedLocationId, setSelectedLocationId } = useLocationDateStore();
  
  // State for the restaurant layout
  const [layout, setLayout] = useState<LayoutData | null>(null);
  
  // State for tracking locations 
  const [locations, setLocations] = useState<Location[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0); // Default zoom level set to 100% to match SeatLayoutEditor
  const [showGrid, setShowGrid] = useState(true);
  const [activeFloor, setActiveFloor] = useState(1); // Active floor state
  
  // Seating allocations for rendering occupied seats
  const [seatAllocations, setSeatAllocations] = useState<SeatAllocation[]>([]);
  
  // Transition state for smooth date changes
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevSeatAllocations, setPrevSeatAllocations] = useState<SeatAllocation[]>([]);
  
  // State for previous reservations and waitlist to enable smooth transitions
  const [prevReservations, setPrevReservations] = useState<any[]>([]);
  const [prevWaitlist, setPrevWaitlist] = useState<any[]>([]);
  const [isDataTransitioning, setIsDataTransitioning] = useState(false);
  
  // Reservation interaction state
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);
  
  // Single-tap seating workflow state
  const [activeMode, setActiveMode] = useState<'view' | 'seat'>('view');
  const [currentReservation, setCurrentReservation] = useState<Reservation | null>(null);
  
  // Side drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'reservations' | 'waitlist'>('reservations');
  
  // Seat wizard state for seating functionality
  const [seatWizard, setSeatWizard] = useState({
    active: false,
    occupantType: null as 'reservation' | 'waitlist' | null,
    occupantId: null as number | null,
    occupantName: '',
    occupantPartySize: 1,
    selectedSeatIds: [] as number[],
  });
  
  // Modals state
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  
  // Reference to the canvas element for viewport calculations
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Function to completely reload the page with a new location - identical to initial load behavior
  const loadLocation = async (locationId: number | null) => {
    console.log('Loading location with ID:', locationId);
    
    // First, reset all of the UI state
    setIsLoading(true); // Show loading indicator
    setError(null);
    
    // Clear all existing layout data
    setLayout(null); 
    setSeatAllocations([]);
    setPrevSeatAllocations([]);
    setLayoutCenter(null);
    
    // Reset view state
    setActiveFloor(1);
    setZoom(0.7); // Use the default zoom level
    
    // Reset any active interactions
    setActiveMode('view');
    setSeatWizard({
      active: false,
      occupantType: null,
      occupantId: null,
      occupantName: '',
      occupantPartySize: 1,
      selectedSeatIds: []
    });
    setSelectedReservation(null);
    setCurrentReservation(null);
    
    // Update both the local component state and the shared store with the selected locationId
    // This ensures the selection persists across tabs and page reloads
    setSelectedLocationId(locationId);
    // No need for extra code since we're using the shared store's setter directly
    
    // Wait for DOM to update with cleared state
    setTimeout(() => {
      // Force a complete refresh by reloading through the API
      try {
        // Instead of calling initializeFloorManager, we'll reload the whole page state
        // This ensures we follow the exact same code path as initial page load
        if (restaurant?.id) {
          // Refetch locations
          locationsApi.getLocations({
            restaurant_id: restaurant.id,
            is_active: true
          }).then(fetchedLocations => {
            // Store all locations
            setLocations(fetchedLocations);
            
            // Now load layouts from scratch
            if (locationId !== null) {
              console.log('Loading layouts for location:', locationId);
              layoutsApi.getAllLayouts(restaurant.id, locationId)
                .then(layouts => {
                  if (layouts.length > 0) {
                    // Find the active layout for this location
                    const activeLayout = layouts.find(ly => ly.is_active);
                    const layoutToLoad = activeLayout || layouts[0];
                    
                    console.log('Loading layout:', layoutToLoad.id, layoutToLoad.name);
                    
                    // Load the layout with a clean slate
                    layoutsApi.getLayout(layoutToLoad.id).then(layoutData => {
                      // Important: Set layout only after all other state is reset
                      console.log('Setting layout data:', layoutData);
                      setLayout(layoutData);
                      
                      // After layout is set, just set a default zoom level
                      setTimeout(() => {
                        setZoom(0.7); // Default zoom level
                        setIsLoading(false);
                      }, 150);
                    });
                  } else {
                    console.warn('No layouts found for location');
                    setIsLoading(false);
                  }
                });
            } else {
              console.warn('No location ID provided');
              setIsLoading(false);
            }
          });
        } else {
          console.error('No restaurant context');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error in loadLocation:', error);
        setError('Failed to load location data');
        setIsLoading(false);
      }
    }, 100);
  };
  
  // Function to fetch restaurant locations
  const fetchLocations = async () => {
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      console.error('Restaurant context required for fetching locations');
      return;
    }
    
    try {
      // Load locations for this restaurant
      const locationsList = await locationsApi.getLocations({
        restaurant_id: restaurant.id,
        is_active: true
      });
      
      console.log('Locations loaded:', locationsList);
      
      if (locationsList && Array.isArray(locationsList) && locationsList.length > 0) {
        // Store the list of locations
        setLocations(locationsList);
        
        // Get location from shared store or fall back to defaults
        let locationIdToUse: number | null = null;
        
        // Priority 1: Use location from shared store if it exists and is in the available locations
        if (selectedLocationId !== null) {
          // Verify this location exists in the list
          const locationExists = locationsList.some(loc => loc.id === selectedLocationId);
          if (locationExists) {
            locationIdToUse = selectedLocationId;
            console.log('Using location from shared store:', selectedLocationId);
          }
        }
        
        // Priority 2: If no valid location in shared store, use default or first location
        if (locationIdToUse === null) {
          const defaultLocation = locationsList.find(loc => loc.is_default);
          locationIdToUse = defaultLocation ? defaultLocation.id : locationsList[0].id;
          
          if (defaultLocation) {
            console.log('Loading default location:', defaultLocation.name, defaultLocation.id);
          } else {
            console.log('Loading first location:', locationsList[0].name, locationsList[0].id);
          }
        }
        
        // Use our common location loading function
        await loadLocation(locationIdToUse);
      } else {
        setError('No locations found for this restaurant');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setIsLoading(false);
      setError('Error loading locations');
    }
  };

  // Effect to load locations and restaurant layout when the restaurant changes
  useEffect(() => {
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      setError('Restaurant context required');
      return;
    }
    
    // Fetch locations first - this will also call initializeFloorManager after setting location
    fetchLocations();
    
    // NOTE: We don't call initializeFloorManager here because fetchLocations will call it
    // after selecting the default location, which ensures we get the right location-specific layout
  }, [restaurant]);
  
  // Effect to sync the app state with the shared location store
  // This ensures that when another component changes the location, this component updates too
  useEffect(() => {
    // This effect will run when the component mounts and when the shared store's selectedLocationId changes
    // We don't need to do anything special here, as we're already using the shared store's value directly
    console.log('Location from shared store updated:', selectedLocationId);
  }, [selectedLocationId]);

  // Effect to call API for seat allocations with tenant validation
  useEffect(() => {
    if (!layout || !date) return;
    
    // Validate restaurant context for tenant isolation
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      console.warn('Tenant validation failed: Invalid restaurant context');
      return;
    }
    
    // Only load seat allocations if we have a valid layout and date
    if (layout.id && date) {
      // Save previous allocations before loading new ones
      if (seatAllocations.length > 0) {
        setPrevSeatAllocations(seatAllocations);
      }
      loadSeatAllocations(date);
    }
  }, [layout, date, restaurant]);
  
  // Effect to reset the data transition state when props change (including reservations/waitlist)
  useEffect(() => {
    if (isDataTransitioning && (reservations.length > 0 || waitlist.length > 0)) {
      // Wait a moment to allow for the fade transition
      const timer = setTimeout(() => {
        setIsDataTransitioning(false);
      }, 450); // Extended for smoother transition
      
      return () => clearTimeout(timer);
    }
  }, [reservations, waitlist, isDataTransitioning]);
  
  // Effect to update the layout when the restaurant changes
  useEffect(() => {
    if (restaurant) {
      initializeFloorManager();
    }
  }, [restaurant]);
  
  // Recalculate zoom when the active floor changes
  useEffect(() => {
    if (layout) {
      const optimalZoom = calculateOptimalZoom();
      setZoom(optimalZoom);
    }
  }, [activeFloor]);
  
  // Initialize the floor manager
  async function initializeFloorManager(forceLocationId?: number) {
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      setError('Restaurant context required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use the forced location ID if provided, otherwise fall back to the selected location ID
      const locationIdToUse = forceLocationId !== undefined ? forceLocationId : selectedLocationId;
      console.log('Loading layouts for location ID:', locationIdToUse);
      
      const layouts = await layoutsApi.getAllLayouts(
        restaurant.id, 
        locationIdToUse !== null ? locationIdToUse : undefined
      );
      if (!layouts || layouts.length === 0) {
        throw new Error('No layouts found for this restaurant' + 
          (selectedLocationId ? ' at the selected location' : ''));
      }
      
      console.log('Layouts loaded:', layouts, 'Looking for active layout');
      
      // Find the active layout (location-specific active layout)
      const activeLayout = layouts.find((ly: LayoutData) => ly.is_active);
      
      if (activeLayout) {
        console.log('Found active layout for location:', activeLayout.id, activeLayout.name);
        await loadLayout(activeLayout.id);
      } else if (layouts.length > 0) {
        // If no active layout, use the first one
        console.log('No active layout found, using first available:', layouts[0].id, layouts[0].name);
        await loadLayout(layouts[0].id);
      } else {
        setError('No layouts found for this restaurant' + 
          (selectedLocationId ? ' at the selected location' : ''));
      }
    } catch (err) {
      console.error('Error initializing floor manager:', err);
      setError('Error loading layout data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  }
  
  // Load a specific layout by ID
  const loadLayout = async (layoutId: number) => {
    setIsLoading(true);
    setError(null);
    setIsTransitioning(true); // Start transition state for smoother UI
    
    try {
      if (!restaurant || !validateRestaurantContext(restaurant)) {
        throw new Error('Invalid restaurant context');
      }
      
      console.log('Loading layout with ID:', layoutId, 'for location:', selectedLocationId);
      
      const layoutData = await layoutsApi.getLayout(layoutId);
      if (!layoutData) {
        throw new Error('Failed to load layout data');
      }
      
      // Verify this layout is appropriate for the selected location
      if (selectedLocationId !== null && 
          layoutData.location_id !== null && 
          layoutData.location_id !== selectedLocationId) {
        console.warn(
          `Layout ${layoutId} belongs to location ${layoutData.location_id} but current selected location is ${selectedLocationId}`
        );
        // We'll continue anyway as this might be intentional (viewing a layout from another location)
      }
      
      console.log('Layout data loaded:', layoutData);
      
      // First, clear the current layout to ensure a clean slate
      setLayout(null);
      
      // Force a DOM update before setting the new layout
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Now set the new layout
      setLayout(layoutData);
      
      // Set active floor to the first floor if it exists
      if (layoutData.sections_data?.sections) {
        const floors = new Set(layoutData.sections_data.sections.map(s => s.floorNumber || 1));
        if (floors.size > 0) {
          const firstFloor = Math.min(...Array.from(floors));
          console.log('Setting active floor to:', firstFloor);
          setActiveFloor(firstFloor);
        }
      }

      // Use a multi-step approach to ensure proper layout centering and zooming
      // Step 1: Set a timer to calculate optimal zoom and center after DOM update
      setTimeout(() => {
        try {
          // Wait for the layout to be fully rendered and clear any transient states
          setLayoutCenter(null);
          
          // Step 2: Calculate the optimal zoom level
          const optimalZoom = calculateOptimalZoom();
          console.log(`Layout ${layoutId} calculated optimal zoom:`, optimalZoom);
          
          // Step 3: Apply the zoom after ensuring layout center is set
          setTimeout(() => {
            setZoom(optimalZoom);
            console.log(`Layout center after zoom calculation:`, layoutCenter);
            setIsTransitioning(false); // End transition state
          }, 150);
        } catch (error) {
          console.error('Error calculating optimal zoom:', error);
          // Fallback to default zoom
          setZoom(0.7);
          setIsTransitioning(false);
        }
      }, 300);
      
      // Load seat allocations for this layout and date
      if (date) {
        loadSeatAllocations(date);
      }
    } catch (err) {
      console.error('Error loading layout:', err);
      setError('Failed to load layout: ' + (err instanceof Error ? err.message : String(err)));
      setIsTransitioning(false); // Make sure to end transition state even on error
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load seat allocations for a specific date with smooth transitions
  async function loadSeatAllocations(dateStr: string) {
    // Ensure we have tenant isolation
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      console.warn('Tenant validation failed when loading seat allocations');
      return;
    }
    
    try {
      // Start transition - save current allocations 
      setIsTransitioning(true);
      setPrevSeatAllocations(seatAllocations);
      
      // Load seat allocations for this date and restaurant/location
      const params: Record<string, any> = {
        restaurant_id: restaurant.id,
        date: dateStr
      };
      
      // Add location filter if a location is selected
      if (selectedLocationId !== null) {
        params.location_id = selectedLocationId;
      }
      
      console.log('Fetching seat allocations with params:', params);
      const allocations = await fetchSeatAllocations(params);
      
      if (allocations) {
        // Apply new allocations after a brief delay for transition effect
        setTimeout(() => {
          setSeatAllocations(allocations);
          // End transition after allocation data is updated
          setTimeout(() => {
            setIsTransitioning(false);
          }, 300); // Match this with CSS transition duration
        }, 50);
      }
    } catch (err) {
      console.error('Error loading seat allocations:', err);
      toast.error('Could not load seat allocations');
      setIsTransitioning(false); // Reset transition state on error
    }
  }
  
  // Function to start the seating process for a reservation
  function startSeatingProcess(reservation: Reservation) {
    if (!reservation) return;
    
    // Set up the seating wizard with this reservation's details
    setSeatWizard({
      active: true,
      occupantType: 'reservation',
      occupantId: reservation.id,
      occupantName: reservation.contact_name || 'Guest',
      occupantPartySize: reservation.party_size || 1,
      selectedSeatIds: [],
    });
    
    // Close any open modals
    setSelectedReservation(null);
    toast.success(`Select ${reservation.party_size} seats for ${reservation.contact_name || 'Guest'}`);
  }
  
  // Function to toggle a seat selection in seat wizard mode
  function toggleSeatSelection(seatId: number) {
    setSeatWizard(prev => {
      const included = prev.selectedSeatIds.includes(seatId);
      const newList = included
        ? prev.selectedSeatIds.filter(id => id !== seatId)
        : [...prev.selectedSeatIds, seatId];
      return { ...prev, selectedSeatIds: newList };
    });
  }
  
  // Cancel the current seating process
  function cancelSeatingProcess() {
    setSeatWizard({
      active: false,
      occupantType: null,
      occupantId: null,
      occupantName: '',
      occupantPartySize: 1,
      selectedSeatIds: [],
    });
    
    // Also reset our single-tap seating state
    setCurrentReservation(null);
    
    // Don't automatically exit seating mode (let the toggle button handle this)
    // If we want to exit seating mode automatically, uncomment:
    // setActiveMode('view');
    
    toast.success('Seating canceled');
  }
  
  // Get appropriate start/end times for seat allocation
  function getSeatAllocationTimes(reservation?: Reservation) {
    // If we have a reservation with a start time, use that
    if (reservation?.start_time) {
      const startTime = new Date(reservation.start_time);
      // Default to 60 minute duration if not specified
      // Use default 60 minute duration
      const durationMinutes = 60;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      return { startTime, endTime };
    }
    
    // Otherwise use current time + 60 minutes
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60000);
    return { startTime, endTime };
  }
  
  // Complete the seating process by creating seat allocations
  async function completeSeating() {
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      toast.error('Invalid restaurant context');
      return;
    }
    
    if (!seatWizard.active || !seatWizard.occupantId || seatWizard.selectedSeatIds.length === 0) {
      toast.error('No seats selected');
      return;
    }
    
    // Make sure we have the right number of seats
    if (seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize) {
      toast.error(`Please select exactly ${seatWizard.occupantPartySize} seats`);
      return;
    }
    
    // Verify that none of the selected seats have been taken while user was deciding
    const anySeatsNowOccupied = seatWizard.selectedSeatIds.some(seatId => isSeatOccupied(seatId));
    
    if (anySeatsNowOccupied) {
      toast.error('Some of your selected seats are no longer available. Please select different seats.');
      // Refresh seat allocation data and reset seat selection
      await loadSeatAllocations(date);
      setSeatWizard(prev => ({
        ...prev,
        selectedSeatIds: []
      }));
      return;
    }
    
    // Get the reservation or waitlist entry we're seating
    const reservation = seatWizard.occupantType === 'reservation' 
      ? reservations.find(r => r.id === seatWizard.occupantId) 
      : undefined;
    
    // Get appropriate times
    const { startTime, endTime } = getSeatAllocationTimes(reservation);
    
    try {
      setIsLoading(true);
      
      // Create the seat allocations
      await seatAllocationMultiCreate({
        restaurant_id: restaurant.id,
        occupant_type: seatWizard.occupantType,
        occupant_id: seatWizard.occupantId,
        seat_ids: seatWizard.selectedSeatIds,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      });
      
      // If it's a reservation, mark it as seated
      if (seatWizard.occupantType === 'reservation' && seatWizard.occupantId) {
        await updateReservation(seatWizard.occupantId, {
          restaurant_id: restaurant.id,
          status: 'seated'
        });
      }
      
      toast.success(`${seatWizard.occupantName} has been seated successfully`);
      
      // Reset the seat wizard and single-tap seating state
      cancelSeatingProcess();
      
      // If we want to exit seating mode automatically after completing, uncomment:
      // setActiveMode('view');
      
      // Refresh data
      await loadSeatAllocations(date);
      onRefreshData();
    } catch (err: any) {
      console.error('Error completing seating:', err);
      
      // More specific error message based on the response
      if (err.response && err.response.status === 422) {
        toast.error('Cannot seat reservation - one or more selected seats are already occupied. Please select different seats.');
        
        // Reset seat selection but keep the wizard active
        setSeatWizard(prev => ({
          ...prev,
          selectedSeatIds: []
        }));
        
        // Refresh to get latest seat allocation data
        loadSeatAllocations(date);
      } else {
        toast.error('Failed to complete seating. Please try again.');
        cancelSeatingProcess();
      }
    } finally {
      setIsLoading(false);
    }
  }
  
  // Get occupant info for a seat with transition support
  function getSeatOccupantInfo(seatId: number) {
    // During transitions, prioritize current allocations but fall back to previous
    if (isTransitioning && prevSeatAllocations.length > 0) {
      const currentInfo = seatAllocations.find(a => a.seat_id === seatId && !a.released_at);
      if (currentInfo) return currentInfo;
      
      // If not in current allocations during transition, check previous allocations
      return prevSeatAllocations.find(a => a.seat_id === seatId && !a.released_at) || null;
    }
    
    // Normal non-transitioning behavior
    return seatAllocations.find(a => a.seat_id === seatId && !a.released_at) || null;
  }
  
  // Check if a seat is already occupied, with transition support
  function isSeatOccupied(seatId: number): boolean {
    // During transitions, check both current and previous allocations
    // This makes seats maintain their state during the transition period
    if (isTransitioning && prevSeatAllocations.length > 0) {
      // First check current allocations
      const currentOccupied = seatAllocations.some(allocation => 
        allocation.seat_id === seatId && !allocation.released_at
      );
      
      // If not found in current, check previous (for fading out effect)
      if (!currentOccupied) {
        return prevSeatAllocations.some(allocation => 
          allocation.seat_id === seatId && !allocation.released_at
        );
      }
      
      return currentOccupied;
    }
    
    // Normal non-transitioning behavior
    return seatAllocations.some(allocation => 
      allocation.seat_id === seatId && !allocation.released_at
    );
  }
  
  // Handle clicking on a seat
  function handleSeatClick(seatId: number, seat: any) {
    // If we're in enhanced single-tap seating mode
    if (activeMode === 'seat' && currentReservation) {
      // Use our isSeatOccupied helper for clarity
      if (isSeatOccupied(seatId)) {
        toast.error(`Seat ${seat.label || seatId} is already occupied`);
        return;
      }
      
      // Check if we already have enough seats
      if (!seatWizard.selectedSeatIds.includes(seatId) && 
          seatWizard.selectedSeatIds.length >= currentReservation.party_size) {
        toast.error(`You can only select ${currentReservation.party_size} seats`);
        return;
      }
      
      // Toggle this seat
      toggleSeatSelection(seatId);
      
      // Auto-complete when all seats are selected (only if adding a seat, not removing)
      if (!seatWizard.selectedSeatIds.includes(seatId) && 
          seatWizard.selectedSeatIds.length + 1 === currentReservation.party_size) {
        toast.success('All seats selected! Tap the Confirm button to complete seating.');
      }
    }
    // Original seating wizard mode (retaining for compatibility)
    else if (seatWizard.active) {
      // Use our isSeatOccupied helper for clarity
      if (isSeatOccupied(seatId)) {
        toast.error(`Seat ${seat.label || seatId} is already occupied`);
        return;
      }
      
      // Check if we already have enough seats
      if (!seatWizard.selectedSeatIds.includes(seatId) && 
          seatWizard.selectedSeatIds.length >= seatWizard.occupantPartySize) {
        toast.error(`You can only select ${seatWizard.occupantPartySize} seats`);
        return;
      }
      
      // Toggle this seat
      toggleSeatSelection(seatId);
    } else {
      // Regular view mode - check if seat is occupied using our helper
      if (isSeatOccupied(seatId)) {
        // Open seat details dialog
        setSelectedSeatId(seatId);
        setShowSeatDialog(true);
      } else {
        toast.success(`Seat ${seat.label || seatId} is available`);
      }
    }
  }
  
  // Handle seat action (finish, noshow, etc)
  async function handleSeatAction(action: string, occupantType: string, occupantId: number) {
    if (!restaurant || !validateRestaurantContext(restaurant)) {
      toast.error('Invalid restaurant context');
      return;
    }
    
    try {
      setIsLoading(true);
      
      switch (action) {
        case 'finish':
          await seatAllocationFinish({
            restaurant_id: restaurant.id,
            occupant_type: occupantType,
            occupant_id: occupantId
          });
          toast.success('Guest has finished, seats freed');
          break;
          
        case 'noshow':
          await seatAllocationNoShow({
            restaurant_id: restaurant.id,
            occupant_type: occupantType,
            occupant_id: occupantId
          });
          toast.success('Marked as no-show');
          break;
          
        case 'arrive':
          await seatAllocationArrive({
            restaurant_id: restaurant.id,
            occupant_type: occupantType,
            occupant_id: occupantId
          });
          toast.success('Guest arrived');
          break;
          
        case 'cancel':
          await seatAllocationCancel({
            restaurant_id: restaurant.id,
            occupant_type: occupantType,
            occupant_id: occupantId
          });
          toast.success('Reservation canceled');
          break;
      }
      
      // Close the dialog
      setShowSeatDialog(false);
      setSelectedSeatId(null);
      
      // Refresh data
      await loadSeatAllocations(date);
      onRefreshData();
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      toast.error(`Failed to ${action}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Handle clicking on a reservation in the list
  function handleReservationClick(reservation: Reservation) {
    if (activeMode === 'seat') {
      setCurrentReservation(reservation);
      setSeatWizard({
        active: true, // Activate the seat wizard to enable highlighting
        occupantType: 'reservation',
        occupantId: reservation.id,
        occupantName: reservation.contact_name || 'Guest',
        occupantPartySize: reservation.party_size || 1,
        selectedSeatIds: []
      });
      toast.success(`Select seats for ${reservation.contact_name || 'Guest'} (Party of ${reservation.party_size || 1})`);
      
      // Auto-close the drawer when selecting a reservation in seating mode
      // This gives more room to see and select seats
      if (drawerOpen) {
        closeDrawer();
      }
    } else {
      setSelectedReservation(reservation);
    }
  }
  
  // Function to close reservation modal
  function closeReservationModal() {
    setSelectedReservation(null);
  }
  
  // Function to close seat dialog
  function closeSeatDialog() {
    setShowSeatDialog(false);
    setSelectedSeatId(null);
  }
  
  // Function to toggle the grid display
  function toggleGrid() {
    setShowGrid(!showGrid);
  }
  
  // Functions for side drawer control
  function toggleDrawer() {
    setDrawerOpen(prev => !prev);
  }
  
  function closeDrawer() {
    setDrawerOpen(false);
  }
  
  function openDrawer() {
    setDrawerOpen(true);
  }
  
  function setDrawerTab(tab: 'reservations' | 'waitlist') {
    setActiveTab(tab);
    // Auto-open drawer when changing tabs
    if (!drawerOpen) {
      openDrawer();
    }
  }
  
  // Helper function to check if a reservation status is valid for seating
  function isReservationSeatable(reservation: Reservation): boolean {
    // Add all statuses that are considered valid for seating
    // Using an array approach to be more maintainable
    const seatableStatuses = [
      'pending',
      'confirmed',
      'reserved',
      'booked'
    ];
    
    // Using type assertion to handle custom status values not in the type definition
    // This accommodates the 'reserved' and 'booked' statuses in your system
    return seatableStatuses.includes(reservation.status as string);
  }
  
  // Helper function to get the status badge styles
  function getStatusStyles(status: string): string {
    // Return appropriate Tailwind classes based on status
    switch(status) {
      case 'booked':
        return 'bg-blue-100 text-blue-800';
      case 'reserved':
        return 'bg-purple-100 text-purple-800';
      case 'confirmed':
        return 'bg-cyan-100 text-cyan-800';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'seated':
        return 'bg-green-100 text-green-800';
      case 'finished':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  // Helper function to get user-friendly status labels
  function getStatusLabel(status: string): string {
    // Return appropriate display name for each status
    switch(status) {
      case 'booked':
        return '📝 Booked';
      case 'reserved':
        return '🗓 Reserved';
      case 'confirmed':
        return '✅ Confirmed';
      case 'pending':
        return '⏳ Pending';
      case 'seated':
        return '🪑 Seated';
      case 'finished':
        return '🏁 Finished';
      case 'cancelled':
        return '❌ Cancelled';
      case 'no_show':
        return '👻 No Show';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
  
  
  // Handle zoom controls with better min/max limits matching SeatLayoutEditor
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.2, Math.min(2.0, prev + delta)));
  };
  
  // State to track layout center for auto-centering
  const [layoutCenter, setLayoutCenter] = useState<{x: number, y: number} | null>(null);
  
  // Calculate the optimal zoom level based on the layout content
  const calculateOptimalZoom = () => {
    // Handle empty layouts or no sections
    if (!layout?.sections_data?.sections || layout.sections_data.sections.length === 0) {
      console.log('No sections in layout, using default zoom');
      setLayoutCenter(null);
      return 0.7; // Default zoom if no sections exist
    }

    // Get sections for the active floor
    const sectionsOnCurrentFloor = layout.sections_data.sections.filter(
      section => (section.floorNumber || 1) === activeFloor
    );

    // If no sections on current floor, reset center and use default zoom
    if (sectionsOnCurrentFloor.length === 0) {
      console.log('No sections on current floor, using default zoom');
      setLayoutCenter(null);
      return 0.7;
    }

    // Find the bounds of the layout (min/max x/y coordinates)
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    // Process all sections to find the layout boundaries
    sectionsOnCurrentFloor.forEach(section => {
      // Get table position and dimensions
      const tableX = section.offsetX || 0;
      const tableY = section.offsetY || 0;
      const tableWidth = section.shape === 'rectangle' ? (section.dimensions?.width || 120) : TABLE_SIZE;
      const tableHeight = section.shape === 'rectangle' ? (section.dimensions?.height || 80) : TABLE_SIZE;

      // Process all seats for this section
      if (section.seats && section.seats.length > 0) {
        section.seats.forEach(seat => {
          const seatX = tableX + (seat.position_x || 0);
          const seatY = tableY + (seat.position_y || 0);
          
          // Update bounds to include seat positions
          minX = Math.min(minX, seatX - SEAT_SIZE/2);
          maxX = Math.max(maxX, seatX + SEAT_SIZE/2);
          minY = Math.min(minY, seatY - SEAT_SIZE/2);
          maxY = Math.max(maxY, seatY + SEAT_SIZE/2);
        });
      }

      // Include the table itself in the bounds calculation
      minX = Math.min(minX, tableX - tableWidth/2);
      maxX = Math.max(maxX, tableX + tableWidth/2);
      minY = Math.min(minY, tableY - tableHeight/2);
      maxY = Math.max(maxY, tableY + tableHeight/2);
    });

    // If no valid sections were found, use default zoom
    if (minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity) {
      console.warn('Invalid layout bounds detected, using default zoom');
      setLayoutCenter(null);
      return 0.7;
    }

    // Calculate the center of the layout for auto-centering
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Update the layout center state for centering when rendering
    setLayoutCenter({ x: centerX, y: centerY });
    
    console.log('Layout center calculated:', centerX, centerY);

    // Add consistent padding for all layouts
    const padding = 150;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Calculate the content dimensions
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Use fixed container dimensions for consistent behavior
    const containerWidth = 1200; 
    const containerHeight = 800;

    // Calculate zoom required to fit content in container
    const zoomX = containerWidth / contentWidth;
    const zoomY = containerHeight / contentHeight;

    // Use the smaller zoom factor with a consistent safety margin
    const safetyScaleFactor = 0.9;
    const calculatedZoom = Math.min(zoomX, zoomY) * safetyScaleFactor;
    
    console.log('Optimal zoom calculated:', calculatedZoom);

    // Ensure zoom is within consistent bounds
    return Math.max(0.2, Math.min(1.0, calculatedZoom || 0.7));
  };

  // Reset zoom to fit the content
  const resetZoom = () => {
    const optimalZoom = calculateOptimalZoom();
    setZoom(optimalZoom);
  };
  
    return (
    <div className="flex flex-col bg-white rounded-md w-full h-full relative overflow-hidden">
      {/* Seating wizard control has been moved below the floor tabs and above the canvas */}
      
      {/* Layout information and controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="p-3 flex justify-between items-center">
          <div className="flex space-x-2 items-center">
            <div>
              <div className="text-lg font-medium text-gray-800">
                Main Layout - Floor Plan View
              </div>
              <div className="text-sm text-gray-600">
                {reservations.length} Reservations | {waitlist.length} Waitlist Entries
              </div>
            </div>
          </div>
          
          {/* Action buttons and refresh control on right side */}
          <div className="flex items-center gap-3">
            {/* Seat Guests button */}
            <button
              onClick={() => {
                if (activeMode === 'view') {
                  setActiveMode('seat');
                  toast.success('Seating mode activated. Select a reservation to seat.');
                  // Auto-open drawer in seating mode
                  openDrawer();
                  setDrawerTab('reservations');
                } else {
                  setActiveMode('view');
                  setCurrentReservation(null);
                  cancelSeatingProcess();
                }
              }}
              className={`px-5 py-3 rounded-md transition-colors shadow-sm text-base font-medium min-w-[180px] text-center ${
                activeMode === 'seat' 
                  ? 'bg-hafaloha-gold text-white border border-hafaloha-gold/80' 
                  : 'bg-white text-gray-700 hover:bg-hafaloha-gold/10 hover:text-hafaloha-gold border border-gray-200'
              }`}
            >
              {activeMode === 'seat' ? 'Cancel Seating' : 'Seat Guests'}
            </button>
            
            {/* Show/Hide Reservations button with fixed width */}
            <button
              onClick={toggleDrawer}
              className={`px-5 py-3 rounded-md transition-colors shadow-sm text-base font-medium min-w-[180px] text-center ${
                drawerOpen 
                  ? 'bg-blue-500 text-white border border-blue-600' 
                  : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
              }`}
            >
              {drawerOpen ? 'Hide Reservations' : 'Show Reservations'}
            </button>
            
            {/* Refresh button */}
            <button
              onClick={onRefreshData}
              className="p-2 text-hafaloha-gold hover:bg-hafaloha-gold/10 rounded-md transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
        
        {/* Canvas controls - toolbar */}
        <div className="flex items-center p-3 border-t border-gray-100">
          {/* Left section - Floor tabs */}
          <div className="flex-none flex space-x-2 mr-6">
            {layout && Array.from(
              new Set(layout?.sections_data?.sections?.map(s => s.floorNumber || 1))
            ).sort((a, b) => a - b).map(floorNum => (
              <button
                key={`floor-${floorNum}`}
                onClick={() => setActiveFloor(floorNum)}
                className={`px-5 py-3 rounded-md transition-colors shadow-sm text-base ${activeFloor === floorNum ? 'bg-hafaloha-gold/10 text-hafaloha-gold border border-hafaloha-gold/20' : 'bg-gray-100 text-gray-700 hover:bg-hafaloha-gold/5 hover:text-hafaloha-gold/70'}`}
              >
                Floor {floorNum}
              </button>
            ))}
          </div>
          
          {/* Flex spacer to balance layout */}
          <div className="flex-1"></div>
          
          {/* Middle section - Location and Date controls */}
          <div className="flex-none flex items-center mx-auto">
            <div className="flex items-center space-x-3">
              {/* Location selector with MobileSelect */}
              {locations.length > 1 && (
                <div className="relative">
                  <MobileSelect
                    options={locations.map(location => ({
                      value: location.id.toString(),
                      label: location.name
                    }))}
                    value={(selectedLocationId || '').toString()}
                    onChange={(value) => {
                      const newLocationId = value ? parseInt(value, 10) : null;
                      
                      // Use the same function as initial page load to completely reset everything
                      // This ensures consistent behavior between initial load and location switching
                      loadLocation(newLocationId);
                    }}
                    placeholder="Select location"
                    className="min-w-[180px]"
                  />
                </div>
              )}
              {/* Previous day button */}
              <button
                onClick={() => {
                  // Save current data before changing date
                  setPrevReservations(reservations);
                  setPrevWaitlist(waitlist);
                  setIsDataTransitioning(true);
                  
                  // Change the date (using the onDateChange prop from parent)
                  // This will update both the parent component and the shared store
                  // since we've already updated the SeatingManager component
                  const prevDay = new Date(dateObj);
                  prevDay.setDate(prevDay.getDate() - 1);
                  onDateChange(prevDay);
                }}
                className="p-3 rounded-md bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 active:bg-hafaloha-gold/30 transition-colors border border-hafaloha-gold/20"
                aria-label="Previous day"
                title="Previous day"
              >
                <ChevronLeft className="h-5 w-5 text-hafaloha-gold" />
              </button>
              
              {/* Date picker with icon */}
              <div className="relative flex-1 sm:w-48">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={format(dateObj, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Save current data before changing date
                      setPrevReservations(reservations);
                      setPrevWaitlist(waitlist);
                      setIsDataTransitioning(true);
                      
                      // Change the date (using the onDateChange prop from parent)
                      // This will update both the parent component and the shared store
                      // since we've already updated the SeatingManager component
                      onDateChange(new Date(e.target.value));
                    }
                  }}
                  className="w-full pl-10 pr-3 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-base focus:ring-2 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold outline-none"
                />
              </div>
              
              {/* Next day button */}
              <button
                onClick={() => {
                  // Save current data before changing date
                  setPrevReservations(reservations);
                  setPrevWaitlist(waitlist);
                  setIsDataTransitioning(true);
                  
                  // Change the date (using the onDateChange prop from parent)
                  // This will update both the parent component and the shared store
                  // since we've already updated the SeatingManager component
                  const nextDay = new Date(dateObj);
                  nextDay.setDate(nextDay.getDate() + 1);
                  onDateChange(nextDay);
                }}
                className="p-3 rounded-md bg-hafaloha-gold/10 hover:bg-hafaloha-gold/20 active:bg-hafaloha-gold/30 transition-colors border border-hafaloha-gold/20"
                aria-label="Next day"
                title="Next day"
              >
                <ChevronRight className="h-5 w-5 text-hafaloha-gold" />
              </button>
            </div>
            {/* Loading indicator removed as requested */}
          </div>
          
          {/* Flex spacer to balance layout */}
          <div className="flex-1"></div>
          
          {/* Right section - Grid toggle and zoom controls */}
          <div className="flex-none flex items-center space-x-2 ml-6">
            <button
              onClick={toggleGrid}
              className={`px-4 py-3 text-base rounded-md transition-colors shadow-sm ${showGrid ? 'bg-hafaloha-gold/10 text-hafaloha-gold border border-hafaloha-gold/20' : 'bg-gray-100 text-gray-600 hover:bg-hafaloha-gold/5 hover:text-hafaloha-gold/70'}`}
            >
              {showGrid ? 'Hide Grid' : 'Show Grid'}
            </button>
            <button
              onClick={() => handleZoom(-0.1)}
              className="px-3 py-2 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Zoom Out"
              disabled={zoom <= 0.2}
            >
              <Minus size={18} />
            </button>
            
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              {Math.round(zoom * 100)}%
            </span>
            
            <button
              onClick={() => handleZoom(0.1)}
              className="px-3 py-2 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Zoom In"
              disabled={zoom >= 2}
            >
              <LucidePlus size={18} />
            </button>
            
            <button 
              onClick={resetZoom}
              className="px-3 py-2 border-l border-gray-200 text-gray-600 hover:bg-gray-200 transition-colors text-xs font-medium"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
      
      {/* Seating information panel - positioned between floor tabs and canvas */}
      {seatWizard.active && (
        <div className="bg-hafaloha-gold/20 border border-hafaloha-gold/30 rounded-lg p-3 mb-3 flex flex-wrap sm:flex-nowrap items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="bg-hafaloha-gold p-2 rounded-full shadow-sm">
              <UserRound className="text-white" size={22} />
            </div>
            <div>
              <div className="font-bold text-lg text-hafaloha-gold">
                Seating: {seatWizard.occupantName}
              </div>
              <div className="font-medium text-gray-700 flex items-center flex-wrap gap-2">
                <span className="bg-hafaloha-gold/10 px-2 py-1 rounded-md border border-hafaloha-gold/20 inline-flex items-center">
                  <Users2 size={16} className="mr-1 text-hafaloha-gold" />
                  Party of {seatWizard.occupantPartySize}
                </span>
                <span className="inline-flex items-center">
                  <CheckSquare size={16} className="mr-1 text-green-600" />
                  {seatWizard.selectedSeatIds.length} of {seatWizard.occupantPartySize} seats selected
                </span>
                {seatWizard.selectedSeatIds.length === seatWizard.occupantPartySize && (
                  <span className="inline-flex items-center text-green-600 font-medium bg-green-50 px-2 py-1 rounded-md border border-green-200">
                    <CheckCircle size={16} className="mr-1" />
                    Ready to confirm
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={cancelSeatingProcess}
              className="px-5 py-3 text-base font-medium border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 text-gray-700 shadow-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={completeSeating}
              disabled={seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize}
              className={`px-5 py-3 text-base font-medium rounded-md text-white shadow-sm transition-colors ${seatWizard.selectedSeatIds.length === seatWizard.occupantPartySize ? 'bg-hafaloha-gold hover:bg-hafaloha-gold/90 active:bg-hafaloha-gold/80' : 'bg-hafaloha-gold/40 cursor-not-allowed'}`}
            >
              Confirm Seating
            </button>
          </div>
        </div>
      )}
      
      {/* Main content area with floor plan and side drawer */}
      <div className="bg-white mb-6 w-full flex flex-row relative">
        {/* Main canvas area */}
        <div 
          className="bg-white rounded-lg shadow-sm flex-1 overflow-auto relative"
          style={{ 
            transition: 'width 0.3s ease-in-out',
            height: 'calc(100vh - 220px)', // Dynamic height based on viewport height
            minHeight: '800px', // Minimum height to ensure sufficient space
            width: drawerOpen ? 'calc(70% - 0.75rem)' : '100%',
            overscrollBehavior: 'contain', /* Improve scroll behavior on touch devices */
            WebkitOverflowScrolling: 'touch', /* Improve scrolling on iOS devices */
            position: 'relative' // Ensure proper positioning of content
          }}
        >
          {/* Loading state with smooth transition - modified to be semi-transparent */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-10 bg-white/70 backdrop-blur-sm ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col items-center bg-white/80 px-8 py-6 rounded-lg shadow-md">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hafaloha-gold mb-4 shadow-sm"></div>
              <p className="text-gray-600 font-medium">Loading layout...</p>
            </div>
          </div>
          
          {/* Error message with smooth transition */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-10 ${error && !isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-sm">
              {error}
            </div>
          </div>
          
          {/* No layout message with smooth transition */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-10 ${!layout && !error && !isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="text-center">
              <p className="text-gray-600 mb-4">No layout is currently loaded.</p>
              <p className="text-gray-500">Please select a layout from the dropdown above.</p>
            </div>
          </div>
          
          {/* Background grid pattern for the entire canvas - covers all visible and scrollable area */}
          {showGrid && (
            <div className="absolute inset-0 z-0 pointer-events-none" 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='${GRID_SIZE}' height='${GRID_SIZE}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 0 L ${GRID_SIZE} 0 ${GRID_SIZE} ${GRID_SIZE} 0 ${GRID_SIZE} Z' fill='none' stroke='%23e5e7eb' stroke-width='1'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                opacity: 0.8,
                width: '100%',
                height: '100%',
                minWidth: '2400px', /* More compact size to match SeatLayoutEditor */
                minHeight: '1600px'
              }}
            />
          )}
          
          {/* Main floor plan content - only shown when layout is available */}
          {layout && (
            <div 
              className="relative flex justify-center items-center p-4" 
              style={{ transformOrigin: 'center center', minHeight: '500px' }}
            >
              <div
                ref={canvasRef}
                className={isTransitioning ? 'opacity-70 transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300'}
                style={{ 
                  width: '1800px', 
                  height: '1200px', 
                  position: 'relative',
                  transform: `scale(${zoom})`, 
                  transformOrigin: '0 0',
                  margin: '0 auto',
                  padding: '0',
                  overflow: 'visible' // Allow content to extend beyond boundaries
              }}>
                {/* Canvas boundary indicator for better visibility */}
                <div className="absolute inset-0 border-2 border-gray-200 border-dashed opacity-30 pointer-events-none" style={{width: '2320px', height: '1520px'}}></div>
                {layout?.sections_data?.sections?.filter(section => (section.floorNumber || 1) === activeFloor).map((section, sectionIndex) => (
                  <div 
                    key={`section-${sectionIndex}`}
                    className="absolute"
                    style={{
                      left: `${section.offsetX || 0}px`,
                      top: `${section.offsetY || 0}px`,
                      position: 'absolute'
                    }}
                  >
                    {/* Table in the center - matched to Layout Editor styling */}
                    <div 
                      className={`flex items-center justify-center bg-gray-300 absolute ${section.shape === 'rectangle' ? '' : 'rounded-full'}`}
                      style={{ 
                        // For circle tables use fixed diameter, for rectangle use the dimensions
                        width: section.shape === 'rectangle' 
                          ? `${section.dimensions?.width || 120}px` 
                          : `${TABLE_SIZE}px`,
                        height: section.shape === 'rectangle' 
                          ? `${section.dimensions?.height || 80}px` 
                          : `${TABLE_SIZE}px`,
                        left: 0,
                        top: 0,
                        // Apply rotation only for rectangle tables
                        transform: section.shape === 'rectangle' 
                          ? `translate(-50%, -50%) rotate(${section.rotation || 0}deg)` 
                          : 'translate(-50%, -50%)',
                        zIndex: 1,
                        opacity: 0.85,
                        boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                        border: '2px solid #ccc'
                      }}
                    >
                      <span className="text-base font-semibold text-gray-800">{section.name}</span>
                      {/* Visual rotation indicator for rectangle tables */}
                      {section.shape === 'rectangle' && (section.rotation || 0) > 0 && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 rounded-bl-sm">
                          {section.rotation}°
                        </div>
                      )}
                    </div>
                    
                    {/* Seats positioned around the table */}
                    {section.seats?.map((seat, seatIndex) => {
                      // Check if this seat is allocated in our seat allocations data
                      const seatAllocation = seatAllocations.find(allocation => 
                        allocation.seat_id === seat.id && allocation.occupant_id !== null
                      );
                      
                      // Determine if the seat is occupied
                      const isOccupied = !!seatAllocation;
                      
                      // Get the name of the person occupying the seat
                      const occupantName = seatAllocation?.occupant_name;
                      
                      return (
                        <div
                          key={`seat-${sectionIndex}-${seatIndex}`}
                          className={`absolute rounded-full flex items-center justify-center text-sm font-medium
                            ${isOccupied ? 'bg-green-500 border-green-600 text-white' : 
                              (seat.id && seatWizard.selectedSeatIds.includes(seat.id)) ? 
                                'bg-hafaloha-gold border-hafaloha-gold/80 text-white' : 
                                'bg-[#fef3c7] border-[#8B5500] text-[#8B5500]'} 
                            ${(activeMode === 'seat' || seatWizard.active) && (!seat.id || !isSeatOccupied(seat.id)) ? 'cursor-pointer hover:ring-4 hover:ring-amber-400/70 active:scale-95' : 
                              isOccupied ? 'cursor-pointer hover:ring-4 hover:ring-green-400/70 active:scale-95' : 'cursor-default'}
                            hover:shadow-lg transition-all duration-300
                          `}
                          style={{ 
                            position: 'absolute',
                            width: `${SEAT_SIZE}px`,
                            height: `${SEAT_SIZE}px`,
                            /* Match seat spacing with SeatLayoutEditor by using positions directly */
                            left: `${seat.position_x}px`,
                            top: `${seat.position_y}px`,
                            zIndex: 5,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            transform: 'translate(-50%, -50%)', // Center the seat on its coordinates
                            border: '2.5px solid', // Matches SeatLayoutEditor
                            opacity: isTransitioning ? 0.5 : 1,
                            transition: 'opacity 0.3s ease-in-out, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out'
                          }}
                          onClick={() => seat.id && handleSeatClick(seat.id, seat)}
                          title={occupantName ? `Reserved by: ${occupantName || 'Unnamed reservation'} #${seatAllocation?.reservation?.reservation_number}` : 
                                  seatWizard.active ? 'Click to select/deselect seat' : 'Available seat'}
                        >
                          {seat.label || `Seat #${seatIndex+1}`}
                          {seat.id && seatWizard.selectedSeatIds.includes(seat.id) && (
                            <span className="absolute -top-2 -right-2 bg-hafaloha-gold text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-md border border-white">
                              {seat.id ? seatWizard.selectedSeatIds.indexOf(seat.id) + 1 : ''}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Side drawer component */}
        <div 
          className={`border border-gray-100 bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 ease-in-out ${drawerOpen ? 'opacity-100 w-[30%]' : 'opacity-0 w-0'}`}
          style={{ 
            height: 'calc(100vh - 220px)', // Dynamic height matching main container 
            minHeight: '800px', // Minimum height to ensure sufficient space
            visibility: drawerOpen ? 'visible' : 'hidden'
          }}
        >
          {/* Drawer pull handle for better iPad UX - visible even when drawer is closed */}
          {!drawerOpen && (
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2"
              style={{zIndex: 10}}
            >
              <button 
                onClick={openDrawer}
                className="bg-white rounded-full p-1 shadow-md border border-gray-200 text-gray-600 hover:text-blue-600"
                aria-label="Open drawer"
                title="Show reservations"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          )}
          {/* Drawer header with tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setDrawerTab('reservations')}
                className={`px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'reservations' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
              >
                Reservations
              </button>
              <button
                onClick={() => setDrawerTab('waitlist')}
                className={`px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'waitlist' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
              >
                Waitlist
              </button>
              <div className="ml-auto">
                <button
                  onClick={closeDrawer}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  aria-label="Close drawer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Drawer content area */}
          <div className="overflow-auto p-2" style={{ height: 'calc(100% - 46px)' }}>
            {activeTab === 'reservations' ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Reservations</h3>
                
                {/* Get filtered reservations based on selected location */}
                {(() => {
                  // Filter reservations by location if a location is selected
                  const filteredReservations = selectedLocationId !== null
                    ? reservations.filter(res => res.location_id === selectedLocationId)
                    : reservations;
                    
                  // Return empty state if no reservations
                  if (filteredReservations.length === 0) {
                    return (
                      <p className="text-gray-500 text-xs italic">
                        No reservations for this date{selectedLocationId !== null ? ' at this location' : ''}
                      </p>
                    );
                  }
                  
                  // Otherwise return the reservation list
                  return null;
                })()} 
                
                {/* Only render if we have reservations */}
                {(selectedLocationId !== null
                  ? reservations.filter(res => res.location_id === selectedLocationId)
                  : reservations).length > 0 && (
                  <ul className="space-y-1">
                    {[...(selectedLocationId !== null
                      ? reservations.filter(res => res.location_id === selectedLocationId)
                      : reservations)].sort((a, b) => {
                      // First, sort by time
                      const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
                      const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
                      
                      if (timeA !== timeB) {
                        return timeA - timeB; // Ascending time order
                      }
                      
                      // If same time, sort by creation date
                      const createTimeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                      const createTimeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                      return createTimeA - createTimeB; // Oldest created first
                    }).map((res) => (
                      <li 
                        key={`drawer-res-${res.id}`} 
                        className={`p-2 rounded-md text-sm cursor-pointer relative transition-colors border shadow-sm ${
                          activeMode === 'seat' 
                            ? currentReservation?.id === res.id
                              ? 'bg-hafaloha-gold/20 border-hafaloha-gold/40 text-hafaloha-gold-800'
                              : isReservationSeatable(res)
                                ? 'bg-white hover:bg-hafaloha-gold/5 border-gray-200'
                                : 'bg-gray-100 opacity-60 border-gray-200'
                            : 'bg-gray-50 hover:bg-hafaloha-gold/5 active:bg-hafaloha-gold/10 border-gray-200'
                        }`}
                        onClick={() => {
                          // Only allow clicking reservations that have valid status for seating
                          if (activeMode === 'seat' && !isReservationSeatable(res)) {
                            toast.error("Can't seat a reservation with status: " + res.status);
                            return;
                          }
                          handleReservationClick(res);
                          // Auto-close drawer after selecting in seat mode
                          if (activeMode === 'seat') {
                            closeDrawer();
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-sm truncate">{res.contact_name || 'Guest'}</div>
                            {res.reservation_number && (
                              <div className="text-xs text-blue-600 font-medium">
                                #{res.reservation_number}
                              </div>
                            )}
                            <div className="text-xs text-gray-600">
                              Party: {res.party_size}, {res.start_time ? new Date(res.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                            </div>
                          </div>
                          <div className={`inline-flex justify-center items-center text-xs font-medium rounded-md min-w-[100px] px-2 py-1.5 ${getStatusStyles(res.status as string)}`}>
                            {getStatusLabel(res.status as string)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Waitlist</h3>
                {waitlist.length === 0 ? (
                  <p className="text-gray-500 text-xs italic">No guests in waitlist</p>
                ) : (
                  <ul className="space-y-1">
                    {waitlist.map((wl) => (
                      <li 
                        key={`drawer-wl-${wl.id}`}
                        className="bg-gray-50 p-2 rounded-md hover:bg-hafaloha-gold/5 active:bg-hafaloha-gold/10 text-sm cursor-pointer relative transition-colors border border-gray-200 shadow-sm"
                        onClick={() => toast.success(`Waitlist Entry: ${wl.contact_name || 'Guest'} (Party of ${wl.party_size})`)}
                      >
                        <div className="font-semibold text-sm truncate">{wl.contact_name || 'Guest'}</div>
                        <div className="text-xs text-gray-600 truncate">
                          Party: {wl.party_size}, {wl.check_in_time ? new Date(wl.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                        </div>
                        <div className="text-xs text-hafaloha-gold/90 font-medium">{wl.status}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom section with reservations and waitlist display - will be hidden when drawer is open */}
      <div className={`px-6 pb-6 w-full transition-opacity duration-300 ${drawerOpen ? 'hidden' : 'block'}`}>
        <div className="flex flex-row gap-6 w-full">
          {/* Reservations list */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-xl font-semibold mb-4 text-hafaloha-gold">Reservations</h3>
            
            {isLoadingSchedule ? (
              <div className="min-h-[150px] overflow-hidden">
                {/* Show previous data faded out during loading if we're transitioning between dates */}
                {isDataTransitioning && prevReservations.length > 0 ? (
                  <ul className="space-y-2 min-h-[150px] opacity-30 transition-all duration-500 ease-in-out transform translate-y-0">
                    {/* Render previous reservations with reduced opacity */}
                    {[...prevReservations].sort((a, b) => {
                      const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
                      const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
                      if (timeA !== timeB) return timeA - timeB;
                      const createTimeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                      const createTimeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                      return createTimeA - createTimeB;
                    }).map((res) => (
                      <li 
                        key={`prev-res-${res.id}`}
                        className="p-4 rounded-md text-base cursor-default relative border shadow-sm bg-gray-50 border-gray-200"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-base">{res.contact_name || 'Guest'}</div>
                            {res.reservation_number && (
                              <div className="text-sm text-blue-600 font-medium mt-1">
                                Reservation: #{res.reservation_number}
                              </div>
                            )}
                            <div className="text-sm text-gray-600 mt-1">Party: {res.party_size || 1}</div>
                            {res.start_time && (
                              <div className="text-sm text-gray-600 mt-1">
                                Time: {new Date(res.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-6 flex justify-center items-center">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-hafaloha-gold/60 rounded-full mr-2 animate-pulse"></div>
                      <p className="text-gray-500 text-sm">Loading reservations...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (selectedLocationId !== null ? reservations.filter(res => res.location_id === selectedLocationId) : reservations).length === 0 ? (
              <div className="py-6 flex justify-center items-center border border-gray-100 rounded-md bg-gray-50">
                <p className="text-gray-500 text-sm">
                  No reservations for this date{selectedLocationId !== null ? ' at this location' : ''}
                </p>
              </div>
            ) : (
              <ul className="space-y-2 min-h-[150px] opacity-100 transition-all duration-500 ease-in-out transform translate-y-0 animate-fadeIn">  {/* Enhanced transition */}
                {/* Sort reservations by time first, then by creation date for reservations with same time */}
                {/* Filter reservations by selected location if needed */}
                {[...(selectedLocationId !== null ? 
                   reservations.filter(res => res.location_id === selectedLocationId) : 
                   reservations)
                ].sort((a, b) => {
                  // First, sort by time
                  const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
                  const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
                  
                  if (timeA !== timeB) {
                    return timeA - timeB; // Ascending time order
                  }
                  
                  // If same time, sort by creation date
                  const createTimeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                  const createTimeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                  return createTimeA - createTimeB; // Oldest created first
                }).map((res) => (
                  <li 
                    key={`res-${res.id}`} 
                    className={`p-4 rounded-md text-base cursor-pointer relative transition-colors border shadow-sm ${
                      activeMode === 'seat' 
                        ? currentReservation?.id === res.id
                          ? 'bg-hafaloha-gold/20 border-hafaloha-gold/40 text-hafaloha-gold-800'
                          : isReservationSeatable(res)
                            ? 'bg-white hover:bg-hafaloha-gold/5 border-gray-200'
                            : 'bg-gray-100 opacity-60 border-gray-200'
                        : 'bg-gray-50 hover:bg-hafaloha-gold/5 active:bg-hafaloha-gold/10 border-gray-200'
                    }`}
                    onClick={() => {
                      // Only allow clicking reservations that have valid status for seating
                      if (activeMode === 'seat' && !isReservationSeatable(res)) {
                        toast.error("Can't seat a reservation with status: " + res.status);
                        return;
                      }
                      handleReservationClick(res);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-base">{res.contact_name || 'Guest'}</div>
                        {res.reservation_number && (
                          <div className="text-sm text-blue-600 font-medium mt-1">
                            Reservation: #{res.reservation_number}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          Party: {res.party_size}, {res.contact_phone ? res.contact_phone.replace(/\D+/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') : 'N/A'}
                        </div>
                        {res.start_time && (
                          <div className="text-sm text-blue-500 mt-1">
                            Time: {new Date(res.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex justify-center items-center min-w-[120px] px-3 py-1.5 text-sm font-medium rounded-md ${getStatusStyles(res.status)}`}>
                          {getStatusLabel(res.status)}
                        </span>
                        {isReservationSeatable(res) && activeMode === 'seat' && (
                          <span className="inline-flex justify-center items-center min-w-[120px] px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-md">
                            Available to seat
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Waitlist entries */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-xl font-semibold mb-4 text-hafaloha-gold">Waitlist</h3>
            
            {isLoadingSchedule ? (
              <div className="min-h-[150px] overflow-hidden">
                {/* Show previous data faded out during loading if we're transitioning between dates */}
                {isDataTransitioning && prevWaitlist.length > 0 ? (
                  <ul className="space-y-2 min-h-[150px] opacity-30 transition-all duration-500 ease-in-out transform translate-y-0">
                    {/* Render previous waitlist with reduced opacity */}
                    {prevWaitlist.map((wl: any) => (
                      <li 
                        key={`prev-wl-${wl.id}`}
                        className="bg-gray-50 p-4 rounded-md text-base cursor-default relative border border-gray-200 shadow-sm"
                      >
                        <div className="font-semibold text-base">{wl.contact_name || 'Guest'}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Party: {wl.party_size}, {wl.contact_phone ? wl.contact_phone.replace(/\D+/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') : 'N/A'}
                        </div>
                        {wl.check_in_time && (
                          <div className="text-sm text-blue-500 mt-1">
                            Checked in: {new Date(wl.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        )}
                        <div className="text-sm text-hafaloha-gold/90 font-medium mt-1">Status: {wl.status}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-6 flex justify-center items-center">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-hafaloha-gold/60 rounded-full mr-2 animate-pulse"></div>
                      <p className="text-gray-500 text-sm">Loading waitlist...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : waitlist.length === 0 ? (
              <div className="py-6 flex justify-center items-center border border-gray-100 rounded-md bg-gray-50">
                <p className="text-gray-500 text-sm">No guests in waitlist</p>
              </div>
            ) : (
              <ul className="space-y-2 min-h-[150px] opacity-100 transition-all duration-500 ease-in-out transform translate-y-0 animate-fadeIn">  {/* Enhanced transition */}
                {waitlist.map((wl: any) => (
                  <li 
                    key={`wl-${wl.id}`}
                    className="bg-gray-50 p-4 rounded-md hover:bg-hafaloha-gold/5 active:bg-hafaloha-gold/10 text-base cursor-pointer relative transition-colors border border-gray-200 shadow-sm"
                    onClick={() => toast.success(`Waitlist Entry: ${wl.contact_name || 'Guest'} (Party of ${wl.party_size})`)}
                  >
                    <div className="font-semibold text-base">{wl.contact_name || 'Guest'}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Party: {wl.party_size}, {wl.contact_phone ? wl.contact_phone.replace(/\D+/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') : 'N/A'}
                    </div>
                    {wl.check_in_time && (
                      <div className="text-sm text-blue-500 mt-1">
                        Checked in: {new Date(wl.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    )}
                    <div className="text-sm text-hafaloha-gold/90 font-medium mt-1">Status: {wl.status}</div>
                    <div className="text-sm text-gray-600 mt-1">Party size: {wl.party_size || '-'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom toolbar with status information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-wrap justify-between items-center w-full mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => toggleGrid()}
              className="px-4 py-2 text-base rounded-md bg-hafaloha-gold/10 text-hafaloha-gold hover:bg-hafaloha-gold/20 active:bg-hafaloha-gold/30 transition-colors border border-hafaloha-gold/20 shadow-sm"
            >
              {showGrid ? 'Hide Grid' : 'Show Grid'}
            </button>
            
            <div className="text-base text-gray-700 font-medium">
              <span className="text-hafaloha-gold">Layout:</span> {layout?.name || 'Main Layout'}
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <span className="text-base text-gray-700 font-medium">
                <span className="text-hafaloha-gold">Floor:</span> {activeFloor}
              </span>
            </div>
            
            <div className="flex items-center">
              <span className="text-base text-gray-700 font-medium">
                <span className="text-hafaloha-gold">Zoom:</span> {Math.round(zoom * 100)}%
              </span>
            </div>
            
            <div className="flex items-center">
              <span className="text-base text-gray-700 font-medium">
                <span className="text-hafaloha-gold">Sections:</span> {layout?.sections_data?.sections ? layout?.sections_data.sections.filter(s => (s.floorNumber || 1) === activeFloor).length : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Reservation Detail Modal */}
        {selectedReservation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center p-4 border-b border-hafaloha-gold/20 bg-hafaloha-gold/5">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-semibold text-hafaloha-gold">Reservation Details</h3>
                  {selectedReservation.reservation_number && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      #{selectedReservation.reservation_number}
                    </span>
                  )}
                </div>
                <button 
                  onClick={closeReservationModal}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                {/* Display reservation details with improved layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                    <h4 className="font-semibold text-hafaloha-gold border-b pb-2 border-hafaloha-gold/20">Guest Information</h4>
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-hafaloha-gold/20 flex items-center justify-center mr-3">
                        <UserRound size={20} className="text-hafaloha-gold" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{selectedReservation.contact_name || 'Guest'}</div>
                        <div className="text-sm text-gray-600">
                          {selectedReservation.contact_phone ? selectedReservation.contact_phone.replace(/\D+/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') : 'No phone'}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Email:</span> {selectedReservation.contact_email || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                    <h4 className="font-semibold text-hafaloha-gold border-b pb-2 border-hafaloha-gold/20">Reservation Details</h4>
                    <div>
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                          <Users2 size={16} className="text-blue-600" />
                        </div>
                        <span className="font-medium">Party Size:</span>
                        <span className="ml-2 text-lg font-semibold">{selectedReservation.party_size || '1'}</span>
                      </div>

                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                          <Calendar size={16} className="text-blue-600" />
                        </div>
                        <span className="font-medium">Date/Time:</span>
                        <span className="ml-2">{selectedReservation.start_time ? 
                          new Date(selectedReservation.start_time).toLocaleString([], {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          }) : 'Not specified'}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                          <CheckCircle size={16} className="text-blue-600" />
                        </div>
                        <span className="font-medium">Status:</span>
                        <span className="ml-2 capitalize px-2 py-1 rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: {
                              'pending': '#FEF3C7',
                              'confirmed': '#DCFCE7',
                              'cancelled': '#FEE2E2',
                              'seated': '#DBEAFE',
                              'completed': '#D1FAE5',
                              'no_show': '#FEE2E2'
                            }[selectedReservation.status || 'pending'],
                            color: {
                              'pending': '#92400E',
                              'confirmed': '#166534',
                              'cancelled': '#B91C1C',
                              'seated': '#1E40AF',
                              'completed': '#065F46',
                              'no_show': '#B91C1C'
                            }[selectedReservation.status || 'pending']
                          }}
                        >
                          {getStatusLabel(selectedReservation.status || 'pending')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Additional Information Section */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4 mb-6">
                  <h4 className="font-semibold text-hafaloha-gold border-b pb-2 border-hafaloha-gold/20">Additional Information</h4>
                  
                  {/* Notes/Special Requests */}
                  <div>
                    <span className="font-medium block mb-1">Special Requests/Notes:</span>
                    <div className="bg-white p-3 rounded border border-gray-200 min-h-[80px]">
                      {selectedReservation.special_requests || selectedReservation.notes ? (
                        <p>{selectedReservation.special_requests || selectedReservation.notes}</p>
                      ) : (
                        <p className="text-gray-400 italic">No special requests noted</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Seat Preferences/Labels */}
                  {selectedReservation.seat_preferences && selectedReservation.seat_preferences.length > 0 && (
                    <div>
                      <span className="font-medium block mb-1">Seat Preferences:</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedReservation.seat_preferences.map((pref, i) => (
                          <span key={`pref-${i}`} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                            {pref.join(', ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Creation Information */}
                  <div className="pt-2 border-t border-gray-200 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Created:</span> {selectedReservation.created_at ? 
                        new Date(selectedReservation.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        }) : 'N/A'}
                    </div>
                    {selectedReservation.updated_at && selectedReservation.updated_at !== selectedReservation.created_at && (
                      <div>
                        <span className="font-medium">Last Updated:</span> {new Date(selectedReservation.updated_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-between">
                  <button
                    onClick={closeReservationModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    Close
                  </button>
                  
                  {/* Show different actions based on reservation status */}
                  {/* If pending or confirmed, show the Seat Guest option */}
                  {(selectedReservation.status === 'pending' || selectedReservation.status === 'confirmed') && (
                    <button
                      onClick={() => startSeatingProcess(selectedReservation)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Seat Guest
                    </button>
                  )}
                  
                  {/* If already seated, show option to mark as completed */}
                  {selectedReservation.status === 'seated' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSeatAction('finish', 'reservation', selectedReservation.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Mark as Finished
                      </button>
                    </div>
                  )}
                  
                  {/* If completed or no-show, show status message */}
                  {(selectedReservation.status === 'completed' || selectedReservation.status === 'no_show') && (
                    <div className="text-sm text-gray-500 italic">
                      This reservation has been {selectedReservation.status === 'completed' ? 'completed' : 'marked as no-show'}.
                    </div>
                  )}
                  
                  {/* If cancelled, show status message */}
                  {selectedReservation.status === 'cancelled' && (
                    <div className="text-sm text-gray-500 italic">
                      This reservation has been cancelled.
                    </div>
                  )}
                  
                  {/* Handle any unexpected status */}
                  {(!['pending', 'confirmed', 'cancelled', 'seated', 'completed', 'no_show'].includes(selectedReservation.status)) && (
                    <button
                      onClick={() => startSeatingProcess(selectedReservation)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Seat Guest
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seat Dialog */}
        {showSeatDialog && selectedSeatId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Seat Options</h3>
                <button 
                  onClick={closeSeatDialog}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4">
                {(() => {
                  const occupantInfo = getSeatOccupantInfo(selectedSeatId);
                  if (!occupantInfo || !occupantInfo.occupant_id || !occupantInfo.occupant_type) {
                    return (
                      <div className="text-center py-4">
                        <p>This seat is currently available.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div>
                      <div className="mb-4">
                        <p className="font-medium">{occupantInfo.occupant_name || 'Guest'}</p>
                        <p className="text-sm text-gray-600">Party size: {occupantInfo.occupant_party_size || 1}</p>
                        <p className="text-sm text-gray-600">Status: {occupantInfo.occupant_status || 'Unknown'}</p>
                        {occupantInfo.start_time && (
                          <p className="text-sm text-gray-600">
                            Time: {new Date(occupantInfo.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {occupantInfo.occupant_status === 'booked' && (
                          <button
                            onClick={() => occupantInfo.occupant_id && handleSeatAction('arrive', occupantInfo.occupant_type || 'reservation', occupantInfo.occupant_id)}
                            className="flex items-center justify-center gap-2 p-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                          >
                            <Check size={16} />
                            Arrive
                          </button>
                        )}
                        
                        {occupantInfo.occupant_status === 'seated' && (
                          <button
                            onClick={() => occupantInfo.occupant_id && handleSeatAction('finish', occupantInfo.occupant_type || 'reservation', occupantInfo.occupant_id)}
                            className="flex items-center justify-center gap-2 p-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                          >
                            <Check size={16} />
                            Finish
                          </button>
                        )}
                        
                        <button
                          onClick={() => occupantInfo.occupant_id && handleSeatAction('noshow', occupantInfo.occupant_type || 'reservation', occupantInfo.occupant_id)}
                          className="flex items-center justify-center gap-2 p-2 bg-hafaloha-gold/10 text-hafaloha-gold rounded-md hover:bg-hafaloha-gold/20"
                        >
                          <Calendar size={16} />
                          No-show
                        </button>
                        
                        <button
                          onClick={() => occupantInfo.occupant_id && handleSeatAction('cancel', occupantInfo.occupant_type || 'reservation', occupantInfo.occupant_id)}
                          className="flex items-center justify-center gap-2 p-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="p-4 border-t">
                <button
                  onClick={closeSeatDialog}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FloorManager;
