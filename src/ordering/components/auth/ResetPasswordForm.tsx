// src/ordering/components/auth/ResetPasswordForm.tsx
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../../ordering/lib/api';
import { useAuthStore } from '../../../ordering/store/authStore';

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const navigate = useNavigate();
  // Access the store method
  const { setUserFromResponse } = useAuthStore.getState();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!token || !email) {
      setError('Invalid or missing token/email.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // Expect { message, jwt, user } from /password/reset
      const response = await api.patch('/password/reset', {
        email,
        token,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });

      // If the backend includes { jwt, user }, sign them in
      if (response.jwt && response.user) {
        setUserFromResponse({ jwt: response.jwt, user: response.user });
      }

      setSuccessMsg('Password reset successfully. Redirecting...');
      setTimeout(() => {
        navigate('/ordering'); // or navigate('/')
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Reset Your Password</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md
                       focus:ring-[#c1902f] focus:border-[#c1902f]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md
                       focus:ring-[#c1902f] focus:border-[#c1902f]"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#c1902f] text-white py-2 px-4 rounded-md
                     hover:bg-[#d4a43f] transition-colors duration-200
                     disabled:opacity-50"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
