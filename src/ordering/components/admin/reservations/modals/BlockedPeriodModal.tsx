// src/ordering/components/admin/reservations/modals/BlockedPeriodModal.tsx
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BlockedPeriod } from '../../../../../shared/api/endpoints/blockedPeriods';
import { Location } from '../../../../../shared/api/endpoints/locations';
import { format } from 'date-fns';

interface BlockedPeriodModalProps {
  blockedPeriod: Partial<BlockedPeriod> | null;
  locations: Location[];
  onClose: () => void;
  onSave: (blockedPeriod: Partial<BlockedPeriod>) => Promise<void>;
  restaurantId: number;
}

const BlockedPeriodModal: React.FC<BlockedPeriodModalProps> = ({ 
  blockedPeriod, 
  locations, 
  onClose, 
  onSave,
  restaurantId 
}) => {
  // Default start/end times to today at current hour and +1 hour
  const defaultStartDate = new Date();
  const defaultEndDate = new Date();
  defaultEndDate.setHours(defaultEndDate.getHours() + 1);

  // Initialize form data from existing blocked period or defaults
  const [formData, setFormData] = useState<Partial<BlockedPeriod>>(
    blockedPeriod || {
      restaurant_id: restaurantId,
      location_id: undefined,
      start_time: format(defaultStartDate, "yyyy-MM-dd'T'HH:mm:ss"),
      end_time: format(defaultEndDate, "yyyy-MM-dd'T'HH:mm:ss"),
      reason: '',
      status: 'active'
    }
  );
  
  // State for date pickers (to handle UI state separately from API format)
  const [startDate, setStartDate] = useState<Date>(
    blockedPeriod?.start_time ? new Date(blockedPeriod.start_time) : defaultStartDate
  );
  const [endDate, setEndDate] = useState<Date>(
    blockedPeriod?.end_time ? new Date(blockedPeriod.end_time) : defaultEndDate
  );
  
  const [errors, setErrors] = useState<Partial<Record<keyof BlockedPeriod, string>>>({});
  const [loading, setLoading] = useState(false);

  // Handle text input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is updated
    if (errors[name as keyof BlockedPeriod]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle date/time changes
  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      setStartDate(date);
      setFormData(prev => ({ 
        ...prev, 
        start_time: format(date, "yyyy-MM-dd'T'HH:mm:ss")
      }));
      
      // Clear error
      if (errors.start_time) {
        setErrors(prev => ({ ...prev, start_time: undefined }));
      }
      
      // Check if end_time error needs to be cleared (if date is now valid)
      if (errors.end_time && endDate > date) {
        setErrors(prev => ({ ...prev, end_time: undefined }));
      }
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      setEndDate(date);
      setFormData(prev => ({ 
        ...prev, 
        end_time: format(date, "yyyy-MM-dd'T'HH:mm:ss")
      }));
      
      // Clear error
      if (errors.end_time) {
        setErrors(prev => ({ ...prev, end_time: undefined }));
      }
    }
  };

  // Form validation
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BlockedPeriod, string>> = {};
    
    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }
    
    if (!formData.end_time) {
      newErrors.end_time = 'End time is required';
    }
    
    if (formData.start_time && formData.end_time && 
        new Date(formData.start_time) >= new Date(formData.end_time)) {
      newErrors.end_time = 'End time must be after start time';
    }
    
    if (!formData.reason) {
      newErrors.reason = 'Reason is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Ensure restaurant_id is set
      const dataToSave = {
        ...formData,
        restaurant_id: restaurantId
      };
      
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Error saving blocked period:', error);
      setErrors({ reason: 'Failed to save blocked period. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-hafaloha-gold">
          {blockedPeriod?.id ? 'Edit Blocked Period' : 'Create New Blocked Period'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Location selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (Optional)
            </label>
            <select
              value={formData.location_id || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                location_id: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-hafaloha-gold focus:border-hafaloha-gold transition-colors"
            >
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>
          
          {/* Start time */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time*
            </label>
            <DatePicker
              selected={startDate}
              onChange={handleStartDateChange}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
              className={`block w-full px-3 py-2 border rounded-md ${
                errors.start_time ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-hafaloha-gold focus:border-hafaloha-gold transition-colors`}
            />
            {errors.start_time && (
              <p className="text-red-500 text-xs mt-1">{errors.start_time}</p>
            )}
          </div>
          
          {/* End time */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time*
            </label>
            <DatePicker
              selected={endDate}
              onChange={handleEndDateChange}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
              className={`block w-full px-3 py-2 border rounded-md ${
                errors.end_time ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-hafaloha-gold focus:border-hafaloha-gold transition-colors`}
            />
            {errors.end_time && (
              <p className="text-red-500 text-xs mt-1">{errors.end_time}</p>
            )}
          </div>
          
          {/* Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason*
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              className={`block w-full px-3 py-2 border rounded-md ${
                errors.reason ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-hafaloha-gold focus:border-hafaloha-gold transition-colors`}
              placeholder="Reason for blocking this time period"
            />
            {errors.reason && (
              <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              onClick={onClose}
              type="button"
              className="w-full inline-flex justify-center px-4 py-2 bg-gray-200 border border-transparent rounded-md shadow-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-hafaloha-gold hover:bg-hafaloha-gold/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hafaloha-gold disabled:bg-hafaloha-gold/50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : blockedPeriod?.id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockedPeriodModal;
