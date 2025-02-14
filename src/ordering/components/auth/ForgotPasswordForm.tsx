// src/ordering/components/auth/ForgotPasswordForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../ordering/lib/api';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/password/forgot', { email });
      setMessage(res.message || 'Check your email for a reset link.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Forgot Password</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Enter your email address
          </label>
          <input
            type="email"
            id="email"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md
                       focus:ring-[#c1902f] focus:border-[#c1902f]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#c1902f] text-white py-2 px-4 rounded-md
                     hover:bg-[#d4a43f] transition-colors duration-200
                     disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="mt-4 text-sm text-center">
        <button
          type="button"
          onClick={() => navigate('/ordering/login')}
          className="text-blue-600 hover:underline"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
