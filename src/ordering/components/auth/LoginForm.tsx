// src/ordering/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export function LoginForm() {
  const { signIn, loading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);

    if (!error) {
      // If successful => go to / => /ordering => index route
      navigate('/');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Welcome Back!</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            <Mail className="inline-block w-4 h-4 mr-2" />
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md
                       focus:ring-[#c1902f] focus:border-[#c1902f]"
            required
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            <Lock className="inline-block w-4 h-4 mr-2" />
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-4 text-sm text-center">
        {/* 
           Absolute => always go to /ordering/forgot-password 
           regardless of current route. 
        */}
        <Link to="/ordering/forgot-password" className="text-blue-600 hover:underline">
          Forgot Password?
        </Link>
      </div>
    </div>
  );
}
