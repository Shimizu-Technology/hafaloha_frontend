import React, { useState } from 'react';
import { X, Calendar, Clock, Users, Phone, Mail, MapPin, Share2 } from 'lucide-react';

interface ReservationModalProps {
  onClose: () => void;
}

interface ReservationData {
  date: string;
  time: string;
  partySize: number;
  duration: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

interface ConfirmationData extends ReservationData {
  confirmed: boolean;
}

export function ReservationModal({ onClose }: ReservationModalProps) {
  const [formData, setFormData] = useState<ReservationData>({
    date: '',
    time: '',
    partySize: 1,
    duration: '1 hour',
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Here you would typically make an API call to your reservation backend
    // For now, we'll simulate a successful reservation
    setConfirmation({
      ...formData,
      confirmed: true
    });
  };

  const handleShare = () => {
    if (confirmation) {
      const text = `I just made a reservation at Håfaloha!\n\nDate: ${confirmation.date}\nTime: ${confirmation.time}\nParty Size: ${confirmation.partySize} people`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Håfaloha Reservation',
          text: text
        }).catch(console.error);
      }
    }
  };

  if (confirmation) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          
          <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Reservation Confirmed!</h3>
              <p className="mt-2 text-sm text-gray-500">
                Thank you! We're excited to serve you at Håfaloha.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#c1902f]" />
                  Date & Time
                </h4>
                <p className="mt-1 text-gray-600">
                  {confirmation.date} at {confirmation.time}
                </p>
                <p className="text-sm text-gray-500">{confirmation.duration}</p>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#c1902f]" />
                  Party Size
                </h4>
                <p className="mt-1 text-gray-600">
                  {confirmation.partySize} {confirmation.partySize === 1 ? 'person' : 'people'}
                </p>
              </div>

              {(confirmation.phone || confirmation.email) && (
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#c1902f]" />
                    Contact Information
                  </h4>
                  {confirmation.phone && (
                    <p className="mt-1 text-gray-600">{confirmation.phone}</p>
                  )}
                  {confirmation.email && (
                    <p className="text-gray-600">{confirmation.email}</p>
                  )}
                </div>
              )}

              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#c1902f]" />
                  Location
                </h4>
                <p className="mt-1 text-gray-600">
                  955 Pale San Vitores Rd<br />
                  Tamuning, Guam 96913
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-md bg-[#c1902f] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#d4a43f]"
              >
                Done
              </button>
              <button
                onClick={handleShare}
                className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <Share2 className="h-4 w-4 inline-block mr-2" />
                Share Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              onClick={onClose}
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div>
            <div className="text-center">
              <h3 className="text-xl font-semibold">Make a Reservation</h3>
              <p className="mt-2 text-sm text-gray-500">
                Book your seat at our restaurant for a unique dining experience
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Time
                  </label>
                  <select
                    required
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  >
                    <option value="">Select a time</option>
                    {Array.from({ length: 11 }, (_, i) => i + 11).map(hour => (
                      <option key={hour} value={`${hour}:00`}>
                        {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Party Size
                  </label>
                  <select
                    required
                    value={formData.partySize}
                    onChange={e => setFormData({ ...formData, partySize: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(size => (
                      <option key={size} value={size}>
                        {size} {size === 1 ? 'person' : 'people'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Duration
                  </label>
                  <select
                    required
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  >
                    <option value="1 hour">1 hour</option>
                    <option value="1.5 hours">1.5 hours</option>
                    <option value="2 hours">2 hours</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="671-123-4567"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#c1902f] focus:outline-none focus:ring-1 focus:ring-[#c1902f]"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full rounded-md bg-[#c1902f] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#d4a43f]"
                >
                  Reserve Now
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}