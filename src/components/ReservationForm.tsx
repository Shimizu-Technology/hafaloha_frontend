// src/components/ReservationForm.tsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import Select, { SingleValue } from 'react-select';

import { Clock, Users, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { fetchAvailability, createReservation } from '../services/api';

/** Helpers */
function formatYYYYMMDD(dateObj: Date): string {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function parseYYYYMMDD(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function format12hSlot(slot: string) {
  const [hhStr, mmStr] = slot.split(':');
  const hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  const d = new Date(2020, 0, 1, hh, mm);
  return d.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** React Select types */
interface TimeOption {
  value: string; // e.g. "17:30"
  label: string; // e.g. "5:30 PM"
}
interface DurationOption {
  value: number; // e.g. 60
  label: string; // e.g. "1 hour"
}

/** Form interface */
interface ReservationFormData {
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export default function ReservationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If user has phone, otherwise default
  const initialPhone = user?.phone && user.phone.trim() !== ''
    ? user.phone
    : '+1671';

  const [formData, setFormData] = useState<ReservationFormData>({
    date: '',
    time: '',
    firstName: '',
    lastName: '',
    phone: initialPhone,
    email: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [partySizeText, setPartySizeText] = useState('1');
  const [duration, setDuration] = useState(60); // numeric

  const [timeslots, setTimeslots] = useState<string[]>([]);

  // Convert “Party Size”
  function getPartySize(): number {
    return parseInt(partySizeText, 10) || 1;
  }

  // Load timeslots
  useEffect(() => {
    async function loadTimes() {
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
    loadTimes();
  }, [formData.date, partySizeText]);

  // Build time options
  const timeOptions: TimeOption[] = timeslots.map((slot) => ({
    value: slot,
    label: format12hSlot(slot),
  }));

  // Build duration options
  const durations = [30, 60, 90, 120, 180, 240];
  const durationOptions: DurationOption[] = durations.map((val) => {
    if (val === 30) return { value: 30, label: '30 minutes' };
    if (val === 60) return { value: 60, label: '1 hour' };
    return { value: val, label: `${val / 60} hours` };
  });

  // Date picking
  function handleDateChange(date: Date | null) {
    setSelectedDate(date);
    setFormData({ ...formData, date: date ? formatYYYYMMDD(date) : '' });
  }

  // Keep in sync
  useEffect(() => {
    if (formData.date) {
      const parsed = parseYYYYMMDD(formData.date);
      setSelectedDate(parsed);
    } else {
      setSelectedDate(null);
    }
  }, [formData.date]);

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.date || !formData.time) {
      toast.error('Please pick a date and time.');
      return;
    }

    const start_time = `${formData.date}T${formData.time}:00`;
    const contactFirstName =
      formData.firstName.trim()
      || (user ? user.name?.split(' ')[0] ?? '' : '');
    const contactLastName =
      formData.lastName.trim()
      || (user ? user.name?.split(' ')[1] ?? '' : '');
    let contactPhone = formData.phone.trim();
    const contactEmail = formData.email.trim() || user?.email || '';

    if (!contactFirstName) {
      toast.error('First name is required.');
      return;
    }

    const finalPartySize = getPartySize();
    const cleanedPhone = contactPhone.replace(/[-()\s]+/g, '');
    if (cleanedPhone === '+1671') {
      contactPhone = '';
    }

    try {
      const newRes = await createReservation({
        start_time,
        party_size: finalPartySize,
        contact_name: [contactFirstName, contactLastName].filter(Boolean).join(' '),
        contact_phone: contactPhone,
        contact_email: contactEmail,
        restaurant_id: 1,
        duration_minutes: duration,
      });

      toast.success('Reservation created successfully!');
      navigate('/reservation-confirmation', {
        state: { reservation: newRes },
      });
    } catch (err) {
      console.error('Error creating reservation:', err);
      toast.error('Failed to create reservation. Please try again.');
    }
  }

  function handlePartySizeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPartySizeText(digitsOnly);
  }

  const isLoggedIn = !!user;

  // Custom React Select styles
  const reactSelectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: '2.25rem',
      borderColor: '#D1D5DB',
      fontSize: '0.875rem', // text-sm
      boxShadow: 'none',
      paddingLeft: '2rem', // add left padding so icon doesn’t overlap
      '&:hover': { borderColor: '#EB578C' }, // pink
    }),
    option: (base: any, state: any) => ({
      ...base,
      fontSize: '0.875rem',
      color: state.isSelected ? 'white' : '#374151', // gray-700
      backgroundColor: state.isSelected ? '#EB578C' : 'white',
      '&:hover': { backgroundColor: '#FF7F6A' }, // coral
    }),
    menu: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="
        w-full
        text-sm sm:text-base
        max-w-[90vw] sm:max-w-md
        max-h-[75vh]
        overflow-y-auto
        mx-auto
        bg-white
        rounded-lg
        shadow-md
        p-3 sm:p-4
      "
      style={{ WebkitTextSizeAdjust: 'none' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Date */}
        <div className="space-y-1">
          <label className="block font-medium text-gray-700 text-sm sm:text-base">
            Date
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="MM/dd/yyyy"
            minDate={new Date()}
            className="
              w-full px-3 py-2
              border border-gray-300
              rounded-md
              focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
              text-sm sm:text-base
            "
            placeholderText="Select date"
            required
            shouldCloseOnSelect
          />
        </div>

        {/* Time => React Select */}
        <div className="space-y-1">
          <label className="block font-medium text-gray-700 text-sm sm:text-base">
            Time
          </label>
          <div className="relative">
            {/* Place icon absolutely, and rely on the Select’s paddingLeft */}
            <Clock
              className="
                absolute
                left-3
                top-1/2
                transform -translate-y-1/2
                h-5 w-5
                text-gray-400
              "
            />
            <Select<TimeOption>
              options={timeOptions}
              placeholder="Select a time"
              value={
                formData.time
                  ? timeOptions.find((opt) => opt.value === formData.time)
                  : null
              }
              onChange={(option: SingleValue<TimeOption>) => {
                setFormData({ ...formData, time: option?.value || '' });
              }}
              styles={reactSelectStyles}
            />
          </div>
        </div>

        {/* Party Size */}
        <div className="space-y-1">
          <label
            htmlFor="partySize"
            className="block font-medium text-gray-700 text-sm sm:text-base"
          >
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
              required
              className="
                w-full pl-10 pr-3 py-2
                border border-gray-300
                rounded-md
                focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
                text-sm sm:text-base
              "
            />
          </div>
        </div>

        {/* Duration => React Select */}
        <div className="space-y-1">
          <label className="block font-medium text-gray-700 text-sm sm:text-base">
            Duration (minutes)
          </label>
          <Select<DurationOption>
            options={durationOptions}
            placeholder="Select duration"
            value={durationOptions.find((opt) => opt.value === duration) || null}
            onChange={(opt) => setDuration(opt?.value || 60)}
            styles={reactSelectStyles}
          />
        </div>

        {/* First Name */}
        <div className="space-y-1">
          <label
            htmlFor="firstName"
            className="block font-medium text-gray-700 text-sm sm:text-base"
          >
            {isLoggedIn ? 'First Name (Optional)' : 'First Name (Required)'}
          </label>
          <input
            type="text"
            id="firstName"
            placeholder={
              isLoggedIn
                ? user?.name?.split(' ')[0] || ''
                : 'Enter your first name'
            }
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="
              w-full px-3 py-2
              border border-gray-300
              rounded-md
              focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
              text-sm sm:text-base
            "
          />
        </div>

        {/* Last Name */}
        <div className="space-y-1">
          <label
            htmlFor="lastName"
            className="block font-medium text-gray-700 text-sm sm:text-base"
          >
            Last Name (Optional)
          </label>
          <input
            type="text"
            id="lastName"
            placeholder={
              isLoggedIn ? user?.name?.split(' ')[1] || '' : 'Last name (optional)'
            }
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="
              w-full px-3 py-2
              border border-gray-300
              rounded-md
              focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
              text-sm sm:text-base
            "
          />
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label
            htmlFor="phone"
            className="block font-medium text-gray-700 text-sm sm:text-base"
          >
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
              className="
                w-full pl-10 pr-3 py-2
                border border-gray-300
                rounded-md
                focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
                text-sm sm:text-base
              "
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block font-medium text-gray-700 text-sm sm:text-base"
          >
            Email {isLoggedIn ? '(Optional)' : '(Required)'}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="email"
              id="email"
              placeholder={
                isLoggedIn ? user?.email ?? '' : 'Enter your email'
              }
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="
                w-full pl-10 pr-3 py-2
                border border-gray-300
                rounded-md
                focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
                text-sm sm:text-base
              "
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-4 sm:mt-6">
        <button
          type="submit"
          className="
            w-full
            bg-hafaloha-pink
            hover:bg-hafaloha-coral
            text-white
            py-2
            sm:py-3
            px-4
            sm:px-6
            rounded-md
            font-semibold
            transition-colors
            duration-200
            text-sm sm:text-base
          "
        >
          Reserve Now
        </button>
      </div>
    </form>
  );
}
