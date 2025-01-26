// src/components/ReservationForm.tsx

import React, { useState, useEffect } from 'react';
import { Clock, Users, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchAvailability, createReservation } from '../services/api';

interface ReservationFormData {
  date: string;  // "YYYY-MM-DD"
  time: string;  // e.g. "17:30"
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export default function ReservationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If user has a phone in their profile, use that. Otherwise default to "+1671".
  // (If you never want to override the user's stored phone, remove this logic.)
  const initialPhone = user?.phone && user.phone.trim() !== ''
    ? user.phone
    : '+1671';

  // We'll keep most fields in formData
  const [formData, setFormData] = useState<ReservationFormData>({
    date: '',
    time: '',
    firstName: '',
    lastName: '',
    phone: initialPhone,  // Pre‐populate with +1671 if no user.phone
    email: '',
  });

  // Store party size as a string for free‐form editing
  const [partySizeText, setPartySizeText] = useState('1');

  // Additional field: how long a reservation lasts
  const [duration, setDuration] = useState(60);

  // We'll store timeslots from /availability here
  const [timeslots, setTimeslots] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // parse partySizeText => number
  function getPartySize(): number {
    return parseInt(partySizeText, 10) || 1;
  }

  /**
   * Whenever `formData.date` or `partySizeText` changes, fetch /availability
   */
  useEffect(() => {
    async function getTimeslots() {
      if (!formData.date || !getPartySize()) {
        setTimeslots([]);
        return;
      }
      try {
        const data = await fetchAvailability(formData.date, getPartySize());
        setTimeslots(data.slots || []);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setTimeslots([]);
      }
    }
    getTimeslots();
  }, [formData.date, partySizeText]);

  // Submit the form => createReservation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Combine date + chosen time into an ISO string for `start_time`
    if (!formData.date || !formData.time) {
      setError('Please pick a date and time.');
      return;
    }

    const start_time = `${formData.date}T${formData.time}:00`;

    // fallback logic for logged‐in user's data
    const contactFirstName = formData.firstName.trim()
      || (user ? user.name?.split(' ')[0] ?? '' : '');
    const contactLastName  = formData.lastName.trim()
      || (user ? user.name?.split(' ')[1] ?? '' : '');
    let contactPhone       = formData.phone.trim(); // We'll further clean up below
    const contactEmail     = formData.email.trim() || user?.email || '';

    // If no first name at all => error
    if (!contactFirstName) {
      setError('First name is required.');
      return;
    }

    // final numeric party size
    const finalPartySize = getPartySize();

    // --- PHONE CLEANUP: If user left it as just '+1671' (plus optional spaces/dashes) => no phone ---
    // remove typical separators
    const cleanedPhone = contactPhone.replace(/[-()\s]+/g, '');
    if (cleanedPhone === '+1671') {
      contactPhone = ''; // treat as no phone
    }

    try {
      // Create the reservation via API
      const newRes = await createReservation({
        start_time,
        party_size: finalPartySize,
        contact_name: [contactFirstName, contactLastName].filter(Boolean).join(' '),
        contact_phone: contactPhone,
        contact_email: contactEmail,
        restaurant_id: 1,
        duration_minutes: duration,
      });

      setSuccess('Reservation created successfully!');
      // navigate to a confirmation page with the new reservation
      navigate('/reservation-confirmation', {
        state: { reservation: newRes },
      });
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation. Please try again.');
    }
  };

  // Just a helper so we don't sprinkle `!!user` everywhere
  const isLoggedIn = !!user;

  /** Filter out non‐digit characters in Party Size */
  function handlePartySizeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPartySizeText(digitsOnly);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <div className="space-y-2">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 
                       rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
          />
        </div>

        {/* Time (Dropdown from timeslots) */}
        <div className="space-y-2">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">
            Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <select
              id="time"
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 border border-gray-300 
                         rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            >
              <option value="">-- Select a time --</option>
              {timeslots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Party Size: text-based numeric filtering */}
        <div className="space-y-2">
          <label htmlFor="partySize" className="block text-sm font-medium text-gray-700">
            Party Size
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              id="partySize"
              inputMode="numeric"
              pattern="[0-9]*"
              value={partySizeText}
              onChange={handlePartySizeChange}
              placeholder="1"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 
                         rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        {/* DURATION MINUTES */}
        <div className="space-y-2">
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
            Duration (minutes)
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(+e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 
                       rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
            <option value={240}>4 hours</option>
          </select>
        </div>

        {/* First Name */}
        <div className="space-y-2">
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            {isLoggedIn ? 'First Name (Optional)' : 'First Name (Required)'}
          </label>
          <input
            type="text"
            id="firstName"
            placeholder={isLoggedIn ? user?.name?.split(' ')[0] || '' : 'Enter your first name'}
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 
                       rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last Name (Optional)
          </label>
          <input
            type="text"
            id="lastName"
            placeholder={isLoggedIn ? user?.name?.split(' ')[1] || '' : 'Last name (optional)'}
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 
                       rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Phone (prepopulated with +1671 unless user already has a phone) */}
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone {isLoggedIn ? '(Optional)' : '(Required)'}
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="tel"
              id="phone"
              placeholder={isLoggedIn ? user?.phone ?? '' : '+1671'}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 
                         rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email {isLoggedIn ? '(Optional)' : '(Required)'}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="email"
              id="email"
              placeholder={isLoggedIn ? user?.email ?? '' : 'Enter your email'}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 
                         rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          className="w-full bg-orange-600 text-white py-3 px-6 rounded-md 
                     hover:bg-orange-700 transition-colors duration-200 font-semibold"
        >
          Reserve Now
        </button>
      </div>
    </form>
  );
}
