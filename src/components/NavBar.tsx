import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.email || 'Admin User';

  // Real phone number here, make sure it's in a valid format for "tel"
  const phoneNumber = '+16719893444';  // example: +1 (671) 989-3444, no spaces or parentheses

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Brand/Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-hafaloha-pink">
                Håfaloha
              </span>
            </Link>
          </div>

          {/* Middle: phone number => clickable */}
          <div className="flex items-center space-x-2 text-hafaloha-pink">
            <Phone className="w-5 h-5" />
            {/* Wrap the phone number in an anchor with tel: */}
            <a 
              href={`tel:${phoneNumber}`} 
              className="font-medium hover:text-hafaloha-coral transition-colors"
            >
              +1 (671) 989-3444
            </a>
          </div>

          {/* Right side: Desktop user menu or hamburger */}
          <div className="flex items-center">
            <div className="hidden md:flex items-center space-x-4">
              {!user ? (
                <Link
                  to="/login"
                  className="text-hafaloha-pink hover:text-hafaloha-coral font-medium"
                >
                  Sign In
                </Link>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center space-x-1 text-gray-800 hover:text-gray-900 focus:outline-none"
                  >
                    <User className="w-5 h-5" />
                    <span>{displayName}</span>
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

      {/* MOBILE DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={closeDrawer}
          />
          <div className="relative bg-white w-64 max-w-full h-full shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <Link
                to="/"
                className="text-xl font-bold text-hafaloha-pink"
                onClick={closeDrawer}
              >
                Håfaloha
              </Link>
              <button
                onClick={closeDrawer}
                className="text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* phone number => clickable in mobile drawer */}
              <div className="flex items-center text-hafaloha-pink space-x-2">
                <Phone className="w-5 h-5" />
                <a 
                  href={`tel:${phoneNumber}`} 
                  className="font-medium hover:text-hafaloha-coral transition-colors"
                >
                  +1 (671) 989-3444
                </a>
              </div>

              {!user ? (
                <Link
                  to="/login"
                  onClick={closeDrawer}
                  className="block text-hafaloha-pink hover:text-hafaloha-coral font-medium"
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
