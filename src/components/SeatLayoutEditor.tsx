import React, { useEffect, useState } from 'react';
import {
  Save, Trash2, Plus as LucidePlus, Settings, Edit2,
  Minus, Maximize, Power
} from 'lucide-react';

// Imagine these are your API helpers:
import {
  fetchAllLayouts,
  createLayout,
  updateLayout,
  activateLayout,
} from '../services/api';

import RenameSeatsModal from './RenameSeatsModal';

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
  id: string;          // e.g. "section-1" or DB ID as a string
  dbId?: number;
  name: string;        // "Table A" etc.
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
  offsetX: number;     // The group's absolute position on canvas
  offsetY: number;
  seats: DBSeat[];
}

interface DBSeat {
  id?: number;
  label?: string;
  position_x: number;   // x of the seat center, relative to the table center
  position_y: number;   // y of the seat center, relative to the table center
  capacity: number;
}

interface SectionConfig {
  name: string;
  seatCount: number;
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
}

/** Predefined layout sizes or "auto" bounding. */
const LAYOUT_PRESETS = {
  auto:   { width: 0,    height: 0,    seatScale: 1.0 },
  small:  { width: 1200, height: 800,  seatScale: 1.0 },
  medium: { width: 2000, height: 1200, seatScale: 1.0 },
  large:  { width: 3000, height: 1800, seatScale: 1.0 },
};

export default function SeatLayoutEditor() {
  const [allLayouts, setAllLayouts] = useState<LayoutData[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<number | null>(null);
  const [layoutName, setLayoutName] = useState('New Layout');
  const [sections, setSections] = useState<SeatSection[]>([]);

  // Canvas sizing
  const [layoutSize, setLayoutSize] = useState<'auto'|'small'|'medium'|'large'>('medium');
  const [canvasWidth,  setCanvasWidth]  = useState(2000);
  const [canvasHeight, setCanvasHeight] = useState(1200);
  const [seatScale,    setSeatScale]    = useState(1.0);
  const [zoom,         setZoom]         = useState(1.0);
  const [showGrid,     setShowGrid]     = useState(true);

  // Dragging an entire table/section
  const [isDragging, setIsDragging]           = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragStart, setDragStart]             = useState<{ x: number; y: number } | null>(null);

  // Add/Edit Section dialog
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSectionId, setEditingSectionId]   = useState<string | null>(null);
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    name: '',
    seatCount: 4,
    type: 'counter',
    orientation: 'vertical',
  });
  const [seatCapacity, setSeatCapacity] = useState(1);

  // For the rename seats modal
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameModalSeats, setRenameModalSeats] = useState<DBSeat[]>([]);
  const [renameModalSectionName, setRenameModalSectionName] = useState('');

  // Constants for table & seat geometry
  const TABLE_DIAMETER    = 80;    // px
  const TABLE_RADIUS      = TABLE_DIAMETER / 2;  // 40
  const TABLE_OFFSET_Y    = 15;    // shift the table circle downward by 10 px
  const SEAT_DIAMETER     = 64;    // px
  const SEAT_RADIUS       = SEAT_DIAMETER / 2;   // 32
  const SEAT_MARGIN       = 10;    // extra spacing so seats don't collide with table

  /** On mount => load all layouts, pick the first if available. */
  useEffect(() => {
    (async () => {
      try {
        const layouts = await fetchAllLayouts();
        setAllLayouts(layouts);

        if (layouts.length > 0) {
          const first = layouts[0];
          setActiveLayoutId(first.id);
          setLayoutName(first.name || 'Untitled Layout');
          setSections(first.sections_data.sections || []);
        }
      } catch (err) {
        console.error('Error loading layouts:', err);
      }
    })();
  }, []);

  /** Re-compute bounding box or set preset if layoutSize changes. */
  useEffect(() => {
    if (layoutSize === 'auto') {
      computeAutoBounds();
    } else {
      const preset = LAYOUT_PRESETS[layoutSize];
      setCanvasWidth(preset.width);
      setCanvasHeight(preset.height);
      setSeatScale(preset.seatScale);
    }
  }, [layoutSize, sections]);

  /** Auto-size the canvas to contain all seats/tables. */
  function computeAutoBounds() {
    if (sections.length === 0) {
      setCanvasWidth(1200);
      setCanvasHeight(800);
      setSeatScale(1.0);
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    sections.forEach(sec => {
      sec.seats.forEach(seat => {
        const gx = sec.offsetX + seat.position_x;
        const gy = sec.offsetY + seat.position_y;
        if (gx < minX) minX = gx;
        if (gx > maxX) maxX = gx;
        if (gy < minY) minY = gy;
        if (gy > maxY) maxY = gy;
      });
      // Also account for the table circle
      const tableLeft   = sec.offsetX - TABLE_RADIUS;
      const tableRight  = sec.offsetX + TABLE_RADIUS;
      const tableTop    = sec.offsetY - TABLE_RADIUS;
      const tableBottom = sec.offsetY + TABLE_RADIUS;
      if (tableLeft   < minX) minX = tableLeft;
      if (tableRight  > maxX) maxX = tableRight;
      if (tableTop    < minY) minY = tableTop;
      if (tableBottom > maxY) maxY = tableBottom;
    });

    const margin = 200;
    const width  = maxX - minX + margin;
    const height = maxY - minY + margin;
    setCanvasWidth(Math.max(width, 800));
    setCanvasHeight(Math.max(height, 600));
    setSeatScale(1.0);
  }

  function handleSelectLayout(id: number) {
    if (id === 0) {
      // means "New Layout"
      setActiveLayoutId(null);
      setLayoutName('New Layout');
      setSections([]);
      return;
    }
    setActiveLayoutId(id);

    const found = allLayouts.find(l => l.id === id);
    if (found) {
      setLayoutName(found.name || 'Untitled Layout');
      setSections(found.sections_data.sections || []);
    }
  }

  // ---------------- Drag seat sections around the canvas ----------------
  function handleDragStart(e: React.MouseEvent, sectionId: string) {
    e.stopPropagation();
    setIsDragging(true);
    setSelectedSection(sectionId);
    setDragStart({ x: e.clientX, y: e.clientY });
  }

  function handleDragMove(e: React.MouseEvent) {
    if (!isDragging || !dragStart || !selectedSection) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setSections(prev =>
      prev.map(sec => {
        if (sec.id !== selectedSection) return sec;
        return {
          ...sec,
          offsetX: sec.offsetX + dx,
          offsetY: sec.offsetY + dy,
        };
      })
    );
    setDragStart({ x: e.clientX, y: e.clientY });
  }

  function handleDragEnd() {
    setIsDragging(false);
    setSelectedSection(null);
    setDragStart(null);
  }

  // ---------------- Add/Edit seat sections ----------------
  function handleAddSection() {
    setEditingSectionId(null);
    setSectionConfig({
      name: `New Table ${sections.length + 1}`,
      seatCount: 4,
      type: 'table',
      orientation: 'horizontal',
    });
    setSeatCapacity(1);
    setShowSectionDialog(true);
  }

  function handleEditSectionClick(sectionId: string) {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return;

    setEditingSectionId(sectionId);
    setSectionConfig({
      name: sec.name,
      seatCount: sec.seats.length,
      type: sec.type,
      orientation: sec.orientation,
    });
    if (sec.seats.length > 0) {
      setSeatCapacity(sec.seats[0].capacity);
    } else {
      setSeatCapacity(1);
    }
    setShowSectionDialog(true);
  }

  function deleteSection(sectionId: string) {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  }

  /**
   * Creates or updates a seat section.
   * For "table": place seats on a circle around (0,0),
   * with an angle offset so seat #1 is top-centered (-π/2).
   */
  function createOrEditSection() {
    if (editingSectionId) {
      // ----- Updating existing section -----
      const oldSection = sections.find(s => s.id === editingSectionId);
      if (!oldSection) {
        setShowSectionDialog(false);
        return;
      }
      const oldCount = oldSection.seats.length;
      const newCount = sectionConfig.seatCount;

      // Update the basic info
      setSections(prev =>
        prev.map(sec => {
          if (sec.id !== editingSectionId) return sec;
          return {
            ...sec,
            name: sectionConfig.name,
            type: sectionConfig.type,
            orientation: sectionConfig.orientation,
          };
        })
      );

      // If it's a table and seatCount changed, re-layout seats
      if (sectionConfig.type === 'table' && newCount !== oldCount) {
        const newSeats = layoutTableSeats(newCount, seatCapacity);
        setSections(prev =>
          prev.map(sec => {
            if (sec.id !== editingSectionId) return sec;
            return { ...sec, seats: newSeats };
          })
        );
      }
      // If it’s a counter, or seatCount unchanged, do nothing more
    } else {
      // ----- Creating a brand new section -----
      const newSectionId = `section-${sections.length + 1}`;
      let newSeats: DBSeat[] = [];

      if (sectionConfig.type === 'table') {
        newSeats = layoutTableSeats(sectionConfig.seatCount, seatCapacity);
      } else {
        // For "counter," do a linear approach
        newSeats = layoutCounterSeats(
          sectionConfig.seatCount,
          sectionConfig.orientation,
          seatCapacity
        );
      }

      const newSection: SeatSection = {
        id: newSectionId,
        name: sectionConfig.name,
        type: sectionConfig.type,
        orientation: sectionConfig.orientation,
        offsetX: 100,
        offsetY: 100,
        seats: newSeats,
      };
      setSections(prev => [...prev, newSection]);
    }

    setShowSectionDialog(false);
  }

  /** Layout seats in a circle around (0,0), seat #1 at top. */
  function layoutTableSeats(seatCount: number, capacity: number): DBSeat[] {
    const angleStep   = (2 * Math.PI) / seatCount;
    const angleOffset = -Math.PI / 2;  // seat #1 top-center

    // radius = tableRadius + seatRadius + margin
    // e.g., 40 + 32 + 10 => ~82
    const radius = TABLE_RADIUS + SEAT_RADIUS + SEAT_MARGIN;

    const seats: DBSeat[] = [];
    for (let i = 0; i < seatCount; i++) {
      const angle = angleOffset + i * angleStep;
      const x = Math.round(radius * Math.cos(angle));
      const y = Math.round(radius * Math.sin(angle));

      seats.push({
        label: `Seat #${i + 1}`,
        position_x: x,
        position_y: y,
        capacity,
      });
    }
    return seats;
  }

  /** Layout seats in a linear "counter" style. */
  function layoutCounterSeats(
    seatCount: number,
    orientation: 'vertical' | 'horizontal',
    capacity: number
  ): DBSeat[] {
    const seats: DBSeat[] = [];
    const spacing = 70;
    for (let i = 0; i < seatCount; i++) {
      let posX = 0, posY = 0;
      if (orientation === 'vertical') {
        posY = i * spacing;
      } else {
        posX = i * spacing;
      }
      seats.push({
        label: `Seat #${i + 1}`,
        position_x: posX,
        position_y: posY,
        capacity,
      });
    }
    return seats;
  }

  /** Saves the layout (create or update). */
  async function handleSaveLayout() {
    try {
      const payload = {
        name: layoutName,
        sections_data: { sections },
      };

      if (activeLayoutId) {
        // PATCH existing layout
        const updatedLayout = await updateLayout(activeLayoutId, payload);
        alert('Layout updated successfully!');
        setLayoutName(updatedLayout.name);
        setSections(updatedLayout.sections_data.sections || []);
      } else {
        // POST new layout
        const newLayout = await createLayout(payload);
        alert('Layout created!');
        setAllLayouts(prev => [...prev, newLayout]);
        setActiveLayoutId(newLayout.id);
        setLayoutName(newLayout.name);
        setSections(newLayout.sections_data.sections || []);
      }
    } catch (err) {
      console.error('Error saving layout:', err);
      alert('Failed to save layout—check console.');
    }
  }

  /** Activates the current layout. */
  async function handleActivateLayout() {
    if (!activeLayoutId) {
      alert('Cannot activate a layout that is not saved yet!');
      return;
    }
    try {
      const resp = await activateLayout(activeLayoutId);
      alert(resp.message || 'Layout activated.');
    } catch (err) {
      console.error('Error activating layout:', err);
      alert('Failed to activate layout—check console.');
    }
  }

  /** Rename seats in a particular section. */
  function handleOpenRenameModal(sectionId: string) {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return;
    setRenameModalOpen(true);
    setRenameModalSeats([...sec.seats]); // copy array
    setRenameModalSectionName(sec.name);
  }
  function handleCloseRenameModal() {
    setRenameModalOpen(false);
    setRenameModalSeats([]);
    setRenameModalSectionName('');
  }
  function handleRenameModalSave(updatedSeats: DBSeat[]) {
    setSections(prev =>
      prev.map(sec => {
        if (sec.name === renameModalSectionName) {
          return {
            ...sec,
            seats: updatedSeats,
          };
        }
        return sec;
      })
    );
    setRenameModalOpen(false);
    setRenameModalSeats([]);
    setRenameModalSectionName('');
  }

  // Zoom controls
  function handleZoomIn() {
    setZoom(z => Math.min(z + 0.25, 5.0));
  }
  function handleZoomOut() {
    setZoom(z => Math.max(z - 0.25, 0.2));
  }
  function handleZoomReset() {
    setZoom(1.0);
  }

  return (
    <div className="relative px-4 pb-6">
      {/* ---------- Top Controls ---------- */}
      <div className="mb-4 flex items-center space-x-4">
        {/* Layout dropdown */}
        <div>
          <label className="mr-2 text-sm font-semibold">Choose Layout:</label>
          <select
            value={activeLayoutId ?? 0}
            onChange={e => handleSelectLayout(Number(e.target.value))}
            className="border border-gray-300 rounded p-1"
          >
            <option value={0}>(New Layout)</option>
            {allLayouts.map(lyt => (
              <option key={lyt.id} value={lyt.id}>
                {lyt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Layout name */}
        <input
          type="text"
          value={layoutName}
          onChange={e => setLayoutName(e.target.value)}
          className="border border-gray-300 rounded p-1"
          placeholder="Layout Name"
        />

        {/* Layout size */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Layout Size:</label>
          <select
            value={layoutSize}
            onChange={e => setLayoutSize(e.target.value as 'auto'|'small'|'medium'|'large')}
            className="px-2 py-1 border border-gray-300 rounded"
          >
            <option value="auto">Auto</option>
            <option value="small">Small (1200×800)</option>
            <option value="medium">Medium (2000×1200)</option>
            <option value="large">Large (3000×1800)</option>
          </select>
        </div>

        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-2 rounded ${
            showGrid ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Settings className="inline w-4 h-4 mr-1" />
          Grid
        </button>

        {/* Zoom controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom In"
          >
            <LucidePlus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomReset}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Reset Zoom"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* Save layout */}
        <button
          onClick={handleSaveLayout}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center"
        >
          <Save className="w-4 h-4 mr-1" />
          Save Layout
        </button>

        {/* Activate layout (only if layout is saved) */}
        {activeLayoutId && (
          <button
            onClick={handleActivateLayout}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <Power className="w-4 h-4 mr-1" />
            Activate Layout
          </button>
        )}
      </div>

      {/* ---------- The main canvas ---------- */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: '80vh', minHeight: '600px' }}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            position: 'relative',
            backgroundImage: showGrid
              ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)'
              : 'none',
            backgroundSize: '20px 20px',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {sections.map(section => (
            <div
              key={section.id}
              style={{
                position: 'absolute',
                left: section.offsetX,
                top:  section.offsetY,
                cursor: 'move',
              }}
              onMouseDown={e => handleDragStart(e, section.id)}
            >
              {section.type === 'table' && (
                <div
                  style={{
                    position: 'absolute',
                    width:  TABLE_DIAMETER,
                    height: TABLE_DIAMETER,
                    borderRadius: '50%',
                    backgroundColor: '#aaa',
                    opacity: 0.7,
                    // We used to do: top: -TABLE_RADIUS
                    // Now we nudge the table down by TABLE_OFFSET_Y
                    top:  -TABLE_RADIUS + TABLE_OFFSET_Y,
                    left: -TABLE_RADIUS,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,  // behind seat circles
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {section.name}
                  </span>
                </div>
              )}

              {/* The small bar with edit/delete icons */}
              <div
                className="mb-1 flex items-center justify-between bg-white/80 rounded px-2 py-1 shadow"
                style={{ position: 'relative', zIndex: 2, cursor: 'default' }}
              >
                <span className="font-medium text-sm text-gray-700">
                  {section.name}
                  {section.dbId ? ` (ID ${section.dbId})` : ''}
                </span>
                <div className="flex items-center space-x-1">
                  {/* Edit button */}
                  <button
                    onClick={ev => {
                      ev.stopPropagation();
                      handleEditSectionClick(section.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="w-3 h-3 text-gray-500" />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={ev => {
                      ev.stopPropagation();
                      deleteSection(section.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Render the seats */}
              <div style={{ position: 'relative' }}>
                {section.seats.map((seat, idx) => {
                  // seat.position_x, seat.position_y is the seat's center around (0,0)
                  // We shift by half the seat diameter so it centers properly
                  const diameter = SEAT_DIAMETER * seatScale;
                  const leftPos  = seat.position_x - diameter / 2;
                  // Subtract TABLE_OFFSET_Y so seats appear slightly above the table circle
                  const topPos   = seat.position_y - diameter / 2 - TABLE_OFFSET_Y;

                  return (
                    <div
                      key={seat.id ?? `temp-${section.id}-${idx}`}
                      style={{
                        position: 'absolute',
                        left: leftPos,
                        top:  topPos,
                        width: diameter,
                        height: diameter,
                        zIndex: 2,
                      }}
                      className="
                        rounded-full flex items-center justify-center cursor-pointer
                        shadow-md text-white font-semibold text-sm
                        bg-green-500 hover:opacity-90
                      "
                      onClick={() => console.log('Clicked seat:', seat.label)}
                    >
                      {seat.label ?? 'Seat'}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add section button */}
      <button
        onClick={handleAddSection}
        className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-lg mt-4"
      >
        <LucidePlus className="w-4 h-4 mr-2" />
        Add Table
      </button>

      {/* ---------- Dialog: Add/Edit Section ---------- */}
      {showSectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 relative">
            <button
              onClick={() => setShowSectionDialog(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-4">
              {editingSectionId ? 'Edit Section' : 'Add Section'}
            </h3>
            <div className="space-y-4">
              {/* Section Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Name
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={sectionConfig.name}
                  onChange={e => setSectionConfig(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Seat Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Seats
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={sectionConfig.seatCount}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setSectionConfig(prev => ({ ...prev, seatCount: val }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              {/* Section Type => "counter" or "table" */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Type
                </label>
                <select
                  value={sectionConfig.type}
                  onChange={e => setSectionConfig(prev => ({
                    ...prev,
                    type: e.target.value as 'counter'|'table',
                  }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="counter">Counter</option>
                  <option value="table">Table</option>
                </select>
              </div>

              {/* Orientation (if "counter") */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orientation
                </label>
                <select
                  value={sectionConfig.orientation}
                  onChange={e => setSectionConfig(prev => ({
                    ...prev,
                    orientation: e.target.value as 'vertical'|'horizontal',
                  }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </div>

              {/* Seat Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seat Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  value={seatCapacity}
                  onChange={e => setSeatCapacity(Number(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  e.g. 1 for a barstool, 4 for a single table seat, etc.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {editingSectionId &&
                sections.find(s => s.id === editingSectionId)?.seats.length ? (
                <button
                  onClick={() => {
                    handleOpenRenameModal(editingSectionId!);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Rename Seats
                </button>
              ) : null}

              <button
                onClick={() => setShowSectionDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={createOrEditSection}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                {editingSectionId ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Rename seats modal ---------- */}
      {renameModalOpen && (
        <RenameSeatsModal
          sectionName={renameModalSectionName}
          seats={renameModalSeats}
          onClose={handleCloseRenameModal}
          onSave={handleRenameModalSave}
        />
      )}
    </div>
  );
}
