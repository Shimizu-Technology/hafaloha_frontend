// src/ordering/components/profile/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

export function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // form fields
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [email,     setEmail]     = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    setError(null);
    try {
      const me = await api.get('/profile'); // GET /profile
      setFirstName(me.first_name || '');
      setLastName(me.last_name || '');
      setPhone(me.phone || '');
      setEmail(me.email || '');
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
      await api.patch('/profile', {
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
      });

      // Show success toast
      toast.success('Profile updated successfully!');

      // OPTIONAL: Keep the "Saving..." state visible for ~0.5s
      // to avoid a sudden flicker when the request finishes quickly.
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
      {/* Card container with a more pronounced shadow */}
      <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-6 sm:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

        {/* If there's an error, show it */}
        {error && (
          <div className="text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {/* If loading, show a small loading text */}
        {loading && <p className="text-sm text-gray-500">Saving...</p>}

        {/* Profile form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* First & Last Name in a 2-column grid on wider screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm
                           focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>

            {/* Last Name */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm
                           focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone
            </label>
            <input
              id="phone"
              type="text"
              placeholder="+1 (671) 123-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm
                         focus:ring-[#c1902f] focus:border-[#c1902f]"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm
                         focus:ring-[#c1902f] focus:border-[#c1902f]"
            />
          </div>

          {/* Save button */}
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
