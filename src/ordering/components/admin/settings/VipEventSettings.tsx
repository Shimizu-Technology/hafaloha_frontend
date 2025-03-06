import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import { getSpecialEvents, setAsCurrentEvent, SpecialEvent } from '../../../../shared/api/endpoints/specialEvents';
import { generateVipCodes, getVipCodes } from '../../../../shared/api/endpoints/vipAccess';
import { LoadingSpinner } from '../../../../shared/components/ui/LoadingSpinner';
import { CreateEventModal } from './CreateEventModal';
import { VipCodesModal } from './VipCodesModal';
import { VipModeToggle } from './VipModeToggle';
import { VipCodeSettings } from './VipCodeSettings';
import { handleApiError } from '../../../../shared/utils/errorHandler';
import { Calendar, Clock, Check, Plus, Tag, Users } from 'lucide-react';

export function VipEventSettings() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SpecialEvent | null>(null);
  const restaurant = useRestaurantStore((state) => state.restaurant);
  
  const fetchEvents = async () => {
    if (!restaurant?.id) return;
    
    setLoading(true);
    try {
      const data = await getSpecialEvents(restaurant.id);
      setEvents(data);
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Failed to fetch events:', errorMessage);
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchEvents();
  }, [restaurant?.id]);
  
  const handleSetAsCurrent = async (eventId: number) => {
    if (!restaurant?.id) return;
    
    try {
      await setAsCurrentEvent(restaurant.id, eventId);
      toast.success('Current event updated');
      fetchEvents();
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Failed to set current event:', errorMessage);
      toast.error('Failed to update current event');
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const formatTime = (timeString?: string) => {
    if (!timeString) return 'All day';
    
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">VIP Events & Access Codes</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-amber-600 text-white rounded-md flex items-center space-x-2 hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          <span>Create Event</span>
        </button>
      </div>
      
      <VipModeToggle className="mb-4" />
      <VipCodeSettings className="mb-6" />
      
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const isCurrentEvent = restaurant?.current_event_id === event.id;
            
            return (
              <div 
                key={event.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${
                  isCurrentEvent ? 'border-amber-500' : 'border-transparent'
                }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold">{event.description || `Event on ${formatDate(event.event_date)}`}</h3>
                    {isCurrentEvent && (
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    
                    {(event.start_time || event.end_time) && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>
                          {event.start_time ? formatTime(event.start_time) : 'Start'} 
                          {' - '} 
                          {event.end_time ? formatTime(event.end_time) : 'End'}
                        </span>
                      </div>
                    )}
                    
                    {event.vip_only_checkout && (
                      <div className="flex items-center text-sm text-amber-700">
                        <Tag className="h-4 w-4 mr-2" />
                        <span>VIP-Only Checkout</span>
                      </div>
                    )}
                    
                    {event.vip_only_checkout && event.code_prefix && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Code Prefix: {event.code_prefix}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 flex justify-between">
                  {!isCurrentEvent && (
                    <button
                      onClick={() => handleSetAsCurrent(event.id)}
                      className="text-sm text-amber-600 hover:text-amber-800"
                    >
                      Set as Current
                    </button>
                  )}
                  
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="text-sm text-blue-600 hover:text-blue-800 ml-auto"
                  >
                    Manage VIP Codes
                  </button>
                </div>
              </div>
            );
          })}
          
          {events.length === 0 && (
            <div className="col-span-full bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">No events found. Create your first event to get started.</p>
            </div>
          )}
        </div>
      )}
      
      {showCreateModal && (
        <CreateEventModal
          restaurantId={restaurant?.id || 0}
          onClose={() => setShowCreateModal(false)}
          onEventCreated={() => {
            setShowCreateModal(false);
            fetchEvents();
          }}
        />
      )}
      
      {selectedEvent && restaurant?.id && (
        <VipCodesModal
          specialEventId={selectedEvent.id}
          restaurantId={restaurant.id}
          eventName={selectedEvent.description || `Event on ${formatDate(selectedEvent.event_date)}`}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
