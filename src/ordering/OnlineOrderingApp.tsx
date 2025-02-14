// src/ordering/OnlineOrderingApp.tsx
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import { Footer } from './components/Footer';
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

import { useAuthStore } from './store/authStore';
import { useMenuStore } from './store/menuStore';
import { useLoadingStore } from './store/loadingStore';

import type { CartItem, MenuItem as MenuItemType } from './types/menu';
import { MenuItem } from './components/MenuItem';

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user } = useAuthStore();

  // If no user => go to /ordering/login
  if (!user) {
    return <Navigate to="login" replace />;
  }
  // If adminOnly & user.role != admin => go /ordering
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="" replace />;
  }
  return <>{children}</>;
}

function OrderingLayout() {
  const loadingCount = useLoadingStore((state) => state.loadingCount);
  const [showSpinner, setShowSpinner] = useState(false);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loadingCount > 0) {
      if (!timerId) {
        const id = setTimeout(() => {
          setShowSpinner(true);
          setTimerId(null);
        }, 700);
        setTimerId(id);
      }
    } else {
      if (timerId) {
        clearTimeout(timerId);
        setTimerId(null);
      }
      setShowSpinner(false);
    }
  }, [loadingCount, timerId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Removed <Toaster/> — only needed once at root */}
      <main className="flex-grow tropical-pattern">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />

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
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  function handleAddToCart(item: MenuItemType) {
    setCart((prevCart) => {
      const existing = prevCart.find((x) => x.id === item.id);
      if (existing) {
        return prevCart.map((x) =>
          x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  }

  return (
    <Routes>
      <Route element={<OrderingLayout />}>
        {/* index => /ordering => Hero & sample items */}
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
                      {menuItems.slice(0, 4).map((item) => (
                        <MenuItem
                          key={item.id}
                          item={item}
                          onAddToCart={handleAddToCart}
                        />
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

        {/* Ordering routes */}
        <Route path="menu" element={<MenuPage onAddToCart={handleAddToCart} />} />
        <Route path="cart" element={<CartPage items={cart} />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation" element={<OrderConfirmation />} />

        {/* Admin => /ordering/admin */}
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Auth => /ordering/login, /ordering/signup, /ordering/forgot-password, etc. */}
        <Route path="login" element={<LoginForm />} />
        <Route path="signup" element={<SignUpForm />} />
        <Route path="forgot-password" element={<ForgotPasswordForm />} />
        <Route path="reset-password" element={<ResetPasswordForm />} />

        {/* Protected => /ordering/orders => must be signed in */}
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />

        {/* Catch-all => /ordering => index route */}
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}
