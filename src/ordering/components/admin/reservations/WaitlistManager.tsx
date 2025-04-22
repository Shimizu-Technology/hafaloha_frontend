// src/ordering/components/admin/reservations/WaitlistManager.tsx
import { useState, useEffect } from 'react';
import { Search, Clock, Users, Phone, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatPhoneNumber } from '../../../../shared/utils/formatters';

import { useDateFilter } from '../../../../reservations/context/DateFilterContext';
import { fetchWaitlistEntries as apiFetchWaitlist } from '../../../../reservations/services/api';

// Import tenant utilities for proper tenant isolation
import { validateRestaurantContext, addRestaurantIdToParams } from '../../../../shared/utils/tenantUtils';

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  party_size?: number;
  check_in_time?: string;
  status?: string; // "waiting", "seated", "removed", "no_show", etc.
  seat_labels?: string[];
  restaurant_id?: number; // Added for tenant isolation
}

// Utility for parse/format
function parseDateFilter(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatYYYYMMDD(dateObj: Date): string {
  return dateObj.toISOString().split('T')[0];
}

interface WaitlistManagerProps {
  restaurantId?: string | number;
}

export function WaitlistManager({ restaurantId }: WaitlistManagerProps) {
  // Ensure we have a valid restaurant context
  useEffect(() => {
    validateRestaurantContext(restaurantId);
  }, [restaurantId]);

  // Using the global date from context
  const { date, setDate } = useDateFilter();

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // These state variables will be used in future implementations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);

  // Fetch waitlist whenever the date or restaurantId changes
  useEffect(() => {
    fetchWaitlistData();
  }, [date, restaurantId]);

  async function fetchWaitlistData() {
    try {
      setIsLoading(true);
      // Add restaurant_id to params for tenant isolation
      const params = addRestaurantIdToParams({ date }, restaurantId);
      // The API expects a date parameter
      const data = await apiFetchWaitlist(params.date);
      setWaitlist(data as WaitlistEntry[]);
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Searching logic
  const filteredWaitlist = waitlist.filter((entry) => {
    const name = entry.contact_name?.toLowerCase() ?? '';
    const phone = entry.contact_phone ?? '';
    const sTerm = searchTerm.toLowerCase();
    return name.includes(sTerm) || phone.includes(sTerm);
  });

  // Date navigation
  function handlePrevDay() {
    const current = parseDateFilter(date);
    current.setDate(current.getDate() - 1);
    setDate(formatYYYYMMDD(current));
  }
  
  function handleNextDay() {
    const current = parseDateFilter(date);
    current.setDate(current.getDate() + 1);
    setDate(formatYYYYMMDD(current));
  }

  // Format wait time display
  function formatWaitTime(checkInTime?: string): string {
    if (!checkInTime) return 'Unknown';
    
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  }

  // Format check-in time for display (e.g. "6:30 PM")
  function formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // Renders a color-coded badge for each waitlist status
  function renderWaitlistStatusBadge(status?: string) {
    if (!status) return null;
    
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'waiting':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'seated':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'removed':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'no_show':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'notified':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {status.replace('_', ' ')}
      </span>
    );
  }

  // Placeholder for future functionality
  function handleNotifyGuest(entry: WaitlistEntry) {
    alert(`Notification would be sent to ${entry.contact_name} at ${entry.contact_phone}`);
    // In a real implementation, this would call an API to send an SMS/notification
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with search and date navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search waitlist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/50 focus:border-hafaloha-gold/50"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        {/* Date navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevDay}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          
          <DatePicker
            selected={parseDateFilter(date)}
            onChange={(date) => setDate(formatYYYYMMDD(date as Date))}
            dateFormat="MMMM d, yyyy"
            className="border border-gray-300 rounded-md px-4 py-2 text-center focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/50 focus:border-hafaloha-gold/50"
          />
          
          <button
            onClick={handleNextDay}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Add to waitlist button */}
        <button
          onClick={() => alert('Add to waitlist functionality will be implemented in future phases')}
          className="px-4 py-2 bg-hafaloha-gold text-white rounded-md hover:bg-hafaloha-gold/90 transition-colors"
        >
          Add to Waitlist
        </button>
      </div>
      
      {/* Waitlist table */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-grow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wait Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-in
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Party
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading waitlist...
                  </td>
                </tr>
              ) : filteredWaitlist.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No entries found for this date.
                  </td>
                </tr>
              ) : (
                filteredWaitlist.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-gray-50 ${entry.status === 'waiting' ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        <span className={entry.status === 'waiting' ? 'font-medium' : ''}>
                          {formatWaitTime(entry.check_in_time)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(entry.check_in_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.contact_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        {entry.party_size || '?'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.contact_phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {formatPhoneNumber(entry.contact_phone)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderWaitlistStatusBadge(entry.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.status === 'waiting' && (
                        <button
                          onClick={() => handleNotifyGuest(entry)}
                          className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Notify guest"
                        >
                          <Bell className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default WaitlistManager;
