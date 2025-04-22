// src/ordering/components/admin/reservations/LayoutEditor.tsx
import React, { useEffect, useState } from 'react';
import { 
  Save, Plus as LucidePlus, Power, 
  Edit2, Minus, Maximize, Trash2
} from 'lucide-react';
import toastUtils from '../../../../shared/utils/toastUtils';

// Tenant utilities for proper tenant isolation
import { validateRestaurantContext } from '../../../../shared/utils/tenantUtils';

// Re-use existing API functions from the Reservations module
import {
  fetchAllLayouts,
  fetchLayout,
  createLayout,
  updateLayout,
  activateLayout,
} from '../../../../reservations/services/api';

// Import the RenameSeatsModal for seat labeling
import RenameSeatsModal from '../../../../reservations/components/RenameSeatsModal';

// Add custom toast methods
const showInfo = (message: string) => {
  return toastUtils.custom(
    (t) => (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-md">
        <div className="flex items-center">
          <div className="ml-3">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        </div>
      </div>
    ),
    { duration: 3000 }
  );
};

/** ---------- Data Interfaces ---------- **/
interface LayoutData {
  id: number;
  name: string;
  restaurant_id: number;
  sections_data: {
    sections: SeatSection[];
  };
}

interface SeatSection {
  id: string;
  dbId?: number;
  name: string;
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
  offsetX: number;
  offsetY: number;
  floorNumber: number;
  seats: DBSeat[];
}

interface DBSeat {
  id?: number;
  label?: string;
  position_x: number;
  position_y: number;
  capacity: number;
}

interface SectionConfig {
  name: string;
  type: 'table' | 'counter';
  orientation: 'vertical' | 'horizontal';
  seatCount: number;
}

interface LayoutEditorProps {
  restaurantId?: string | number;
}

/** Predefined layout sizes or "auto" bounding. */
const LAYOUT_PRESETS = {
  auto:   { width: 0,    height: 0,    seatScale: 1.0 },
  small:  { width: 1200, height: 800,  seatScale: 1.0 },
  medium: { width: 2000, height: 1200, seatScale: 1.0 },
  large:  { width: 3000, height: 1800, seatScale: 1.0 },
};

/**
 * Admin wrapper for the layout editor functionality.
 * Allows creating, editing, and managing seating layouts with proper tenant isolation.
 */
export const LayoutEditor: React.FC<LayoutEditorProps> = ({ restaurantId }) => {
  // 1) Tenant validation - throws if invalid
  useEffect(() => {
    validateRestaurantContext(restaurantId);
  }, [restaurantId]);

  // Layout states
  const [allLayouts, setAllLayouts] = useState<LayoutData[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<number | null>(null);
  const [layoutName, setLayoutName] = useState('New Layout');
  const [sections, setSections] = useState<SeatSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Canvas sizing + zoom
  const [layoutSize, setLayoutSize] = useState<'auto'|'small'|'medium'|'large'>('medium');
  const [canvasWidth, setCanvasWidth] = useState(2000);
  const [canvasHeight, setCanvasHeight] = useState(1200);
  const [seatScale, setSeatScale] = useState(1.0);
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  // Dragging a section
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Add/Edit Section dialog
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // For the new/edit section form
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    name: '', 
    type: 'table', 
    orientation: 'vertical',
    seatCount: 4
  });
  const [seatCountText, setSeatCountText] = useState('4');
  const [sectionFloorText, setSectionFloorText] = useState('1');
  const [seatCapacityText, setSeatCapacityText] = useState('1');

  // Basic geometry constants
  const TABLE_DIAMETER = 80;
  const TABLE_RADIUS = TABLE_DIAMETER / 2;
  const TABLE_OFFSET_Y = 15;
  const SEAT_DIAMETER = 64;
  const SEAT_MARGIN = 10;

  // Floor logic
  const floorNumbers = Array.from(new Set(sections.map(s => s.floorNumber || 1))).sort((a, b) => a - b);
  const [activeFloor, setActiveFloor] = useState(floorNumbers.length > 0 ? floorNumbers[0] : 1);
  const sectionsForActiveFloor = sections.filter(s => (s.floorNumber || 1) === activeFloor);

  // Rename seats modal
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameModalSeats, setRenameModalSeats] = useState<DBSeat[]>([]);
  const [renameModalSectionName, setRenameModalSectionName] = useState('');

  /** On mount => fetch all layouts with tenant isolation. */
  useEffect(() => {
    if (restaurantId) {
      loadAllLayouts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  async function loadAllLayouts() {
    try {
      setIsLoading(true);
      
      // Ensure we have a valid restaurant ID
      if (!restaurantId) {
        console.error('[LayoutEditor] Missing restaurant ID');
        toastUtils.error('Cannot load layouts: missing restaurant context');
        setIsLoading(false);
        return;
      }
      
      // Convert to number for consistent comparison
      const numericRestaurantId = Number(restaurantId);
      
      // We can't pass params directly to fetchAllLayouts as it doesn't accept parameters
      // Instead, we'll filter the results after fetching using the restaurant ID
      const response = await fetchAllLayouts();
      const layouts = response as LayoutData[];
      
      // Double-check layouts belong to this restaurant for additional tenant isolation
      const filteredLayouts = layouts.filter(layout => 
        layout.restaurant_id === numericRestaurantId
      );
      
      console.log(`[LayoutEditor] Loaded ${filteredLayouts.length} layouts for restaurant ${numericRestaurantId}`);
      setAllLayouts(filteredLayouts);
      
      if (filteredLayouts.length > 0) {
        const firstId = filteredLayouts[0].id;
        setActiveLayoutId(firstId);
        await loadOneLayout(firstId);
      }
    } catch (err) {
      console.error('[LayoutEditor] Error loading layouts:', err);
      toastUtils.error('Failed to load layouts.');
    } finally {
      setIsLoading(false);
    }
  }

  /** Load seat sections from the chosen layout. */
  async function loadOneLayout(id: number) {
    try {
      setIsLoading(true);
      
      // Ensure we have a valid restaurant ID
      if (!restaurantId) {
        console.error('[LayoutEditor] Missing restaurant ID');
        toastUtils.error('Cannot load layout: missing restaurant context');
        setIsLoading(false);
        return;
      }
      
      // Convert to number for consistent comparison
      const numericRestaurantId = Number(restaurantId);
      
      // We need to use the standard API call and filter results afterward
      const response = await fetchLayout(id);
      
      // Add logging for debugging
      console.log(`[LayoutEditor] Fetched layout ${id}, checking against restaurant ${numericRestaurantId}`);
      const layout = response as LayoutData;
      
      // The API response might not include restaurant_id even though it was filtered server-side
      // Since we requested with restaurant_id=numericRestaurantId and the server enforces tenant isolation,
      // we can safely assume this layout belongs to the current restaurant
      if (!layout.restaurant_id) {
        console.log(`[LayoutEditor] Layout response missing restaurant_id, adding current restaurant ID ${numericRestaurantId}`);
        layout.restaurant_id = numericRestaurantId;
      }
      
      // Double-check tenant isolation as a safeguard
      if (layout.restaurant_id !== numericRestaurantId) {
        console.error(`[LayoutEditor] Tenant isolation error: layout belongs to restaurant ${layout.restaurant_id}, but current restaurant is ${numericRestaurantId}`);
        toastUtils.error('Access denied: layout does not belong to this restaurant');
        setIsLoading(false);
        return;
      }
      
      console.log(`[LayoutEditor] Successfully loaded layout ${id} for restaurant ${numericRestaurantId}`);
      
      const secWithFloors = (layout.sections_data?.sections || []).map((sec) => ({
        ...sec,
        floorNumber: sec.floorNumber ?? 1,
      }));
      
      setLayoutName(layout.name || 'Untitled Layout');
      setSections(secWithFloors);

      // Pick the first floor
      const floors = Array.from(new Set(secWithFloors.map((s) => s.floorNumber || 1))).sort((a, b) => a - b);
      setActiveFloor(floors.length > 0 ? floors[0] : 1);
    } catch (err) {
      console.error('[LayoutEditor] Error loading layout ID=', id, err);
      toastUtils.error('Failed to load layout.');
    } finally {
      setIsLoading(false);
    }
  }

  /** On layout selection from dropdown. */
  function handleSelectLayout(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value);
    if (isNaN(id) || id === 0) {
      // New layout
      setActiveLayoutId(null);
      setLayoutName('New Layout');
      setSections([]);
      setActiveFloor(1);
      return;
    }
    setActiveLayoutId(id);
    loadOneLayout(id);
  }

  /** Recompute bounding box whenever layoutSize or sectionsForActiveFloor changes. */
  useEffect(() => {
    if (layoutSize === 'auto') {
      computeAutoBounds();
    } else {
      const preset = LAYOUT_PRESETS[layoutSize];
      setCanvasWidth(preset.width);
      setCanvasHeight(preset.height);
      setSeatScale(preset.seatScale);
    }
  }, [layoutSize, sectionsForActiveFloor]);

  function computeAutoBounds() {
    if (sectionsForActiveFloor.length === 0) {
      setCanvasWidth(1200);
      setCanvasHeight(800);
      setSeatScale(1.0);
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    sectionsForActiveFloor.forEach((sec) => {
      sec.seats.forEach((seat) => {
        const gx = sec.offsetX + seat.position_x;
        const gy = sec.offsetY + seat.position_y;
        if (gx < minX) minX = gx;
        if (gx > maxX) maxX = gx;
        if (gy < minY) minY = gy;
        if (gy > maxY) maxY = gy;
      });
    });

    // Add some padding
    const padX = 200, padY = 200;
    const width = maxX - minX + padX * 2;
    const height = maxY - minY + padY * 2;

    setCanvasWidth(Math.max(1200, width));
    setCanvasHeight(Math.max(800, height));
    setSeatScale(1.0);
  }

  /** Create a new layout */
  async function handleCreateLayout() {
    try {
      // Ensure we have a valid restaurant context
      if (!restaurantId) {
        console.error('[LayoutEditor] Missing restaurant ID');
        toastUtils.error('Cannot create layout: missing restaurant context');
        return;
      }
      
      // Convert to number for consistent comparison
      const numericRestaurantId = Number(restaurantId);

      const newLayout = {
        name: layoutName,
        restaurant_id: numericRestaurantId,
        sections_data: {
          sections: sections
        }
      };

      setIsLoading(true);
      // Use the standard API call with the restaurant_id included in the layout data
      const response = await createLayout(newLayout);
      const result = response as LayoutData;
      setActiveLayoutId(result.id);
      toastUtils.success('Layout created successfully');
      
      // Reload all layouts to update the dropdown
      await loadAllLayouts();
    } catch (err) {
      console.error('[LayoutEditor] Error creating layout:', err);
      toastUtils.error('Failed to create layout');
    } finally {
      setIsLoading(false);
    }
  }

  /** Update an existing layout */
  async function handleUpdateLayout() {
    if (!activeLayoutId) {
      handleCreateLayout();
      return;
    }

    try {
      // Ensure we have a valid restaurant context
      if (!restaurantId) {
        console.error('[LayoutEditor] Missing restaurant ID');
        toastUtils.error('Cannot update layout: missing restaurant context');
        return;
      }
      
      // Convert to number for consistent comparison
      const numericRestaurantId = Number(restaurantId);
      
      setIsLoading(true);
      // Use the standard API call with the restaurant_id included in the layout data
      await updateLayout(activeLayoutId, {
        name: layoutName,
        restaurant_id: numericRestaurantId,
        sections_data: {
          sections: sections
        }
      });
      toastUtils.success('Layout updated successfully');
    } catch (err) {
      console.error('[LayoutEditor] Error updating layout:', err);
      toastUtils.error('Failed to update layout');
    } finally {
      setIsLoading(false);
    }
  }

  /** Activate a layout */
  async function handleActivateLayout() {
    if (!activeLayoutId) {
      toastUtils.error('Please save the layout before activating it');
      return;
    }

    try {
      // Ensure we have a valid restaurant context
      if (!restaurantId) {
        console.error('[LayoutEditor] Missing restaurant ID');
        toastUtils.error('Cannot activate layout: missing restaurant context');
        return;
      }
      
      setIsLoading(true);
      // Use the standard API call
      await activateLayout(activeLayoutId);
      toastUtils.success('Layout activated successfully');
    } catch (err) {
      console.error('[LayoutEditor] Error activating layout:', err);
      toastUtils.error('Failed to activate layout');
    } finally {
      setIsLoading(false);
    }
  }

  /** Add a new table section */
  function handleAddTable() {
    // Create a new section with default values
    const newSection: SeatSection = {
      id: `new-${Date.now()}`,
      name: `Table ${sections.length + 1}`,
      type: 'table',
      orientation: 'vertical',
      offsetX: 400,
      offsetY: 300,
      floorNumber: activeFloor,
      seats: [
        { id: `seat-${Date.now()}-1` as any, label: 'A1', position_x: 0, position_y: -80, capacity: 1 },
        { id: `seat-${Date.now()}-2` as any, label: 'A2', position_x: 80, position_y: 0, capacity: 1 },
        { id: `seat-${Date.now()}-3` as any, label: 'A3', position_x: 0, position_y: 80, capacity: 1 },
        { id: `seat-${Date.now()}-4` as any, label: 'A4', position_x: -80, position_y: 0, capacity: 1 }
      ]
    };
    
    setSections([...sections, newSection]);
  }

  /** Add a new counter section */
  function handleAddCounter() {
    // Create a new counter section with default values
    const newCounter: SeatSection = {
      id: `new-${Date.now()}`,
      name: `Counter ${sections.length + 1}`,
      type: 'counter',
      orientation: 'horizontal',
      offsetX: 200,
      offsetY: 200,
      floorNumber: activeFloor,
      seats: [
        { id: `seat-${Date.now()}-1` as any, label: 'Seat #1', position_x: 0, position_y: 0, capacity: 1 },
        { id: `seat-${Date.now()}-2` as any, label: 'Seat #2', position_x: 0, position_y: 70, capacity: 1 },
        { id: `seat-${Date.now()}-3` as any, label: 'Seat #3', position_x: 0, position_y: 140, capacity: 1 },
        { id: `seat-${Date.now()}-4` as any, label: 'Seat #4', position_x: 0, position_y: 210, capacity: 1 },
        { id: `seat-${Date.now()}-5` as any, label: 'Seat #5', position_x: 0, position_y: 280, capacity: 1 }
      ]
    };
    
    setSections([...sections, newCounter]);
  }

  /** Toggle edit mode */
  function toggleEditMode() {
    setIsEditMode(!isEditMode);
  }

  /** Adjust zoom level */
  function handleZoomIn() {
    setZoom(Math.min(2.0, zoom + 0.1));
  }

  function handleZoomOut() {
    setZoom(Math.max(0.5, zoom - 0.1));
  }

  function handleZoomReset() {
    setZoom(1.0);
  }

  // Handle drag start for a section
  function handleDragStart(e: React.PointerEvent, sectionId: string) {
    if (!isEditMode) return;
    
    setIsDragging(true);
    setSelectedSection(sectionId);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    // Capture pointer to receive events even when cursor leaves the element
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  
  // Handle drag move
  function handleDragMove(e: React.PointerEvent) {
    if (!isDragging || !selectedSection) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Update the section position
    setSections(prevSections => {
      return prevSections.map(section => {
        if (section.id === selectedSection) {
          return {
            ...section,
            offsetX: section.offsetX + deltaX / zoom,
            offsetY: section.offsetY + deltaY / zoom
          };
        }
        return section;
      });
    });
    
    // Update drag start position
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  }
  
  // Handle drag end
  function handleDragEnd(e: React.PointerEvent) {
    if (!isDragging) return;
    
    setIsDragging(false);
    setSelectedSection(null);
    
    // Release pointer capture
    e.currentTarget.releasePointerCapture(e.pointerId);
  }
  
  // Handle edit section
  function handleEditSection(sectionId: string) {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    setSectionConfig({
      name: section.name,
      type: section.type,
      orientation: section.orientation,
      seatCount: section.seats.length
    });
    setSeatCountText(section.seats.length.toString());
    setSectionFloorText(section.floorNumber?.toString() || '1');
    setSeatCapacityText('1'); // Default capacity
    
    setEditingSectionId(sectionId);
    setShowSectionDialog(true);
  }
  
  // Handle delete section
  function handleDeleteSection(sectionId: string) {
    setSections(prevSections => prevSections.filter(section => section.id !== sectionId));
  }
  
  // Handle save section
  function handleSaveSection() {
    if (!editingSectionId) return;
    
    const seatCount = parseInt(seatCountText) || 4;
    const floorNumber = parseInt(sectionFloorText) || 1;
    const seatCapacity = parseInt(seatCapacityText) || 1;
    
    setSections(prevSections => {
      return prevSections.map(section => {
        if (section.id === editingSectionId) {
          // Generate new seats based on the configuration
          const newSeats = [];
          
          if (sectionConfig.type === 'table') {
            // For tables, arrange seats in a circle
            for (let i = 0; i < seatCount; i++) {
              const angle = (i / seatCount) * 2 * Math.PI;
              const radius = 80;
              
              newSeats.push({
                id: section.seats[i]?.id || (`seat-${Date.now()}-${i}` as any),
                label: `A${i + 1}`,
                position_x: Math.sin(angle) * radius,
                position_y: Math.cos(angle) * radius,
                capacity: seatCapacity
              });
            }
          } else {
            // For counters, arrange seats in a line
            const spacing = 70;
            for (let i = 0; i < seatCount; i++) {
              newSeats.push({
                id: section.seats[i]?.id || (`seat-${Date.now()}-${i}` as any),
                label: `Seat #${i + 1}`,
                position_x: sectionConfig.orientation === 'horizontal' ? i * spacing : 0,
                position_y: sectionConfig.orientation === 'vertical' ? i * spacing : 0,
                capacity: seatCapacity
              });
            }
          }
          
          return {
            ...section,
            name: sectionConfig.name,
            type: sectionConfig.type,
            orientation: sectionConfig.orientation,
            floorNumber,
            seats: newSeats
          };
        }
        return section;
      });
    });
    
    setShowSectionDialog(false);
    setEditingSectionId(null);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">Layout Editor</h2>
          {isLoading && (
            <span className="text-sm text-gray-500 ml-2">Loading...</span>
          )}
        </div>
        
        {/* Layout selection dropdown */}
        <div className="flex-grow mx-4">
          <div className="flex items-center space-x-2">
            <select 
              className="w-full max-w-xs border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/50 focus:border-hafaloha-gold/50"
              value={activeLayoutId || ''}
              onChange={handleSelectLayout}
              disabled={isLoading}
            >
              <option value="">Create New Layout</option>
              {allLayouts.map(layout => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
            
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="Layout Name"
              className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/50 focus:border-hafaloha-gold/50"
              disabled={isLoading}
            />
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            title="New layout"
            onClick={() => {
              setActiveLayoutId(null);
              setLayoutName('New Layout');
              setSections([]);
            }}
            disabled={isLoading}
          >
            <LucidePlus className="h-4 w-4 text-gray-600" />
          </button>
          <button 
            className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            title="Save layout"
            onClick={handleUpdateLayout}
            disabled={isLoading}
          >
            <Save className="h-4 w-4 text-gray-600" />
          </button>
          <button 
            className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            title="Activate layout"
            onClick={handleActivateLayout}
            disabled={isLoading || !activeLayoutId}
          >
            <Power className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Tool controls */}
      <div className="flex items-center space-x-2 mb-4 bg-gray-50 p-2 rounded-md">
        <button 
          className="px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          onClick={handleAddTable}
          disabled={isLoading}
        >
          Add Table
        </button>
        <button 
          className="px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          onClick={handleAddCounter}
          disabled={isLoading}
        >
          Add Counter
        </button>
        <div className="border-l border-gray-300 h-6 mx-2"></div>
        <button 
          className={`px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 ${isEditMode ? 'bg-hafaloha-gold/20' : 'bg-white'}`}
          onClick={toggleEditMode}
          disabled={isLoading}
        >
          Edit
        </button>
        
        {/* Zoom controls */}
        <div className="ml-auto flex items-center space-x-2">
          <button 
            className="p-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            onClick={handleZoomOut}
            disabled={isLoading}
            title="Zoom out"
          >
            <Minus className="h-4 w-4 text-gray-600" />
          </button>
          <button 
            className="p-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            onClick={handleZoomReset}
            disabled={isLoading}
            title="Reset zoom"
          >
            <Maximize className="h-4 w-4 text-gray-600" />
          </button>
          <button 
            className="p-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            onClick={handleZoomIn}
            disabled={isLoading}
            title="Zoom in"
          >
            <LucidePlus className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Layout canvas */}
      <div className="flex-grow bg-white rounded-lg shadow overflow-hidden p-4">
        {/* Floor Tabs */}
        <div className="flex gap-2 mb-4">
          {floorNumbers.map(floorNum => (
            <button
              key={floorNum}
              onClick={() => setActiveFloor(floorNum)}
              className={`
                px-4 py-2 rounded text-sm
                ${floorNum === activeFloor
                  ? 'bg-hafaloha-gold/10 text-hafaloha-gold border border-hafaloha-gold/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-hafaloha-gold/5'
                }
              `}
            >
              Floor {floorNum}
            </button>
          ))}
        </div>
        
        <div 
          className="h-[600px] bg-gray-50 border border-gray-300 rounded-lg overflow-auto"
          style={{
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          <div 
            className="relative"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: '2000px',
              height: '1200px'
            }}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerLeave={handleDragEnd}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500">Loading layout...</p>
              </div>
            ) : sections.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500">No tables or counters added yet</p>
                  <p className="text-sm text-gray-400 mt-2">Use the controls above to add tables and counters</p>
                </div>
              </div>
            ) : (
              <>
                {/* Render sections for active floor */}
                {sectionsForActiveFloor.map((section) => {
                  const TABLE_DIAMETER = 120;
                  const TABLE_OFFSET_Y = 0;
                  
                  return (
                    <div
                      key={section.id}
                      style={{
                        position: 'absolute',
                        left: section.offsetX,
                        top: section.offsetY,
                        cursor: isEditMode ? 'move' : 'default',
                      }}
                    >
                      {/* Table circle if type="table" */}
                      {section.type === 'table' && (
                        <div
                          style={{
                            position: 'absolute',
                            width: TABLE_DIAMETER,
                            height: TABLE_DIAMETER,
                            borderRadius: '50%',
                            backgroundColor: '#aaa',
                            opacity: 0.7,
                            top: -(TABLE_DIAMETER / 2) + TABLE_OFFSET_Y,
                            left: -(TABLE_DIAMETER / 2),
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 600 }}>
                            {section.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Section header with name */}
                      <div
                        className="bg-white/80 rounded px-2 py-1 shadow flex items-center justify-between"
                        style={{
                          position: 'relative',
                          zIndex: 999,
                          cursor: 'default',
                          marginBottom: 4,
                        }}
                      >
                        <span className="font-medium text-sm text-gray-700 mr-2">
                          {section.name}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleEditSection(section.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-gray-500" />
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleDeleteSection(section.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Seats */}
                      <div style={{ position: 'relative' }}>
                        {section.seats.map((seat, idx) => {
                          const diameter = 64;
                          const leftPos = seat.position_x - diameter / 2;
                          const topPos = seat.position_y - diameter / 2 - TABLE_OFFSET_Y;

                          return (
                            <div
                              key={seat.id ?? `temp-${section.id}-${idx}`}
                              style={{
                                position: 'absolute',
                                left: leftPos,
                                top: topPos,
                                width: diameter,
                                height: diameter,
                                zIndex: 2,
                              }}
                              className="
                                rounded-full flex items-center justify-center cursor-pointer
                                shadow-md text-white font-semibold text-sm
                                bg-green-500 hover:opacity-90
                              "
                            >
                              {seat.label ?? 'Seat'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Rename Seats Modal */}
      {renameModalOpen && (
        <RenameSeatsModal
          onClose={() => setRenameModalOpen(false)}
          seats={renameModalSeats}
          sectionName={renameModalSectionName}
          onSave={(updatedSeats) => {
            // Implementation will be added in the next phase
            setRenameModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default LayoutEditor;
