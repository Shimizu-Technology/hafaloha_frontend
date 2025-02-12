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

/** Layout wrapper with shared header/footer for the Ordering domain */
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
  const { menuItems, fetchMenuItems } = useMenuStore();

  const [cart, setCart] = useState<CartItem[]>([]);

  // On mount, fetch menu items
  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  function handleAddToCart(item: MenuItemType) {
    setCart((prevCart) => {
      const existing = prevCart.find((x) => x.id === item.id);
      if (existing) {
        // increment quantity
        return prevCart.map((x) =>
          x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x
        );
      } else {
        // add new item
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  }

  return (
    <Routes>
      <Route element={<OrderingLayout />}>
        {/* Home = index route at /ordering/ */}
        <Route
          index
          element={
            <>
              <Hero />
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Popular Items */}
                  <div className="lg:col-span-2">
                    <h2 className="text-2xl sm:text-3xl font-display text-gray-900 mb-8">
                      Popular Items
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {menuItems.slice(0, 4).map((item) => (
                        <MenuItem
                          key={item.id}
                          item={item}
                          // Add to the local cart for this example
                          onAddToCart={handleAddToCart}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Loyalty Teaser */}
                  <div>
                    <LoyaltyTeaser />
                  </div>
                </div>
              </div>
            </>
          }
        />

        {/* Menu */}
        <Route
          path="menu"
          element={<MenuPage onAddToCart={handleAddToCart} />}
        />

        {/* Cart & Checkout */}
        <Route path="cart" element={<CartPage items={cart} />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation" element={<OrderConfirmation />} />

        {/* Admin (protected) */}
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

        {/* Order History (protected) */}
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
