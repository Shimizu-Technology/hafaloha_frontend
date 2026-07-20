import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, ScrollToTop, RestaurantProvider } from './shared';
import PostHogProvider from './shared/components/analytics/PostHogProvider';
import { ToastContainer } from './shared/components/ToastContainer';
import { PaymentScriptPreloader } from './shared/components/payment/PaymentScriptPreloader';

import GlobalLayout from './GlobalLayout';
import ReservationsApp from './reservations/ReservationsApp';
import OnlineOrderingApp from './ordering/OnlineOrderingApp';
import WholesaleApp from './wholesale/WholesaleApp';

export default function LiveApp() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        {/* Preload payment scripts based on restaurant settings */}
        <PaymentScriptPreloader />

        {/* Keep analytics inside auth and restaurant context */}
        <PostHogProvider>
          <BrowserRouter>
            <ScrollToTop />
            <ToastContainer
              position="top-right"
              reverseOrder={false}
              containerStyle={{
                maxHeight: '100vh',
                overflow: 'auto',
                paddingRight: '10px',
                scrollBehavior: 'smooth'
              }}
              containerClassName="scrollable-toast-container"
              gutter={8}
              toastOptions={{
                className: '',
                style: {
                  maxWidth: '100%',
                  width: 'auto'
                },
                duration: 5000
              }}
            />

            <Routes>
              <Route element={<GlobalLayout />}>
                <Route path="/reservations/*" element={<ReservationsApp />} />
                <Route path="/wholesale/*" element={<WholesaleApp />} />
                <Route path="/*" element={<OnlineOrderingApp />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </PostHogProvider>
      </RestaurantProvider>
    </AuthProvider>
  );
}
