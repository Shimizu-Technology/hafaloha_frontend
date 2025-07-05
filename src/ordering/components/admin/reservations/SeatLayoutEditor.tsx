// src/ordering/components/admin/reservations/SeatLayoutEditor.tsx

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Save, Trash2, Plus as LucidePlus, Edit2, Copy,
  Minus, Maximize, Power, Check, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Select, { StylesConfig, components } from 'react-select';

// Custom option interface for select dropdowns
interface SelectOption {
  value: string;
  label: string;
}

// EnhancedMobileSelect component with better dropdown positioning
interface EnhancedMobileSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const EnhancedMobileSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select an option',
  className = ''
}: EnhancedMobileSelectProps) => {
  // Find the selected option
  const selectedOption = options.find(option => option.value === value);
  
  // Custom styles for react-select with fixed positioning
  const customStyles: StylesConfig = {
    control: (provided, state) => ({
      ...provided,
      borderColor: state.isFocused ? '#c1902f' : '#e5e7eb',
      borderWidth: '1px',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(193, 144, 47, 0.2)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#c1902f' : '#d1d5db',
      },
      padding: '4px 8px',
      fontSize: '16px', // Prevent iOS zoom
      minHeight: '44px', // Better touch target for mobile
      borderRadius: '6px',
      transition: 'all 0.2s ease',
      width: '100%',
      backgroundColor: 'white',
    }),
    menu: (provided) => ({
      ...provided,
      marginTop: '4px',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 1000, // Ensure it appears above other elements
      width: '100%', // Ensure menu is same width as control
      left: 0,
      position: 'absolute',
      border: '1px solid #e5e7eb',
      backgroundColor: 'white',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '0',
      maxHeight: '300px',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#c1902f' : state.isFocused ? 'rgba(193, 144, 47, 0.1)' : 'white',
      color: state.isSelected ? 'white' : '#111827',
      padding: '12px 16px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: state.isSelected ? '500' : '400',
      transition: 'background-color 0.15s ease',
      '&:active': {
        backgroundColor: state.isSelected ? '#c1902f' : 'rgba(193, 144, 47, 0.2)',
      },
      borderBottom: '1px solid #f3f4f6',
      '&:last-child': {
        borderBottom: 'none',
      },
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused ? '#c1902f' : '#9ca3af',
      padding: '0 8px',
      transition: 'transform 0.2s ease, color 0.2s ease',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0)',
      '&:hover': {
        color: '#c1902f',
      },
    }),
  };

  // Custom dropdown indicator
  const DropdownIndicator = (props: any) => {
    return (
      <components.DropdownIndicator {...props}>
        <ChevronDown size={18} />
      </components.DropdownIndicator>
    );
  };

  // Handle change
  const handleChange = (selectedOption: any) => {
    if (selectedOption) {
      onChange(selectedOption.value);
    }
  };

  return (
    <div className={`w-full ${className}`} style={{ position: 'relative' }}>
      <Select
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        styles={customStyles}
        components={{ DropdownIndicator }}
        isSearchable={false}
        menuPosition="absolute"
        menuPlacement="bottom"
        classNamePrefix="enhanced-select"
      />
    </div>
  );
};
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import * as tenantUtils from '../../../../shared/utils/tenantUtils';
import { layoutsApi, type LayoutData, type SeatSection, type Seat, type TableShape, type TableRotation, type TableDimensions } from '../../../services/api-services';
import { Location, locationsApi } from '../../../../reservations/services/locations-api';
// Using TableDimensions type for rectangular tables: {width: number, height: number}

// Extended SeatSection with dragging properties
interface DraggableSeatSection extends SeatSection {
  offsetX: number;
  offsetY: number;
}

/** ---------- Data Interfaces ---------- **/

// Custom select component for layout selection that stays in position
interface LayoutSelectOption {
  value: string;
  label: string;
}

interface LayoutSelectProps {
  options: LayoutSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const LayoutSelect: React.FC<LayoutSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select a layout',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  
  // Find the selected option
  const selectedOption = options.find(option => option.value === value);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* Select button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-hafaloha-gold transition-all duration-200 ${selectedOption?.label.includes('(Active)') ? 'border-2 border-green-500 bg-green-50' : 'border border-gray-300 bg-white'}`}
      >
        <div className="flex items-center">
          <span className="block truncate">
            {selectedOption ? selectedOption.label.replace(' (Active)', '') : placeholder}
          </span>
          {selectedOption?.label.includes('(Active)') && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Check size={10} className="mr-0.5" />
              Active
            </span>
          )}
        </div>
        <ChevronDown 
          size={16} 
          className={`ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
        />
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
          <div className="max-h-60 py-1 overflow-auto">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`cursor-pointer select-none relative py-3 px-4 flex items-center justify-between ${option.value === value
                  ? 'bg-hafaloha-gold text-white font-medium'
                  : 'text-gray-900 hover:bg-hafaloha-gold/10'
                }`}
              >
                <div className="flex-1">
                  <span className={`${option.label.includes('(Active)') ? 'font-bold' : 'font-normal'}`}>
                    {option.label.replace(' (Active)', '')}
                  </span>
                </div>
                
                {/* Show a prominent indicator if this is the active layout */}
                {option.label.includes('(Active)') && (
                  <div className="flex items-center">
                    <span className={`flex items-center justify-center px-2 py-0.5 rounded-full text-xs ${option.value === value ? 'bg-white text-hafaloha-gold' : 'bg-green-100 text-green-800'}`}>
                      Active
                    </span>
                    <Check size={14} className={`ml-1 ${option.value === value ? 'text-white' : 'text-green-600'}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface SectionConfig {
  name: string;
  seatCount: number;
  type: 'table' | 'counter';
  orientation: 'horizontal' | 'vertical';
  // New properties for enhanced layout editor
  shape: TableShape;
  dimensions: {
    width: number;
    height: number;
  };
  rotation: TableRotation;
}

// Grid sizing and snapping constants
const GRID_SIZE = 25; // Grid size in pixels (matches the SVG grid pattern)
const SNAP_THRESHOLD = 10; // Threshold in pixels for snapping to grid

/** Define layout size presets - kept for future reference but currently unused */
// const LAYOUT_PRESETS: { [key: string]: { width: number; height: number; seatScale: number } } = {
//   small: { width: 800, height: 600, seatScale: 0.8 },
//   medium: { width: 1200, height: 800, seatScale: 1.0 },
//   large: { width: 2000, height: 1200, seatScale: 1.2 },
//   auto: { width: 1200, height: 800, seatScale: 1.0 },  // Default values, will be recalculated
// };

/**
 * SeatLayoutEditor Component
 * Visual editor for restaurant seat layouts with tenant isolation
 * Enhanced with transition effects and iPad optimizations
 */
interface SeatLayoutEditorProps {
  onTransitionStart?: () => void;
  isParentTransitioning?: boolean;
  /** Callback when unsaved changes state changes to inform parent components */
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
  locationId?: number | null; // Added location ID for multi-location support
}

const SeatLayoutEditor = ({ 
  onTransitionStart,
  isParentTransitioning = false,
  onUnsavedChangesChange,
  locationId = null
}: SeatLayoutEditorProps): JSX.Element => {
  // Add a ref to track the container element
  const containerRef = useRef<HTMLDivElement>(null);
  // Get restaurant context from store for tenant isolation
  const { restaurant } = useRestaurantStore();
  
  // Layout states
  const [allLayouts, setAllLayouts] = useState<LayoutData[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<number | null>(null);
  const [layoutName, setLayoutName] = useState('New Layout');
  const [sections, setSections] = useState<DraggableSeatSection[]>([]);
  
  // Location states
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(locationId);
  
  // Transition states for smooth UI
  const [dataTransitioning, setDataTransitioning] = useState(false);
  
  // Canvas sizing
  const [layoutSize] = useState<'auto'|'small'|'medium'|'large'>('auto');
  // Store these values for proper layout calculation but currently unused
  // const [canvasWidth, setCanvasWidth] = useState(1200); 
  // const [canvasHeight, setCanvasHeight] = useState(800);
  // const [seatScale, setSeatScale] = useState(1.0);
  
  // Canvas ref for drag events
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);
  
  // Track the currently dragged element to restore touch action
  const draggedElementRef = useRef<HTMLElement | null>(null);
  
  // Track scroll position before drag to restore it after movement
  const scrollPositionRef = useRef<{x: number, y: number} | null>(null);
  
  // State for layout editing mode
  const [isEditing, setIsEditing] = useState(false);
  
  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Dragging state handlers
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  
  // Enhanced drag handlers for both mouse and touch events
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, sectionId: string) => {
    // Only call preventDefault for mouse events, not touch events
    if ('clientX' in e) {
      e.preventDefault();
    } else {
      // For touch events, we need to stop propagation to prevent panning/scrolling
      e.stopPropagation();
    }
    
    // Save the current scroll position so we can lock it
    if (containerRef.current) {
      scrollPositionRef.current = {
        x: containerRef.current.scrollLeft,
        y: containerRef.current.scrollTop
      };
      
      // Apply fixed positioning to prevent scroll
      document.body.style.overflow = 'hidden';
    }
    
    setIsDragging(true);
    setSelectedSection(sectionId);
    
    // Handle both mouse and touch events
    if ('clientX' in e) {
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (e.touches && e.touches.length > 0) {
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };
  
  // Enhanced drag move handler for both mouse and touch events
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !selectedSection || !dragStart) return;
    
    // Stop propagation to prevent scrolling while dragging
    e.stopPropagation();
    
    // For mouse events, prevent default behavior (like text selection)
    if ('clientX' in e) {
      e.preventDefault();
    }
    
    let clientX: number, clientY: number;
    
    // Handle both mouse and touch events
    if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      return;
    }
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    // Calculate new position with delta movement
    let newX = 0;
    let newY = 0;
    
    // Find the current section being dragged
    const currentSection = sections.find(section => section.id === selectedSection);
    
    if (currentSection) {
      // Calculate raw new position
      newX = currentSection.offsetX + deltaX / zoom;
      newY = currentSection.offsetY + deltaY / zoom;
      
      // Apply grid snapping if enabled
      if (snapToGrid) {
        // Calculate nearest grid position
        const snapX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        const snapY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        
        // Only snap if we're close to a grid line (within threshold)
        if (Math.abs(newX - snapX) < SNAP_THRESHOLD / zoom) {
          newX = snapX;
        }
        
        if (Math.abs(newY - snapY) < SNAP_THRESHOLD / zoom) {
          newY = snapY;
        }
      }
      
      // Update section position with smoother movement for iPad
      setSections(prevSections => {
        return prevSections.map(section => {
          if (section.id === selectedSection) {
            return {
              ...section,
              offsetX: newX,
              offsetY: newY
            };
          }
          return section;
        });
      });
    }
    
    // Reset drag start for continuous movement
    setDragStart({ x: clientX, y: clientY });
  };
  
  // Enhanced drag end handler
  const handleDragEnd = useCallback(() => {
    // Only proceed if we were dragging
    if (!isDragging || !selectedSection) {
      return;
    }
    
    // Restore touch action to the dragged element and remove touch feedback
    if (draggedElementRef.current) {
      draggedElementRef.current.style.touchAction = '';
      draggedElementRef.current.classList.remove('touch-active'); // Remove touch feedback class
    }
    
    // Test backward compatibility in development environment
    if (process.env.NODE_ENV === 'development' && sections.length > 0) {
      // Create a mock layout to test with
      const mockLayout = {
        sections_data: { sections: sections }
      };
      testBackwardCompatibility(mockLayout);
    }
    
    // Restore touch action to the canvas
    if (canvasRef.current) {
      canvasRef.current.style.touchAction = 'pan-x pan-y';
    }
    
    // Clean up
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.style.userSelect = '';
    
    // Restore original scroll position if it was stored
    if (containerRef.current && scrollPositionRef.current) {
      containerRef.current.scrollLeft = scrollPositionRef.current.x;
      containerRef.current.scrollTop = scrollPositionRef.current.y;
    }
    
    // Reset refs
    scrollPositionRef.current = null;
    draggedElementRef.current = null;
    
    // Mark as having unsaved changes since we moved something
    setHasUnsavedChanges(true);
    
    setIsDragging(false);
    setSelectedSection(null);
    setDragStart(null);
  }, [isDragging, selectedSection, sections]);

  // Add/Edit Section dialog
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  
  // Section configuration state management
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    name: '',
    seatCount: 4,
    type: 'table',
    orientation: 'horizontal',
    // Default shape is rectangle for better usability
    shape: 'rectangle',
    // Default dimensions for tables with explicit type
    dimensions: { width: 120, height: 80 } as TableDimensions,
    // Default rotation is 0 degrees
    rotation: 0
  });
  const [seatCountText, setSeatCountText] = useState('4');
  const [sectionFloorText, setSectionFloorText] = useState('1');
  const [seatCapacityText, setSeatCapacityText] = useState('1');
  // State for custom seat labels
  const [customSeatLabels, setCustomSeatLabels] = useState<{[key: number]: string}>({});  
  const [showSeatLabelsEdit, setShowSeatLabelsEdit] = useState(false);
  
  // Basic geometry constants - match original implementation
  const TABLE_DIAMETER = 100; // Default size in pixels
  const [snapToGrid, setSnapToGrid] = useState(false); // Grid snapping off by default for smoother dragging
  const SEAT_DIAMETER = 64;  // Match original implementation
  
  // Floor logic
  const floorNumbers = Array.from(new Set(sections.map(s => s.floorNumber || 1))).sort((a, b) => a - b);
  const [activeFloor, setActiveFloor] = useState(floorNumbers.length > 0 ? floorNumbers[0] : 1);
  const sectionsForActiveFloor = useMemo(() => {
    return sections.filter(section => section.floorNumber === activeFloor);
  }, [sections, activeFloor]);
  
  // We're not using the rename modal for now as we have a more comprehensive edit dialog
  // Will use this in a future enhancement when we add seat-specific editing
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false); // State for smoother floor switching
  
  /** Recompute bounding box whenever layoutSize or sectionsForActiveFloor changes. */
  useEffect(() => {
    if (layoutSize === 'auto') {
      computeAutoBounds();
    } else {
      // Preset values are not currently used but kept for future reference
      // const preset = LAYOUT_PRESETS[layoutSize];
      // setCanvasWidth(preset.width);
      // setCanvasHeight(preset.height);
      // setSeatScale(preset.seatScale);
    }
  }, [layoutSize, sectionsForActiveFloor]);

  /** 
   * Trigger transition effect when needed and notify parent component.
   * This ensures smoother UI transitions when changing layouts or floors.
   */
  const triggerTransition = useCallback(() => {
    if (onTransitionStart) {
      onTransitionStart();
    }
    setDataTransitioning(true);
    
    // Clear transition after animation completes
    setTimeout(() => {
      setDataTransitioning(false);
    }, 450);
  }, [onTransitionStart]);

  // Reset transition state when transitions complete
  useEffect(() => {
    if (dataTransitioning && !isParentTransitioning) {
      const timer = setTimeout(() => {
        setDataTransitioning(false);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [dataTransitioning, isParentTransitioning]);
  
  /** Compute the canvas bounds automatically based on section positions */
  const computeAutoBounds = () => {
    if (sectionsForActiveFloor.length === 0) {
      // setCanvasWidth(1200);
      // setCanvasHeight(800);
      // setSeatScale(1.0);
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    sectionsForActiveFloor.forEach((sec) => {
      sec.seats.forEach((seat: Seat) => {
        const gx = sec.offsetX + seat.position_x;
        const gy = sec.offsetY + seat.position_y;
        if (gx < minX) minX = gx;
        if (gx > maxX) maxX = gx;
        if (gy < minY) minY = gy;
        if (gy > maxY) maxY = gy;
      });
    });

    // Add padding - values calculated but not currently used
    // const width = Math.max(maxX - minX + 400, 1200);
    // const height = Math.max(maxY - minY + 400, 800);
    // setCanvasWidth(width);
    // setCanvasHeight(height);
    // setSeatScale(1.0);
  };

  /** Function to fetch restaurant locations */
  const fetchLocations = async () => {
    if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
      console.error('Restaurant context required for fetching locations');
      return;
    }
    
    try {
      // Fetch all active locations for this restaurant
      const locationsList = await locationsApi.getLocations({
        restaurant_id: restaurant.id,
        is_active: true
      });
      
      console.log('Locations loaded:', locationsList);
      
      if (locationsList && Array.isArray(locationsList)) {
        setLocations(locationsList);
        
        let locationIdToUse = selectedLocationId;
        
        // If no location is currently selected, try to select the default or first one
        if (selectedLocationId === null) {
          const defaultLocation = locationsList.find(loc => loc.is_default);
          if (defaultLocation) {
            locationIdToUse = defaultLocation.id;
            setSelectedLocationId(defaultLocation.id);
          } else if (locationsList.length > 0) {
            locationIdToUse = locationsList[0].id;
            setSelectedLocationId(locationsList[0].id);
          }
        }
        
        // Load layouts for the selected location immediately
        if (locationIdToUse !== null) {
          console.log('Loading layouts for initial location:', locationIdToUse);
          loadLayouts(locationIdToUse);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  /** Load all layouts with optional location filter */
  const loadLayouts = async (locationFilterId?: number | null) => {
    if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
      setError('Restaurant context required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Loading layouts with location filter:', locationFilterId ?? selectedLocationId);
      
      // Check if we have a valid restaurant ID
      const restaurantId = typeof restaurant.id === 'number' ? restaurant.id : parseInt(restaurant.id, 10);
      
      // Get layouts from API using the active location filter or passed parameter
      // Convert null to undefined for the API call to satisfy typing
      const locationIdToUse = locationFilterId !== null ? locationFilterId : selectedLocationId !== null ? selectedLocationId : undefined;
      const layouts = await layoutsApi.getAllLayouts(restaurantId, locationIdToUse);
      
      console.log('Layouts loaded:', layouts);
      setAllLayouts(layouts);
      
      // Select an active layout or the first available one
      if (layouts && layouts.length > 0) {
        // Find active layout
        const activeLayout = layouts.find(l => l.is_active === true);
        
        if (activeLayout) {
          setActiveLayoutId(activeLayout.id);
          loadLayout(activeLayout.id);
        } else {
          // No active layout, use the first one
          setActiveLayoutId(layouts[0].id);
          loadLayout(layouts[0].id);
        }
      } else {
        // No layouts available
        setActiveLayoutId(null);
        setSections([]);
        setLayoutName('');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading layouts:', error);
      setError('Failed to load layouts');
      setIsLoading(false);
    }
  };
  
  // Load layouts when component mounts or restaurant context changes
  useEffect(() => {
    if (restaurant) {
      // First fetch locations, which will then trigger loadLayouts
      fetchLocations();
    }
  }, [restaurant]);
  
  // Add beforeunload event listener to warn when leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Standard browser confirmation dialog
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
  
  // Notify parent component when unsaved changes state changes
  useEffect(() => {
    // Call the callback if provided
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  /** Handle selecting a layout from dropdown */
  const handleSelectLayout = async (id: number) => {
    console.log('Selected layout ID:', id);
    
    // Check if there are unsaved changes before switching layouts
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to switch layouts without saving?');
      if (!confirmed) {
        return; // Cancel switching if not confirmed
      }
    }
    
    // Trigger transition effect
    triggerTransition();
    
    // Handle special case for "New Layout" option
    if (id === 0) {
      console.log('Creating new layout');
      createNewLayout();
      return;
    }
    
    // Load existing layout
    console.log('Loading layout:', id);
    await loadLayout(id);
    
    // Reset unsaved changes flag after successfully loading a layout
    setHasUnsavedChanges(false);
  };

  /** Create a new layout */
  const createNewLayout = () => {
    // Check if multi-location restaurant requires a location selection
    if (locations.length > 1 && !selectedLocationId) {
      toast.error('Please select a location before creating a new layout');
      return;
    }
    
    // Check if there are unsaved changes before creating a new layout
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to create a new layout without saving?');
      if (!confirmed) {
        return; // Cancel if not confirmed
      }
    }
    
    setActiveLayoutId(null);
    setLayoutName('New Layout');
    setSections([]);
    setHasUnsavedChanges(false); // Reset unsaved changes flag for new layout
    setActiveFloor(1);
    
    // Show confirmation with selected location name
    if (selectedLocationId) {
      const locationName = locations.find(loc => loc.id === selectedLocationId)?.name || 'Selected Location';
      toast.success(`Creating new layout for ${locationName}`);
    }
  };
  
  /** Load a specific layout */
  // Add console logging for debugging shape detection
  // Utility function to debug section shape issues
  const debugSectionShape = (section: SeatSection) => {
    console.log(`Section: ${section.name}`);
    console.log(`- Shape: ${section.shape ? JSON.stringify(section.shape) : 'undefined'}`);
    console.log(`- Shape type: ${typeof section.shape}`);
    console.log(`- Data: ${JSON.stringify(section)}`);
    return section; // Allow use in call chains
  };
  
  const loadLayout = async (id: number) => {
    if (!id) {
      toast.error('Invalid layout ID');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Loading layout details for ID:', id);
      const layout = await layoutsApi.getLayout(id);
      
      // Debug with apiClient response data directly
      console.log('Using apiClient data for debugging');
      
      if (!layout) {
        console.error('Layout not found for ID:', id);
        toast.error('Layout not found');
        setIsLoading(false);
        return;
      }
      
      console.log('Loaded layout details:', layout);
      console.log('Layout sections data:', layout.sections_data);
      
      // Ensure all sections have a floor number and normalize for backward compatibility
      const sectionsWithFloors = (layout.sections_data?.sections || []).map(sec => {
        // First ensure floor number is set
        const sectionWithFloor = {
          ...sec,
          floorNumber: sec.floorNumber ?? 1,
        };
        
        // Debug the section before normalization
        debugSectionShape(sectionWithFloor);
        
        // Then normalize to ensure shape, dimensions, and rotation are set
        const normalizedSection = normalizeSectionData(sectionWithFloor);
        
        // Debug after normalization
        debugSectionShape(normalizedSection);
        
        return normalizedSection;
      });
      
      console.log('Processed sections with floors and normalized:', sectionsWithFloors);
      
      setLayoutName(layout.name || 'Unnamed Layout');
      setSections(sectionsWithFloors);
      setActiveLayoutId(layout.id);
      
      // Set active floor to the first floor
      const floors = Array.from(new Set(sectionsWithFloors.map(s => s.floorNumber))).sort((a, b) => a - b);
      setActiveFloor(floors.length > 0 ? floors[0] : 1);
      
      console.log('Set active floor to:', floors.length > 0 ? floors[0] : 1);
      console.log('Available floors:', floors);
    } catch (error) {
      console.error('Error loading layout:', error);
      toast.error('Failed to load layout');
      // Reset active layout ID on error
      setActiveLayoutId(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  /** Save the current layout */
  const saveLayout = async () => {
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      toast.error('Restaurant context required');
      return;
    }
    
    if (!layoutName.trim()) {
      toast.error('Layout name is required');
      return;
    }
    
    // Validate location selection for multi-location restaurants
    if (locations.length > 1 && !selectedLocationId) {
      toast.error('Please select a location for this layout');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Saving layout with name:', layoutName);
      console.log('Current sections:', sections);
      
      // Prepare layout data - normalize all sections to ensure backward compatibility
      const layoutData: Partial<LayoutData> = {
        name: layoutName,
        restaurant_id: restaurant?.id || 0,
        location_id: selectedLocationId || locationId || undefined, // Use selectedLocationId from state, falling back to locationId prop
        sections_data: {
          sections: sections.map(section => normalizeSectionData(section))
        }
      };
      
      console.log('Layout data to save:', layoutData);
      
      let savedLayout;
      
      if (activeLayoutId) {
        // Update existing layout
        console.log('Updating existing layout:', activeLayoutId);
        savedLayout = await layoutsApi.updateLayout(activeLayoutId, layoutData);
        toast.success('Layout updated');
      } else {
        // Create new layout
        console.log('Creating new layout');
        savedLayout = await layoutsApi.createLayout(layoutData);
        toast.success('Layout created');
      }
      
      console.log('Save response:', savedLayout);
      
      if (savedLayout && savedLayout.id) {
        setActiveLayoutId(savedLayout.id);
        
        // Refresh layout list
        console.log('Refreshing layout list');
        const layouts = await layoutsApi.getAllLayouts(restaurant?.id || 0, locationId || undefined);
        setAllLayouts(layouts);
        
        // Reset unsaved changes flag after successful save
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Failed to save layout');
    } finally {
      setIsLoading(false);
    }
  };
  
  /** Activate the current layout */
  const activateLayout = async () => {
    if (!activeLayoutId) {
      toast.error('No layout selected');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await layoutsApi.activateLayout(activeLayoutId);
      
      // Update layouts to reflect new active status - use selectedLocationId for consistent filtering
      const restaurantId = typeof restaurant?.id === 'number' ? restaurant.id : parseInt(restaurant?.id || '0', 10);
      const locationIdToUse = selectedLocationId !== null ? selectedLocationId : undefined;
      
      console.log('Reloading layouts for location:', locationIdToUse);
      const layouts = await layoutsApi.getAllLayouts(restaurantId, locationIdToUse);
      setAllLayouts(layouts);
      
      toast.success('Layout activated successfully');
    } catch (error) {
      console.error('Error activating layout:', error);
      toast.error('Failed to activate layout');
    } finally {
      setIsLoading(false);
    }
  };
  
  /** Change active floor with transition effect */
  const handleFloorChange = (floorNum: number) => {
    if (floorNum !== activeFloor) {
      triggerTransition();
      setIsRendering(true);
      
      // Slight delay to ensure smooth transition
      setTimeout(() => {
        setActiveFloor(floorNum);
        setIsRendering(false);
      }, 150);
    }
  };
  
  // Seat spacing constants
  const SEAT_SPACING_FIXED = 40; // Fixed distance from table edge to seat in pixels
  const CORNER_SEAT_OFFSET = 25; // Offset from corner positions

  // Create helper for generating seat layouts based on table shape and rotation
  const layoutTableSeats = (count: number, capacity: number = 1, shape: TableShape = 'circle', dimensions: TableDimensions = { width: 120, height: 80 }, rotation: TableRotation = 0): Seat[] => {
    const seats: Seat[] = [];
    
    // Function to return consistent seat distance from table edge
    const getSeatDistance = (): number => {
      // Using fixed spacing for more visual consistency regardless of table size
      return SEAT_SPACING_FIXED;
    };
    
    // Helper to position a seat relative to a rectangle edge based on orientation
    const getEdgeSeatPosition = (edge: 'top' | 'bottom' | 'left' | 'right', isHorizontal: boolean, longSide: number, shortSide: number): {x: number, y: number, isCorner?: boolean} => {
      const spacing = getSeatDistance();
      
      if (isHorizontal) {
        // Horizontal orientation (0° or 180°)
        switch(edge) {
          case 'top': return { x: 0, y: -shortSide/2 - spacing };
          case 'bottom': return { x: 0, y: shortSide/2 + spacing };
          case 'left': return { x: -longSide/2 - spacing, y: 0 };
          case 'right': return { x: longSide/2 + spacing, y: 0 };
        }
      } else {
        // Vertical orientation (90° or 270°)
        switch(edge) {
          case 'top': return { x: 0, y: -longSide/2 - spacing };
          case 'bottom': return { x: 0, y: longSide/2 + spacing };
          case 'left': return { x: -shortSide/2 - spacing, y: 0 };
          case 'right': return { x: shortSide/2 + spacing, y: 0 };
        }
      }
      
      // Default fallback (should never happen)
      return { x: 0, y: 0 };
    };
    
    // Helper for positioning corner seats based on orientation
    const getCornerPosition = (corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', isHorizontal: boolean, longSide: number, shortSide: number): {x: number, y: number, isCorner: boolean} => {
      const offset = CORNER_SEAT_OFFSET;
      const spacing = getSeatDistance();
      
      if (isHorizontal) {
        // Horizontal orientation (0° or 180°)
        switch(corner) {
          case 'topLeft': 
            return { 
              x: -longSide/2 + offset, 
              y: -shortSide/2 - spacing,
              isCorner: true 
            };
          case 'topRight': 
            return { 
              x: longSide/2 - offset, 
              y: -shortSide/2 - spacing,
              isCorner: true 
            };
          case 'bottomLeft': 
            return { 
              x: -longSide/2 + offset, 
              y: shortSide/2 + spacing,
              isCorner: true 
            };
          case 'bottomRight': 
            return { 
              x: longSide/2 - offset, 
              y: shortSide/2 + spacing,
              isCorner: true 
            };
        }
      } else {
        // Vertical orientation (90° or 270°)
        switch(corner) {
          case 'topLeft': 
            return { 
              x: -shortSide/2 - spacing, 
              y: -longSide/2 + offset,
              isCorner: true 
            };
          case 'topRight': 
            return { 
              x: shortSide/2 + spacing, 
              y: -longSide/2 + offset,
              isCorner: true 
            };
          case 'bottomLeft': 
            return { 
              x: -shortSide/2 - spacing, 
              y: longSide/2 - offset,
              isCorner: true 
            };
          case 'bottomRight': 
            return { 
              x: shortSide/2 + spacing, 
              y: longSide/2 - offset,
              isCorner: true 
            };
        }
      }
      
      // Default fallback (should never happen)
      return { x: 0, y: 0, isCorner: true };
    };

    // Note: Corner seats are marked directly when created
    
    // Handle different shapes
    if (shape === 'circle') {
      // Use actual dimension if available, or fallback to default
      const diameter = dimensions.width || TABLE_DIAMETER;
      const radius = diameter / 2;
      const seatDistance = getSeatDistance();
      
      // Allow any number of seats as requested by the user
      // Don't limit based on circumference - let the user decide what looks good
      const actualCount = count;
      
      console.log(`Circle table: User requested ${count} seats, creating ${actualCount}`);
      
      // For very large seat counts (>10), we might need to adjust the seat distance
      // to avoid visual clutter, but we'll still create all requested seats
      
      // For exactly 2 seats, position them for optimal conversation
      if (actualCount === 2) {
        // Use a slightly closer distance for circles to match rectangles visually
        const circleDistance = seatDistance * 0.8;
        const positions = [
          { x: -radius - circleDistance, y: 0 }, // Left
          { x: radius + circleDistance, y: 0 }   // Right
        ];
        
        for (let i = 0; i < actualCount; i++) {
          seats.push({
            position_x: positions[i].x,
            position_y: positions[i].y,
            capacity: capacity,
            label: `Seat #${i+1}`
          });
        }
      }
      // For 3-4 seats, position in compass points with optimal spacing
      else if (actualCount <= 4) {
        // Use a slightly closer distance for circles to match rectangles visually
        const circleDistance = seatDistance * 0.8;
        const positions = [
          { x: 0, y: -radius - circleDistance },   // North
          { x: radius + circleDistance, y: 0 },     // East
          { x: 0, y: radius + circleDistance },     // South
          { x: -radius - circleDistance, y: 0 }     // West
        ];
        
        for (let i = 0; i < Math.min(actualCount, positions.length); i++) {
          seats.push({
            position_x: positions[i].x,
            position_y: positions[i].y,
            capacity: capacity,
            label: `Seat #${i+1}`
          });
        }
      } 
      // For more than 4 seats, arrange in a circle with optimal spacing
      else {
        console.log(`Creating circle table with ${actualCount} seats`);
        // Use a slightly closer distance for circles to match rectangles visually
        const circleDistance = seatDistance * 0.8;
        // Calculate seat distance based on table size
        const seatRadius = radius + circleDistance;
        
        // For circle tables, we always want to distribute seats evenly around the perimeter
        const seatAngleOffset = actualCount <= 6 ? Math.PI / 4 : 0; // Offset for better positioning with fewer seats
        
        // Create all requested seats
        for (let i = 0; i < actualCount; i++) {
          // Calculate seat position in a circular pattern
          const angle = ((i / actualCount) * Math.PI * 2) + seatAngleOffset;
          seats.push({
            position_x: Math.cos(angle) * seatRadius,
            position_y: Math.sin(angle) * seatRadius,
            capacity: capacity,
            label: `Seat #${i+1}`
          });
        }
        
        console.log(`Created ${seats.length} seats for circle table with ${actualCount} seats`);
      }
    } 
    else if (shape === 'rectangle') {
      // Use actual dimensions if available, or fallback to defaults
      const width = dimensions.width || 120;
      const height = dimensions.height || 80;
      
      // Calculate positions based on rotation
      const isHorizontal = rotation === 0 || rotation === 180;
      const longSide = isHorizontal ? width : height;
      const shortSide = isHorizontal ? height : width;
      
      // Calculate seat distance based on dimensions
      const seatDistance = getSeatDistance();
      const longSeatDistance = seatDistance;
      const shortSeatDistance = seatDistance;
      
      // When explicitly editing a table with a certain number of seats,
      // we should respect the user's requested seat count regardless of calculated capacity
      // This ensures users can have more seats if they want them
      
      // Removed unused capacity calculations since we always respect the user's specified seat count
      // Calculation kept as a comment for future auto-suggestion features if needed
      // const longEdgeCapacity = Math.max(1, Math.floor(longSide / OPTIMAL_EDGE_SEAT_SPACING));
      // const shortEdgeCapacity = Math.max(1, Math.floor(shortSide / OPTIMAL_EDGE_SEAT_SPACING));
      // const suggestedCapacity = 2 * (longEdgeCapacity + shortEdgeCapacity);
      
      // Always use the requested count - don't impose limitations
      // We trust the user knows how many seats they want
      const actualCount = count;
      
      // Special case for 1-2 seats
      if (actualCount <= 2) {
        // For 1-2 seats, prioritize long sides for better conversation
        for (let i = 0; i < actualCount; i++) {
          let x = 0, y = 0;
          
          if (actualCount === 1) {
            // Single seat centered on long side
            if (isHorizontal) {
              x = 0;
              y = shortSide / 2 + shortSeatDistance;
            } else {
              x = shortSide / 2 + shortSeatDistance;
              y = 0;
            }
          } else {
            // Two seats on opposite long sides
            if (isHorizontal) {
              x = i === 0 ? 0 : 0;
              y = i === 0 ? -shortSide / 2 - shortSeatDistance : shortSide / 2 + shortSeatDistance;
            } else {
              x = i === 0 ? -shortSide / 2 - shortSeatDistance : shortSide / 2 + shortSeatDistance;
              y = 0;
            }
          }
          
          seats.push({
            position_x: x,
            position_y: y,
            capacity: capacity,
            label: `Seat #${i+1}`
          });
        }
      }
      // Special case for 3-4 seats
      else if (actualCount <= 4) {
        // For 3-4 seats, position them consistently in the middle of each side
        const positions = [];
        
        // Use our helper function to position seats correctly based on orientation
        // First add top and bottom seats
        positions.push(getEdgeSeatPosition('top', isHorizontal, longSide, shortSide));
        positions.push(getEdgeSeatPosition('bottom', isHorizontal, longSide, shortSide));
        
        // Then add left and right seats
        positions.push(getEdgeSeatPosition('left', isHorizontal, longSide, shortSide));
        positions.push(getEdgeSeatPosition('right', isHorizontal, longSide, shortSide));
        
        for (let i = 0; i < Math.min(actualCount, positions.length); i++) {
          seats.push({
            position_x: positions[i].x,
            position_y: positions[i].y,
            capacity: capacity,
            label: `Seat #${i+1}`
          });
        }
      }
      // Handle any number of seats for rectangle tables with a cleaner approach
      else if (actualCount <= 8) {
        console.log('DEBUG: Creating rectangle table with 1-8 seats:', actualCount);
        
        // Define a standard template of seat positions in consistent order
        // First the 4 edge seats, then the 4 corner seats
        const seatPositions = [
          // Edge seats first (1-4)
          { 
            name: 'top-edge',
            x: 0,
            y: -shortSide/2 - getSeatDistance(),
            isCorner: false
          },
          { 
            name: 'right-edge',
            x: longSide/2 + getSeatDistance(),
            y: 0,
            isCorner: false
          },
          { 
            name: 'bottom-edge',
            x: 0,
            y: shortSide/2 + getSeatDistance(),
            isCorner: false
          },
          { 
            name: 'left-edge',
            x: -longSide/2 - getSeatDistance(),
            y: 0,
            isCorner: false
          },
          
          // Then corner seats (5-8)
          { 
            name: 'top-left-corner',
            x: -longSide/2 + CORNER_SEAT_OFFSET,
            y: -shortSide/2 - getSeatDistance(),
            isCorner: true
          },
          { 
            name: 'top-right-corner',
            x: longSide/2 - CORNER_SEAT_OFFSET,
            y: -shortSide/2 - getSeatDistance(),
            isCorner: true
          },
          { 
            name: 'bottom-left-corner',
            x: -longSide/2 + CORNER_SEAT_OFFSET,
            y: shortSide/2 + getSeatDistance(),
            isCorner: true
          },
          { 
            name: 'bottom-right-corner',
            x: longSide/2 - CORNER_SEAT_OFFSET,
            y: shortSide/2 + getSeatDistance(),
            isCorner: true
          }
        ];
        
        // Simply take the number of positions we need based on requested seat count
        const selectedPositions = seatPositions.slice(0, actualCount);
        console.log(`DEBUG: Selected ${selectedPositions.length} positions for ${actualCount} seats:`, 
          selectedPositions.map(p => p.name));
        
        // IMPORTANT: Empty the seats array before adding new seats
        // This prevents reusing existing seats from previous calculations
        seats.length = 0;
        
        // Create the seats from the selected positions
        selectedPositions.forEach((pos, index) => {
          seats.push({
            position_x: pos.x,
            position_y: pos.y,
            capacity: capacity,
            label: `Seat #${index + 1}`,
            isCorner: pos.isCorner
          });
        });
        
        console.log(`DEBUG: Created ${seats.length} seats for rectangle table with ${actualCount} seats`);
        // Verify the seats array contains the correct seats
        seats.forEach((seat, i) => {
          console.log(`DEBUG: Seat #${i+1}:`, seat.position_x, seat.position_y, seat.isCorner ? '(corner)' : '');
        });
      }
      // For more than 8 seats, distribute with priority to long edges
      else {
        // Calculate how many seats to place on each edge based on length ratio
        const totalEdgeLength = 2 * (longSide + shortSide);
        const longEdgeRatio = longSide / totalEdgeLength;
        
        // Calculate seats per edge
        let longEdgeSeats = Math.round(actualCount * longEdgeRatio);
        let shortEdgeSeats = Math.round(actualCount * (1 - longEdgeRatio) / 2);
        
        // Make sure we distribute all seats
        const totalCalculated = (longEdgeSeats * 2) + (shortEdgeSeats * 2);
        
        if (totalCalculated < actualCount) {
          // Add extra seats to long edges first
          longEdgeSeats += Math.floor((actualCount - totalCalculated) / 2);
          // Then add any remaining seats to short edges
          shortEdgeSeats += Math.ceil((actualCount - totalCalculated) / 2);
        } else if (totalCalculated > actualCount) {
          // Remove extra seats, prioritizing keeping long edge seats
          const excess = totalCalculated - actualCount;
          if (shortEdgeSeats * 2 >= excess) {
            shortEdgeSeats -= Math.ceil(excess / 2);
          } else {
            shortEdgeSeats = 0;
            longEdgeSeats -= (excess - shortEdgeSeats * 2) / 2;
          }
        }
        
        // Add long edge seats
        if (longEdgeSeats > 0) {
          const longEdgeSpacing = longSide / (longEdgeSeats + 1);
          
          for (let i = 0; i < longEdgeSeats; i++) {
            const position = (i + 1) * longEdgeSpacing - longSide / 2;
            
            if (isHorizontal) {
              // Add top edge seat
              seats.push({
                position_x: position,
                position_y: -shortSide / 2 - shortSeatDistance,
                capacity: capacity,
                label: `Seat #${seats.length + 1}`
              });
              
              // Add bottom edge seat
              seats.push({
                position_x: position,
                position_y: shortSide / 2 + shortSeatDistance,
                capacity: capacity,
                label: `Seat #${seats.length + 1}`
              });
            } else {
              // Add left edge seat
              seats.push({
                position_x: -shortSide / 2 - shortSeatDistance,
                position_y: position,
                capacity: capacity,
                label: `Seat #${seats.length + 1}`
              });
              
              // Add right edge seat
              seats.push({
                position_x: shortSide / 2 + shortSeatDistance,
                position_y: position,
                capacity: capacity,
                label: `Seat #${seats.length + 1}`
              });
            }
          }
        }
        
        // Add short edge seats if there's still room
        if (shortEdgeSeats > 0 && seats.length < actualCount) {
          const shortEdgeSpacing = shortSide / (shortEdgeSeats + 1);
          
          for (let i = 0; i < shortEdgeSeats && seats.length < actualCount; i++) {
            const position = (i + 1) * shortEdgeSpacing - shortSide / 2;
            
            if (isHorizontal) {
              // Add left edge seat
              seats.push({
                position_x: -longSide / 2 - longSeatDistance,
                position_y: position,
                capacity: capacity,
                label: `Seat #${seats.length + 1}`
              });
              
              // Add right edge seat if still under count
              if (seats.length < actualCount) {
                seats.push({
                  position_x: longSide / 2 + longSeatDistance,
                  position_y: position,
                  capacity: capacity,
                  label: `Seat #${seats.length + 1}`
                });
              }
            } else {
              // Add top edge seat
              seats.push({
                position_x: position,
                position_y: -longSide / 2 - longSeatDistance,
                capacity: capacity,
                label: `Seat #${seats.length + 1}`
              });
              
              // Add bottom edge seat if still under count
              if (seats.length < actualCount) {
                seats.push({
                  position_x: position,
                  position_y: longSide / 2 + longSeatDistance,
                  capacity: capacity,
                  label: `Seat #${seats.length + 1}`
                });
              }
            }
          }
        }
      }
    }
    
    // Make sure we don't exceed the requested count
    return seats.slice(0, count);
  };

  // Open configuration dialog for a specific section
  const handleEditSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setEditingSectionId(sectionId);
      setSectionConfig({
        name: section.name,
        seatCount: section.seats.length,
        type: section.type || 'table',
        shape: section.shape || 'circle',
        orientation: 'horizontal',
        dimensions: section.dimensions || { width: TABLE_DIAMETER, height: TABLE_DIAMETER },
        rotation: section.rotation || 0
      });
      // Handle the floor property safely using optional chaining
      // @ts-ignore - TypeScript doesn't know about floor property
      setSectionFloorText((section.floor ?? 1).toString());
      
      // Always use the ACTUAL number of seats present on the table
      // This ensures the edit dialog and the actual table have synchronized seat counts
      setSeatCountText(section.seats.length.toString());
      setSeatCapacityText(section.seats[0]?.capacity ? section.seats[0].capacity.toString() : '1');
      
      // Import any custom seat labels
      const existingLabels: Record<number, string> = {};
      section.seats.forEach((seat, index) => {
        if (seat.label && !seat.label.match(/^Seat #\d+$/)) {
          existingLabels[index] = seat.label;
        }
      });
      setCustomSeatLabels(existingLabels);
      
      setShowSectionDialog(true);
    }
  };
  // Add a new section
  const handleAddSection = () => {
    const sectionFloor = activeFloor;
    
    setSectionConfig({
      name: 'New Table',
      seatCount: 4,
      type: 'table',
      orientation: 'horizontal',
      // Default table shape is rectangle
      shape: 'rectangle',
      // Default dimensions for a rectangular table
      dimensions: {
        width: 120,
        height: 80
      },
      // Default rotation is 0 degrees
      rotation: 0
    });
    
    setSeatCountText('4');
    setSectionFloorText(String(sectionFloor));
    setSeatCapacityText('1');
    setCustomSeatLabels({});
    
    setEditingSectionId(null);
    setShowSectionDialog(true);
  };
  
  /**
   * Ensure section data includes shape, dimensions and rotation properties
   * This handles backward compatibility with layouts created before the enhancement
   */
  const normalizeSectionData = (section: SeatSection): SeatSection => {
    // Log before normalization for debugging
    console.log('Normalizing section:', section.id, section.name);
    console.log('- Original shape:', section.shape, typeof section.shape);
    
    // Default to circle only if shape is missing
    let shapeValue: TableShape = 'circle';
    
    // IMPORTANT: Strong explicit check for the rectangle shape
    // This ensures any serialized format of 'rectangle' is properly detected
    if (section.shape !== undefined && section.shape !== null) {
      const rawShape = String(section.shape).toLowerCase().trim();
      console.log('- Normalized shape:', rawShape);
      
      if (rawShape === 'rectangle') {
        shapeValue = 'rectangle';
        console.log('  - Explicitly using rectangle shape');
      }
    }
    
    // Build the dimensions with sensible defaults
    const dimensions: TableDimensions = section.dimensions || { width: 120, height: 80 };
    
    // Return a new object with all properties from the original, plus defaults for missing ones
    const normalized: SeatSection = {
      ...section,
      // Store correctly normalized shape
      shape: shapeValue,
      // Add default dimensions if missing
      dimensions,
      // Default to 0 rotation if missing - using nullish coalescing to preserve 0 value
      rotation: section.rotation ?? 0,
      // Ensure seats are initialized
      seats: section.seats || []
    };
    
    console.log('- Normalized result:', normalized.shape);
    if (normalized.shape === 'rectangle' && normalized.dimensions) {
      console.log('  - Rectangle dimensions:', normalized.dimensions.width, 'x', normalized.dimensions.height);
    }
    return normalized;
  };
  
  /**
   * Test helper function to verify backward compatibility with legacy layouts
   * This is used during development to ensure we properly handle old data
   * @param legacyLayout Layout data from before shape/rotation implementation
   */
  // Used in development environment for testing backward compatibility
  function testBackwardCompatibility(legacyLayout: any): void {
    try {
      console.log('Testing backward compatibility with legacy layout:', legacyLayout);
      
      // Extract sections from the legacy layout
      const legacySections = legacyLayout.sections_data?.sections || [];
      console.log('Legacy sections count:', legacySections.length);
      
      // Normalize each section and verify it has the required properties
      const normalizedSections = legacySections.map((section: Partial<SeatSection>) => normalizeSectionData(section as SeatSection));
      
      const allValid = normalizedSections.every((section: SeatSection) => {
        const hasShape = !!section.shape;
        const hasDimensions = !!section.dimensions;
        const hasRotation = section.rotation !== undefined;
        
        return hasShape && hasDimensions && hasRotation;
      });
      
      console.log('Backward compatibility test result:', allValid ? 'PASSED' : 'FAILED');
      console.log('Normalized sections with defaults:', normalizedSections);
      
      console.log('All valid:', allValid);
    } catch (error) {
      console.error('Error testing backward compatibility:', error);
    }
  };
  
  // Create a new section after dialog confirmation
  const handleCreateSection = () => {
    if (editingSectionId) {
      // Update an existing section
      setSections(prevSections => {
        return prevSections.map(section => {
          if (section.id === editingSectionId) {
            const finalSeatCount = parseInt(seatCountText, 10) || 4;
            const finalFloor = parseInt(sectionFloorText, 10) || 1;
            const finalCapacity = parseInt(seatCapacityText, 10) || 1;
            
            // Only preserve the exact same seats (with their positions) if ONLY the rotation is changing
            // For any other change, we completely recreate the table as if it were brand new
            const isOnlyRotationChanged = 
              section.shape === sectionConfig.shape &&
              section.dimensions?.width === sectionConfig.dimensions?.width &&
              section.dimensions?.height === sectionConfig.dimensions?.height &&
              section.seats.length === finalSeatCount &&
              parseInt(seatCountText, 10) === section.seats.length && // Double-check seat count
              section.rotation !== sectionConfig.rotation;
            
            console.log(`Editing table: isOnlyRotationChanged=${isOnlyRotationChanged}, ` +
                     `currentSeatCount=${section.seats.length}, requestedSeatCount=${finalSeatCount}`);
            
            let seats;
            
            if (isOnlyRotationChanged) {
              // CASE 1: ROTATION ONLY
              // If only rotating the table, preserve the existing seats but apply the rotation
              console.log("Only rotation changed - preserving seat layout and applying rotation");
              
              // Copy existing seats but apply rotation transformation
              seats = section.seats.map(seat => {
                // Use the existing seat data but apply rotation to positions
                let x = seat.position_x;
                let y = seat.position_y;
                
                // Calculate how much to rotate (from old rotation to new)
                const oldRotation = section.rotation || 0;
                const newRotation = sectionConfig.rotation || 0;
                const rotationDiff = newRotation - oldRotation;
                
                // Apply rotation transformation
                if (rotationDiff !== 0) {
                  // Convert rotation to radians
                  const angleRad = (rotationDiff * Math.PI) / 180;
                  const cosAngle = Math.cos(angleRad);
                  const sinAngle = Math.sin(angleRad);
                  
                  // Apply rotation matrix
                  const rotatedX = x * cosAngle - y * sinAngle;
                  const rotatedY = x * sinAngle + y * cosAngle;
                  
                  x = rotatedX;
                  y = rotatedY;
                }
                
                return {
                  ...seat,
                  position_x: x,
                  position_y: y,
                  capacity: finalCapacity
                };
              });
            } else {
              // CASE 2: COMPLETELY RECREATE TABLE
              // For ANY other change, create a brand new table and replace the existing one
              console.log(`Completely recreating table with ${finalSeatCount} seats as a new table`);
              
              // Step 2: Generate seats - SPECIAL CASE for rectangle tables with 5-10 seats
              if (sectionConfig.shape === 'rectangle' && finalSeatCount >= 5 && finalSeatCount <= 10) {
                // Use the exact same positioning logic as when creating a new table
                // This ensures perfect consistency between creating and editing tables
                const width = sectionConfig.dimensions?.width || 120;
                const height = sectionConfig.dimensions?.height || 80;
                const rotation = sectionConfig.rotation || 0;
                
                // For seat positioning, use the table dimensions in their original orientation
                const longSide = width;  // Always use width as the long side in calculations
                const shortSide = height; // Always use height as the short side in calculations
                const seatDistance = SEAT_SPACING_FIXED; // Fixed distance from table edge
                
                // Calculate appropriate positions for rectangle table seats
                let seatPositions = [];
                
                if (finalSeatCount === 5 || finalSeatCount === 6) {
                  // For 5-6 seats, create a balanced pattern that looks good
                  // Common spacing calculations
                  const longEdgeSpacing = longSide / 4; // Position at 1/4 from each end
                  
                  // Top edge - 2 seats
                  seatPositions.push(
                    {
                      x: -longEdgeSpacing,
                      y: -shortSide/2 - seatDistance,
                      isCorner: false
                    },
                    {
                      x: longEdgeSpacing,
                      y: -shortSide/2 - seatDistance,
                      isCorner: false
                    }
                  );
                  
                  // Bottom edge - 2 seats
                  seatPositions.push(
                    {
                      x: -longEdgeSpacing,
                      y: shortSide/2 + seatDistance,
                      isCorner: false
                    },
                    {
                      x: longEdgeSpacing,
                      y: shortSide/2 + seatDistance,
                      isCorner: false
                    }
                  );
                  
                  // For 5 seats, add 1 seat to the right in the center
                  if (finalSeatCount >= 5) {
                    seatPositions.push({
                      x: longSide/2 + seatDistance,
                      y: 0, // Centered on the right edge
                      isCorner: false
                    });
                  }
                  
                  // For 6 seats, add the sixth seat on the left in the center
                  if (finalSeatCount >= 6) {
                    seatPositions.push({
                      x: -longSide/2 - seatDistance,
                      y: 0, // Centered on the left edge
                      isCorner: false
                    });
                  }
                }
                else if (finalSeatCount === 7 || finalSeatCount === 8) {
                  // For 7-8 seats, create a more balanced arrangement with better spacing
                  // Make top/bottom seats closer together but side seats further apart
                  const topBottomSpacing = longSide / 4; // Closer together on top/bottom
                  const sideSpacing = shortSide / 2.5; // Further apart on sides
                  
                  // Top edge - 2 seats with good spacing
                  seatPositions.push(
                    {
                      x: -topBottomSpacing,
                      y: -shortSide/2 - seatDistance,
                      isCorner: false
                    },
                    {
                      x: topBottomSpacing,
                      y: -shortSide/2 - seatDistance,
                      isCorner: false
                    }
                  );
                  
                  // Bottom edge - 2 seats with good spacing
                  seatPositions.push(
                    {
                      x: -topBottomSpacing,
                      y: shortSide/2 + seatDistance,
                      isCorner: false
                    },
                    {
                      x: topBottomSpacing,
                      y: shortSide/2 + seatDistance,
                      isCorner: false
                    }
                  );
                  
                  // Right edge - 2 seats with good spacing
                  seatPositions.push(
                    {
                      x: longSide/2 + seatDistance,
                      y: -sideSpacing,
                      isCorner: false
                    },
                    {
                      x: longSide/2 + seatDistance,
                      y: sideSpacing,
                      isCorner: false
                    }
                  );
                  
                  // Left edge - 1 seat for 7-seat table, or 2 seats for 8-seat table
                  if (finalSeatCount === 7) {
                    // Just one seat in the center of the left edge
                    seatPositions.push({
                      x: -longSide/2 - seatDistance,
                      y: 0,
                      isCorner: false
                    });
                  } else {
                    // Two seats on the left edge with good spacing
                    seatPositions.push(
                      {
                        x: -longSide/2 - seatDistance,
                        y: -sideSpacing,
                        isCorner: false
                      },
                      {
                        x: -longSide/2 - seatDistance,
                        y: sideSpacing,
                        isCorner: false
                      }
                    );
                  }
                }
                else if (finalSeatCount === 9 || finalSeatCount === 10) {
                  // For 9-10 seats, use a fixed optimized layout with specific positioning
                  // Extra distance for better label readability
                  const extraDistance = 10; 
                  const modifiedSeatDistance = seatDistance + extraDistance;
                  
                  // Calculate spacing based on table size for balanced look - MATCHING EXACTLY with create path
                  const topBottomSpacing = longSide / 1.8; // Maximum spacing between top/bottom seats
                  const sideSpacing = shortSide / 2.5; // More spacing between side seats
                  
                  // Top edge - 3 seats evenly spaced - EXACT match with create path
                  seatPositions.push(
                    {
                      x: -topBottomSpacing, // Match create path exactly
                      y: -shortSide/2 - modifiedSeatDistance,
                      isCorner: false
                    },
                    {
                      x: 0, // Center seat
                      y: -shortSide/2 - modifiedSeatDistance,
                      isCorner: false
                    },
                    {
                      x: topBottomSpacing, // Match create path exactly
                      y: -shortSide/2 - modifiedSeatDistance,
                      isCorner: false
                    }
                  );
                  
                  // Bottom edge - 3 seats evenly spaced - EXACT match with create path
                  seatPositions.push(
                    {
                      x: -topBottomSpacing, // Match create path exactly
                      y: shortSide/2 + modifiedSeatDistance,
                      isCorner: false
                    },
                    {
                      x: 0, // Center seat
                      y: shortSide/2 + modifiedSeatDistance,
                      isCorner: false
                    },
                    {
                      x: topBottomSpacing, // Match create path exactly
                      y: shortSide/2 + modifiedSeatDistance,
                      isCorner: false
                    }
                  );
                  
                  // Right edge - 2 seats
                  seatPositions.push(
                    {
                      x: longSide/2 + modifiedSeatDistance,
                      y: -sideSpacing,
                      isCorner: false
                    },
                    {
                      x: longSide/2 + modifiedSeatDistance,
                      y: sideSpacing,
                      isCorner: false
                    }
                  );
                  
                  // Left edge - 1 seat for 9 seats, 2 seats for 10 seats
                  if (finalSeatCount === 9) {
                    // Just one centered seat for 9-seat table
                    seatPositions.push({
                      x: -longSide/2 - modifiedSeatDistance,
                      y: 0,
                      isCorner: false
                    });
                  } else {
                    // Two seats for 10-seat table
                    seatPositions.push(
                      {
                        x: -longSide/2 - modifiedSeatDistance,
                        y: -sideSpacing,
                        isCorner: false
                      },
                      {
                        x: -longSide/2 - modifiedSeatDistance,
                        y: sideSpacing,
                        isCorner: false
                      }
                    );
                  }
                }
                
                // Apply rotation transformation to seat positions
                if (rotation !== 0) {
                  const rotationRadians = (rotation * Math.PI) / 180;
                  seatPositions = seatPositions.map((pos) => {
                    const rotatedX = pos.x * Math.cos(rotationRadians) - pos.y * Math.sin(rotationRadians);
                    const rotatedY = pos.x * Math.sin(rotationRadians) + pos.y * Math.cos(rotationRadians);
                    return {
                      ...pos,
                      x: rotatedX,
                      y: rotatedY
                    };
                  });
                }
                
                // Convert seatPositions to actual Seat objects
                seats = seatPositions.map((pos, index) => ({
                  position_x: pos.x,
                  position_y: pos.y,
                  label: `Seat #${index + 1}`,
                  capacity: finalCapacity,
                  isCorner: pos.isCorner
                }));
              } else {
                // For circles or rectangle tables with other seat counts, use layoutTableSeats
                seats = layoutTableSeats(
                  finalSeatCount,
                  finalCapacity,
                  sectionConfig.shape,
                  sectionConfig.dimensions,
                  sectionConfig.rotation
                );
              }
              
              // Step 3: Preserve any custom seat labels
              // First gather existing custom labels
              const existingCustomLabels: Record<number, string> = {};
              section.seats.forEach((seat, idx) => {
                if (seat.label && !seat.label.match(/^Seat #\d+$/)) {
                  existingCustomLabels[idx] = seat.label;
                }
              });
              
              // Then also add any custom labels from the edit form
              const allCustomLabels = {...existingCustomLabels, ...customSeatLabels};
              
              // Apply custom labels where available
              if (Object.keys(allCustomLabels).length > 0) {
                seats = seats.map((seat, idx) => {
                  if (allCustomLabels[idx]) {
                    return {...seat, label: allCustomLabels[idx]};
                  }
                  return seat;
                });
              }
            }
            
            return {
              ...section,
              name: sectionConfig.name,
              type: sectionConfig.type,
              orientation: sectionConfig.orientation,
              floorNumber: finalFloor,
              seats: seats,
              shape: sectionConfig.shape,
              dimensions: sectionConfig.dimensions,
              rotation: sectionConfig.rotation
            };
          }
          return section;
        });
      });
      
      setHasUnsavedChanges(true);
      setShowSectionDialog(false);
      setCustomSeatLabels({}); // Reset custom labels after saving
      return;
    }
    
    // Create a new section
    const finalFloor = parseInt(sectionFloorText, 10) || 1;
    const finalSeatCount = parseInt(seatCountText, 10) || 4;
    const finalCapacity = parseInt(seatCapacityText, 10) || 1;
    
    // Use shape-specific seat layout algorithm
    console.log('Creating new table with seat count:', finalSeatCount, 'Shape:', sectionConfig.shape);
    
    // Initialize seats array
    let seats = [];
    
    // DIRECT IMPLEMENTATION: Special handling for rectangle tables with any number of seats
    if (sectionConfig.shape === 'rectangle') {
      const width = sectionConfig.dimensions?.width || 120;
      const height = sectionConfig.dimensions?.height || 80;
      const rotation = sectionConfig.rotation || 0;
      
      // For seat positioning, we'll use the table dimensions in their original orientation
      // This ensures seats are consistently positioned relative to the table's appearance
      const longSide = width;  // Always use width as the long side in calculations
      const shortSide = height; // Always use height as the short side in calculations
      const seatDistance = SEAT_SPACING_FIXED; // Fixed distance from table edge
      
      // Calculate appropriate positions for rectangle table seats
      const seatPositions = [];
      
      if (finalSeatCount === 1) {
        // Just one seat in the center of the bottom edge
        seatPositions.push({
          x: 0,
          y: shortSide/2 + seatDistance,
          isCorner: false
        });
      }
      else if (finalSeatCount === 2) {
        // Two seats on opposite sides (top and bottom)
        seatPositions.push(
          {
            x: 0,
            y: -shortSide/2 - seatDistance,
            isCorner: false
          },
          {
            x: 0,
            y: shortSide/2 + seatDistance,
            isCorner: false
          }
        );
      }
      else if (finalSeatCount === 3) {
        // Three seats - one on top, two on bottom (left and right)
        seatPositions.push(
          {
            x: 0,
            y: -shortSide/2 - seatDistance,
            isCorner: false
          },
          {
            x: -longSide/4,
            y: shortSide/2 + seatDistance,
            isCorner: false
          },
          {
            x: longSide/4,
            y: shortSide/2 + seatDistance,
            isCorner: false
          }
        );
      }
      else if (finalSeatCount === 4) {
        // Four seats with one on each side - traditional layout
        // This creates the classic restaurant table with seats on all sides
        seatPositions.push(
          // Top edge center
          {
            x: 0,
            y: -shortSide/2 - seatDistance,
            isCorner: false
          },
          // Right edge center
          {
            x: longSide/2 + seatDistance,
            y: 0,
            isCorner: false
          },
          // Bottom edge center
          {
            x: 0,
            y: shortSide/2 + seatDistance,
            isCorner: false
          },
          // Left edge center
          {
            x: -longSide/2 - seatDistance,
            y: 0,
            isCorner: false
          }
        );
      }
      else if (finalSeatCount === 5 || finalSeatCount === 6) {
        // For 5-6 seats, we'll create a balanced pattern that looks good
        // This is a very common restaurant layout with 2 on top, 2 on bottom, and 1-2 on the side
        
        // Common spacing calculations
        const longEdgeSpacing = longSide / 4; // Position at 1/4 from each end
        
        // Top edge - 2 seats
        seatPositions.push(
          {
            x: -longEdgeSpacing,
            y: -shortSide/2 - seatDistance,
            isCorner: false
          },
          {
            x: longEdgeSpacing,
            y: -shortSide/2 - seatDistance,
            isCorner: false
          }
        );
        
        // Bottom edge - 2 seats
        seatPositions.push(
          {
            x: -longEdgeSpacing,
            y: shortSide/2 + seatDistance,
            isCorner: false
          },
          {
            x: longEdgeSpacing,
            y: shortSide/2 + seatDistance,
            isCorner: false
          }
        );
        
        // For 5 seats, add 1 seat to the right in the center
        if (finalSeatCount >= 5) {
          seatPositions.push({
            x: longSide/2 + seatDistance,
            y: 0, // Centered on the right edge
            isCorner: false
          });
        }
        
        // For 6 seats, add the sixth seat on the left in the center
        if (finalSeatCount >= 6) {
          seatPositions.push({
            x: -longSide/2 - seatDistance,
            y: 0, // Centered on the left edge
            isCorner: false
          });
        }
        
      }
      else if (finalSeatCount === 7 || finalSeatCount === 8) {
        // For 7-8 seats, create a more balanced arrangement with better spacing
        // Use a clear, consistent pattern that doesn't cause overlapping
        
        // APPROACH: 2-2-2-1 arrangement (2 on top, 2 on bottom, 2 on right, 1 on left)
        // Or 2-2-2-2 for 8 seats (2 on each side)
        
        // Adjust spacing to avoid overlap
        // Make top/bottom seats closer together but side seats further apart
        const topBottomSpacing = longSide / 4; // Closer together on top/bottom
        const sideSpacing = shortSide / 2.5; // Further apart on sides
        
        // Top edge - 2 seats with good spacing
        seatPositions.push(
          {
            x: -topBottomSpacing,
            y: -shortSide/2 - seatDistance,
            isCorner: false
          },
          {
            x: topBottomSpacing,
            y: -shortSide/2 - seatDistance,
            isCorner: false
          }
        );
        
        // Bottom edge - 2 seats with good spacing
        seatPositions.push(
          {
            x: -topBottomSpacing,
            y: shortSide/2 + seatDistance,
            isCorner: false
          },
          {
            x: topBottomSpacing,
            y: shortSide/2 + seatDistance,
            isCorner: false
          }
        );
        
        // Right edge - 2 seats with good spacing
        seatPositions.push(
          {
            x: longSide/2 + seatDistance,
            y: -sideSpacing,
            isCorner: false
          },
          {
            x: longSide/2 + seatDistance,
            y: sideSpacing,
            isCorner: false
          }
        );
        
        // Left edge - 1 seat for 7-seat table, or 2 seats for 8-seat table
        if (finalSeatCount === 7) {
          // Just one seat in the center of the left edge
          seatPositions.push({
            x: -longSide/2 - seatDistance,
            y: 0,
            isCorner: false
          });
        } else {
          // Two seats on the left edge with good spacing
          seatPositions.push(
            {
              x: -longSide/2 - seatDistance,
              y: -sideSpacing,
              isCorner: false
            },
            {
              x: -longSide/2 - seatDistance,
              y: sideSpacing,
              isCorner: false
            }
          );
        }
      }
      // Special case for 9-10 seats - optimized layout with better spacing
      else if (finalSeatCount === 9 || finalSeatCount === 10) {
        console.log(`Creating optimized rectangle table with exactly ${finalSeatCount} seats`);
        
        // For 9-10 seats, use a fixed optimized layout with specific positioning
        // 3 seats on top, 3 on bottom, 2 on right side, and 1-2 on left side
        
        // Use much wider spacing for better label readability
        // Increase the seat distance from the table edge as well
        const extraDistance = 10; // Additional distance from table edge
        const modifiedSeatDistance = seatDistance + extraDistance;
        
        // Spread out seats more widely along edges
        const topBottomSpacing = longSide / 1.8; // Maximum spacing between top/bottom seats
        const sideSpacing = shortSide / 2.5; // More spacing between side seats
        
        // Add 3 seats to top edge with good spacing
        seatPositions.push(
          { x: -topBottomSpacing, y: -shortSide/2 - modifiedSeatDistance, isCorner: false },
          { x: 0, y: -shortSide/2 - modifiedSeatDistance, isCorner: false },
          { x: topBottomSpacing, y: -shortSide/2 - modifiedSeatDistance, isCorner: false }
        );
        
        // Add 3 seats to bottom edge with good spacing
        seatPositions.push(
          { x: -topBottomSpacing, y: shortSide/2 + modifiedSeatDistance, isCorner: false },
          { x: 0, y: shortSide/2 + modifiedSeatDistance, isCorner: false },
          { x: topBottomSpacing, y: shortSide/2 + modifiedSeatDistance, isCorner: false }
        );
        
        // Add 2 seats to right edge
        seatPositions.push(
          { x: longSide/2 + modifiedSeatDistance, y: -sideSpacing, isCorner: false },
          { x: longSide/2 + modifiedSeatDistance, y: sideSpacing, isCorner: false }
        );
        
        // Add 1 seat to left edge for 9-seat table, or 2 seats for 10-seat table
        if (finalSeatCount === 9) {
          // Just one seat in the center of the left edge
          seatPositions.push({
            x: -longSide/2 - modifiedSeatDistance,
            y: 0,
            isCorner: false
          });
        } else {
          // Two seats on the left edge with good spacing
          seatPositions.push(
            { x: -longSide/2 - modifiedSeatDistance, y: -sideSpacing, isCorner: false },
            { x: -longSide/2 - modifiedSeatDistance, y: sideSpacing, isCorner: false }
          );
        }
        
        console.log(`Created ${seatPositions.length} seats for optimized ${finalSeatCount}-seat table`);
      }
      // Handle tables with 11+ seats with a flexible, realistic approach
      else if (finalSeatCount > 10) {
        console.log(`Creating large rectangle table with ${finalSeatCount} seats`);
        
        // For larger tables, we need to be smarter about seat distribution
        // Let's cap the maximum seats per edge to avoid overcrowding
        const maxSeatsPerLongEdge = Math.min(Math.floor(longSide / 70), 8); // Cap at 8 seats per edge or practical spacing
        const maxSeatsPerShortEdge = Math.min(Math.floor(shortSide / 70), 4); // Cap at 4 seats per short edge
        
        // Calculate how many seats we can fit around the table without overcrowding
        const maxTotalSeats = (maxSeatsPerLongEdge * 2) + (maxSeatsPerShortEdge * 2);
        
        console.log(`Max practical seats: ${maxTotalSeats} (${maxSeatsPerLongEdge} per long edge, ${maxSeatsPerShortEdge} per short edge)`);
        
        // If requested seats exceed practical maximum, adjust the distribution
        // but still create all requested seats
        let longEdgeSeatsEach, shortEdgeSeatsEach;
        
        if (finalSeatCount > maxTotalSeats) {
          console.log(`Note: ${finalSeatCount} seats requested exceeds practical layout. Creating all seats but some may overlap.`);
          // Do our best to distribute them reasonably
          longEdgeSeatsEach = maxSeatsPerLongEdge;
          shortEdgeSeatsEach = maxSeatsPerShortEdge;
          
          // If we still need more seats, increase long edges first (they have more space)
          const remainingSeats = finalSeatCount - maxTotalSeats;
          if (remainingSeats > 0) {
            const extraPerLongEdge = Math.ceil(remainingSeats / 2);
            longEdgeSeatsEach += extraPerLongEdge;
            console.log(`Adding ${extraPerLongEdge} extra seats to each long edge to accommodate all seats`);
          }
        } else {
          // We can fit all seats comfortably
          // Distribute based on proportion of perimeter
          const perimeter = 2 * (longSide + shortSide);
          const longEdgeRatio = longSide / perimeter;
          
          // Distribute seats with priority to long edges
          longEdgeSeatsEach = Math.ceil(finalSeatCount * longEdgeRatio);
          
          // Don't exceed our practical maximum
          longEdgeSeatsEach = Math.min(longEdgeSeatsEach, maxSeatsPerLongEdge);
          
          // Remaining seats go on the short edges
          const remainingSeats = finalSeatCount - (longEdgeSeatsEach * 2);
          shortEdgeSeatsEach = Math.floor(remainingSeats / 2);
        }
        
        // Account for odd numbers of remaining seats
        const totalPlannedSeats = (longEdgeSeatsEach * 2) + (shortEdgeSeatsEach * 2);
        const extraSeats = finalSeatCount - totalPlannedSeats;
        
        console.log(`Distribution: ${longEdgeSeatsEach} on each long edge, ${shortEdgeSeatsEach} on each short edge, extra: ${extraSeats}`);
        
        // Calculate better spacing for seats along each edge
        // Use a consistent spacing approach that prevents overlap
        const longEdgeSpacing = longSide / (longEdgeSeatsEach + 1);
        const shortEdgeSpacing = shortSide / (shortEdgeSeatsEach + 1);
        
        // Add seats to top edge (long)
        for (let i = 1; i <= longEdgeSeatsEach; i++) {
          const xPos = -longSide/2 + i * longEdgeSpacing;
          seatPositions.push({
            x: xPos,
            y: -shortSide/2 - seatDistance,
            isCorner: false
          });
        }
        
        // Add seats to bottom edge (long)
        for (let i = 1; i <= longEdgeSeatsEach; i++) {
          const xPos = -longSide/2 + i * longEdgeSpacing;
          seatPositions.push({
            x: xPos,
            y: shortSide/2 + seatDistance,
            isCorner: false
          });
        }
        
        // Add seats to right edge (short)
        for (let i = 1; i <= shortEdgeSeatsEach; i++) {
          const yPos = -shortSide/2 + i * shortEdgeSpacing;
          seatPositions.push({
            x: longSide/2 + seatDistance,
            y: yPos,
            isCorner: false
          });
        }
        
        // Add seats to left edge (short) 
        for (let i = 1; i <= shortEdgeSeatsEach; i++) {
          const yPos = -shortSide/2 + i * shortEdgeSpacing;
          seatPositions.push({
            x: -longSide/2 - seatDistance,
            y: yPos,
            isCorner: false
          });
        }
        
        // If we have any extra seats, add them to the right edge with adjusted spacing
        if (extraSeats > 0) {
          // Calculate new spacing for the extras
          const extraSpacing = shortSide / (extraSeats + 1);
          for (let i = 1; i <= extraSeats; i++) {
            const yPos = -shortSide/2 + i * extraSpacing;
            seatPositions.push({
              x: longSide/2 + seatDistance,
              y: yPos,
              isCorner: false
            });
          }
        }
        
        console.log(`Created ${seatPositions.length} seats for large table with ${finalSeatCount} seats requested`);
      }
      
      // SIMPLIFIED APPROACH: Calculate all positions as if table is not rotated,
      // then just apply rotation matrix transformation
      
      // First step: Calculate all seat positions for the table at 0 degrees
      // (we've done this above in all the seat positioning code)
      
      // Second step: Apply rotation transformation to all positions
      // This ensures an exact match to the non-rotated pattern, just rotated
      const adjustedPositions = seatPositions.map(pos => {
        // Apply precise rotation matrix transformations
        // These are standard 2D rotation matrices
        if (rotation === 90) {
          return {
            x: -pos.y, // -y
            y: pos.x,  // x
            isCorner: pos.isCorner
          };
        } else if (rotation === 180) {
          return {
            x: -pos.x, // -x
            y: -pos.y, // -y
            isCorner: pos.isCorner
          };
        } else if (rotation === 270) {
          return {
            x: pos.y,   // y
            y: -pos.x,  // -x
            isCorner: pos.isCorner
          };
        } else {
          // For 0 degree rotation, use positions as-is
          return pos;
        }
      });
      
      // Add the exact number of seats requested
      console.log(`DEBUG: Requested ${finalSeatCount} seats for rectangle table with rotation ${rotation}°`);
      
      // Create the seats directly based on the adjusted positions
      // Create exactly the number requested (or all available positions if fewer)
      const numSeats = Math.min(finalSeatCount, adjustedPositions.length);
      for (let i = 0; i < numSeats; i++) {
        const pos = adjustedPositions[i];
        seats.push({
          position_x: pos.x,
          position_y: pos.y,
          capacity: finalCapacity,
          label: `Seat #${i + 1}`,
          isCorner: pos.isCorner
        });
      }
      
      console.log(`DEBUG: Created ${seats.length} seats for rectangle table:`);
      if (seats.length > 0) {
        console.log(`  Configuration: ${finalSeatCount} seats with ${rotation}° rotation`);
        console.log(`  Table dimensions: ${width}x${height}`);
      }
    } else {
      // For circle tables, use the existing algorithm
      seats = layoutTableSeats(
        finalSeatCount, 
        finalCapacity, 
        sectionConfig.shape, 
        sectionConfig.dimensions,
        sectionConfig.rotation
      );
    }
    
    console.log('Generated seats:', seats.length, 'for shape', sectionConfig.shape);
    
    // Apply custom labels if present
    if (Object.keys(customSeatLabels).length > 0) {
      seats = seats.map((seat, index) => ({
        ...seat,
        label: customSeatLabels[index] || seat.label || `Seat #${index+1}`
      }));
    }
    
    const newSectionId = `section-${Date.now()}`;
    const newSection: SeatSection = {
      id: newSectionId,
      name: sectionConfig.name,
      type: sectionConfig.type,
      orientation: sectionConfig.orientation,
      offsetX: 400, // Start in middle of view
      offsetY: 300,
      floorNumber: finalFloor,
      seats: seats,
      // Include new shape, dimensions, and rotation properties
      shape: sectionConfig.shape,
      dimensions: sectionConfig.dimensions,
      rotation: sectionConfig.rotation
    };
    
    setSections([...sections, newSection]);
    setHasUnsavedChanges(true);
    setActiveFloor(finalFloor);
    setShowSectionDialog(false);
    setCustomSeatLabels({}); // Reset custom labels after creating
  };

  // Enhanced loading state with transition
  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[500px] transition-opacity duration-500 ease-in-out">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-blue-500">Loading layout editor...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-500/90 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* CSS for iPad optimizations */}
      <style>
        {`
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none; /* Chrome, Safari and Opera */
          }
        `}
      </style>
      {/* Layout editor controls - optimized for iPad and mobile views */}
      <div className="p-3 bg-white border-b border-gray-200">
        {/* Main controls with responsive grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Layout selection section - takes up more space on smaller screens */}
          <div className="md:col-span-7 lg:col-span-8 space-y-3 md:space-y-0 md:flex md:items-center md:gap-2 lg:gap-3">
            {/* Location and Layout selectors in a responsive layout */}
            <div className="flex flex-wrap items-center gap-2 w-full">
              {/* Location selector */}
              {locations.length > 1 && (
                <div className="flex items-center gap-2 min-w-[150px] max-w-[280px] flex-grow">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap hidden xs:inline-block">
                    Location:
                  </label>
                  <div className="flex-grow">
                    <EnhancedMobileSelect
                      value={selectedLocationId !== null ? selectedLocationId.toString() : ''}
                      onChange={(value: string) => {
                        const newLocationId = value ? parseInt(value, 10) : null;
                        
                        // Check if we're in the middle of editing and have unsaved changes
                        if (hasUnsavedChanges) {
                          const confirmed = window.confirm(
                            'Changing location will reload layouts and you will lose any unsaved changes. Continue?'
                          );
                          if (!confirmed) return;
                        }
                        
                        // Update the selected location
                        setSelectedLocationId(newLocationId);
                        loadLayouts(newLocationId);
                        setHasUnsavedChanges(false);
                        
                        // Show a toast notification about the location change
                        const locationName = locations.find(loc => loc.id === newLocationId)?.name || 'All Locations';
                        toast.success(`Showing layouts for ${locationName}`);
                      }}
                      options={locations.map(location => ({
                        value: location.id.toString(),
                        label: location.name
                      }))}
                      placeholder="Select location"
                      className="w-full"
                    />
                  </div>
                </div>
              )}
              
              {/* Layout selector - takes remaining space */}
              <div className="flex items-center gap-2 flex-grow min-w-[200px] max-w-[320px]">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap hidden xs:inline-block">
                  Layout:
                </label>
                <div className="flex-grow">
                  <LayoutSelect
                    value={activeLayoutId ? activeLayoutId.toString() : '0'}
                    onChange={(value: string) => {
                      const id = parseInt(value);
                      if (!isNaN(id)) handleSelectLayout(id);
                    }}
                    options={[
                      { value: '0', label: '-- New Layout --' },
                      ...allLayouts.map((layout) => ({
                        value: layout.id.toString(),
                        label: `${layout.name} ${layout.is_active ? '(Active)' : ''}`
                      }))
                    ]}
                    placeholder="Select a layout"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            {/* New button - now has better responsive placement */}
            <button
              onClick={createNewLayout}
              className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md whitespace-nowrap"
              title="Create New Layout"
            >
              <LucidePlus size={16} />
              <span className="inline-block">New</span>
            </button>
          </div>
          
          {/* Actions section - simplified and optimized for touch */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-wrap items-center gap-2">
            {/* Layout name input */}
            <div className="relative flex-grow min-w-[140px]">
              <input
                type="text"
                value={layoutName}
                onChange={(e) => {
                  setLayoutName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Layout Name"
              />
              <span className="absolute inset-y-0 left-2 items-center pointer-events-none text-gray-500 text-xs font-medium xs:inline-flex hidden">
                Name:
              </span>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Save button - touch optimized */}
              <button 
                onClick={saveLayout}
                disabled={isLoading || layoutName.trim() === '' || !hasUnsavedChanges}
                className={`flex items-center justify-center px-3 py-2 rounded-md text-white font-medium whitespace-nowrap min-w-[80px] transition-colors duration-200 ${hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                <Save size={16} className="mr-1" />
                <span>Save</span>
              </button>
              
              {/* Active status or Activate button */}
              {activeLayoutId && allLayouts.find(l => l.id === activeLayoutId)?.is_active ? (
                <div className="flex items-center px-3 py-2 rounded-md bg-green-100 text-green-700 border border-green-300 whitespace-nowrap">
                  <Check size={16} className="mr-1" />
                  <span className="hidden sm:inline">Active</span>
                </div>
              ) : (
                <button
                  onClick={activateLayout}
                  disabled={!activeLayoutId}
                  className="flex items-center px-3 py-2 rounded-md transition-colors duration-200 border border-green-200 text-green-600 hover:bg-green-50 whitespace-nowrap"
                  title="Activate this layout"
                >
                  <Power size={16} className="mr-1" />
                  <span className="hidden sm:inline">Activate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floor controls toolbar - optimized for iPad view */}
      <div className="py-2 px-3 border-t border-gray-100 overflow-x-auto">
        {/* Floor tabs in scrollable row for iPad */}
        <div className="flex items-center gap-2 pb-1 flex-nowrap min-w-0 overflow-x-auto hide-scrollbar">
          {floorNumbers.map(floorNum => (
            <button
              key={floorNum}
              onClick={() => handleFloorChange(floorNum)}
              className={`px-4 py-3 rounded-md transition-all duration-200 shadow-sm whitespace-nowrap flex-shrink-0 min-w-[110px] max-w-[150px] flex items-center justify-center
                ${activeFloor === floorNum 
                  ? 'bg-hafaloha-gold/10 text-hafaloha-gold border border-hafaloha-gold/20' 
                  : 'bg-gray-100 text-gray-700 hover:bg-hafaloha-gold/5 hover:text-hafaloha-gold/70'}`}
            >
              Floor {floorNum}
            </button>
          ))}

          {/* Add floor button - Enhanced for iPad touch */}
          <button
            onClick={() => {
              const nextFloor = floorNumbers.length > 0 ? Math.max(...floorNumbers) + 1 : 1;
              // Trigger transition effect for smoother floor addition
              triggerTransition();
              setIsRendering(true);
              setTimeout(() => {
                setActiveFloor(nextFloor);
                setIsRendering(false);
              }, 150);
            }}
            className="px-4 py-3 rounded-md transition-all duration-200 shadow-sm bg-gray-100 text-gray-700 hover:bg-hafaloha-gold/10 hover:text-hafaloha-gold hover:border hover:border-hafaloha-gold/20 flex items-center justify-center whitespace-nowrap flex-shrink-0"
          >
            <LucidePlus size={16} className="mr-1" />
            Add Floor
          </button>
        </div>
      </div>

      {/* Main canvas area - optimized for iPad with better scrolling and transitions */}
      <div className="bg-white mb-6 w-full">
        <div 
          ref={containerRef}
          className={`border border-gray-100 bg-white overflow-auto rounded-lg shadow-sm w-full max-w-full relative transition-all duration-300 ease-in-out z-10 ${dataTransitioning || isRendering || isParentTransitioning ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'} ${isDragging ? 'overflow-hidden' : ''}`}
          style={{ 
            width: '100%',
            // Responsive canvas height based on screen size
            height: 'calc(100vh - 280px)', // Dynamic height based on viewport
            minHeight: '500px', // Minimum height on all devices
            maxHeight: '1000px', // Maximum height to prevent excessive space
            background: showGrid ? 
              `url("data:image/svg+xml,%3Csvg width='25' height='25' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 0 L 25 0 25 25 0 25 Z' fill='none' stroke='%23e5e7eb' stroke-width='1'/%3E%3C/svg%3E")` : 
              'white',
            WebkitOverflowScrolling: 'touch', // Better iPad scrolling experience
            touchAction: isDragging ? 'none' : 'pan-x pan-y', // Disable all touch actions while dragging
            userSelect: isDragging ? 'none' : 'auto' // Prevent text selection during dragging
          }}
        >
        {/* Active Layout Indicator */}
        {activeLayoutId && allLayouts.find(l => l.id === activeLayoutId)?.is_active && (
          <div className="absolute top-2 right-2 z-20 bg-green-100 text-green-700 rounded-md px-3 py-1 text-sm font-medium border border-green-300 shadow-sm flex items-center">
            <Check size={14} className="mr-1" />
            Active Layout
          </div>
        )}
        
        {sections.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <p className="mb-4 text-gray-500">No tables or sections added yet.</p>
              <button 
                onClick={handleAddSection}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-500/90 text-white rounded-md shadow-sm flex items-center mx-auto"
              >
                <LucidePlus size={16} className="mr-2" />
                Add Table
              </button>
            </div>
          </div>
        ) : (
          <div 
              className="text-center relative" 
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              ref={canvasRef}
              onMouseMove={handleDragMove}
              onTouchMove={(e) => {
                // If we're dragging, immediately handle the drag move
                if (isDragging) {
                  // We've already set touchAction: none on both the canvas and dragged element
                  // Also stop propagation to prevent any parent elements from scrolling
                  e.stopPropagation();
                }
                handleDragMove(e);
              }}
              onMouseUp={handleDragEnd}
              onTouchEnd={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchCancel={handleDragEnd}
            >
              {/* Render sections for current floor */}
              <div className="relative w-full h-full">
                {/* Map through sections for the active floor */}
                {sectionsForActiveFloor.map(section => {
                  const currentSectionId = section.id;
                  return (
                <div 
                  key={currentSectionId}
                  data-section-id={currentSectionId}
                  className={`absolute cursor-move transition-all ${isEditing ? 'hover:ring-2 ring-blue-400' : ''} 
                    ${selectedSection === currentSectionId ? 'z-10 shadow-lg' : 'z-0'}
                    ${isDragging && selectedSection === currentSectionId ? 'opacity-85 scale-105' : 'opacity-100'}`}
                  style={{
                    left: `${section.offsetX}px`,
                    top: `${section.offsetY}px`,
                    transition: isDragging && selectedSection === currentSectionId ? 'none' : 'transform 0.15s ease-out',
                    boxShadow: isDragging && selectedSection === currentSectionId ? '0 4px 20px rgba(0, 120, 212, 0.3)' : 'none'
                  }}
                  onMouseDown={(e) => handleDragStart(e, currentSectionId)}
                  onTouchStart={(e) => {
                    // Store the element being dragged so we can restore it later
                    draggedElementRef.current = e.currentTarget as HTMLElement;
                    
                    // Add active touch feedback for better visual response on iPads
                    e.currentTarget.classList.add('touch-active');
                    
                    // Set touch action before handling the drag to avoid scrolling interference
                    e.currentTarget.style.touchAction = 'none';
                    
                    // Use type assertion for webkit CSS properties not in TypeScript definitions
                    const style = e.currentTarget.style as any;
                    style.webkitTouchCallout = 'none'; // Disable callout on iOS
                    style.webkitUserSelect = 'none'; // Disable selection on iOS
                    
                    // Prevent any native gesture handling
                    e.preventDefault();
                    
                    // Use a small timeout to ensure the touch action is applied before handling the drag
                    setTimeout(() => {
                      // Handle the drag start
                      handleDragStart(e, currentSectionId);
                      
                      // Add a haptic feedback cue for iOS devices if supported
                      if (window.navigator && typeof window.navigator.vibrate === 'function') {
                        // vibrate() returns boolean, not a Promise
                        try {
                          window.navigator.vibrate(50);
                        } catch (error) {
                          // Silently fail if vibration API fails
                        }
                      }
                    }, 0);
                  }}
                >
                  {/* Table container - conditional rendering based on shape type */}
                  <div
                    className={`flex items-center justify-center overflow-hidden shadow-sm ${section.shape === 'rectangle' ? '' : 'rounded-full'}`}
                    style={{
                      // For circle tables use fixed diameter, for rectangle use the dimensions
                      width: section.shape === 'rectangle' 
                        ? `${section.dimensions?.width || 120}px` 
                        : `${TABLE_DIAMETER}px`,
                      height: section.shape === 'rectangle' 
                        ? `${section.dimensions?.height || 80}px` 
                        : `${TABLE_DIAMETER}px`,
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      // Apply rotation only for rectangle tables
                      transform: section.shape === 'rectangle' 
                        ? `translate(-50%, -50%) rotate(${section.rotation || 0}deg)` 
                        : 'translate(-50%, -50%)',
                      zIndex: 1, // Tables below seats
                      backgroundColor: '#e2e2e2', // Light gray from Image 1
                      opacity: selectedSection === currentSectionId ? 0.9 : 0.8,
                      boxShadow: selectedSection === currentSectionId ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.05)',
                      border: selectedSection === currentSectionId ? `2px solid #c1902f` : '1px solid #d8d8d8'
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
                
                  {/* Render the seats for this section */}
                  {section.seats && section.seats.map((seat: Seat, seatIndex: number) => {
                    // Calculate rotated position for the seat based on table rotation
                    const finalX = seat.position_x;
                    const finalY = seat.position_y;
                    
                    // IMPORTANT: We don't need to apply rotation here
                    // The seat positions are already rotated in the handleCreateSection function
                    // We're directly using the pre-rotated positions to avoid double rotation
                    
                    return (
                      <div
                        key={`${currentSectionId}-seat-${seatIndex}`}
                        className="absolute rounded-full flex items-center justify-center shadow-sm font-medium"
                        style={{
                          width: `${SEAT_DIAMETER}px`,
                          height: `${SEAT_DIAMETER}px`,
                          left: finalX,
                          top: finalY,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 2, // Seats above tables
                          backgroundColor: '#fef3c7', // Amber-50 exact color
                          color: '#8B5500', // Hafaloha brown text color
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          border: '2.5px solid #8B5500', // Darker brown border like in floor manager
                          fontSize: '0.875rem', // text-sm, slightly larger and matching FloorManager
                          fontWeight: '600' // semibold to match FloorManager
                        }}
                        title={`${seat.label} (Capacity: ${seat.capacity})`}
                      >
                        {seat.label || `Seat #${seatIndex + 1}`}
                      </div>
                    );
                  })}
                     
                  {/* Controls visible in edit mode - positioned for better accessibility */}
                  {isEditing && (
                    <div className="absolute -top-10 right-0 flex space-x-1 z-50 pointer-events-auto">
                      {/* Edit Button */}
                      <button
                        onClick={(e) => {
                          // Stop propagation to prevent triggering table selection
                          e.stopPropagation();
                          
                          // Use the proper handleEditSection function instead of duplicate code
                          handleEditSection(currentSectionId);
                        }}
                        className="p-1.5 bg-blue-100 rounded hover:bg-blue-200 text-blue-700 transition-colors shadow-md touch-action-manipulation border border-blue-300"
                        title="Edit Table"
                      >
                        <Edit2 size={15} />
                      </button>
                      
                      {/* Duplicate Button */}
                      <button
                        onClick={(e) => {
                          // Stop propagation to prevent triggering table selection
                          e.stopPropagation();
                          
                          // Duplicate section - create a copy with slight offset
                          const newSectionId = Math.random().toString(36).substring(2, 10);
                          
                          // Find the section to duplicate
                          const sectionToDuplicate = sections.find((s) => s.id === currentSectionId);
                          if (sectionToDuplicate) {
                            // Create deep copy of section to avoid reference issues
                            const sectionCopy = JSON.parse(JSON.stringify(sectionToDuplicate));
                            const newSection: SeatSection = { 
                              ...sectionCopy,
                              id: newSectionId,
                              name: `${sectionToDuplicate.name} (Copy)`,
                              offsetX: sectionToDuplicate.offsetX + 30,
                              offsetY: sectionToDuplicate.offsetY + 30
                            };
                            
                            setSections([...sections, newSection]);
                            setHasUnsavedChanges(true);
                            
                            // Select the new section
                            setSelectedSection(newSectionId);
                            
                            // Show feedback toast
                            toast.success(`Duplicated: ${sectionToDuplicate.name}`, {
                              position: "bottom-center",
                              duration: 2000
                            });
                          }
                        }}
                        className="p-1.5 bg-blue-100 rounded hover:bg-blue-200 text-blue-700 transition-colors shadow-md touch-action-manipulation active:transform active:scale-95 border border-blue-300"
                        title="Duplicate Table"
                      >
                        <Copy size={15} />
                      </button>
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            // Stop propagation to prevent triggering table selection
                            e.stopPropagation();
                            
                            // Delete section
                            setSections(sections.filter(s => s.id !== currentSectionId));
                            setHasUnsavedChanges(true);
                          }}
                          className="p-1.5 bg-red-100 rounded hover:bg-red-200 text-red-700 transition-colors shadow-md touch-action-manipulation active:transform active:scale-95 border border-red-300"
                          title="Delete Table"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
      </div> {/* End of main canvas container */}

      {/* Bottom toolbar - touch optimized */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 flex justify-between items-center flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Add Table - Touch optimized */}
          <button 
            onClick={handleAddSection}
            className="min-h-[50px] min-w-[120px] px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg shadow flex items-center justify-center transition-all text-base touch-action-manipulation active:transform active:scale-95"
          >
            <LucidePlus size={20} className="mr-2" />
            Add Table
          </button>
          {/* Edit Mode - Touch optimized */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`min-h-[50px] min-w-[120px] px-5 py-3 rounded-lg shadow flex items-center justify-center transition-all text-base touch-action-manipulation active:transform active:scale-95 ${isEditing ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'}`}
          >
            {isEditing ? 'Exit Edit Mode' : 'Edit Mode'}
          </button>
          {/* Show/hide grid - enhanced for touch */}
          <button
            onClick={() => setShowGrid(prev => !prev)}
            className={`min-h-[50px] min-w-[120px] px-5 py-3 rounded-lg flex items-center justify-center transition-all text-base touch-action-manipulation active:transform active:scale-95 ${showGrid 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300 border border-blue-300' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 border border-gray-200'
            }`}
            title={showGrid ? 'Hide Grid' : 'Show Grid'}
          >
            <Maximize size={20} className="mr-2" />
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </button>
          {/* Snap to grid toggle - for precise table positioning - touch optimized */}
          <button
            onClick={() => setSnapToGrid(prev => !prev)}
            className={`min-h-[50px] min-w-[120px] px-5 py-3 rounded-lg flex items-center justify-center transition-all text-base touch-action-manipulation active:transform active:scale-95 ${snapToGrid 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300 border border-blue-300' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 border border-gray-200'
            }`}
            title={snapToGrid ? 'Disable Grid Snapping' : 'Enable Grid Snapping'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5z"/>
              <path d="M3 9h18"/>
              <path d="M3 15h18"/>
              <path d="M9 3v18"/>
              <path d="M15 3v18"/>
            </svg>
            {snapToGrid ? 'Grid Snap: On' : 'Grid Snap: Off'}
          </button>
          <div className="flex items-center bg-gray-100 rounded-md overflow-hidden border border-gray-200 shadow-sm">
            <button
              onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))}
              className="px-3 py-2 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Zoom Out"
              disabled={zoom <= 0.2}
            >
              <Minus size={18} />
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
              className="px-3 py-2 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Zoom In"
              disabled={zoom >= 2}
            >
              <LucidePlus size={18} />
            </button>
            <button 
              onClick={() => setZoom(1)}
              className="px-3 py-2 border-l border-gray-200 text-gray-600 hover:bg-gray-200 transition-colors text-xs font-medium"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Section Edit Dialog - Enhanced for iPad with touch-friendly controls */}
      {showSectionDialog && (
        <div className="fixed inset-0 flex items-start justify-center p-4 pt-10 z-50 pointer-events-none overflow-auto" style={{ maxHeight: '100vh' }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-200 pointer-events-auto transform transition-all duration-200 ease-in-out mb-10">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-medium text-blue-600">
                {editingSectionId ? 'Edit Section' : 'Add New Section'}
              </h3>
              <button 
                onClick={() => setShowSectionDialog(false)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="space-y-5">  {/* Increased spacing for touch */}
              <div>
                <label htmlFor="section-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  id="section-name"
                  type="text"
                  value={sectionConfig.name}
                  onChange={(e) => setSectionConfig({...sectionConfig, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                />
              </div>
              
              <div>
                <label htmlFor="section-floor" className="block text-sm font-medium text-gray-700 mb-2">
                  Floor
                </label>
                <input
                  id="section-floor"
                  type="number"
                  min="1"
                  value={sectionFloorText}
                  onChange={(e) => setSectionFloorText(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                />
              </div>
              
              <div>
                <label htmlFor="section-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Section Type
                </label>
                <EnhancedMobileSelect
                  options={[
                    { value: 'table', label: 'Table' },
                    { value: 'counter', label: 'Counter' }
                  ]}
                  value={sectionConfig.type}
                  onChange={(value: string) => setSectionConfig({...sectionConfig, type: value as 'table' | 'counter'})}
                  placeholder="Select section type"
                  className="w-full"
                />
              </div>
              
              {/* Table Shape Selection */}
              <div>
                <label htmlFor="section-shape" className="block text-sm font-medium text-gray-700 mb-2">
                  Table Shape
                </label>
                <EnhancedMobileSelect
                  options={[
                    { value: 'circle', label: 'Circle' },
                    { value: 'rectangle', label: 'Rectangle' }
                  ]}
                  value={sectionConfig.shape}
                  onChange={(value: string) => setSectionConfig({...sectionConfig, shape: value as TableShape})}
                  placeholder="Select table shape"
                  className="w-full"
                />
              </div>
              
              {/* Touch-friendly Table Rotation - only show when not circular */}
              {sectionConfig.shape === 'rectangle' && (
                <div>
                  <label htmlFor="rotation-control" className="block text-sm font-medium text-gray-700 mb-2">
                    Rotation: <span className="text-blue-600 font-semibold">{sectionConfig.rotation}°</span>
                  </label>
                  {/* Interactive rotation control for touch devices */}
                  <div className="relative bg-white rounded-lg p-4 border border-blue-100 shadow-sm touch-action-manipulation">
                    <div 
                      id="rotation-control"
                      className="w-full flex justify-between items-center"
                    >
                      {/* Visual representation of the table */}
                      <div className="mx-auto relative w-32 h-32 flex justify-center items-center">
                        <div 
                          className="w-20 h-14 bg-gray-200 border-2 border-blue-400 rounded-md shadow-sm transition-transform"
                          style={{ transform: `rotate(${sectionConfig.rotation}deg)` }}
                        >
                          {/* Visual indicators for top of table */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600 rounded-t-sm"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Touch-friendly rotation controls */}
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[0, 90, 180, 270].map((rotation) => (
                        <button
                          key={rotation}
                          type="button"
                          onClick={() => {
                            // Update rotation while explicitly preserving original seat count
                            setSectionConfig({...sectionConfig, rotation: rotation as TableRotation});
                            
                            // Ensure seat count in the text field matches what we had before
                            // This prevents the bug where rotating causes seat count to reset
                            const existingSeatCount = parseInt(seatCountText, 10) || 4;
                            setSeatCountText(existingSeatCount.toString());
                          }}
                          className={`min-h-[44px] py-2 px-1 rounded-md border transition-all touch-action-manipulation active:transform active:scale-95 ${sectionConfig.rotation === rotation 
                            ? 'bg-blue-500 text-white border-blue-600' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {rotation}°
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">Tap a button to set table rotation</p>
                  </div>
                </div>
              )}
              
              {/* Table Dimensions - only show for rectangle */}
              {sectionConfig.shape === 'rectangle' && (
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="table-width" className="block text-sm font-medium text-gray-700 mb-2">
                      Width (cm)
                    </label>
                    <input
                      id="table-width"
                      type="number"
                      min="60"
                      max="300"
                      value={sectionConfig.dimensions.width}
                      onChange={(e) => setSectionConfig({
                        ...sectionConfig, 
                        dimensions: {
                          ...sectionConfig.dimensions,
                          width: parseInt(e.target.value) || 120
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                    />
                  </div>
                  <div>
                    <label htmlFor="table-height" className="block text-sm font-medium text-gray-700 mb-2">
                      Height (cm)
                    </label>
                    <input
                      id="table-height"
                      type="number"
                      min="60"
                      max="300"
                      value={sectionConfig.dimensions.height}
                      onChange={(e) => setSectionConfig({
                        ...sectionConfig, 
                        dimensions: {
                          ...sectionConfig.dimensions,
                          height: parseInt(e.target.value) || 80
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                    />
                  </div>
                </div>
              )}
              
              {/* Enhanced Seat Count Controls with visualization */}
              <div className="col-span-2 mb-2">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="seat-count" className="text-sm font-medium text-gray-700">
                    Number of Seats: <span className="text-blue-600 font-semibold">{seatCountText}</span>
                  </label>
                  
                  <button 
                    onClick={() => {
                      // Auto-calculate optimal number of seats based on table shape and dimensions
                      let optimalSeatCount;
                      if (sectionConfig.shape === 'circle') {
                        // For circle tables, base on circumference (2πr)
                        // Assuming each seat needs about 60-70cm of space
                        const circumference = 2 * Math.PI * (TABLE_DIAMETER / 2);
                        optimalSeatCount = Math.max(2, Math.floor(circumference / 65));
                      } else {
                        // For rectangle tables, base on perimeter
                        const perimeter = 2 * (sectionConfig.dimensions.width + sectionConfig.dimensions.height);
                        optimalSeatCount = Math.max(2, Math.round(perimeter / 60));
                      }
                      setSeatCountText(optimalSeatCount.toString());
                    }}
                    className="min-h-[44px] min-w-[110px] text-sm bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 px-3 py-2 rounded border border-blue-200 transition-all touch-action-manipulation active:transform active:scale-95"
                    title="Calculate optimal seat count based on table dimensions"
                  >
                    Auto-Calculate
                  </button>
                </div>
                
                {/* Enhanced slider for seat count with touch-friendly design */}
                <div className="relative">
                  <input
                    id="seat-count-slider"
                    type="range"
                    min="1"
                    max="10" /* Limited to 10 seats max to avoid overlapping */
                    step="1" /* Ensure it moves in whole numbers */
                    value={parseInt(seatCountText) || 4}
                    onChange={(e) => setSeatCountText(e.target.value)}
                    className="w-full h-10 bg-blue-50 rounded-lg appearance-none cursor-pointer accent-blue-500 touch-action-manipulation"
                    style={{
                      // Custom styling for better touch targets on iPad
                      WebkitAppearance: 'none',
                      margin: '12px 0',
                      height: '24px',
                      borderRadius: '12px',
                    }}
                  />
                  {/* Touch-friendly tick marks with all numbers visible */}
                  <div className="w-full flex justify-between px-1 text-xs text-gray-400">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                    <span>6</span>
                    <span>7</span>
                    <span>8</span>
                    <span>9</span>
                    <span>10</span>
                  </div>
                </div>
                
                {/* Seat visualization with ability to edit labels - Hafaloha styled */}
                <div className="mt-3 mb-1 flex flex-wrap justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Seat Visualization</span>
                  <button
                    onClick={() => setShowSeatLabelsEdit(!showSeatLabelsEdit)}
                    className="text-sm bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-1 rounded border border-amber-200 flex items-center"
                    style={{ borderColor: '#c1902f', color: '#8B5500' }}
                  >
                    {showSeatLabelsEdit ? 'Hide Label Editor' : 'Edit Seat Labels'}
                  </button>
                </div>
                <div className="p-3 border border-gray-200 rounded-md bg-gray-50 flex flex-wrap justify-center gap-2">
                  {Array.from({ length: parseInt(seatCountText) || 4 }).map((_, i) => (
                    <div 
                      key={i}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer"
                      style={{ borderColor: '#c1902f', backgroundColor: '#fef3c7', color: '#8B5500', border: '2px solid #c1902f' }}
                      title={customSeatLabels[i] || `Seat ${i+1}`}
                      onClick={() => showSeatLabelsEdit && setCustomSeatLabels({...customSeatLabels, [i]: window.prompt('Enter seat label:', customSeatLabels[i] || `Seat ${i+1}`) || customSeatLabels[i] || `Seat ${i+1}`})}
                    >
                      {customSeatLabels[i] ? customSeatLabels[i].substring(0, 2) : i+1}
                    </div>
                  ))}
                </div>
                {showSeatLabelsEdit && (
                  <div className="mt-2 p-2 border border-gray-100 rounded bg-blue-50">
                    <p className="text-xs text-gray-600 mb-2">Click on any seat above to edit its label. Custom labels will be saved with the table.</p>
                    <div className="max-h-28 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: parseInt(seatCountText) || 4 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-1 text-sm">
                            <span className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 text-xs">{i+1}</span>
                            <input
                              type="text"
                              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                              value={customSeatLabels[i] || `Seat ${i+1}`}
                              onChange={(e) => setCustomSeatLabels({...customSeatLabels, [i]: e.target.value})}
                              placeholder={`Seat ${i+1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Seat Count and Capacity Section - fixed alignment */}
              <div className="mb-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="seat-count" className="block text-sm font-medium text-gray-700 mb-2">
                      Precise Seat Count
                    </label>
                    <input
                      id="seat-count"
                      type="number"
                      min="1"
                      max="20"
                      value={seatCountText}
                      onChange={(e) => setSeatCountText(e.target.value)}
                      className="w-full h-[46px] border border-gray-300 rounded-md px-4 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="seat-capacity" className="block text-sm font-medium text-gray-700 mb-2">
                      Seats Capacity
                    </label>
                    <div className="flex">
                      <input
                        id="seat-capacity"
                        type="number"
                        min="1"
                        max="30"
                        value={seatCapacityText}
                        onChange={(e) => setSeatCapacityText(e.target.value)}
                        className="w-full h-[46px] border border-gray-300 rounded-l-md px-4 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                      />
                      <button
                        onClick={() => {
                          // Auto-calculate capacity based on seat count
                          const seatCount = parseInt(seatCountText) || 4;
                          const recommendedCapacity = Math.min(20, Math.ceil(seatCount * 1.25));
                          setSeatCapacityText(recommendedCapacity.toString());
                        }}
                        className="whitespace-nowrap text-sm bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-1 rounded-r-md border border-l-0 border-amber-200 h-[46px] flex items-center"
                        style={{ borderColor: '#c1902f', color: '#8B5500' }}
                      >
                        Recommend
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Capacity should be ≥ seat count for flexibility in seating.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center space-x-6 pt-6 mt-4 border-t border-gray-200">  {/* Centered buttons with divider */}
                <button
                  onClick={() => setShowSectionDialog(false)}
                  className="h-12 w-[140px] bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSection}
                  className="h-12 w-[140px] bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 active:bg-blue-800 transition-all text-base font-medium"
                >
                  {editingSectionId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default SeatLayoutEditor;
