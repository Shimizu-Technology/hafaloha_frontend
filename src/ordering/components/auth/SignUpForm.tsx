// src/ordering/components/auth/SignUpForm.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SignUpForm() {
  const { signUp, loading, error } = useAuthStore();

  // We store user input in local state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '+1671',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const navigate = useNavigate();

  // If we had an “onMount” check for something, or a side effect
  // to handle store error changes, we could do it here:
  useEffect(() => {
    // If “error” is present, we can highlight or show it, but we already do so in the UI below.
  }, [error]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    // Call signUp from the store
    await signUp(
      formData.email,
      formData.password,
      formData.firstName,
      formData.lastName,
      formData.phone
    );

    // The store sets “error” if something goes wrong.
    // Only navigate if error is still null (meaning success).
    if (!useAuthStore.getState().error) {
      navigate('/ordering'); 
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Create an Account</h2>

      {/* If the store has an error, show it */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            <User className="inline-block w-4 h-4 mr-2" />
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md
                       focus:ring-[#c1902f] focus:border-[#c1902f]"
            required
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            <User className="inline-block w-4 h-4 mr-2" />
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md
                       focus:ring-[#c1902f] focus:border-[#c1902f]"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            <Mail className="inline-block w-4 h-4 mr-2" />
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md
                       focus:ring-[#c1902f] focus:border-[#c1902f]"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            <Phone className="inline-block w-4 h-4 mr-2" />
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md
                       focus:ring-[#c1902f] focus:border-[#c1902f]"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            <Lock className="inline-block w-4 h-4 mr-2" />
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md
                       focus:ring-[#c1902f] focus:border-[#c1902f]"
            required
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            <Lock className="inline-block w-4 h-4 mr-2" />
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
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
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}
