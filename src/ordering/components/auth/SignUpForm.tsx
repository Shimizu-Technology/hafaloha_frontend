// src/ordering/components/auth/SignUpForm.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

/**
 * Allows a plus sign, then 3 or 4 digits for “country+area code,” then exactly 7 digits.
 * Examples:
 *   +16711234567  => 4 digits for area code (1671), then 7 digits
 *   +17025551234  => 4 digits (1702) + 7 digits
 *   +9251234567   => 3 digits (925) + 7 digits => total 10 digits after the plus
 */
function isValidPhone(phoneStr: string) {
  return /^\+\d{3,4}\d{7}$/.test(phoneStr);
}

export function SignUpForm() {
  const { signUp, loading, error } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    // Default to +1671 so they see the Guam code,
    // but they can edit to e.g. +1702 or +925 + ...
    phone: '+1671',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    // If "error" changes, we could display or handle it
  }, [error]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    const finalPhone = formData.phone.trim();
    if (!isValidPhone(finalPhone)) {
      toast.error(
        'Phone must be + (3 or 4 digit area code) + 7 digits, e.g. +16711234567'
      );
      return;
    }

    // Proceed with signUp
    await signUp(
      formData.email,
      formData.password,
      formData.firstName,
      formData.lastName,
      finalPhone
    );

    if (!useAuthStore.getState().error) {
      toast.success('Account created successfully!');
      // Navigate to phone verification
      navigate('/ordering/verify-phone');
    }
  }

  return (
    <div className="max-w-sm w-full mx-auto mt-8 px-6 py-8 bg-white shadow-xl rounded-lg border border-gray-100">
      <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-6">
        Create an Account
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            <User className="inline-block w-4 h-4 mr-1 text-[#c1902f]" />
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            placeholder="John"
            value={formData.firstName}
            onChange={handleChange}
            className="
              block w-full px-4 py-2 mt-1 text-base border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-transparent
              placeholder-gray-400
            "
            required
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            <User className="inline-block w-4 h-4 mr-1 text-[#c1902f]" />
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            className="
              block w-full px-4 py-2 mt-1 text-base border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-transparent
              placeholder-gray-400
            "
            required
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            <Mail className="inline-block w-4 h-4 mr-1 text-[#c1902f]" />
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            className="
              block w-full px-4 py-2 mt-1 text-base border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-transparent
              placeholder-gray-400
            "
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            <Phone className="inline-block w-4 h-4 mr-1 text-[#c1902f]" />
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="+1671"
            value={formData.phone}
            onChange={handleChange}
            className="
              block w-full px-4 py-2 mt-1 text-base border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-transparent
              placeholder-gray-400
            "
            required
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            <Lock className="inline-block w-4 h-4 mr-1 text-[#c1902f]" />
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            className="
              block w-full px-4 py-2 mt-1 text-base border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-transparent
              placeholder-gray-400
            "
            required
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            <Lock className="inline-block w-4 h-4 mr-1 text-[#c1902f]" />
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="
              block w-full px-4 py-2 mt-1 text-base border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-[#c1902f] focus:border-transparent
              placeholder-gray-400
            "
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="
            inline-flex items-center justify-center w-full px-4 py-3 mt-1 text-base font-medium
            text-white bg-[#c1902f] border border-transparent rounded-md
            hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]
            transition-colors duration-200 disabled:opacity-50
          "
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-gray-600">Already have an account?</p>
        <Link
          to="/ordering/login"
          className="font-medium text-blue-600 hover:underline"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
