// src/components/dashboard/WaitlistTab.tsx
import React, { useEffect, useState } from 'react';
import { Search, Clock, Users, Phone } from 'lucide-react';
import { useDateFilter } from '../../context/DateFilterContext';

import { fetchWaitlistEntries as apiFetchWaitlist } from '../../services/api';

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  party_size?: number;
  check_in_time?: string;
  status?: string; // "waiting", "seated", "removed", "no_show", etc.
  seat_labels?: string[];
}

// Utility for parse/format
function parseDateFilter(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}
function formatYYYYMMDD(dateObj: Date): string {
  return dateObj.toISOString().split('T')[0];
}

export default function WaitlistTab() {
  // Instead of a local date, we use the global date from context:
  const { date, setDate } = useDateFilter();

  // Data
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  // Searching
  const [searchTerm, setSearchTerm] = useState('');

  // On mount or whenever the global date changes => fetch waitlist
  useEffect(() => {
    fetchWaitlist();
  }, [date]);

  async function fetchWaitlist() {
    try {
      const data = await apiFetchWaitlist({ date });
      setWaitlist(data);
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    }
  }

  // Searching logic
  const searchedWaitlist = waitlist.filter((w) => {
    const wName = w.contact_name?.toLowerCase() ?? '';
    const wPhone = w.contact_phone ?? '';
    const sTerm = searchTerm.toLowerCase();
    return wName.includes(sTerm) || wPhone.includes(searchTerm);
  });

  // (Optional) If you want arrow-based date nav or a DatePicker,
  // you can do so using setDate(...) exactly like in ReservationsTab.
  // For now, we’ll keep it simpler.

  return (
    <div className="bg-white shadow rounded-md overflow-hidden p-4 mt-4">
      {/* Example: If you want to show the current date or let them pick it: 
      
          <div className="mb-4 flex items-center">
            <button onClick={() => {/* setDate(…prev day…)* /}}>&lt;</button>
            <span className="mx-2">{date}</span>
            <button onClick={() => {/* setDate(…next day…)* /}}>&gt;</button>
          </div>
      
        Or a DatePicker, same as ReservationsTab
      */}

      {/* Search bar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-md">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search waitlist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 
              rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Waitlist table */}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-[700px] table-auto divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Time Joined
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Guest
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Party Size
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {searchedWaitlist.map((w) => {
              const joined = new Date(w.check_in_time || '');
              const joinedDisplay = isNaN(joined.getTime())
                ? 'N/A'
                : joined.toLocaleString();

              const seatLabelText = w.seat_labels?.length
                ? `(Seated at ${w.seat_labels.join(', ')})`
                : '';

              return (
                <tr key={w.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      {joinedDisplay}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                    {w.contact_name ?? 'N/A'}
                    {seatLabelText && (
                      <span className="text-xs text-green-600 ml-1">
                        {seatLabelText}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      {w.party_size ?? 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {w.contact_phone ? (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-1" />
                        {w.contact_phone}
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderWaitlistStatusBadge(w.status)}
                  </td>
                </tr>
              );
            })}
            {searchedWaitlist.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No waitlist entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderWaitlistStatusBadge(status?: string) {
  switch (status) {
    case 'waiting':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold 
          rounded-full bg-yellow-100 text-yellow-800">
          waiting
        </span>
      );
    case 'seated':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold 
          rounded-full bg-green-100 text-green-800">
          seated
        </span>
      );
    case 'removed':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold 
          rounded-full bg-gray-200 text-gray-800">
          removed
        </span>
      );
    case 'no_show':
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold 
          rounded-full bg-red-100 text-red-800">
          no_show
        </span>
      );
    default:
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold 
          rounded-full bg-gray-100 text-gray-800">
          {status || 'N/A'}
        </span>
      );
  }
}
