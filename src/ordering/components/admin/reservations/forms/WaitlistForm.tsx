// src/ordering/components/admin/reservations/forms/WaitlistForm.tsx
import { useState, useEffect } from 'react';
import { Users, User, Phone, Clock } from 'lucide-react';
import toastUtils from '../../../../../shared/utils/toastUtils';
import { useRestaurantStore } from '../../../../../shared/store/restaurantStore';

interface WaitlistFormData {
  name: string;
  partySize: number;
  phone: string;
  estimatedWaitTime: number; // in minutes
  notes: string;
}

interface WaitlistFormProps {
  onClose?: () => void;
  onSuccess?: (entry: any) => void;
}

export default function WaitlistForm({ onClose, onSuccess }: WaitlistFormProps) {
  const restaurant = useRestaurantStore(state => state.restaurant);
  
  // Error state for tenant validation
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<WaitlistFormData>({
    name: '',
    partySize: 2,
    phone: '',
    estimatedWaitTime: 30,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Validate tenant context
  useEffect(() => {
    const restaurant = useRestaurantStore.getState().restaurant;
    if (!restaurant || !restaurant.id) {
      setError('Restaurant context is required to add to waitlist');
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePartySizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    // Limit party size to reasonable range
    const boundedValue = Math.max(1, Math.min(value, 20));
    
    setFormData(prev => ({
      ...prev,
      partySize: boundedValue,
    }));
  };

  const handleEstimatedWaitTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 15;
    // Limit wait time to reasonable range (15 min to 3 hours)
    const boundedValue = Math.max(15, Math.min(value, 180));
    
    setFormData(prev => ({
      ...prev,
      estimatedWaitTime: boundedValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate restaurant context
    const restaurant = useRestaurantStore.getState().restaurant;
    if (!restaurant || !restaurant.id) {
      setError('Restaurant context is required to add to waitlist');
      return;
    }
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toastUtils.error('Name and phone number are required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use fetchWaitlistEntries.create method (which doesn't exist yet but we'll add it)
      // We're using a POST request to create a waitlist entry
      const response = await fetch('/api/waitlist_entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_name: formData.name,
          party_size: formData.partySize,
          contact_phone: formData.phone,
          check_in_time: new Date().toISOString(),
          status: 'waiting',
          estimated_wait_time: formData.estimatedWaitTime,
          notes: formData.notes,
          restaurant_id: restaurant.id,
        }),
      }).then(res => res.json());

      toastUtils.success('Added to waitlist successfully!');
      
      // Reset form
      setFormData({
        name: '',
        partySize: 2,
        phone: '',
        estimatedWaitTime: 30,
        notes: '',
      });
      
      // Call success callback if provided
      if (onSuccess && response.data) {
        onSuccess(response.data);
      }
      
      // Close modal if onClose provided
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      console.error('Error adding to waitlist:', err);
      toastUtils.error('Failed to add to waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Error display
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="bg-hafaloha-gold text-white p-4">
        <h2 className="text-xl font-bold">Add to Waitlist</h2>
        <p className="text-sm opacity-90">
          {restaurant?.name || 'Restaurant'} • {typeof restaurant?.address === 'string' ? restaurant?.address : 'Location'}
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Guest's name"
              className="
                flex-grow p-2.5 border border-gray-300 rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold/50 transition-colors
              "
            />
          </div>
        </div>
        
        {/* Party Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Party Size *
          </label>
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-400 mr-2" />
            <input
              type="number"
              min="1"
              max="20"
              value={formData.partySize}
              onChange={handlePartySizeChange}
              required
              className="
                flex-grow p-2.5 border border-gray-300 rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold/50 transition-colors
              "
            />
          </div>
        </div>
        
        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-gray-400 mr-2" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              placeholder="(555) 555-5555"
              className="
                flex-grow p-2.5 border border-gray-300 rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold/50 transition-colors
              "
            />
          </div>
        </div>
        
        {/* Estimated Wait Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Wait Time (minutes) *
          </label>
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-400 mr-2" />
            <input
              type="number"
              min="15"
              max="180"
              value={formData.estimatedWaitTime}
              onChange={handleEstimatedWaitTimeChange}
              required
              className="
                flex-grow p-2.5 border border-gray-300 rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold/50 transition-colors
              "
            />
          </div>
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            className="
              w-full p-2.5 border border-gray-300 rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-hafaloha-gold/30 focus:border-hafaloha-gold/50 transition-colors
            "
            placeholder="Special requests or additional information..."
          />
        </div>
        
        {/* Footer with buttons */}
        <div className="pt-4 flex justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              px-4 py-2.5 rounded-md shadow-sm transition-colors
              ${isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-hafaloha-gold text-white hover:bg-hafaloha-gold/90 active:bg-hafaloha-gold/80'}
            `}
          >
            {isSubmitting ? 'Adding...' : 'Add to Waitlist'}
          </button>
        </div>
      </form>
    </div>
  );
}
