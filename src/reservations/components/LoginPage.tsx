// src/components/LoginPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Utensils, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from);
    } catch {
      setError('Invalid email or password');
    }
  };

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-pink-100/60 /* subtle pink */
        to-white
        relative
        px-4
        py-8  /* Slightly reduced vertical padding for a higher card */
        sm:px-6
        lg:px-8
      "
    >
      {/* Optional faint pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        {/* e.g., wave or subtle pattern */}
      </div>

      {/* Main container */}
      <div className="relative z-10 w-full max-w-md mx-auto mt-16 sm:mt-20">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div
            className="
              w-20 h-20
              bg-hafaloha-pink
              rounded-full
              flex
              items-center
              justify-center
              shadow-lg
              transform
              hover:rotate-180
              transition-transform
              duration-500
            "
          >
            <Utensils className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-6 shadow-md rounded-lg">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600">
            Sign in to manage reservations and seating
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-base font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    w-full
                    border border-gray-300
                    px-3 py-3
                    text-base
                    rounded-md
                    shadow-sm
                    focus:outline-none
                    focus:ring-2
                    focus:ring-hafaloha-pink
                    focus:border-hafaloha-pink
                  "
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-base font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="
                    w-full
                    border border-gray-300
                    px-3 py-3
                    text-base
                    rounded-md
                    shadow-sm
                    focus:outline-none
                    focus:ring-2
                    focus:ring-hafaloha-pink
                    focus:border-hafaloha-pink
                  "
                />
              </div>
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                className="
                  relative
                  w-full
                  flex
                  justify-center
                  px-4 py-3
                  text-base font-medium
                  text-white
                  bg-hafaloha-pink
                  hover:bg-hafaloha-coral
                  rounded-md
                  shadow-sm
                  focus:outline-none
                  focus:ring-2
                  focus:ring-offset-2
                  focus:ring-hafaloha-pink
                  transition-colors
                "
              >
                <span className="absolute right-3 inset-y-0 flex items-center">
                  <ChevronRight className="h-5 w-5 text-pink-200 group-hover:text-pink-100 transition-colors" />
                </span>
                Sign In
              </button>
            </div>
          </form>

          {/* "Don't have an account?" */}
          <div className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="
                text-hafaloha-pink
                hover:text-hafaloha-coral
                font-medium
              "
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
