import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { LoadingSpinner } from '../../shared/components/ui';
import { locationsApi } from '../../shared/api/endpoints/locations';
import { stripeApi } from '../../shared/api/endpoints/stripe';
import { useOrderStore } from '../store/orderStore';
import { clearPendingCheckoutDraft, loadPendingCheckoutDraft } from '../utils/pendingCheckout';

type FinalizeState = 'processing' | 'error';

type ApiErrorLike = {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
};

function checkoutErrorMessage(error: unknown) {
  const apiError = error as ApiErrorLike;
  return apiError.response?.data?.error || apiError.message || 'We could not finalize your order.';
}

export function CheckoutReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addOrder = useOrderStore((state) => state.addOrder);
  const [state, setState] = useState<FinalizeState>('processing');
  const [message, setMessage] = useState('Finalizing your order...');

  useEffect(() => {
    let cancelled = false;

    const finalizeOrder = async () => {
      const paymentIntentId = searchParams.get('payment_intent');
      const redirectStatus = searchParams.get('redirect_status');
      const draft = loadPendingCheckoutDraft();
      const restaurantId = localStorage.getItem('restaurant_id') || import.meta.env.VITE_RESTAURANT_ID || '1';

      if (!paymentIntentId) {
        setState('error');
        setMessage('We could not verify your payment because the payment reference is missing.');
        return;
      }

      if (!draft) {
        setState('error');
        setMessage('We could not recover your checkout details. Please contact support before trying again.');
        return;
      }

      try {
        const paymentIntent = await stripeApi.getPaymentIntent(paymentIntentId, restaurantId);

        if (paymentIntent.status !== 'succeeded') {
          setState('error');
          setMessage(
            redirectStatus === 'failed'
              ? 'Your payment was not completed.'
              : `Your payment is currently ${paymentIntent.status}.`
          );
          return;
        }

        const paymentDetails = {
          status: paymentIntent.status,
          payment_method: 'stripe',
          transaction_id: paymentIntent.id,
          payment_date: new Date().toISOString().split('T')[0],
          payment_intent_id: paymentIntent.id,
          processor: 'stripe',
          notes: 'Order finalized from Stripe payment recovery flow',
        };

        const newOrder = await addOrder(
          draft.cartItems,
          draft.finalTotal,
          draft.formData.specialInstructions,
          draft.formData.name,
          draft.formData.phone,
          draft.formData.email,
          paymentIntent.id,
          'stripe',
          draft.formData.vipCode,
          false,
          paymentDetails,
          draft.locationId ?? null
        );

        let locationName = '';
        let locationAddress = '';
        const hasAny24hrItem = draft.cartItems.some((item) => (item.advance_notice_hours ?? 0) >= 24);

        if (draft.locationId) {
          try {
            const location = await locationsApi.getLocation(draft.locationId);
            locationName = location.name;
            locationAddress = location.address;
          } catch (error) {
            console.error('Error fetching location details for recovered confirmation:', error);
          }
        }

        clearPendingCheckoutDraft();

        if (!cancelled) {
          navigate(`/order-confirmation/${newOrder.id}`, {
            replace: true,
            state: {
              orderDetails: {
                ...newOrder,
                location_name: locationName,
                location_address: locationAddress,
                requires_advance_notice: hasAny24hrItem,
                max_advance_notice_hours: hasAny24hrItem ? 24 : undefined,
              },
              orderId: newOrder.id,
              total: draft.finalTotal,
              hasAny24hrItem,
              locationName,
              locationAddress,
            },
          });
        }
      } catch (error: unknown) {
        console.error('Failed to finalize Stripe checkout return:', error);
        setState('error');
        setMessage(checkoutErrorMessage(error));
      }
    };

    void finalizeOrder();

    return () => {
      cancelled = true;
    };
  }, [addOrder, navigate, searchParams]);

  if (state === 'processing') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <LoadingSpinner text="Finalizing your order" className="mb-4" />
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">We Couldn&apos;t Confirm Your Order</h1>
        <p className="text-lg text-red-600 mb-4">{message}</p>
        <p className="text-gray-600 mb-8">
          If you saw an approval from your payment provider, please contact support so we can verify the payment before you try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/checkout"
            className="inline-flex items-center justify-center px-6 py-3 rounded-md text-white bg-[#c1902f] hover:bg-[#d4a43f]"
          >
            Return to Checkout
          </Link>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
