// src/ordering/OnlineOrderingApp.tsx
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { Header } from './components/Header';
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
import { OrderHistory } from './components/profile/OrderHistory';

import { useAuthStore } from './store/authStore';
import { useMenuStore } from './store/menuStore';
import type { CartItem, MenuItem as MenuItemType } from './types/menu';
import { MenuItem } from './components/MenuItem';

// We import our global loading store
import { useLoadingStore } from './store/loadingStore';

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="login" />;
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="" />;
  }
  return <>{children}</>;
}

/** Layout with a “debounced” spinner overlay. */
function OrderingLayout() {
  const loadingCount = useLoadingStore((state) => state.loadingCount);

  // Debounce logic:
  // If loadingCount > 0, wait 300ms before actually showing the spinner.
  // If the request finishes <300ms, we skip showing it => no flicker.
  const [showSpinner, setShowSpinner] = useState(false);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loadingCount > 0) {
      // We have an ongoing request => start a timer
      // (if we haven't already)
      if (!timerId) {
        const id = setTimeout(() => {
          setShowSpinner(true);
          setTimerId(null);
        }, 300); // 300ms delay
        setTimerId(id);
      }
    } else {
      // No requests => clear any timer & hide the spinner
      if (timerId) {
        clearTimeout(timerId);
        setTimerId(null);
      }
      setShowSpinner(false);
    }
  }, [loadingCount, timerId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <Toaster position="top-right" />

      <main className="flex-grow tropical-pattern">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />

      {/* Only show the overlay if showSpinner is true */}
      {showSpinner && (
        <div className="
          fixed top-0 left-0 w-screen h-screen
          bg-black bg-opacity-40 
          flex items-center justify-center
          z-[9999999]
        ">
          <div className="bg-gray-800 p-6 rounded shadow-lg flex flex-col items-center">
            <LoadingSpinner />
            <p className="mt-3 text-white font-semibold">
              Loading...
            </p>
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

        <Route path="menu" element={<MenuPage onAddToCart={handleAddToCart} />} />
        <Route path="cart" element={<CartPage items={cart} />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation" element={<OrderConfirmation />} />

        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="login" element={<LoginForm />} />
        <Route path="signup" element={<SignUpForm />} />

        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="" />} />
      </Route>
    </Routes>
  );
}
