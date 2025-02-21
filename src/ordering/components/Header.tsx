// src/ordering/components/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingCart,
  Menu as MenuIcon,
  X,
  Clock,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { toast } from 'react-hot-toast';

export function Header() {
  const { user, signOut } = useAuthStore();

  // Cart items
  const cartItems = useOrderStore((state) => state.cartItems);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Animate cart icon
  const [cartBounce, setCartBounce] = useState(false);
  const prevCartCountRef = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      setCartBounce(true);
      const timer = setTimeout(() => setCartBounce(false), 300);
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  // Mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile/Admin dropdown (desktop)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Admin check
  const isAdmin = user?.role === 'admin';

  // Display name
  const firstName = user?.first_name || user?.email || 'Guest';

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <button
            className="p-2 rounded-md text-gray-700 hover:bg-gray-200 active:scale-95 lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </button>

          {/* Logo => link to "/" */}
          <Link
            to="/"
            className="
              flex items-center text-2xl font-bold text-gray-900
              hover:text-black transition-colors
            "
          >
            håfaloha!
          </Link>

          {/* Desktop Nav (hidden on mobile) */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/menu"
              className="text-gray-700 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 active:scale-95"
            >
              Menu
            </Link>
            <div className="flex items-center text-gray-700 whitespace-nowrap">
              <Clock className="h-4 w-4 mr-2" />
              <span>11AM-9PM</span>
            </div>
            <div className="flex items-center text-gray-700 whitespace-nowrap">
              <MapPin className="h-4 w-4 mr-2" />
              <span>Tamuning</span>
            </div>
            <a
              href="tel:+16719893444"
              className="flex items-center text-gray-700 whitespace-nowrap hover:text-gray-900"
            >
              <Phone className="h-4 w-4 mr-2" />
              (671) 989-3444
            </a>
          </nav>

          {/* Right side: Profile & Cart */}
          <div className="flex items-center space-x-4">
            {/* If user is logged in => dropdown */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  className="flex items-center text-gray-700 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 active:scale-95"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <User className="h-6 w-6" />
                  <span className="ml-2 hidden lg:inline">{firstName}</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50">
                    {/* Admin Tools if isAdmin */}
                    {isAdmin && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400">
                          Admin Tools
                        </div>
                        <Link
                          to="/reservations/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          Manage Reservations
                        </Link>
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                        <hr className="my-1" />
                      </>
                    )}

                    {/* Normal user links */}
                    <Link
                      to="/orders"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Order History
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      My Profile
                    </Link>
                    <hr className="my-1" />

                    <button
                      onClick={() => {
                        signOut();
                        toast.success('Signed out successfully!');
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // If not logged in => show Sign In/Up (desktop only)
              <div className="hidden lg:flex space-x-2">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 active:scale-95"
                >
                  Sign In
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  to="/signup"
                  className="text-gray-700 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Cart icon */}
            <Link
              to="/cart"
              className="p-2 relative text-gray-700 hover:text-gray-900 hover:bg-gray-200 active:scale-95 rounded-md"
              aria-label="Shopping cart"
            >
              <ShoppingCart
                className={`h-6 w-6 ${cartBounce ? 'animate-bounce' : ''}`}
              />
              {cartCount > 0 && (
                <span
                  className="
                    absolute -top-1 -right-1 
                    bg-[#c1902f] text-white text-xs font-bold
                    rounded-full h-5 w-5 flex items-center justify-center
                  "
                >
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu => shows if isMobileMenuOpen */}
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/menu"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700
                         hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Menu
            </Link>
            <div className="px-3 py-2 text-base font-medium text-gray-700 flex items-center">
              <Clock className="inline-block h-4 w-4 mr-2" />
              11AM-9PM
            </div>
            <div className="px-3 py-2 text-base font-medium text-gray-700 flex items-center">
              <MapPin className="inline-block h-4 w-4 mr-2" />
              Tamuning
            </div>
            <a
              href="tel:+16719893444"
              className="
                block px-3 py-2 text-base font-medium text-gray-700
                hover:text-gray-900 hover:bg-gray-50
                flex items-center
              "
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Phone className="inline-block h-4 w-4 mr-2" />
              (671) 989-3444
            </a>

            {user ? (
              <>
                {isAdmin && (
                  <>
                    <div className="px-3 py-1 text-xs font-semibold text-gray-400">
                      Admin Tools
                    </div>
                    <Link
                      to="/reservations/dashboard"
                      className="block px-3 py-2 rounded-md text-base font-medium
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Manage Reservations
                    </Link>
                    <Link
                      to="/admin"
                      className="block px-3 py-2 rounded-md text-base font-medium
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                    <hr className="my-1" />
                  </>
                )}

                <Link
                  to="/orders"
                  className="block px-3 py-2 rounded-md text-base font-medium
                             text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Order History
                </Link>
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium
                             text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Profile
                </Link>
                <hr className="my-1" />

                <button
                  onClick={() => {
                    signOut();
                    toast.success('Signed out successfully!');
                    setIsMobileMenuOpen(false);
                  }}
                  className="
                    block w-full text-left px-3 py-2 rounded-md text-base font-medium
                    text-gray-700 hover:text-gray-900 hover:bg-gray-50
                  "
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="
                    block px-3 py-2 rounded-md text-base font-medium
                    text-gray-700 hover:text-gray-900 hover:bg-gray-50
                  "
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="
                    block px-3 py-2 rounded-md text-base font-medium
                    text-gray-700 hover:text-gray-900 hover:bg-gray-50
                  "
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
