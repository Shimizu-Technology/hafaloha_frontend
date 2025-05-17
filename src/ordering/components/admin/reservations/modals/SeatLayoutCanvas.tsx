// src/ordering/components/admin/reservations/modals/SeatLayoutCanvas.tsx

import React, { useState } from 'react';

export interface DBSeat {
  id: number;
  label: string;
  position_x: number;
  position_y: number;
  capacity?: number;
  occupant_status?: string;  // "free","reserved","occupied","seated", etc.
  occupant_name?: string;    // e.g. "John" or "John Smith"
  isSelected?: boolean;      // wizard highlight
}

export interface SeatSectionData {
  id: number | string;
  name: string;
  section_type: 'table' | 'counter';
  offset_x: number;
  offset_y: number;
  seats: DBSeat[];
}

interface DragState {
  isDragging: boolean;
  sectionId: string | number | null;
  startX: number;
  startY: number;
}

export interface SeatLayoutCanvasProps {
  width: number;
  height: number;
  zoom: number;
  showGrid?: boolean;
  sections: SeatSectionData[];

  onSeatClick?: (seat: DBSeat, section?: SeatSectionData) => void;
  onSectionDrag?: (sectionId: number | string, dx: number, dy: number) => void;

  tableDiameter?: number; // default 80
  seatDiameter?: number;  // default 64
}

const DEFAULT_TABLE_DIAMETER = 80;
const DEFAULT_SEAT_DIAMETER  = 64;
const TABLE_OFFSET_Y         = 0;

export default function SeatLayoutCanvas({
  width,
  height,
  zoom,
  showGrid = true,
  sections,
  onSeatClick,
  onSectionDrag,
  tableDiameter = DEFAULT_TABLE_DIAMETER,
  seatDiameter = DEFAULT_SEAT_DIAMETER,
}: SeatLayoutCanvasProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sectionId: null,
    startX: 0,
    startY: 0,
  });

  // Grid size for the pattern
  const gridSize = 10;

  // Helper to get color for seat based on occupancy status
  function getSeatColor(seat: DBSeat) {
    if (seat.isSelected) return '#f06c96'; // highlight selected seats
    
    switch (seat.occupant_status) {
      case 'reserved':
        return '#fcd34d'; // reserved = yellow
      case 'seated':
      case 'occupied':
        return '#ef4444'; // occupied = red
      default:
        return '#10b981'; // free = green
    }
  }

  // Handle seat click events
  function handleSeatClick(seat: DBSeat, section: SeatSectionData) {
    if (onSeatClick) {
      onSeatClick(seat, section);
    }
  }

  // Handle section dragging (if enabled)
  function handleSectionMouseDown(e: React.MouseEvent, section: SeatSectionData) {
    if (!onSectionDrag) return; // Not draggable if no handler
    
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    setDragState({
      isDragging: true,
      sectionId: section.id,
      startX,
      startY,
    });
  }

  function handleSectionMouseMove(e: React.MouseEvent) {
    if (!dragState.isDragging || !onSectionDrag) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const dx = (currentX - dragState.startX) / zoom;
    const dy = (currentY - dragState.startY) / zoom;
    
    onSectionDrag(dragState.sectionId!, dx, dy);
    
    setDragState({
      ...dragState,
      startX: currentX,
      startY: currentY,
    });
  }

  function handleSectionMouseUp() {
    setDragState({
      isDragging: false,
      sectionId: null,
      startX: 0,
      startY: 0,
    });
  }

  return (
    <div
      className="relative overflow-auto bg-white"
      style={{ width: '100%', height: '100%' }}
      onMouseMove={handleSectionMouseMove}
      onMouseUp={handleSectionMouseUp}
      onMouseLeave={handleSectionMouseUp}
    >
      <div
        className="relative"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Grid (optional) */}
        {showGrid && (
          <svg
            width={width}
            height={height}
            className="absolute top-0 left-0 pointer-events-none"
          >
            <defs>
              <pattern
                id="grid"
                width={gridSize}
                height={gridSize}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke="#f0f0f0"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#grid)"
            />
          </svg>
        )}

        {/* Sections with tables and seats */}
        {sections.map((section) => (
          <div
            key={section.id}
            className="absolute"
            style={{
              left: section.offset_x,
              top: section.offset_y + TABLE_OFFSET_Y,
              cursor: onSectionDrag ? 'move' : 'default',
            }}
            onMouseDown={(e) => handleSectionMouseDown(e, section)}
          >
            {/* Table or counter background */}
            <div
              className="absolute rounded-full bg-gray-200 border border-gray-300"
              style={{
                width: `${tableDiameter}px`,
                height: section.section_type === 'table' ? `${tableDiameter}px` : '10px',
                transform: 'translate(-50%, -50%)',
              }}
            />

            {/* Section label */}
            <div
              className="absolute text-xs font-medium text-center text-gray-500"
              style={{
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
              }}
            >
              {section.name}
            </div>

            {/* Seats */}
            {section.seats.map((seat) => (
              <div
                key={seat.id}
                className={`absolute rounded-full flex items-center justify-center 
                           cursor-pointer border border-gray-400 shadow-sm
                           ${seat.isSelected ? 'ring-2 ring-offset-2 ring-hafaloha-pink' : ''}`}
                style={{
                  left: seat.position_x,
                  top: seat.position_y,
                  width: `${seatDiameter}px`,
                  height: `${seatDiameter}px`,
                  backgroundColor: getSeatColor(seat),
                  color: '#ffffff',
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={() => handleSeatClick(seat, section)}
                title={`${seat.label}${seat.occupant_status !== 'free' ? ` (${seat.occupant_status})` : ''}`}
              >
                <span className="text-xs font-bold">{seat.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
