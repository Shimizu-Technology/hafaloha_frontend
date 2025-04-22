// src/ordering/components/admin/settings/ReservationsSettings.tsx
import { useState, useEffect } from 'react';
import { Save, Clock, Users, Calendar } from 'lucide-react';

// Import tenant utilities for proper tenant isolation
import { validateRestaurantContext, addRestaurantIdToParams } from '../../../../shared/utils/tenantUtils';

interface ReservationsSettingsProps {
  restaurantId?: string | number;
}

export function ReservationsSettings({ restaurantId }: ReservationsSettingsProps) {
  // Ensure we have a valid restaurant context
  useEffect(() => {
    validateRestaurantContext(restaurantId);
  }, [restaurantId]);

  // State for settings
  const [settings, setSettings] = useState({
    allowReservations: true,
    maxPartySize: 10,
    minAdvanceHours: 1,
    maxAdvanceDays: 30,
    timeSlotInterval: 30,
    defaultDuration: 90,
    allowWaitlist: true,
    autoConfirm: false,
    sendReminders: true,
    reminderHours: 24
  });

  // State for form submission
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseInt(value) 
          : value
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Placeholder for API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSaved(true);
      
      // Reset the saved message after 3 seconds
      setTimeout(() => setIsSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200 bg-hafaloha-gold/5 rounded-t-lg px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900">Reservations Settings</h3>
        <p className="text-sm text-gray-500">Configure how reservations work for your restaurant</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Settings Section */}
          <div className="space-y-4 col-span-2">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              General Settings
            </h4>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowReservations"
                name="allowReservations"
                checked={settings.allowReservations}
                onChange={handleChange}
                className="h-4 w-4 text-hafaloha-gold focus:ring-hafaloha-gold border-gray-300 rounded"
              />
              <label htmlFor="allowReservations" className="ml-2 block text-sm text-gray-700">
                Allow online reservations
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowWaitlist"
                name="allowWaitlist"
                checked={settings.allowWaitlist}
                onChange={handleChange}
                className="h-4 w-4 text-hafaloha-gold focus:ring-hafaloha-gold border-gray-300 rounded"
              />
              <label htmlFor="allowWaitlist" className="ml-2 block text-sm text-gray-700">
                Enable waitlist
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoConfirm"
                name="autoConfirm"
                checked={settings.autoConfirm}
                onChange={handleChange}
                className="h-4 w-4 text-hafaloha-gold focus:ring-hafaloha-gold border-gray-300 rounded"
              />
              <label htmlFor="autoConfirm" className="ml-2 block text-sm text-gray-700">
                Auto-confirm reservations
              </label>
            </div>
          </div>
          
          {/* Time Settings Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Time Settings
            </h4>
            
            <div>
              <label htmlFor="timeSlotInterval" className="block text-sm font-medium text-gray-700">
                Time slot interval (minutes)
              </label>
              <select
                id="timeSlotInterval"
                name="timeSlotInterval"
                value={settings.timeSlotInterval}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-hafaloha-gold focus:border-hafaloha-gold sm:text-sm rounded-md"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="defaultDuration" className="block text-sm font-medium text-gray-700">
                Default reservation duration (minutes)
              </label>
              <select
                id="defaultDuration"
                name="defaultDuration"
                value={settings.defaultDuration}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-hafaloha-gold focus:border-hafaloha-gold sm:text-sm rounded-md"
              >
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
                <option value="150">150 minutes</option>
                <option value="180">180 minutes</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="minAdvanceHours" className="block text-sm font-medium text-gray-700">
                Minimum advance notice (hours)
              </label>
              <input
                type="number"
                id="minAdvanceHours"
                name="minAdvanceHours"
                value={settings.minAdvanceHours}
                onChange={handleChange}
                min="0"
                max="72"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-hafaloha-gold focus:border-hafaloha-gold sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="maxAdvanceDays" className="block text-sm font-medium text-gray-700">
                Maximum advance booking (days)
              </label>
              <input
                type="number"
                id="maxAdvanceDays"
                name="maxAdvanceDays"
                value={settings.maxAdvanceDays}
                onChange={handleChange}
                min="1"
                max="365"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-hafaloha-gold focus:border-hafaloha-gold sm:text-sm"
              />
            </div>
          </div>
          
          {/* Party Settings Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Party Settings
            </h4>
            
            <div>
              <label htmlFor="maxPartySize" className="block text-sm font-medium text-gray-700">
                Maximum party size
              </label>
              <input
                type="number"
                id="maxPartySize"
                name="maxPartySize"
                value={settings.maxPartySize}
                onChange={handleChange}
                min="1"
                max="100"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-hafaloha-gold focus:border-hafaloha-gold sm:text-sm"
              />
            </div>
            
            <div className="pt-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Notifications
              </h4>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sendReminders"
                name="sendReminders"
                checked={settings.sendReminders}
                onChange={handleChange}
                className="h-4 w-4 text-hafaloha-gold focus:ring-hafaloha-gold border-gray-300 rounded"
              />
              <label htmlFor="sendReminders" className="ml-2 block text-sm text-gray-700">
                Send reservation reminders
              </label>
            </div>
            
            <div>
              <label htmlFor="reminderHours" className="block text-sm font-medium text-gray-700">
                Send reminder (hours before)
              </label>
              <select
                id="reminderHours"
                name="reminderHours"
                value={settings.reminderHours}
                onChange={handleChange}
                disabled={!settings.sendReminders}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-hafaloha-gold focus:border-hafaloha-gold sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="4">4 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="mt-6 flex items-center justify-end">
          {isSaved && (
            <span className="mr-4 text-sm text-green-600">Settings saved successfully!</span>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-hafaloha-gold hover:bg-hafaloha-gold/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hafaloha-gold disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReservationsSettings;
