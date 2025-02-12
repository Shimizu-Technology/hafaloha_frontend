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
import { useAuth0 } from '@auth0/auth0-react';   // <-- Auth0
import { useOrders } from '../hooks/useOrders'; // <-- Our new Orders hook

export function Header() {
  // Auth0
  const { user, isAuthenticated, logout } = useAuth0();

  // CART from useOrders
  const { cartItems } = useOrders();
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Bounce animation
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

  // Mobile menu + user dropdown
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // If you have a custom logic for admin checks:
  // const isAdmin = user?.['https://hafaloha.com/roles']?.includes('admin');
  const isAdmin = false;

  // Pick a nice display name or fallback
  const firstName = user?.name || user?.email || 'Guest';

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Mobile menu toggle */}
          <button
            className="p-2 rounded-md text-gray-700 lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </button>

          {/* Logo => /ordering */}
          <Link to="/ordering" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">håfaloha!</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link to="/ordering/menu" className="text-gray-700 hover:text-gray-900">
              Menu
            </Link>
            <div className="flex items-center text-gray-700">
              <Clock className="h-4 w-4 mr-2" />
              <span>11AM-9PM</span>
            </div>
            <div className="flex items-center text-gray-700">
              <MapPin className="h-4 w-4 mr-2" />
              <span>Tamuning</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Phone className="h-4 w-4 mr-2" />
              <span>(671) 989-3444</span>
            </div>
          </nav>

          {/* Right side: Profile / Cart */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              // If Auth0 has a user
              <div className="relative" ref={dropdownRef}>
                <button
                  className="flex items-center text-gray-700 hover:text-gray-900"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <User className="h-6 w-6" />
                  <span className="ml-2 hidden lg:inline">{firstName}</span>
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    {isAdmin && (
                      <>
                        <Link
                          to="/reservations/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          Reservations Admin
                        </Link>
                        <Link
                          to="/ordering/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          Ordering Admin
                        </Link>
                      </>
                    )}
                    <Link
                      to="/ordering/orders"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Order History
                    </Link>
                    <button
                      onClick={() => {
                        logout({ returnTo: window.location.origin });
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
              // Not authenticated => Show Sign In / Sign Up
              <div className="hidden lg:flex space-x-2">
                <Link
                  to="/ordering/login"
                  className="text-gray-700 hover:text-gray-900"
                >
                  Sign In
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  to="/ordering/signup"
                  className="text-gray-700 hover:text-gray-900"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Cart Link */}
            <Link
              to="/ordering/cart"
              className="p-2 relative text-gray-700 hover:text-gray-900"
              aria-label="Shopping cart"
            >
              <ShoppingCart
                className={`h-6 w-6 transition-transform ${
                  cartBounce ? 'animate-bounce' : ''
                }`}
              />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#c1902f]
                                 text-white text-xs font-bold
                                 rounded-full h-5 w-5
                                 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/ordering/menu"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700
                         hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Menu
            </Link>
            <div className="px-3 py-2 text-base font-medium text-gray-700">
              <Clock className="inline-block h-4 w-4 mr-2" />
              11AM-9PM
            </div>
            <div className="px-3 py-2 text-base font-medium text-gray-700">
              <MapPin className="inline-block h-4 w-4 mr-2" />
              Tamuning
            </div>
            <div className="px-3 py-2 text-base font-medium text-gray-700">
              <Phone className="inline-block h-4 w-4 mr-2" />
              (671) 989-3444
            </div>

            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <>
                    <Link
                      to="/reservations/dashboard"
                      className="block px-3 py-2 rounded-md text-base font-medium
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Reservations Admin
                    </Link>
                    <Link
                      to="/ordering/admin"
                      className="block px-3 py-2 rounded-md text-base font-medium
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Ordering Admin
                    </Link>
                  </>
                )}
                <Link
                  to="/ordering/orders"
                  className="block px-3 py-2 rounded-md text-base font-medium
                             text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Order History
                </Link>
                <button
                  onClick={() => {
                    logout({ returnTo: window.location.origin });
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base
                             font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/ordering/login"
                  className="block px-3 py-2 rounded-md text-base font-medium
                             text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/ordering/signup"
                  className="block px-3 py-2 rounded-md text-base font-medium
                             text-gray-700 hover:text-gray-900 hover:bg-gray-50"
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
