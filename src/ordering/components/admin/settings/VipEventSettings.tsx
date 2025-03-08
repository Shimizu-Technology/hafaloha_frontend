// src/ordering/components/admin/settings/VipEventSettings.tsx

import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { 
  getSpecialEvents, 
  getVipCodes, 
  generateVipCodes 
} from '../../../../shared/api/endpoints/specialEvents';
import { LoadingSpinner, SettingsHeader } from '../../../../shared/components/ui';
import { toast } from 'react-hot-toast';
import { Calendar, Mail } from 'lucide-react';
import { VipCodeEmailModal } from './VipCodeEmailModal';

interface SpecialEvent {
  id: number;
  description: string;
  event_date: string;
  vip_only_checkout?: boolean;
  code_prefix?: string;
}

interface VipAccessCode {
  id: number;
  code: string;
  name: string;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  is_active: boolean;
  group_id?: string;
}

export const VipEventSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SpecialEvent | null>(null);
  const [vipCodes, setVipCodes] = useState<VipAccessCode[]>([]);
  const [codeGenParams, setCodeGenParams] = useState({
    batch: true,
    count: 10,
    name: '',
    maxUses: '',
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  const { restaurant, setCurrentEvent } = useRestaurantStore();
  
  // Fetch special events and VIP codes
  useEffect(() => {
    if (!restaurant?.id) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const events = await getSpecialEvents(restaurant.id);
        setSpecialEvents(events);
        
        if (restaurant.current_event_id) {
          const currentEvent = events.find(e => e.id === restaurant.current_event_id);
          if (currentEvent) {
            setSelectedEvent(currentEvent);
            const codes = await getVipCodes(currentEvent.id);
            setVipCodes(codes);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [restaurant?.id, restaurant?.current_event_id]);
  
  const handleEventChange = async (eventId: string) => {
    const id = parseInt(eventId);
    const event = specialEvents.find(e => e.id === id);
    setSelectedEvent(event || null);
    
    if (id) {
      try {
        setLoading(true);
        await setCurrentEvent(id);
        const codes = await getVipCodes(id);
        setVipCodes(codes);
        toast.success('Event set as current event');
      } catch (error) {
        console.error('Error setting current event:', error);
        toast.error('Failed to set current event');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        await setCurrentEvent(null);
        setVipCodes([]);
        toast.success('Current event cleared');
      } catch (error) {
        console.error('Error clearing current event:', error);
        toast.error('Failed to clear current event');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleGenerateCodes = async () => {
    if (!selectedEvent) return;
    
    try {
      setLoading(true);
      const params = {
        batch: codeGenParams.batch,
        count: parseInt(codeGenParams.count.toString()),
        name: codeGenParams.name,
        max_uses: codeGenParams.maxUses ? parseInt(codeGenParams.maxUses) : undefined,
      };
      
      await generateVipCodes(selectedEvent.id, params);
      toast.success(`Generated ${codeGenParams.batch ? params.count : 1} VIP code(s)`);
      
      // Refresh VIP codes list
      const updatedCodes = await getVipCodes(selectedEvent.id);
      setVipCodes(updatedCodes);
    } catch (error) {
      console.error('Error generating VIP codes:', error);
      toast.error('Failed to generate VIP codes');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  if (loading && !specialEvents.length) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
          </div>
        </div>
        
        {/* Event selection skeleton */}
        <div className="bg-white p-6 rounded-lg shadow transition-all duration-300 animate-fadeIn">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4 animate-pulse"></div>
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        {/* VIP code generation skeleton */}
        <div className="bg-white p-6 rounded-lg shadow transition-all duration-300 animate-fadeIn">
          <div className="h-5 w-48 bg-gray-200 rounded mb-4 animate-pulse"></div>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="flex space-x-4">
                <div className="h-6 w-40 bg-gray-200 rounded"></div>
                <div className="h-6 w-40 bg-gray-200 rounded"></div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 animate-pulse">
              <div>
                <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
              <div>
                <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
            </div>
            
            <div className="h-10 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        
        {/* VIP codes list skeleton */}
        <div className="bg-white p-6 rounded-lg shadow transition-all duration-300 animate-fadeIn">
          <div className="h-5 w-24 bg-gray-200 rounded mb-4 animate-pulse"></div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from({ length: 3 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center">
        <SettingsHeader 
          title="VIP Event Settings"
          description="Configure special events and VIP access codes."
          icon={<Calendar className="h-6 w-6" />}
        />
      </div>
      
      {/* Event selection */}
      <div className="bg-white p-6 rounded-lg shadow transition-all duration-300 animate-fadeIn">
        <h3 className="font-semibold mb-4">Select Special Event</h3>
        <select
          value={selectedEvent?.id || ''}
          onChange={(e) => handleEventChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors duration-200"
        >
          <option value="">-- Select an event --</option>
          {specialEvents.map(event => (
            <option key={event.id} value={event.id}>
              {event.description} ({formatDate(event.event_date)})
            </option>
          ))}
        </select>
      </div>
      
      {/* VIP code generation - only show if an event is selected */}
      {selectedEvent && (
        <div className="bg-white p-6 rounded-lg shadow transition-all duration-300 animate-fadeIn">
          <h3 className="font-semibold mb-4">Generate VIP Codes</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generation Type
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-amber-600"
                    checked={codeGenParams.batch}
                    onChange={() => setCodeGenParams({...codeGenParams, batch: true})}
                  />
                  <span className="ml-2">Batch (Multiple Codes)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-amber-600"
                    checked={!codeGenParams.batch}
                    onChange={() => setCodeGenParams({...codeGenParams, batch: false})}
                  />
                  <span className="ml-2">Single Group Code</span>
                </label>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {codeGenParams.batch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Codes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={codeGenParams.count}
                    onChange={(e) => setCodeGenParams({...codeGenParams, count: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code Name/Label
                </label>
                <input
                  type="text"
                  value={codeGenParams.name}
                  onChange={(e) => setCodeGenParams({...codeGenParams, name: e.target.value})}
                  placeholder={codeGenParams.batch ? "Individual VIP" : "Group VIP"}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              {!codeGenParams.batch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Uses (blank for unlimited)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={codeGenParams.maxUses}
                    onChange={(e) => setCodeGenParams({...codeGenParams, maxUses: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>
            
            <button
              onClick={handleGenerateCodes}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : 'Generate VIP Codes'}
            </button>
          </div>
        </div>
      )}
      
      {/* VIP codes list - only show if codes exist */}
      {selectedEvent && vipCodes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow transition-all duration-300 animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">VIP Codes</h3>
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
            >
              <Mail size={16} className="mr-2" />
              Send VIP Codes via Email
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vipCodes.map(code => (
                  <tr key={code.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{code.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{code.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.current_uses} / {code.max_uses || '∞'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full transition-colors duration-300 ${
                        code.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {code.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* VIP Code Email Modal */}
      {showEmailModal && (
        <VipCodeEmailModal
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
};
