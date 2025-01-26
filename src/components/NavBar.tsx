// src/components/NavBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Controls the mobile side drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  // For user info or sign in
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close user dropdown if user clicks outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Display name for logged‐in user
  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.email || 'Admin User';

  const phoneNumber = '671-649-7560';

  // Closes the entire mobile drawer
  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-orange-600">
                Rotary Sushi
              </span>
            </Link>
          </div>

          {/* Middle: phone number always visible */}
          <div className="flex items-center space-x-2 text-orange-600">
            <Phone className="w-5 h-5" />
            <span className="font-medium">{phoneNumber}</span>
          </div>

          {/* Right side: desktop user menu or hamburger */}
          <div className="flex items-center">
            {/* Desktop user menu (≥ md) */}
            <div className="hidden md:flex items-center space-x-4">
              {!user ? (
                // If not logged in => show Sign In
                <Link
                  to="/login"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign In
                </Link>
              ) : (
                // If logged in => user dropdown
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center space-x-1 text-gray-800 hover:text-gray-900 focus:outline-none"
                  >
                    <User className="w-5 h-5" />
                    <span>{displayName}</span>
                    {/* caret */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transform transition-transform duration-200 ${
                        showDropdown ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
                      <ul className="py-1 text-gray-700">
                        <li>
                          <Link
                            to="/profile"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setShowDropdown(false)}
                          >
                            My Profile
                          </Link>
                        </li>
                        {(user.role === 'admin' || user.role === 'staff') && (
                          <li>
                            <Link
                              to="/dashboard"
                              className="block px-4 py-2 hover:bg-gray-100"
                              onClick={() => setShowDropdown(false)}
                            >
                              Admin Dashboard
                            </Link>
                          </li>
                        )}
                        <li>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                          >
                            Sign Out
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hamburger button (shown on < md) */}
            <button
              className="md:hidden ml-2 text-gray-600 hover:text-gray-800 focus:outline-none"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER (only visible if drawerOpen===true) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* backdrop overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={closeDrawer}
          />
          {/* the drawer panel */}
          <div className="relative bg-white w-64 max-w-full h-full shadow-lg">
            {/* drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              {/* brand */}
              <Link
                to="/"
                className="text-xl font-bold text-orange-600"
                onClick={closeDrawer}
              >
                Rotary Sushi
              </Link>
              <button
                onClick={closeDrawer}
                className="text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* drawer body */}
            <div className="px-4 py-4 space-y-4">
              {/* phone number always visible */}
              <div className="flex items-center text-orange-600 space-x-2">
                <Phone className="w-5 h-5" />
                <span className="font-medium">{phoneNumber}</span>
              </div>

              {!user ? (
                <Link
                  to="/login"
                  onClick={closeDrawer}
                  className="block text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign In
                </Link>
              ) : (
                <>
                  <div className="flex items-center space-x-2 text-gray-800">
                    <User className="w-5 h-5" />
                    <span>{displayName}</span>
                  </div>
                  <ul className="space-y-1 text-gray-700 mt-2 ml-6">
                    <li>
                      <Link
                        to="/profile"
                        className="block px-2 py-1 hover:bg-gray-100 rounded"
                        onClick={closeDrawer}
                      >
                        My Profile
                      </Link>
                    </li>
                    {(user.role === 'admin' || user.role === 'staff') && (
                      <li>
                        <Link
                          to="/dashboard"
                          className="block px-2 py-1 hover:bg-gray-100 rounded"
                          onClick={closeDrawer}
                        >
                          Admin Dashboard
                        </Link>
                      </li>
                    )}
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          closeDrawer();
                          handleLogout();
                        }}
                        className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-red-600"
                      >
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
