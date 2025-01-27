// src/components/SignupPage.tsx
import React, { useState } from 'react';
import { ChevronRight, Utensils } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 1) Import the signupUser helper
import { signupUser } from '../services/api';

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors]       = useState<string[]>([]);
  const [success, setSuccess]     = useState('');

  const { loginWithJwtUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccess('');

    try {
      // 2) Call our signupUser function
      const resp = await signupUser({
        first_name: firstName,
        last_name:  lastName,
        phone,
        email,
        password,
        password_confirmation: passwordConfirmation,
        restaurant_id: 1, // Hardcoded or dynamic
      });

      // 3) The API is expected to return something like { jwt, user }
      const { jwt, user } = resp;

      // Immediately log in after successful signup
      loginWithJwtUser(jwt, user);

      setSuccess('User created & logged in successfully!');
      navigate('/');
    } catch (err: any) {
      // If our server returns { errors: [...] } or something similar:
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors(['An error occurred.']);
      }
    }
  };

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br
        from-pink-100/60 /* subtle pink gradient */
        to-white
        relative
        px-4
        py-8 /* Slightly less vertical padding so content appears higher */
        sm:px-6
        lg:px-8
      "
    >
      {/* Optional faint pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        {/* e.g., wave or subtle pattern */}
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto mt-16 sm:mt-20">
        {/* Logo or icon */}
        <div className="flex justify-center mb-6">
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

        <div className="bg-white py-8 px-6 shadow-md rounded-lg">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Create an Account
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600">
            Sign up to manage reservations and seating
          </p>

          {/* Success or Errors */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-4">
              {success}
            </div>
          )}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
              {errors.map((error, i) => (
                <p key={i}>{error}</p>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* First Name */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                placeholder="John"
                className="
                  w-full px-3 py-3 text-base
                  border border-gray-300
                  rounded-md
                  focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
                "
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Doe"
                className="
                  w-full px-3 py-3 text-base
                  border border-gray-300
                  rounded-md
                  focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
                "
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            {/* Phone (optional) */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">
                Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="(Optional) Phone number"
                className="
                  w-full px-3 py-3 text-base
                  border border-gray-300
                  rounded-md
                  focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
                "
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                className="
                  w-full px-3 py-3 text-base
                  border border-gray-300
                  rounded-md
                  focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
                "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter a strong password"
                className="
                  w-full px-3 py-3 text-base
                  border border-gray-300
                  rounded-md
                  focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
                "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm Password"
                className="
                  w-full px-3 py-3 text-base
                  border border-gray-300
                  rounded-md
                  focus:ring-2 focus:ring-hafaloha-pink focus:border-hafaloha-pink
                "
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
              />
            </div>

            {/* Submit Button */}
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
                Sign Up
              </button>
            </div>
          </form>

          {/* Link to Login */}
          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="
                text-hafaloha-pink
                hover:text-hafaloha-coral
                font-medium
              "
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
