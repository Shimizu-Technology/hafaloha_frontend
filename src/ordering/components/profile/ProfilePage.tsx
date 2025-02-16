// src/ordering/components/profile/ProfilePage.tsx

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export function ProfilePage() {
  const { user, updateUser } = useAuthStore(); // Read + update the user from zustand

  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // form fields
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [email,     setEmail]     = useState('');

  useEffect(() => {
    // If we have a user in the store, populate the form with it
    if (user) {
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
      setPhone(user.phone ?? '');
      setEmail(user.email ?? '');
    } else {
      fetchProfile(); // or redirect if no user?
    }
    // eslint-disable-next-line
  }, []);

  async function fetchProfile() {
    setLoading(true);
    setError(null);
    try {
      // GET /profile returns the logged-in user's info
      const me = await api.get('/profile');
      setFirstName(me.first_name || '');
      setLastName(me.last_name || '');
      setPhone(me.phone || '');
      setEmail(me.email || '');

      // Optionally, also call updateUser(me) if you want to sync the store
      updateUser(me);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('No user in store. Are you logged in?');
      }

      // 1) Patch => updated user
      const updatedUser = await api.patch('/profile', {
        user: {
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
        },
      });

      // 2) Update the authStore => triggers Header re-render with new name
      updateUser(updatedUser);

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
      <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-6 sm:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

        {error && (
          <div className="text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {loading && <p className="text-sm text-gray-500">Saving...</p>}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>
            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              placeholder="+1 (671) 123-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#c1902f] focus:border-[#c1902f]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#c1902f] focus:border-[#c1902f]"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="
                inline-flex items-center px-5 py-2
                bg-[#c1902f] text-white font-medium
                rounded-md hover:bg-[#d4a43f]
                focus:outline-none focus:ring-2 focus:ring-offset-2
                focus:ring-[#c1902f] active:scale-95
              "
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
