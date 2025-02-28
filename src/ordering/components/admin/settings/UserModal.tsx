// src/ordering/components/admin/settings/UserModal.tsx
import React, { useState } from 'react';
import { api } from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { formatPhoneNumber } from '../../../../shared/utils/formatters';

// Same phone check from SignUpForm
// Matches +3-4 digits for country/area code, plus exactly 7 digits => total 10 or 11 digits after the plus
function isValidPhone(phoneStr: string) {
  // Example: +16711234567 or +9251234567
  return /^\+\d{3,4}\d{7}$/.test(phoneStr);
}

interface User {
  id: number;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  role: string;
}

interface UserModalProps {
  user: User | null;
  isCreateMode: boolean;
  onClose: (didChange: boolean) => void;
  restaurantId?: string;
}

export function UserModal({ user, isCreateMode, onClose, restaurantId }: UserModalProps) {
  // If creating new => default phone to +1671; otherwise load existing phone
  const [email, setEmail] = useState(user?.email || '');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(
    isCreateMode ? '+1671' : user?.phone || ''
  );
  const [role, setRole] = useState(user?.role || 'customer');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const finalPhone = phone.trim();
      // If phone isn't blank => validate it
      if (finalPhone && !isValidPhone(finalPhone)) {
        toast.error('Phone must be + (3 or 4 digit area code) + 7 digits, e.g. +16711234567');
        return;
      }

      if (isCreateMode) {
        // POST /admin/users
        await api.post('/admin/users', {
          email,
          first_name: firstName,
          last_name: lastName,
          phone: finalPhone || undefined, // if blank => undefined
          role,
          restaurant_id: restaurantId
        });
        toast.success('User created!');
        onClose(true);
      } else if (user) {
        // PATCH /admin/users/:id
        await api.patch(`/admin/users/${user.id}`, {
          email,
          first_name: firstName,
          last_name: lastName,
          phone: finalPhone || undefined,
          role,
        });
        toast.success('User updated!');
        onClose(true);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save user.');
      onClose(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.email}? This cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await api.delete(`/admin/users/${user.id}`);
      toast.success('User deleted.');
      onClose(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete user.');
      onClose(false);
    } finally {
      setLoading(false);
    }
  }

  // Re-send (invite + reset link) => POST /admin/users/:id/resend_invite
  async function handleResendInvite() {
    if (!user) return;
    setLoading(true);
    try {
      await api.post(`/admin/users/${user.id}/resend_invite`, {});
      toast.success(`Invite/reset link sent to ${user.email}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send the invite/reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
        fixed inset-0 z-[9999] flex items-center justify-center
        bg-black bg-opacity-50
      "
    >
      <div className="bg-white w-full max-w-md rounded shadow-lg p-6 relative mx-2">
        <h2 className="text-xl font-semibold mb-4">
          {isCreateMode ? 'Create User' : 'Edit User'}
        </h2>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md
                         focus:ring-[#c1902f] focus:border-[#c1902f] p-2"
            />
          </div>

          {/* First & Last Name */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md
                           focus:ring-[#c1902f] focus:border-[#c1902f] p-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md
                           focus:ring-[#c1902f] focus:border-[#c1902f] p-2"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone <span className="text-red-500">*</span>
              <span className="ml-1 text-gray-500 text-xs" title="Enter in format: +16719893444">ⓘ</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1671"
              required
              className="mt-1 w-full border border-gray-300 rounded-md
                         focus:ring-[#c1902f] focus:border-[#c1902f] p-2"
            />
            {phone && (
              <p className="mt-1 text-sm text-gray-500">
                Will display as: {formatPhoneNumber(phone)}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md
                         focus:ring-[#c1902f] focus:border-[#c1902f] 
                         p-2 text-base"
            >
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end items-center space-x-2 mt-6">
          {/* (Re)send invite/reset link => only if existing user */}
          {!isCreateMode && (
            <button
              type="button"
              onClick={handleResendInvite}
              disabled={loading}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded 
                         hover:bg-blue-700"
            >
              Send Invite/Reset Link
            </button>
          )}

          {/* Delete => only if existing user */}
          {!isCreateMode && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-3 py-2 text-sm text-white bg-red-600 
                         rounded hover:bg-red-700"
            >
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={() => onClose(false)}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-300
                       rounded hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="px-3 py-2 text-sm text-white bg-[#c1902f]
                       rounded hover:bg-[#d4a43f]"
          >
            {loading ? 'Saving...' : isCreateMode ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
