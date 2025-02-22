// src/ordering/OnlineOrderingApp.tsx

import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import { Hero } from './components/Hero';
import { MenuPage } from './components/MenuPage';
import { CartPage } from './components/CartPage';
import { CheckoutPage } from './components/CheckoutPage';
import { OrderConfirmation } from './components/OrderConfirmation';
import AdminDashboard from './components/admin/AdminDashboard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { LoyaltyTeaser } from './components/loyalty/LoyaltyTeaser';
import { LoginForm } from './components/auth/LoginForm';
import { SignUpForm } from './components/auth/SignUpForm';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import { OrderHistory } from './components/profile/OrderHistory';
import { ProfilePage } from './components/profile/ProfilePage';
import { VerifyPhonePage } from './components/auth/VerifyPhonePage';

import { useAuthStore } from './store/authStore';
import { useMenuStore } from './store/menuStore';
import { useLoadingStore } from './store/loadingStore';
import { MenuItem as MenuItemCard } from './components/MenuItem';
import { useSiteSettingsStore } from './store/siteSettingsStore'; // <-- IMPORTANT

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function OrderingLayout() {
  const loadingCount = useLoadingStore((state) => state.loadingCount);
  const [showSpinner, setShowSpinner] = React.useState(false);
  const [timerId, setTimerId] = React.useState<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (loadingCount > 0) {
      // Start a short timer so spinner doesn’t show if loading is very quick
      if (!timerId) {
        const id = setTimeout(() => {
          setShowSpinner(true);
          setTimerId(null);
        }, 700);
        setTimerId(id);
      }
    } else {
      // No more loading → clear timer and hide spinner
      if (timerId) {
        clearTimeout(timerId);
        setTimerId(null);
      }
      setShowSpinner(false);
    }
  }, [loadingCount, timerId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <main className="flex-grow tropical-pattern">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>

      {showSpinner && (
        <div
          className="
            fixed top-0 left-0 w-screen h-screen
            bg-black bg-opacity-40 
            flex items-center justify-center
            z-[9999999]
          "
        >
          <div className="bg-gray-800 p-6 rounded shadow-lg flex flex-col items-center">
            <LoadingSpinner />
            <p className="mt-3 text-white font-semibold">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnlineOrderingApp() {
  const { menuItems, fetchMenuItems } = useMenuStore();
  const { fetchSiteSettings } = useSiteSettingsStore(); // <-- destructure the store method

  useEffect(() => {
    fetchMenuItems();        // load menu items
    fetchSiteSettings();     // load hero/spinner image URLs
  }, [fetchMenuItems, fetchSiteSettings]);

  // Filter for featured items
  const featuredItems = menuItems.filter((item) => item.featured);
  const featuredSlice = featuredItems.slice(0, 4);

  return (
    <Routes>
      <Route element={<OrderingLayout />}>
        {/* index => "/" => hero & popular items */}
        <Route
          index
          element={
            <>
              <Hero />
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <h2 className="text-2xl sm:text-3xl font-display text-gray-900 mb-8">
                      Popular Items
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {featuredSlice.map((item) => (
                        <MenuItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <LoyaltyTeaser />
                  </div>
                </div>
              </div>
            </>
          }
        />

        {/* /menu => the MenuPage */}
        <Route path="menu" element={<MenuPage />} />

        {/* /cart => Cart */}
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation" element={<OrderConfirmation />} />

        {/* Admin only => /admin */}
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Auth */}
        <Route path="login" element={<LoginForm />} />
        <Route path="signup" element={<SignUpForm />} />
        <Route path="forgot-password" element={<ForgotPasswordForm />} />
        <Route path="reset-password" element={<ResetPasswordForm />} />

        {/* Phone verification */}
        <Route path="verify-phone" element={<VerifyPhonePage />} />

        {/* Protected user pages => /orders, /profile */}
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* If unknown => redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
