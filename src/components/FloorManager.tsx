// src/components/FloorManager.tsx
import React, { useEffect, useState } from 'react';
import {
  Edit2, LayoutDashboard, Minus, Maximize, Plus as LucidePlus, Settings,
} from 'lucide-react';

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
} from '../services/api';
import ReservationModal from './ReservationModal';

/** ---------- Data Interfaces ---------- **/
interface Reservation {
  id: number;
  contact_name?:  string;
  contact_phone?: string;
  contact_email?: string;
  party_size?:    number;
  status?:        string;  
  start_time?:    string;  
  created_at?:    string;  
  seat_labels?:   string[]; // Already from the backend
}

interface WaitlistEntry {
  id: number;
  contact_name?:  string;
  contact_phone?: string;
  party_size?:    number;
  check_in_time?: string;
  status?:        string;  
  seat_labels?:   string[]; // Already from the backend
}

interface SeatAllocation {
  id: number;
  seat_id:        number;
  occupant_type:  'reservation' | 'waitlist' | null;
  occupant_id:    number | null;
  occupant_name?: string;
  occupant_party_size?: number;
  occupant_status?: string;  
  released_at?:   string | null;
}

interface DBSeat {
  id: number;
  label?:     string;
  position_x: number;
  position_y: number;
  capacity?:  number;
}

interface DBSeatSection {
  id:           number;
  name:         string;
  offset_x:     number;
  offset_y:     number;
  orientation?: string;
  seats: DBSeat[];
}

interface LayoutData {
  id:   number;
  name: string;
  seat_sections: DBSeatSection[];
}

interface RestaurantData {
  id: number;
  current_layout_id?: number|null;
}

interface FloorManagerProps {
  date:           string;
  onDateChange:   (d: string) => void;
  reservations:   Reservation[];
  waitlist:       WaitlistEntry[];
  onRefreshData:  () => void;
  onTabChange:    (tab: string) => void;
}

/** occupant seat assignment wizard */
interface SeatWizardState {
  occupantType:       'reservation'|'waitlist'|null;
  occupantId:         number|null;
  occupantName:       string;
  occupantPartySize:  number;
  active:             boolean;
  selectedSeatIds:    number[];
}

const LAYOUT_PRESETS = {
  auto:   { width: 0,    height: 0,    seatScale: 1.0 },
  small:  { width: 1200, height: 800,  seatScale: 1.0 },
  medium: { width: 2000, height: 1200, seatScale: 1.0 },
  large:  { width: 3000, height: 1800, seatScale: 1.0 },
};

/** Returns seat times from “now” or from “18:00” if not the same day. */
function getSeatTimes(dateStr: string, durationMin=60) {
  const guamTodayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Guam" });
  const guamNowStr   = new Date().toLocaleString("en-US", { timeZone: "Pacific/Guam" });
  const guamNow      = new Date(guamNowStr);

  const isToday = (dateStr === guamTodayStr);
  if (isToday) {
    const start = guamNow;
    const end   = new Date(start.getTime() + durationMin*60000);
    return { start, end };
  } else {
    const start = new Date(`${dateStr}T18:00:00`);
    const end   = new Date(start.getTime() + durationMin*60000);
    return { start, end };
  }
}

/** Sort reservations by start_time, then created_at. */
function sortReservations(list: Reservation[]): Reservation[] {
  return [...list].sort((a,b) => {
    const tA = new Date(a.start_time||'').getTime();
    const tB = new Date(b.start_time||'').getTime();
    if (tA !== tB) return tA - tB;

    const cA = new Date(a.created_at||'').getTime();
    const cB = new Date(b.created_at||'').getTime();
    return cA - cB;
  });
}

export default function FloorManager({
  date,
  onDateChange,
  reservations: parentReservations,
  waitlist:     parentWaitlist,
  onRefreshData,
  onTabChange,
}: FloorManagerProps) {
  // We keep local arrays if we want to do seat wizard or highlight changes
  const [localReservations, setLocalReservations] = useState<Reservation[]>([]);
  const [localWaitlist,     setLocalWaitlist]     = useState<WaitlistEntry[]>([]);

  // We can just copy them from props, no need to re-merge seat_labels since the backend does that now
  useEffect(() => {
    setLocalReservations([...parentReservations]);
  }, [parentReservations]);

  useEffect(() => {
    setLocalWaitlist([...parentWaitlist]);
  }, [parentWaitlist]);

  // Layout states
  const [allLayouts, setAllLayouts]       = useState<LayoutData[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number|null>(null);
  const [layout,           setLayout]           = useState<LayoutData|null>(null);
  const [loading,          setLoading]          = useState(true);

  // seat allocations for this date
  const [dateSeatAllocs, setDateSeatAllocs] = useState<SeatAllocation[]>([]);

  // seat wizard
  const [seatWizard, setSeatWizard] = useState<SeatWizardState>({
    occupantType: null,
    occupantId:   null,
    occupantName: '',
    occupantPartySize: 1,
    active: false,
    selectedSeatIds: [],
  });

  // occupant pick
  const [showPickOccupantModal, setShowPickOccupantModal] = useState(false);
  const [pickOccupantValue,     setPickOccupantValue]     = useState('');

  // seat detail
  const [selectedSeat,   setSelectedSeat]   = useState<DBSeat|null>(null);
  const [showSeatDialog, setShowSeatDialog] = useState(false);

  // reservation modal
  const [selectedReservation, setSelectedReservation] = useState<Reservation|null>(null);

  // canvas
  const [layoutSize,   setLayoutSize]   = useState<'auto'|'small'|'medium'|'large'>('medium');
  const [canvasWidth,  setCanvasWidth]  = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [zoom,         setZoom]         = useState(1.0);
  const [showGrid,     setShowGrid]     = useState(true);

  //
  // On mount => load restaurant => pick layout => load data for (layout, date)
  //
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
        await loadDataFor(rest.current_layout_id, date);
      } else {
        setSelectedLayoutId(null);
        setLayout(null);
      }
    } catch (err) {
      console.error('initLoad error:', err);
    } finally {
      setLoading(false);
    }
  }

  //
  // If date or layout changes => load seat allocations for that day
  //
  useEffect(() => {
    if (!selectedLayoutId) return;
    loadDataFor(selectedLayoutId, date);
  }, [date, selectedLayoutId]);

  async function loadDataFor(layoutId: number, dateStr: string) {
    setLoading(true);
    try {
      const layoutResp = await fetchLayout(layoutId);
      const seatAllocs = await fetchSeatAllocations({ date: dateStr });

      setLayout(layoutResp);
      setDateSeatAllocs(seatAllocs);

      // compute auto bounds if needed
      if (layoutSize === 'auto') {
        computeAutoBounds(layoutResp);
      }
    } catch (err) {
      console.error('loadDataFor error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectLayout(id: number) {
    setSelectedLayoutId(id);
  }

  async function refreshLayout() {
    if (!selectedLayoutId) return;
    await loadDataFor(selectedLayoutId, date);
    onRefreshData();
  }

  function computeAutoBounds(l: LayoutData) {
    if (!l || !l.seat_sections) return;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    l.seat_sections.forEach(sec => {
      sec.seats.forEach(st => {
        const gx = sec.offset_x + st.position_x;
        const gy = sec.offset_y + st.position_y;
        if (gx < minX) minX = gx;
        if (gx > maxX) maxX = gx;
        if (gy < minY) minY = gy;
        if (gy > maxY) maxY = gy;
      });
    });
    const margin = 200;
    const w = Math.max(800, maxX - minX + margin);
    const h = Math.max(600, maxY - minY + margin);
    setCanvasWidth(w);
    setCanvasHeight(h);
  }

  // occupant seat calls
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
      console.error('Seat occupant error:', err);
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
      console.error('Reserving occupant error:', err);
    }
  }

  async function handleFinishOccupant(ocType: string, ocId: number) {
    try {
      await seatAllocationFinish({ occupant_type: ocType, occupant_id: ocId });
      setShowSeatDialog(false);
      setSelectedSeat(null);
      await refreshLayout();
    } catch (err) {
      console.error('Finish occupant error:', err);
    }
  }

  async function handleNoShow(ocType: string, ocId: number) {
    try {
      await seatAllocationNoShow({ occupant_type: ocType, occupant_id: ocId });
      setShowSeatDialog(false);
      setSelectedSeat(null);
      await refreshLayout();
    } catch (err) {
      console.error('No-show occupant error:', err);
    }
  }

  async function handleArriveOccupant(ocType: string, ocId: number) {
    try {
      await seatAllocationArrive({ occupant_type: ocType, occupant_id: ocId });
      setShowSeatDialog(false);
      setSelectedSeat(null);
      await refreshLayout();
    } catch (err) {
      console.error('Arrive occupant error:', err);
    }
  }

  async function handleCancelOccupant(ocType: string, ocId: number) {
    try {
      await seatAllocationCancel({ occupant_type: ocType, occupant_id: ocId });
      setShowSeatDialog(false);
      setSelectedSeat(null);
      await refreshLayout();
    } catch (err) {
      console.error('Cancel occupant error:', err);
    }
  }

  // occupant pick => wizard
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
    const occId = +idStr;
    if (!occId) return;

    let occupantPartySize = 1;
    let occupantNameFull  = 'Guest';
    if (typ === 'reservation') {
      const found = localReservations.find(r => r.id === occId);
      if (found) {
        occupantPartySize = found.party_size || 1;
        occupantNameFull  = found.contact_name || 'Guest';
      }
    } else {
      const foundW = localWaitlist.find(w => w.id === occId);
      if (foundW) {
        occupantPartySize = foundW.party_size || 1;
        occupantNameFull  = foundW.contact_name || 'Guest';
      }
    }
    const occupantName = occupantNameFull.split(/\s+/)[0];
    setSeatWizard({
      occupantType: typ as 'reservation'|'waitlist',
      occupantId:   occId,
      occupantName,
      occupantPartySize,
      active: true,
      selectedSeatIds: [],
    });
    handlePickOccupantClose();
  }
  function handleCancelWizard() {
    setSeatWizard({
      occupantType: null,
      occupantId:   null,
      occupantName: '',
      occupantPartySize: 1,
      active: false,
      selectedSeatIds: [],
    });
  }

  // occupant
  function occupantOfSeat(seatId: number) {
    return dateSeatAllocs.find(a => a.seat_id === seatId && !a.released_at) || null;
  }
  function handleSeatClick(seat: DBSeat) {
    if (!layout) return;
    const occupant = occupantOfSeat(seat.id);
    const isFree   = !occupant;

    if (seatWizard.active) {
      if (!isFree) {
        alert(`Seat ${seat.label || ('Seat #'+seat.id)} is not free.`);
        return;
      }
      if (seatWizard.selectedSeatIds.length >= seatWizard.occupantPartySize) {
        alert(`Need exactly ${seatWizard.occupantPartySize} seat(s).`);
        return;
      }
      toggleSelectedSeat(seat.id);
    } else {
      setSelectedSeat(seat);
      setShowSeatDialog(true);
    }
  }
  function toggleSelectedSeat(seatId: number) {
    setSeatWizard(prev => {
      const included = prev.selectedSeatIds.includes(seatId);
      const newArr   = included
        ? prev.selectedSeatIds.filter(id => id !== seatId)
        : [...prev.selectedSeatIds, seatId];
      return { ...prev, selectedSeatIds: newArr };
    });
  }
  function handleCloseSeatDialog() {
    setSelectedSeat(null);
    setShowSeatDialog(false);
  }

  // sorted
  const sortedRes = sortReservations(localReservations);

  if (loading) {
    return <div>Loading seat data...</div>;
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>

      {/* Top Controls */}
      <div className="flex items-center space-x-4 mb-4">
        {/* Date */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="border border-gray-300 rounded p-1"
          />
        </div>

        {/* Layout */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Layout:</label>
          <select
            value={selectedLayoutId || ''}
            onChange={(e) => handleSelectLayout(Number(e.target.value))}
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

        {/* Layout Size */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">View Size:</label>
          <select
            value={layoutSize}
            onChange={(e) => setLayoutSize(e.target.value as 'auto'|'small'|'medium'|'large')}
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
          <Settings className="inline w-4 h-4 mr-1"/>
          Grid
        </button>

        {/* Zoom */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4"/>
          </button>
          <span className="w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(z + 0.25, 5.0))}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom In"
          >
            <LucidePlus className="w-4 h-4"/>
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Reset Zoom"
          >
            <Maximize className="w-4 h-4"/>
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

      {/* Canvas seat map */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: '50vh' }}
      >
        <div
          style={{
            position: 'relative',
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: '#fff',
            backgroundImage: showGrid
              ? 'radial-gradient(circle,#cbd5e1 1px,transparent 1px)'
              : 'none',
            backgroundSize: '20px 20px',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {layout.seat_sections.map(sec => (
            <div
              key={sec.id}
              style={{
                position: 'absolute',
                left: sec.offset_x,
                top:  sec.offset_y,
              }}
            >
              <div
                className="mb-1 flex items-center justify-between bg-white/80 
                           backdrop-blur-sm px-2 py-1 rounded shadow"
                style={{ position: 'relative', zIndex: 2 }}
              >
                <span className="font-medium text-sm text-gray-700">
                  {sec.name}
                </span>
                <Edit2 className="w-3 h-3 text-gray-400"/>
              </div>

              {sec.seats.map((seat, idx) => {
                const seatX = seat.position_x - 30;
                const seatY = seat.position_y - 30;
                // occupant => from dateSeatAllocs
                const occupant = dateSeatAllocs.find(a => a.seat_id === seat.id && !a.released_at);
                let seatColor = 'bg-green-500';
                let occupantDisplay = seat.label?.trim() || `Seat #${seat.id}`;

                if (occupant) {
                  const st = occupant.occupant_status || '';
                  if (st === 'reserved') {
                    seatColor = 'bg-yellow-400';
                  } else if (st === 'seated' || st === 'occupied') {
                    seatColor = 'bg-red-500';
                  }
                  occupantDisplay = occupant.occupant_name || occupantDisplay;
                }
                const isSelected = seatWizard.selectedSeatIds.includes(seat.id);
                if (seatWizard.active && isSelected) {
                  seatColor = 'bg-blue-500';
                }

                return (
                  <div
                    key={seat.id || `tmp-${idx}`}
                    onClick={() => handleSeatClick(seat)}
                    style={{
                      position: 'absolute',
                      left: seatX,
                      top: seatY,
                      width: 60,
                      height: 60,
                      zIndex: 1,
                    }}
                    className={`
                      ${seatColor}
                      flex items-center justify-center text-center
                      text-white text-xs font-semibold
                      rounded-full cursor-pointer
                    `}
                  >
                    {occupantDisplay}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom => Reservations & Waitlist */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reservations => localReservations */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Reservations</h3>
          <ul className="space-y-2">
            {sortReservations(localReservations).map(r => {
              const timeStr = r.start_time
                ? new Date(r.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const displayName = r.contact_name || 'Guest';

              let seatText = '';
              if ((r.status === 'reserved' || r.status === 'seated') && r.seat_labels?.length) {
                seatText = `(Seats: ${r.seat_labels.join(', ')})`;
              }

              return (
                <li
                  key={r.id}
                  className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm cursor-pointer"
                  onClick={() => setSelectedReservation(r)}
                >
                  <div className="font-semibold">
                    {displayName}{' '}
                    {seatText && <span className="ml-2 text-xs text-green-600">{seatText}</span>}
                  </div>
                  <div className="text-xs text-gray-600">
                    Party: {r.party_size}, {r.contact_phone}
                  </div>
                  {timeStr && (
                    <div className="text-xs text-blue-500">Time: {timeStr}</div>
                  )}
                  <div className="text-xs text-gray-500">Status: {r.status}</div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Waitlist => localWaitlist */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Waitlist</h3>
          <ul className="space-y-2">
            {localWaitlist.map(w => {
              const checkIn = w.check_in_time
                ? new Date(w.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const dispName = w.contact_name || 'Guest';

              return (
                <li
                  key={w.id}
                  className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
                >
                  <div className="font-semibold">
                    {dispName}
                    {/* If you want seat text: 
                        w.seat_labels?.length ? `(Seats: ${w.seat_labels.join(', ')})` : '' */}
                  </div>
                  <div className="text-xs text-gray-600">
                    Party: {w.party_size}, {w.contact_phone}
                  </div>
                  {checkIn && (
                    <div className="text-xs text-blue-500">Checked in: {checkIn}</div>
                  )}
                  <div className="text-xs text-gray-500">Status: {w.status}</div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Seat Detail Dialog */}
      {showSeatDialog && selectedSeat && (() => {
        const occupantAlloc = dateSeatAllocs.find(a => a.seat_id === selectedSeat.id && !a.released_at);
        if (!occupantAlloc) {
          return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded shadow w-96 relative">
                <button
                  onClick={handleCloseSeatDialog}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
                <h3 className="font-bold text-lg mb-2">Seat is Free</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This seat is free for {date}.
                </p>
                {!seatWizard.active && (
                  <button
                    onClick={() => {
                      // If you want to seat a free seat immediately:
                      // handlePickOccupantOpen();
                      // or do something else.
                      handleCloseSeatDialog();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Seat/Reserve Now
                  </button>
                )}
              </div>
            </div>
          );
        }

        const { occupant_type, occupant_id, occupant_name, occupant_party_size, occupant_status } = occupantAlloc;
        if (occupant_status === 'reserved') {
          return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded shadow w-96 relative">
                <button
                  onClick={handleCloseSeatDialog}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
                <h3 className="font-bold text-lg mb-2">Seat Reserved</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Reserved by <strong>{occupant_name || 'someone'}</strong> 
                  (Party of {occupant_party_size || 1})
                </p>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => handleArriveOccupant(occupant_type || 'reservation', occupant_id || 0)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Seat This Party
                  </button>
                  <button
                    onClick={() => handleNoShow(occupant_type || 'reservation', occupant_id || 0)}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Mark No-Show
                  </button>
                  <button
                    onClick={() => handleCancelOccupant(occupant_type || 'reservation', occupant_id || 0)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel Reservation
                  </button>
                </div>
              </div>
            </div>
          );
        } else if (occupant_status === 'seated' || occupant_status === 'occupied') {
          return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded shadow w-96 relative">
                <button
                  onClick={handleCloseSeatDialog}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
                <h3 className="font-bold text-lg mb-2">Seat Occupied</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Occupied by <strong>{occupant_name || 'someone'}</strong> 
                  (Party of {occupant_party_size || 1})
                </p>
                <button
                  onClick={() => handleFinishOccupant(occupant_type || 'reservation', occupant_id || 0)}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Finish / Free Seat
                </button>
              </div>
            </div>
          );
        } else {
          // unknown occupant status => allow “cancel occupant”
          return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded shadow w-96 relative">
                <button
                  onClick={handleCloseSeatDialog}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
                <h3 className="font-bold text-lg mb-2">Unknown Occupant</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Occupied by <strong>{occupant_name || 'someone'}</strong> 
                  (Party of {occupant_party_size || 1})
                </p>
                <button
                  onClick={() => handleCancelOccupant(occupant_type || 'reservation', occupant_id || 0)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel / Free
                </button>
              </div>
            </div>
          );
        }
      })()}

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
              onChange={e => setPickOccupantValue(e.target.value)}
            >
              <option value="">-- Choose occupant --</option>
              <optgroup label="Reservations (booked)">
                {localReservations
                  .filter(r => r.status === 'booked')
                  .map(r => (
                    <option key={`res-${r.id}`} value={`reservation-${r.id}`}>
                      {r.contact_name?.split(' ')[0] || 'Guest'} (Party of {r.party_size})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Waitlist (waiting)">
                {localWaitlist
                  .filter(w => w.status === 'waiting')
                  .map(w => (
                    <option key={`wl-${w.id}`} value={`waitlist-${w.id}`}>
                      {w.contact_name?.split(' ')[0] || 'Guest'} (Party of {w.party_size})
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

      {/* Reservation Modal */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
        />
      )}
    </div>
  );
}
