// src/components/SeatPreferenceMapModal.tsx

import React, { useEffect, useState } from 'react';
import { X, Minus, Plus, Maximize, Settings } from 'lucide-react';

import SeatLayoutCanvas, {
  DBSeat,
  SeatSectionData,
} from './SeatLayoutCanvas';

import { fetchSeatAllocations } from '../services/api';

interface SeatPreferenceMapModalProps {
  /** The date we’re booking, e.g. "2025-01-25". */
  date: string;
  /** Time in "HH:mm" for occupant checks, if you want. Optional. */
  time?: string;
  /** Duration in minutes, if you want occupant checks for that timeslot. Optional. */
  duration?: number;

  /**
   * The overall seat layout, including floor_number in each section.
   * We'll separate them by floor in the UI.
   */
  sections: (SeatSectionData & { floor_number?: number })[];

  /**
   * Up to 3 seat‐preference sets if editing an existing reservation.
   * e.g. [ ["Seat #1","Seat #2"], ["A1","A2"], [] ]
   */
  initialPreferences?: string[][];

  /**
   * The party size => limit each preference set to that many seats.
   */
  partySize: number;

  /** Called when staff hits "Save." We pass back all 3 sets. */
  onSave: (preferences: string[][]) => void;

  /** Called when staff hits "Cancel" or outside the modal. */
  onClose: () => void;
}

export default function SeatPreferenceMapModal({
  date,
  time,
  duration = 60,
  sections,
  initialPreferences = [[], [], []],
  partySize,
  onSave,
  onClose,
}: SeatPreferenceMapModalProps) {
  // occupant data => seatId => occupantStatus + occupantName
  const [seatAllocations, setSeatAllocations] = useState<Record<number, { status: string; name?: string }>>({});
  const [loading, setLoading] = useState(true);

  // Collect floors from the “floor_number”
  const floorNumbers = Array.from(new Set(sections.map(s => s.floor_number ?? 1))).sort((a, b) => a - b);
  const [activeFloor, setActiveFloor] = useState(floorNumbers[0] || 1);

  // Zoom / grid
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);

  // seatPreferences => up to 3 sets => seatPreferences[0..2]
  const [seatPreferences, setSeatPreferences] = useState<string[][]>([...initialPreferences]);

  // activeOptionIndex => which of the 3 sets is currently being highlighted
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);

  // 1) Load occupant data
  useEffect(() => {
    async function loadAllocations() {
      setLoading(true);
      try {
        // If daily occupant checks are enough:
        const seatAllocs = await fetchSeatAllocations({ date });
        const seatMap: Record<number, { status: string; name?: string }> = {};
        seatAllocs.forEach((alloc: any) => {
          if (!alloc.released_at) {
            seatMap[alloc.seat_id] = {
              status: alloc.occupant_status ?? 'occupied',
              name: alloc.occupant_name ?? 'Occupied',
            };
          }
        });
        setSeatAllocations(seatMap);
      } catch (err) {
        console.error('Failed to load seat allocations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllocations();
  }, [date, time, duration]);

  // 2) Filter sections for the activeFloor
  const sectionsForActiveFloor = sections.filter(s => (s.floor_number ?? 1) === activeFloor);

  // 3) Build display => occupant status + "isSelected"
  const displaySections = sectionsForActiveFloor.map(sec => {
    const mappedSeats = sec.seats.map(seat => {
      const occupant = seatAllocations[seat.id];
      const occupant_status = occupant ? occupant.status : 'free';
      // highlight seats only in the currently active set
      const currentSet = seatPreferences[activeOptionIndex] || [];
      const isSelected = currentSet.includes(seat.label);

      return {
        ...seat,
        occupant_status,
        isSelected,
      };
    });
    return { ...sec, seats: mappedSeats };
  });

  // 4) seat click => toggle seat if occupant_status is free + haven't exceeded partySize
  function handleSeatClick(seat: DBSeat) {
    const occupant = seatAllocations[seat.id];
    const occupantStatus = occupant ? occupant.status : 'free';
    if (occupantStatus !== 'free') {
      alert(`Seat "${seat.label}" is currently ${occupantStatus}.`);
      return;
    }

    setSeatPreferences(prev => {
      const clone = [...prev];
      const currentSet = clone[activeOptionIndex] || [];

      // If seat already in that set => remove it
      if (currentSet.includes(seat.label)) {
        clone[activeOptionIndex] = currentSet.filter(lbl => lbl !== seat.label);
        return clone;
      }
      // else add it if not exceeding partySize
      if (currentSet.length >= partySize) {
        alert(`For Option ${activeOptionIndex+1}, you can only select up to ${partySize} seat(s).`);
        return prev; // no change
      }
      clone[activeOptionIndex] = [...currentSet, seat.label];
      return clone;
    });
  }

  // Switch floors
  function handleFloorTabClick(floorNum: number) {
    setActiveFloor(floorNum);
  }

  // Switch seat option
  function handleOptionTabClick(idx: number) {
    setActiveOptionIndex(idx);
    setSeatPreferences(prev => {
      const clone = [...prev];
      if (!clone[idx]) clone[idx] = [];
      return clone;
    });
  }

  // Zoom
  function zoomIn() {
    setZoom(z => Math.min(z + 0.25, 5.0));
  }
  function zoomOut() {
    setZoom(z => Math.max(z - 0.25, 0.25));
  }
  function zoomReset() {
    setZoom(1.0);
  }

  // 5) onSave => pass all seatPreferences
  function handleSave() {
    onSave(seatPreferences);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow">
          <p>Loading seat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="relative bg-white w-full max-w-5xl rounded-lg shadow-lg p-4">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-2">Select Seat Preferences</h2>
        <p className="text-sm text-gray-600 mb-4">
          Pick up to 3 seat‐preference options for the customer.
          Occupied/reserved seats are red or yellow.
          Each option can have up to {partySize} seat(s).
        </p>

        {/* Option tabs */}
        <div className="flex items-center space-x-2 mb-4">
          {[0,1,2].map((idx) => (
            <button
              key={idx}
              onClick={() => handleOptionTabClick(idx)}
              className={`px-3 py-1 rounded 
                ${activeOptionIndex === idx ? 'bg-orange-200' : 'bg-gray-100 hover:bg-gray-200'}
              `}
            >
              Option {idx+1}
            </button>
          ))}
        </div>

        {/* Floor tabs (if more than 1 floor) */}
        {floorNumbers.length > 1 && (
          <div className="flex items-center space-x-2 mb-4">
            {floorNumbers.map(f => (
              <button
                key={f}
                onClick={() => handleFloorTabClick(f)}
                className={`px-3 py-1 rounded 
                  ${activeFloor === f ? 'bg-orange-50 text-orange-700 border border-orange-300' : 'bg-gray-100 hover:bg-gray-200'}
                `}
              >
                Floor {f}
              </button>
            ))}
          </div>
        )}

        {/* Zoom + Grid controls */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 text-sm rounded border ${
              showGrid ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Settings className="inline w-4 h-4 mr-1" />
            Grid
          </button>
          <div className="flex items-center space-x-2">
            <button onClick={zoomOut} className="p-1 bg-gray-100 rounded hover:bg-gray-200" title="Zoom Out">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button onClick={zoomIn} className="p-1 bg-gray-100 rounded hover:bg-gray-200" title="Zoom In">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={zoomReset} className="p-1 bg-gray-100 rounded hover:bg-gray-200" title="Reset Zoom">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The seat map */}
        <div className="border border-gray-200 rounded mb-4" style={{height: '60vh', minHeight: 400}}>
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

        {/* Summary of the 3 sets */}
        <div className="border-t border-gray-200 pt-3 text-sm">
          {seatPreferences.map((arr, idx) => (
            <div key={idx} className="mb-1">
              <strong>Option {idx+1}:</strong>{' '}
              {arr.length ? arr.join(', ') : '(none)'}
            </div>
          ))}
        </div>

        {/* Bottom buttons */}
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
