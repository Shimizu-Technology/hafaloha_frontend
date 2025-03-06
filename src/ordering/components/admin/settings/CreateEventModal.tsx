import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X, Calendar } from 'lucide-react';
import { createSpecialEvent } from '../../../../shared/api/endpoints/specialEvents';
import { handleApiError } from '../../../../shared/utils/errorHandler';

interface CreateEventModalProps {
  restaurantId: number;
  onClose: () => void;
  onEventCreated: () => void;
}

export function CreateEventModal({ restaurantId, onClose, onEventCreated }: CreateEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    vip_only_checkout: false,
    code_prefix: 'VIP',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.event_date) {
      toast.error('Description and event date are required');
      return;
    }
    
    setLoading(true);
    
    try {
      await createSpecialEvent(restaurantId, formData);
      toast.success('Event created successfully');
      onEventCreated();
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Failed to create event:', errorMessage);
      toast.error(`Failed to create event: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Create Special Event</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Event Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Event Name/Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>
          
          {/* Event Date */}
          <div>
            <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline-block w-4 h-4 mr-1" />
              Event Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="event_date"
              name="event_date"
              value={formData.event_date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>
          
          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
          
          {/* VIP Only Checkout */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="vip_only_checkout"
              name="vip_only_checkout"
              checked={formData.vip_only_checkout}
              onChange={handleInputChange}
              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
            />
            <label htmlFor="vip_only_checkout" className="ml-2 block text-sm text-gray-900">
              VIP-Only Checkout
            </label>
          </div>
          
          {/* Code Prefix (only shown if VIP-Only is checked) */}
          {formData.vip_only_checkout && (
            <div>
              <label htmlFor="code_prefix" className="block text-sm font-medium text-gray-700 mb-1">
                VIP Code Prefix
              </label>
              <input
                type="text"
                id="code_prefix"
                name="code_prefix"
                value={formData.code_prefix}
                onChange={handleInputChange}
                placeholder="VIP"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                This prefix will be used for all VIP codes generated for this event (e.g., VIP-ABCD-1234)
              </p>
            </div>
          )}
          
          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
