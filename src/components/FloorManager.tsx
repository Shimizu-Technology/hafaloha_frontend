import React, { useEffect, useState } from 'react';
import {
  Edit2, LayoutDashboard, Minus, Maximize, Plus as LucidePlus, Settings,
} from 'lucide-react';

import ReservationModal from './ReservationModal';
import FloorTabs from './FloorTabs';  // For multiple floors

import {
  fetchRestaurant,
  fetchAllLayouts,
  fetchLayout,
  fetchSeatAllocations,
  seatAllocationMultiCreate,
  seatAllocationReserve,
  seatAllocationFinish,
  seatAllocationNoShow,
  seatAllocationArrive,
  seatAllocationCancel,
  updateReservation,
  deleteReservation,
} from '../services/api';

/** ---------- Data Interfaces ---------- **/
interface Reservation {
  id: number;
  contact_name?:  string;
  start_time?:    string;   // e.g. "2025-01-25T19:00:00Z"
  party_size?:    number;
  status?:        string;   // "booked", "reserved", "seated", etc.
  contact_phone?: string;
  contact_email?: string;
  created_at?:    string;
  seat_labels?:   string[];
  seat_preferences?: string[][];
}

interface WaitlistEntry {
  id: number;
  contact_name?:  string;
  check_in_time?: string;
  party_size?:    number;
  status?:        string;   
  contact_phone?: string;
  seat_labels?:   string[];
}

interface SeatAllocation {
  id: number;
  seat_id:           number;
  occupant_type:     'reservation' | 'waitlist' | null;
  occupant_id:       number | null;
  occupant_name?:    string;
  occupant_party_size?: number;
  occupant_status?:  string; 
  start_time?:       string;
  end_time?:         string;
  released_at?:      string | null;
}

interface DBSeat {
  id: number;
  label?: string;
  position_x: number;
  position_y: number;
  capacity?: number;
}

interface DBSeatSection {
  id: number;
  name: string;
  section_type?: string;   
  offset_x: number;
  offset_y: number;
  orientation?: string;
  floor_number?: number;
  seats: DBSeat[];
}

interface LayoutData {
  id: number;
  name: string;
  seat_sections: DBSeatSection[];
}

interface RestaurantData {
  id: number;
  name: string;
  time_zone?: string;
  current_layout_id?: number | null;
}

interface FloorManagerProps {
  date: string;
  onDateChange: (newDate: string) => void;
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  onRefreshData: () => void;
  onTabChange: (tab: string) => void;
}

/** Toggling the canvas size. */
const LAYOUT_PRESETS = {
  auto:   { width: 0,    height: 0,    seatScale: 1.0 },
  small:  { width: 1200, height: 800,  seatScale: 1.0 },
  medium: { width: 2000, height: 1200, seatScale: 1.0 },
  large:  { width: 3000, height: 1800, seatScale: 1.0 },
};

/** The occupant wizard for multi‐seat selection. */
interface SeatWizardState {
  occupantType: 'reservation' | 'waitlist' | null;
  occupantId: number | null;
  occupantName: string;
  occupantPartySize: number;
  active: boolean;
  selectedSeatIds: number[];
}

/** Utility to get seat times from “now” or “18:00” if not current date. */
function getSeatTimes(selectedDate: string, durationMinutes = 60) {
  const guamTodayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Guam" });
  const guamNowStr   = new Date().toLocaleString("en-US", { timeZone: "Pacific/Guam" });
  const guamNow      = new Date(guamNowStr);

  const isToday = (selectedDate === guamTodayStr);
  if (isToday) {
    const start = guamNow;
    const end   = new Date(start.getTime() + durationMinutes * 60000);
    return { start, end };
  } else {
    const start = new Date(`${selectedDate}T18:00:00`);
    const end   = new Date(start.getTime() + durationMinutes * 60000);
    return { start, end };
  }
}

export default function FloorManager({
  date,
  onDateChange,
  reservations,
  waitlist,
  onRefreshData,
  onTabChange,
}: FloorManagerProps) {
  // Layout states
  const [allLayouts, setAllLayouts]         = useState<LayoutData[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [layout, setLayout]                 = useState<LayoutData | null>(null);

  // Occupancy
  const [dateSeatAllocations, setDateSeatAllocations] = useState<SeatAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi‐seat wizard
  const [seatWizard, setSeatWizard] = useState<SeatWizardState>({
    occupantType: null,
    occupantId: null,
    occupantName: '',
    occupantPartySize: 1,
    active: false,
    selectedSeatIds: [],
  });

  // occupant pick modal
  const [showPickOccupantModal, setShowPickOccupantModal] = useState(false);
  const [pickOccupantValue, setPickOccupantValue]         = useState('');

  // Canvas sizing
  const [layoutSize, setLayoutSize]     = useState<'auto'|'small'|'medium'|'large'>('medium');
  const [canvasWidth, setCanvasWidth]   = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [seatScale, setSeatScale]       = useState(1.0);
  const [zoom, setZoom]                 = useState(1.0);
  const [showGrid, setShowGrid]         = useState(true);

  // Reservation modal
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // “Seat detail” overlay
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);
  const [showSeatDialog, setShowSeatDialog] = useState(false);

  // On mount => load restaurant & layouts
  useEffect(() => {
    initLoad();
  }, []);

  async function initLoad() {
    setLoading(true);
    try {
      const rest: RestaurantData = await fetchRestaurant(1);
      const layouts = await fetchAllLayouts();
      setAllLayouts(layouts);

      if (rest.current_layout_id) {
        setSelectedLayoutId(rest.current_layout_id);
        const layoutData = await fetchLayout(rest.current_layout_id);
        setLayout(layoutData);
        await fetchSeatAllocsForDate(rest.current_layout_id, date);
      } else {
        // no active layout
        setLayout(null);
        setSelectedLayoutId(null);
      }
    } catch (err) {
      console.error('[FloorManager] initLoad error:', err);
      setLayout(null);
      setSelectedLayoutId(null);
    } finally {
      setLoading(false);
    }
  }

  // If date or layout changes => fetch seat allocations
  useEffect(() => {
    if (!selectedLayoutId) return;
    fetchSeatAllocsForDate(selectedLayoutId, date);
  }, [selectedLayoutId, date]);

  async function fetchSeatAllocsForDate(layoutId: number, theDate: string) {
    setLoading(true);
    try {
      const seatAllocs = await fetchSeatAllocations({ date: theDate });
      setDateSeatAllocations(seatAllocs);
    } catch (err) {
      console.error('[FloorManager] fetchSeatAllocsForDate error:', err);
      setDateSeatAllocations([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectLayout(id: number) {
    setSelectedLayoutId(id);
    setLoading(true);
    try {
      const layoutData = await fetchLayout(id);
      setLayout(layoutData);
      await fetchSeatAllocsForDate(id, date);
    } catch (err) {
      console.error('[FloorManager] handleSelectLayout error:', err);
      setLayout(null);
      setDateSeatAllocations([]);
    } finally {
      setLoading(false);
    }
  }

  // Refresh occupant data + parent's reservations/waitlist
  async function refreshLayout() {
    if (!selectedLayoutId) return;
    await fetchSeatAllocsForDate(selectedLayoutId, date);
    onRefreshData();
  }

  // bounding box or preset
  useEffect(() => {
    if (!layout) return;
    if (layoutSize === 'auto') {
      computeAutoBounds();
    } else {
      const preset = LAYOUT_PRESETS[layoutSize];
      setCanvasWidth(preset.width);
      setCanvasHeight(preset.height);
      setSeatScale(preset.seatScale);
    }
  }, [layout, layoutSize]);

  function computeAutoBounds() {
    if (!layout?.seat_sections) return;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    layout.seat_sections.forEach(sec => {
      sec.seats.forEach(seat => {
        const gx = sec.offset_x + seat.position_x;
        const gy = sec.offset_y + seat.position_y;
        if (gx < minX) minX = gx;
        if (gx > maxX) maxX = gx;
        if (gy < minY) minY = gy;
        if (gy > maxY) maxY = gy;
      });
    });

    const margin = 200;
    const w = maxX - minX + margin;
    const h = maxY - minY + margin;
    setCanvasWidth(Math.max(w, 800));
    setCanvasHeight(Math.max(h, 600));
    setSeatScale(1.0);
  }

  /** occupant info for a seat */
  function getOccupantInfo(seatId: number) {
    return dateSeatAllocations.find(a => a.seat_id === seatId && !a.released_at) || null;
  }

  // ---------------- Wizard logic ----------------
  function handlePickOccupantOpen() {
    setPickOccupantValue('');
    setShowPickOccupantModal(true);
  }
  function handlePickOccupantClose() {
    setPickOccupantValue('');
    setShowPickOccupantModal(false);
  }
  function handleOccupantSelected() {
    if (!pickOccupantValue) return;
    const [typ, idStr] = pickOccupantValue.split('-');
    const occupantId = parseInt(idStr, 10);
    if (!occupantId) return;

    let occupantPartySize = 1;
    let occupantNameFull  = 'Guest';

    if (typ === 'reservation') {
      const found = reservations.find(r => r.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantNameFull  = found.contact_name ?? 'Guest';
      }
    } else {
      const found = waitlist.find(w => w.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantNameFull  = found.contact_name ?? 'Guest';
      }
    }

    // We'll store the occupant's first name in occupantName
    const occupantName = occupantNameFull.split(/\s+/)[0];
    setSeatWizard(prev => ({
      ...prev,
      occupantType: typ as 'reservation'|'waitlist',
      occupantId,
      occupantName,
      occupantPartySize,
      active: true,
    }));
    handlePickOccupantClose();
  }

  function handleCancelWizard() {
    setSeatWizard({
      occupantType: null,
      occupantId: null,
      occupantName: '',
      occupantPartySize: 1,
      active: false,
      selectedSeatIds: [],
    });
  }

  function toggleSelectedSeat(seatId: number) {
    setSeatWizard(prev => {
      const included = prev.selectedSeatIds.includes(seatId);
      return {
        ...prev,
        selectedSeatIds: included
          ? prev.selectedSeatIds.filter(id => id !== seatId)
          : [...prev.selectedSeatIds, seatId],
      };
    });
  }

  // occupant -> seat calls
  async function handleSeatNow() {
    if (!seatWizard.active || !seatWizard.occupantId) return;
    if (seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize) {
      alert(`Need exactly ${seatWizard.occupantPartySize} seat(s).`);
      return;
    }
    const { start, end } = getSeatTimes(date, 60);
    try {
      await seatAllocationMultiCreate({
        occupant_type: seatWizard.occupantType,
        occupant_id:   seatWizard.occupantId,
        seat_ids:      seatWizard.selectedSeatIds,
        start_time:    start.toISOString(),
        end_time:      end.toISOString(),
      });
      handleCancelWizard();
      await refreshLayout();
    } catch (err) {
      console.error('[FloorManager] handleSeatNow error:', err);
      alert('Seat occupant error—check console.');
    }
  }
  async function handleReserveSeats() {
    if (!seatWizard.active || !seatWizard.occupantId) return;
    if (seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize) {
      alert(`Need exactly ${seatWizard.occupantPartySize} seat(s).`);
      return;
    }
    const { start, end } = getSeatTimes(date, 60);
    try {
      await seatAllocationReserve({
        occupant_type: seatWizard.occupantType,
        occupant_id:   seatWizard.occupantId,
        seat_ids:      seatWizard.selectedSeatIds,
        start_time:    start.toISOString(),
        end_time:      end.toISOString(),
      });
      handleCancelWizard();
      await refreshLayout();
    } catch (err) {
      console.error('[FloorManager] handleReserveSeats error:', err);
      alert('Reserve occupant error—check console.');
    }
  }

  // occupant status changes
  function closeSeatDialog() {
    setSelectedSeatId(null);
    setShowSeatDialog(false);
  }

  async function handleFinishOccupant(occupantType: string, occupantId: number) {
    try {
      await seatAllocationFinish({ occupant_type: occupantType, occupant_id: occupantId });
      closeSeatDialog();
      await refreshLayout();
    } catch (err) {
      console.error('[FloorManager] handleFinishOccupant error:', err);
      alert('Finish occupant error—check console.');
    }
  }
  async function handleNoShow(occupantType: string, occupantId: number) {
    try {
      await seatAllocationNoShow({ occupant_type: occupantType, occupant_id: occupantId });
      closeSeatDialog();
      await refreshLayout();
    } catch (err) {
      console.error('[FloorManager] handleNoShow error:', err);
      alert('No-show occupant error—check console.');
    }
  }

  // *** KEY FIX HERE: pass occupantId, not occupant_id ***
  async function handleArriveOccupant(occupantType: string, occupantId: number) {
    try {
      await seatAllocationArrive({
        occupant_type: occupantType,
        occupant_id:   occupantId,
      });
      closeSeatDialog();
      await refreshLayout();
    } catch (err) {
      console.error('[FloorManager] handleArriveOccupant error:', err);
      alert('Arrive occupant error—check console.');
    }
  }

  async function handleCancelOccupant(occupantType: string, occupantId: number) {
    try {
      await seatAllocationCancel({ occupant_type: occupantType, occupant_id: occupantId });
      closeSeatDialog();
      await refreshLayout();
    } catch (err) {
      console.error('[FloorManager] handleCancelOccupant error:', err);
      alert('Cancel occupant error—check console.');
    }
  }

  // Reservation edits/deletes
  async function handleDeleteReservation(id: number) {
    try {
      await deleteReservation(id);
      setSelectedReservation(null);
      await refreshLayout();
    } catch (err) {
      console.error('[FloorManager] handleDeleteReservation error:', err);
      alert('Delete reservation failed—check console.');
    }
  }
  async function handleEditReservation(updated: Reservation) {
    try {
      const patchData: any = {
        contact_name:  updated.contact_name,
        contact_phone: updated.contact_phone,
        contact_email: updated.contact_email,
        party_size:    updated.party_size,
        status:        updated.status,
      };
      if (updated.seat_preferences) {
        patchData.seat_preferences = updated.seat_preferences;
      }
      await updateReservation(updated.id, patchData);
      setSelectedReservation(null);
      await refreshLayout();
    } catch (err) {
      console.error('[FloorManager] handleEditReservation error:', err);
      alert('Update reservation failed—check console.');
    }
  }

  if (loading) {
    return <div>Loading layout data...</div>;
  }
  if (!layout) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <div className="text-center max-w-md px-4">
          <LayoutDashboard className="mx-auto text-gray-300" size={64} />
          <h2 className="text-xl font-semibold text-gray-800 mt-4">No Layout Found</h2>
          <p className="text-gray-600 mt-2">
            It looks like this restaurant hasn’t set up a layout yet,
            or no layout is currently active.
          </p>
          <button
            onClick={() => onTabChange('layout')}
            className="inline-flex items-center px-4 py-2 mt-5 bg-orange-600 text-white rounded shadow hover:bg-orange-700"
          >
            Create a Layout
          </button>
        </div>
      </div>
    );
  }

  // Build seat data for FloorTabs
  const seatSections = layout.seat_sections.map((sec) => {
    return {
      id: sec.id,
      name: sec.name,
      section_type: sec.section_type === 'table' ? 'table' : 'counter',
      offset_x: sec.offset_x,
      offset_y: sec.offset_y,
      floor_number: sec.floor_number ?? 1,

      seats: sec.seats.map((s) => {
        const occ = getOccupantInfo(s.id);
        const occupant_status = occ?.occupant_status || 'free';
        const occupant_name   = occ?.occupant_name   || '';

        // Check if seat is in seatWizard
        const isSelected = seatWizard.active && seatWizard.selectedSeatIds.includes(s.id);

        return {
          id: s.id,
          label: s.label || '',
          position_x: s.position_x,
          position_y: s.position_y,
          capacity: s.capacity || 1,

          occupant_status,
          occupant_name,
          isSelected,
        };
      }),
    };
  });

  // onSeatClick => if wizard is active => select seat, else show seat detail
  function handleSeatClick(
    seat: {
      id: number;
      label: string;
      occupant_status?: string;
      isSelected?: boolean;
    },
    section: { id: number; name: string; floor_number?: number }
  ) {
    if (seatWizard.active) {
      // wizard flow
      if (seat.occupant_status !== 'free') {
        alert(`Seat ${seat.label} is occupied or reserved.`);
        return;
      }
      const alreadySelected = seatWizard.selectedSeatIds.includes(seat.id);
      if (!alreadySelected && seatWizard.selectedSeatIds.length >= seatWizard.occupantPartySize) {
        alert(`Need exactly ${seatWizard.occupantPartySize} seat(s).`);
        return;
      }
      toggleSelectedSeat(seat.id);
    } else {
      // open seat detail
      setSelectedSeatId(seat.id);
      setShowSeatDialog(true);
    }
  }

  // occupant for the selected seat
  const selectedSeatAlloc = selectedSeatId
    ? dateSeatAllocations.find(a => a.seat_id === selectedSeatId && !a.released_at)
    : null;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>

      {/* Top controls */}
      <div className="flex items-center space-x-4 mb-4">
        {/* Date */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Date:</label>
          <input
            type="date"
            value={date}
            onChange={e => onDateChange(e.target.value)}
            className="border border-gray-300 rounded p-1"
          />
        </div>

        {/* Layout */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Layout:</label>
          <select
            value={selectedLayoutId ?? ''}
            onChange={e => handleSelectLayout(Number(e.target.value))}
            className="border border-gray-300 rounded p-1"
          >
            <option value="">-- None --</option>
            {allLayouts.map(ly => (
              <option key={ly.id} value={ly.id}>
                {ly.name}
              </option>
            ))}
          </select>
        </div>

        {/* View size */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">View Size:</label>
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

        {/* Zoom */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(z => Math.max(z - 0.25, 0.2))}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(z + 0.25, 5.0))}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom In"
          >
            <LucidePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Reset Zoom"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Seat Wizard */}
      {!seatWizard.active ? (
        <button
          onClick={handlePickOccupantOpen}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Seat/Reserve a Party
        </button>
      ) : (
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-sm text-gray-800">
            Seating for {seatWizard.occupantName} (Party of {seatWizard.occupantPartySize}) —
            selected {seatWizard.selectedSeatIds.length} seat(s)
          </span>
          <button
            onClick={handleSeatNow}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Seat Now
          </button>
          {seatWizard.occupantType === 'reservation' && (
            <button
              onClick={handleReserveSeats}
              className="px-4 py-2 bg-orange-600 text-white rounded"
            >
              Reserve Seats
            </button>
          )}
          <button
            onClick={handleCancelWizard}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {/* The FloorTabs => seat layout */}
      <FloorTabs
        allSections={seatSections}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        zoom={zoom}
        showGrid={showGrid}
        onSeatClick={handleSeatClick}
        onSectionDrag={undefined}
        getFloorNumber={(sec) => sec.floor_number || 1}
      />

      {/* Reservations & Waitlist */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reservations => open ReservationModal on click */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Reservations</h3>
          <ul className="space-y-2">
            {reservations.map((r) => {
              const timeStr = r.start_time
                ? new Date(r.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const guestName = r.contact_name || 'Guest';

              let seatText = '';
              if ((r.status === 'reserved' || r.status === 'seated') && r.seat_labels?.length) {
                seatText = `(Seats: ${r.seat_labels.join(', ')})`;
              }

              return (
                <li
                  key={`res-${r.id}`}
                  className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm cursor-pointer"
                  onClick={() => setSelectedReservation(r)}
                >
                  <div className="font-semibold">
                    {guestName}{' '}
                    {seatText && (
                      <span className="ml-2 text-xs text-green-600">
                        {seatText}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    Party: {r.party_size}, {r.contact_phone}
                  </div>
                  {timeStr && <div className="text-xs text-blue-500">Time: {timeStr}</div>}
                  <div className="text-xs text-gray-500">Status: {r.status}</div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Waitlist */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Waitlist</h3>
          <ul className="space-y-2">
            {waitlist.map((w) => {
              const timeStr = w.check_in_time
                ? new Date(w.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const guestName = w.contact_name || 'Guest';

              return (
                <li
                  key={`wl-${w.id}`}
                  className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
                >
                  <div className="font-semibold">{guestName}</div>
                  <div className="text-xs text-gray-600">
                    Party: {w.party_size}, {w.contact_phone}
                  </div>
                  {timeStr && <div className="text-xs text-blue-500">Checked in: {timeStr}</div>}
                  <div className="text-xs text-gray-500">Status: {w.status}</div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* occupant pick modal */}
      {showPickOccupantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-96 relative">
            <button
              onClick={handlePickOccupantClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-2">Select Occupant</h3>

            <select
              className="border border-gray-300 rounded w-full p-2"
              value={pickOccupantValue}
              onChange={(e) => setPickOccupantValue(e.target.value)}
            >
              <option value="">-- Choose occupant --</option>
              <optgroup label="Reservations (booked)">
                {reservations
                  .filter((r) => r.status === 'booked')
                  .map((r) => (
                    <option key={`res-${r.id}`} value={`reservation-${r.id}`}>
                      {r.contact_name?.split(' ')[0] || 'Guest'} (Party of {r.party_size})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Waitlist (waiting)">
                {waitlist
                  .filter((wl) => wl.status === 'waiting')
                  .map((wl) => (
                    <option key={`wl-${wl.id}`} value={`waitlist-${wl.id}`}>
                      {wl.contact_name?.split(' ')[0] || 'Guest'} (Party of {wl.party_size})
                    </option>
                  ))}
              </optgroup>
            </select>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={handlePickOccupantClose}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleOccupantSelected}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Start Wizard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seat Detail Dialog => occupant or free */}
      {showSeatDialog && selectedSeatId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          {(() => {
            const occupantAlloc = getOccupantInfo(selectedSeatId);
            if (!occupantAlloc) {
              // free seat
              return (
                <div className="bg-white p-4 rounded shadow w-96 relative">
                  <button
                    onClick={closeSeatDialog}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                  >
                    ✕
                  </button>
                  <h3 className="font-bold text-lg mb-2">Seat Is Free</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This seat is currently free for {date}.
                  </p>
                  {!seatWizard.active && (
                    <button
                      onClick={() => {
                        // Start wizard with this seat preselected
                        setSeatWizard({
                          occupantType: null,
                          occupantId: null,
                          occupantName: '',
                          occupantPartySize: 1,
                          active: true,
                          selectedSeatIds: [selectedSeatId],
                        });
                        closeSeatDialog();
                        handlePickOccupantOpen();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                      Seat/Reserve Now
                    </button>
                  )}
                </div>
              );
            } else {
              // occupant found => occupant status
              const occType   = occupantAlloc.occupant_type || 'reservation';
              const occId     = occupantAlloc.occupant_id || 0;
              const occName   = occupantAlloc.occupant_name || 'someone';
              const occSize   = occupantAlloc.occupant_party_size || 1;
              const occStatus = occupantAlloc.occupant_status;

              if (occStatus === 'reserved') {
                return (
                  <div className="bg-white p-4 rounded shadow w-96 relative">
                    <button
                      onClick={closeSeatDialog}
                      className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                    >
                      ✕
                    </button>
                    <h3 className="font-bold text-lg mb-2">Seat Reserved</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Reserved by <strong>{occName} (Party of {occSize})</strong>
                    </p>
                    <div className="flex flex-col space-y-2">
                      {/* KEY: pass occId, not occupant_id */}
                      <button
                        onClick={() => handleArriveOccupant(occType, occId)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Seat This Party
                      </button>
                      <button
                        onClick={() => handleNoShow(occType, occId)}
                        className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                      >
                        Mark No-Show
                      </button>
                      <button
                        onClick={() => handleCancelOccupant(occType, occId)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancel Reservation
                      </button>
                    </div>
                  </div>
                );
              } else if (occStatus === 'seated' || occStatus === 'occupied') {
                return (
                  <div className="bg-white p-4 rounded shadow w-96 relative">
                    <button
                      onClick={closeSeatDialog}
                      className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                    >
                      ✕
                    </button>
                    <h3 className="font-bold text-lg mb-2">Seat Occupied</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Occupied by <strong>{occName} (Party of {occSize})</strong>
                    </p>
                    <button
                      onClick={() => handleFinishOccupant(occType, occId)}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Finish / Free Seat
                    </button>
                  </div>
                );
              } else {
                // unknown occupant
                return (
                  <div className="bg-white p-4 rounded shadow w-96 relative">
                    <button
                      onClick={closeSeatDialog}
                      className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                    >
                      ✕
                    </button>
                    <h3 className="font-bold text-lg mb-2">Unknown Occupant</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Occupied by <strong>{occName} (Party of {occSize})</strong>
                    </p>
                    <button
                      onClick={() => handleCancelOccupant(occType, occId)}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel / Free
                    </button>
                  </div>
                );
              }
            }
          })()}
        </div>
      )}

      {/* Reservation Modal => edit or delete */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onDelete={handleDeleteReservation}
          onEdit={handleEditReservation}
        />
      )}
    </div>
  );
}
