// src/shared/components/navigation/Header.tsx
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
import { useAuth } from '../../auth';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useRestaurantStore } from '../../store/restaurantStore';
import { formatPhoneNumber } from '../../utils/formatters';
import { LanguageSelector } from '../../i18n';

// Create a custom hook to safely use the order store
function useCartItems() {
  // Default empty state
  const [cartItems, setCartItems] = useState<any[]>([]);
  
  // Effect to load the order store if available
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    
    const loadOrderStore = async () => {
      try {
        // Dynamic import
        const orderingModule = await import('../../../ordering/store/orderStore');
        
        if (!mounted) return;
        
        if (orderingModule && orderingModule.useOrderStore) {
          // Get initial cart items
          const store = orderingModule.useOrderStore.getState();
          if (store && Array.isArray(store.cartItems)) {
            setCartItems(store.cartItems);
          }
          
          // Subscribe to changes
          unsubscribe = orderingModule.useOrderStore.subscribe(
            (state: any) => {
              if (mounted && Array.isArray(state.cartItems)) {
                setCartItems(state.cartItems);
              }
            }
          );
        }
      } catch (e) {
        console.log('Order store not available, using empty cart');
      }
    };
    
    // Execute the async function
    loadOrderStore();
    
    // Cleanup function
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);
  
  return cartItems;
}

export function Header() {
  const { t } = useTranslation();
  const { user, logout: signOut } = useAuth();
  const { restaurant } = useRestaurantStore();

  // Cart items - will only have items in the ordering app context
  const cartItems = useCartItems();
  const cartCount = cartItems.reduce((acc: number, item: any) => acc + item.quantity, 0);

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
              {t('navigation.menu')}
            </Link>
            <Link
              to="/reservations"
              className="text-gray-700 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 active:scale-95"
            >
              {t('navigation.reservations')}
            </Link>
            <LanguageSelector />
            <div className="flex items-center text-gray-700 whitespace-nowrap">
              <Clock className="h-4 w-4 mr-2" />
              <span>11AM-9PM</span>
            </div>
            <div className="flex items-center text-gray-700 whitespace-nowrap">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{restaurant?.address ? restaurant.address.split(',')[0] : 'Tamuning'}</span>
            </div>
            {restaurant?.phone_number ? (
              <a
                href={`tel:${restaurant.phone_number}`}
                className="flex items-center text-gray-700 whitespace-nowrap hover:text-gray-900"
              >
                <Phone className="h-4 w-4 mr-2" />
                {formatPhoneNumber(restaurant.phone_number)}
              </a>
            ) : (
              <a
                href="tel:+16719893444"
                className="flex items-center text-gray-700 whitespace-nowrap hover:text-gray-900"
              >
                <Phone className="h-4 w-4 mr-2" />
                (671) 989-3444
              </a>
            )}
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
                          {t('navigation.adminTools')}
                        </div>
                        <Link
                          to="/reservations/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          {t('navigation.manageReservations')}
                        </Link>
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          {t('navigation.adminDashboard')}
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
                      {t('navigation.orderHistory')}
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      {t('navigation.myProfile')}
                    </Link>
                    <hr className="my-1" />

                    <button
                      onClick={() => {
                        signOut();
                        toast.success(t('auth.signedOutSuccess'));
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {t('auth.signOut')}
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
                  {t('auth.signIn')}
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  to="/signup"
                  className="text-gray-700 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 active:scale-95"
                >
                  {t('auth.signUp')}
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
              {t('navigation.menu')}
            </Link>
            <Link
              to="/reservations"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700
                         hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('navigation.reservations')}
            </Link>
            <div className="px-3 py-2">
              <LanguageSelector />
            </div>
            <div className="px-3 py-2 text-base font-medium text-gray-700 flex items-center">
              <Clock className="inline-block h-4 w-4 mr-2" />
              11AM-9PM
            </div>
            <div className="px-3 py-2 text-base font-medium text-gray-700 flex items-center">
              <MapPin className="inline-block h-4 w-4 mr-2" />
              {restaurant?.address ? restaurant.address.split(',')[0] : 'Tamuning'}
            </div>
            {restaurant?.phone_number ? (
              <a
                href={`tel:${restaurant.phone_number}`}
                className="
                  block px-3 py-2 text-base font-medium text-gray-700
                  hover:text-gray-900 hover:bg-gray-50
                  flex items-center
                "
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Phone className="inline-block h-4 w-4 mr-2" />
                {formatPhoneNumber(restaurant.phone_number)}
              </a>
            ) : (
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
            )}

            {user ? (
              <>
                {isAdmin && (
                  <>
                    <div className="px-3 py-1 text-xs font-semibold text-gray-400">
                      {t('navigation.adminTools')}
                    </div>
                    <Link
                      to="/reservations/dashboard"
                      className="block px-3 py-2 rounded-md text-base font-medium
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t('navigation.manageReservations')}
                    </Link>
                    <Link
                      to="/admin"
                      className="block px-3 py-2 rounded-md text-base font-medium
                                 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t('navigation.adminDashboard')}
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
                  {t('navigation.orderHistory')}
                </Link>
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium
                             text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('navigation.myProfile')}
                </Link>
                <hr className="my-1" />

                <button
                  onClick={() => {
                    signOut();
                    toast.success(t('auth.signedOutSuccess'));
                    setIsMobileMenuOpen(false);
                  }}
                  className="
                    block w-full text-left px-3 py-2 rounded-md text-base font-medium
                    text-gray-700 hover:text-gray-900 hover:bg-gray-50
                  "
                >
                  {t('auth.signOut')}
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
                  {t('auth.signIn')}
                </Link>
                <Link
                  to="/signup"
                  className="
                    block px-3 py-2 rounded-md text-base font-medium
                    text-gray-700 hover:text-gray-900 hover:bg-gray-50
                  "
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('auth.signUp')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
