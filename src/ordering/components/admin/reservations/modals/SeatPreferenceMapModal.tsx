// src/ordering/components/admin/reservations/modals/SeatPreferenceMapModal.tsx

import { useEffect, useState } from 'react';
import { X, Minus, Plus, Maximize, Settings } from 'lucide-react';
import { validateRestaurantContext } from '../../../../../shared/utils/tenantUtils';
import toastUtils from '../../../../../shared/utils/toastUtils';
import SeatLayoutCanvas, { DBSeat, SeatSectionData } from './SeatLayoutCanvas';

// Import API endpoints will be added when needed
// import { /* API endpoints */ } from '../../../../../shared/api/endpoints/reservations';

interface SeatPreferenceMapModalProps {
  /** The sections data containing seats and their positions */
  sections: (SeatSectionData & { floor_number?: number })[];

  /** 
   * Initial selection of seat preferences (up to 3 sets)
   * e.g. [ ["Seat #1","Seat #2"], ["A1","A2"], [] ]
   */
  initialSelection?: string[][];

  /** Called when user selects seats and clicks Save */
  onSelect: (preferences: string[][]) => void;

  /** Called when user clicks Cancel */
  onClose: () => void;
}

export default function SeatPreferenceMapModal({
  sections,
  initialSelection = [[], [], []],
  onSelect,
  onClose
}: SeatPreferenceMapModalProps) {
  // Tenant validation
  const [error, setError] = useState<string | null>(null);
  const validationResult = validateRestaurantContext();
  const tenantError = typeof validationResult === 'object' ? validationResult.error : 'Invalid restaurant context';
  
  // State for seat allocations and loading status
  const [seatAllocations] = useState<Record<number, { status: string; name?: string }>>({});
  // Not using loading state for now since we're not fetching data
  const [loading] = useState(false);

  // Floor management
  const floorNumbers = Array.from(
    new Set(sections.map((s) => s.floor_number ?? 1))
  ).sort((a, b) => a - b);
  const [activeFloor, setActiveFloor] = useState(floorNumbers[0] || 1);

  // Zoom and grid controls
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);

  // Seat preference management
  const [seatPreferences, setSeatPreferences] = useState<string[][]>([...initialSelection]);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);

  // Handle tenant validation error
  useEffect(() => {
    if (tenantError) {
      setError(tenantError);
      toastUtils.error(`Error: ${tenantError}`);
    }
  }, [tenantError]);

  // Filter sections by active floor
  const sectionsForActiveFloor = sections.filter(
    (s) => (s.floor_number ?? 1) === activeFloor
  );

  // Build display sections with occupancy status and selection
  const displaySections = sectionsForActiveFloor.map((sec) => {
    const mappedSeats = sec.seats.map((seat) => {
      const occupant = seatAllocations[seat.id];
      const occupant_status = occupant ? occupant.status : 'free';

      // Highlight seats that are in the current preference set
      const currentSet = seatPreferences[activeOptionIndex] || [];
      const isSelected = currentSet.includes(seat.label);

      return { ...seat, occupant_status, isSelected };
    });
    return { ...sec, seats: mappedSeats };
  });

  // Handle seat click - toggle seat selection
  function handleSeatClick(seat: DBSeat) {
    const occupant = seatAllocations[seat.id];
    const occupantStatus = occupant ? occupant.status : 'free';
    
    if (occupantStatus !== 'free') {
      toastUtils.error(`Seat "${seat.label}" is currently ${occupantStatus}.`);
      return;
    }

    setSeatPreferences((prev) => {
      const clone = [...prev];
      const currentSet = clone[activeOptionIndex] || [];

      // If seat is already in the set => remove it
      if (currentSet.includes(seat.label)) {
        clone[activeOptionIndex] = currentSet.filter((lbl) => lbl !== seat.label);
        return clone;
      }
      
      // Otherwise add it (no party size limit in this simplified version)
      clone[activeOptionIndex] = [...currentSet, seat.label];
      return clone;
    });
  }

  // Switch active floor
  function handleFloorTabClick(floorNum: number) {
    setActiveFloor(floorNum);
  }

  // Switch between preference options
  function handleOptionTabClick(idx: number) {
    setActiveOptionIndex(idx);
    setSeatPreferences((prev) => {
      const clone = [...prev];
      if (!clone[idx]) clone[idx] = [];
      return clone;
    });
  }

  // Zoom controls
  function zoomIn() {
    setZoom((z) => Math.min(z + 0.25, 5.0));
  }
  
  function zoomOut() {
    setZoom((z) => Math.max(z - 0.25, 0.25));
  }
  
  function zoomReset() {
    setZoom(1.0);
  }

  // Handle Save - pass preferences back to parent
  function handleSave() {
    onSelect(seatPreferences);
  }

  // Error display
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h2 className="text-red-600 text-xl font-bold mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <p className="text-gray-700">Loading seat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-5xl rounded-lg shadow-lg p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-2 text-gray-900">
          Select Seat Preferences
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Pick up to 3 seat‐preference options for the customer.
          <br />
          Occupied/reserved seats are shown in red/yellow.
        </p>

        {/* Option Tabs */}
        <div className="flex items-center space-x-2 mb-4">
          {[0, 1, 2].map((idx) => {
            const isActive = activeOptionIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => handleOptionTabClick(idx)}
                className={`
                  px-3 py-1 rounded
                  ${isActive 
                    ? 'border border-gold bg-gold/10 text-gold' 
                    : 'bg-gray-100 hover:bg-gray-200'
                  }
                `}
              >
                Option {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Floor Tabs (if multiple floors) */}
        {floorNumbers.length > 1 && (
          <div className="flex items-center space-x-2 mb-4">
            {floorNumbers.map((floorNum) => {
              const isActive = activeFloor === floorNum;
              return (
                <button
                  key={floorNum}
                  onClick={() => handleFloorTabClick(floorNum)}
                  className={`
                    px-3 py-1 rounded
                    ${isActive 
                      ? 'border border-gold bg-gold/10 text-gold' 
                      : 'bg-gray-100 hover:bg-gray-200'
                    }
                  `}
                >
                  Floor {floorNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Zoom & Grid Controls */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`
              px-2 py-1 text-sm rounded border
              ${showGrid
                ? 'border-gold bg-gold/10 text-gold'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <Settings className="inline w-4 h-4 mr-1" />
            Grid
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              className="p-1 bg-gray-100 rounded hover:bg-gray-200"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button
              onClick={zoomIn}
              className="p-1 bg-gray-100 rounded hover:bg-gray-200"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={zoomReset}
              className="p-1 bg-gray-100 rounded hover:bg-gray-200"
              title="Reset Zoom"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Seat Map Canvas */}
        <div
          className="border border-gray-200 rounded mb-4"
          style={{ height: '60vh', minHeight: '400px' }}
        >
          {sectionsForActiveFloor.length === 0 ? (
            <div className="p-4 text-gray-500">
              No sections found for this floor.
            </div>
          ) : (
            <SeatLayoutCanvas
              width={2000}
              height={1200}
              zoom={zoom}
              showGrid={showGrid}
              sections={displaySections}
              onSeatClick={(seat) => handleSeatClick(seat)}
              onSectionDrag={undefined}
            />
          )}
        </div>

        {/* Summary of the 3 seat preference options */}
        <div className="border-t border-gray-200 pt-3 text-sm">
          {seatPreferences.map((arr, idx) => (
            <div key={idx} className="mb-1">
              <strong>Option {idx + 1}:</strong>{' '}
              {arr.length ? arr.join(', ') : '(none)'}
            </div>
          ))}
        </div>

        {/* Footer Buttons */}
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gold hover:bg-amber-600 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
