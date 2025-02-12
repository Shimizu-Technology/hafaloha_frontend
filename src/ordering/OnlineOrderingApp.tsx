// src/ordering/OnlineOrderingApp.tsx
import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth0 } from '@auth0/auth0-react';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { MenuPage } from './components/MenuPage';
import { CartPage } from './components/CartPage';
import { CheckoutPage } from './components/CheckoutPage';
import { OrderConfirmation } from './components/OrderConfirmation';
import AdminDashboard from './components/admin/AdminDashboard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { UpsellModal } from './components/upsell/UpsellModal'; // if you still use this
import { LoyaltyTeaser } from './components/loyalty/LoyaltyTeaser';
import { LoginForm } from './components/auth/LoginForm';
import { SignUpForm } from './components/auth/SignUpForm';
import { OrderHistory } from './components/profile/OrderHistory';

// Hook-based approach
import { useMenu } from './hooks/useMenu';       // no more useMenuStore
import { useOrders } from './hooks/useOrders';   // for the cart logic
import { MenuItem } from './components/MenuItem'; // updated
import { CustomizationModal } from './components/CustomizationModal';

/**
 * ProtectedRoute:
 *  - Checks if user is authenticated via Auth0
 *  - Optionally checks if adminOnly is required
 *  - If not satisfied, redirect to /ordering/login
 */
function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, user } = useAuth0();

  // If not logged in, redirect to /ordering/login
  if (!isAuthenticated) {
    return <Navigate to="login" />;
  }

  // If adminOnly is required, check your user claims or app_metadata
  if (adminOnly) {
    // e.g. const isAdmin = user?.['https://hafaloha.com/roles']?.includes('admin');
    const isAdmin = false; // or your real logic
    if (!isAdmin) {
      return <Navigate to="" />; // or some 403 page
    }
  }

  return <>{children}</>;
}

/** 
 * Layout wrapper with shared header/footer for the Ordering domain.
 * Renders an <Outlet> for nested routes. 
 */
function OrderingLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      <main className="flex-grow tropical-pattern">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function OnlineOrderingApp() {
  // 1) Bring in the new useMenu hook to fetch items
  const { menuItems, fetchMenuItems } = useMenu();

  // 2) We can also access the Orders hook to get or manage cart if needed
  // const { cartItems } = useOrders(); // if you just want cart items or similar

  // On mount, fetch menu items
  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  return (
    <Routes>
      <Route element={<OrderingLayout />}>
        {/* HOME = index route at /ordering/ */}
        <Route
          index
          element={
            <>
              <Hero />
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <h2 className="text-3xl font-display text-gray-900 mb-8">
                      Popular Items
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {menuItems.slice(0, 4).map((item) => (
                        <MenuItem key={item.id} item={item} />
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

        {/* Menu */}
        <Route path="menu" element={<MenuPage />} />

        {/* Cart & Checkout */}
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />

        {/* Make order-confirmation UNPROTECTED so anyone can see it after placing an order */}
        <Route path="order-confirmation" element={<OrderConfirmation />} />

        {/* Admin */}
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Auth pages */}
        <Route path="login" element={<LoginForm />} />
        <Route path="signup" element={<SignUpForm />} />

        {/* e.g. order history, must be logged in */}
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />

        {/* 404 fallback => redirect to /ordering */}
        <Route path="*" element={<Navigate to="" />} />
      </Route>
    </Routes>
  );
}
