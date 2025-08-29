// src/wholesale/components/WholesaleCheckout.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWholesaleCart } from '../context/WholesaleCartProvider';
import { wholesaleApi, CreateOrderRequest, WholesaleParticipant } from '../services/wholesaleApi';
import { useRestaurantStore } from '../../shared/store/restaurantStore';
import { useAuthStore } from '../../shared/auth/authStore';
import { handleApiError } from '../../shared/utils/errorHandler';
import ParticipantSelector from './ParticipantSelector';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';
import { StripeCheckout, StripeCheckoutRef } from '../../ordering/components/payment/StripeCheckout';
import MobileStickyBar from './MobileStickyBar';

interface OrderFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupLocation: string;
  notes: string;
  participantId: number | null;
}

export default function WholesaleCheckout() {
  const navigate = useNavigate();
  const { items, fundraiser, getCartTotal, clearCart, validateCart, setFundraiser, error: cartError, removeUnavailableItems } = useWholesaleCart();
  const { restaurant } = useRestaurantStore();
  const { user } = useAuthStore();
  
  const [participants, setParticipants] = useState<WholesaleParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const stripeCheckoutRef = useRef<StripeCheckoutRef>(null);

  const [formData, setFormData] = useState<OrderFormData>({
    customerName: user?.name || (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : ''),
    customerEmail: user?.email || '',
    customerPhone: user?.phone || '',
    pickupLocation: 'restaurant', // Default to restaurant pickup
    notes: '',
    participantId: null,
  });

  // Prefill phone with +1671 if empty on mount (mirror main CheckoutPage behavior)
  useEffect(() => {
    if ((formData.customerPhone || '').trim() === '') {
      setFormData(prev => ({ ...prev, customerPhone: '+1671' }));
    }
  }, []);

  // Keep customer info in sync with logged-in user; default phone to +1671 when missing
  useEffect(() => {
    if (user) {
      const userName = user.name || (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : '');
      setFormData(prev => ({
        ...prev,
        customerName: userName || prev.customerName,
        customerEmail: user.email || prev.customerEmail,
        customerPhone: user.phone || '+1671',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        customerName: '',
        customerEmail: '',
        customerPhone: '+1671',
      }));
    }
  }, [user]);

  useEffect(() => {
    // Redirect if cart is empty
    if (items.length === 0) {
      navigate('/wholesale');
      return;
    }

    // If no fundraiser is set but we have items, try to derive fundraiser from items
    if (!fundraiser && items.length > 0) {
      // All items should be from the same fundraiser, so we can get it from the first item
      const fundraiserId = items[0].fundraiserId;
      console.log('No fundraiser set in context, fetching fundraiser data. FundraiserId:', fundraiserId);
      fetchMissingFundraiser(fundraiserId);
    }

    // Load participants for the fundraiser (if we have one)
    if (fundraiser) {
      loadParticipants();
    }
    
    // Validate cart on mount
    validateCart();
  }, [items.length, fundraiser, navigate, validateCart]);

  const fetchMissingFundraiser = async (fundraiserId: number) => {
    try {
      // We need to get fundraiser by ID, but the API might only support by slug
      // For now, let's try to get all fundraisers and find the matching one
      const response = await wholesaleApi.getFundraisers();
      if (response.success && response.data) {
        const matchingFundraiser = response.data.fundraisers.find(f => f.id === fundraiserId);
        if (matchingFundraiser) {
          setFundraiser(matchingFundraiser);
        }
      }
    } catch (err) {
      console.error('Error fetching missing fundraiser:', err);
      // Non-fatal error - continue without setting fundraiser
    }
  };

  const loadParticipants = async () => {
    if (!fundraiser) return;
    
    try {
      const response = await wholesaleApi.getFundraiser(fundraiser.slug);
      if (response.success && response.data) {
        setParticipants(response.data.fundraiser.participants);
      }
    } catch (err) {
      console.error('Error loading participants:', err);
      // Non-fatal error - continue without participants
    }
  };

  const handleInputChange = (field: keyof OrderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const getPickupLocationText = (): string => {
    // Use fundraiser-specific pickup info if available
    if (fundraiser?.pickup_display_name && fundraiser?.pickup_display_address) {
      return `${fundraiser.pickup_display_name} - ${fundraiser.pickup_display_address}`;
    }
    
    // Fallback to fundraiser display name with restaurant address
    if (fundraiser?.pickup_display_name) {
      const address = fundraiser.pickup_display_address || restaurant?.address || restaurant?.custom_pickup_location;
      if (address) {
        return `${fundraiser.pickup_display_name} - ${address}`;
      }
      return `${fundraiser.pickup_display_name} - Contact for pickup details`;
    }
    
    // Final fallback to restaurant info
    const restaurantAddress = restaurant?.address || restaurant?.custom_pickup_location;
    const restaurantName = restaurant?.name || 'Hafaloha';
    
    if (restaurantAddress) {
      return `${restaurantName} - ${restaurantAddress}`;
    }
    
    return `${restaurantName} - Contact restaurant for pickup details`;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      errors.customerName = 'Name is required';
    }

    if (!formData.customerEmail.trim()) {
      errors.customerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      errors.customerEmail = 'Please enter a valid email address';
    }

    if (!formData.customerPhone.trim()) {
      errors.customerPhone = 'Phone number is required';
    }

    if (!formData.pickupLocation.trim()) {
      errors.pickupLocation = 'Pickup location is required';
    }

    // No terms & conditions acceptance required for wholesale checkout

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async () => {
    setError(null);
    setLoading(true);

    try {
      // Validate form
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      // Validate cart
      const cartValid = await validateCart();
      if (!cartValid) {
        // The validateCart function already sets detailed error messages in the cart store
        // We don't need to set a generic error here - the cart error will be displayed
        setLoading(false);
        return;
      }

      // Process payment FIRST (match CheckoutPage behavior)
      setIsProcessingPayment(true);
      if (!stripeCheckoutRef.current) throw new Error('Payment system not initialized');
      const paymentOk = await stripeCheckoutRef.current.processPayment();
      if (!paymentOk) {
        setError('Payment failed. Please try again.');
        setIsProcessingPayment(false);
        return;
      }

      // After successful payment, create the wholesale order so it is linked in our system
      const orderData: CreateOrderRequest = {
        order: {
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          shippingAddress: getPickupLocationText(),
          notes: formData.notes,
          participantId: formData.participantId ?? undefined
        },
        cart_items: items.map(item => ({
          item_id: item.itemId,
          fundraiser_id: item.fundraiserId,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          price_cents: item.priceCents,
          line_total_cents: item.priceCents * item.quantity,
          selected_options: item.options || {} // Use backend format (group ID -> option IDs)
        }))
      };

      const orderResponse = await wholesaleApi.createOrder(orderData);
      if (!orderResponse.success || !orderResponse.data) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }
      const order = orderResponse.data.order;

      // Redirect and clear cart
      navigate(`/wholesale/orders/${order.id}/confirmation`);
      setTimeout(() => clearCart(), 100);

    } catch (err) {
      console.error('Error placing order:', err);
      // Use the proper error handler to extract user-friendly messages
      const errorMessage = handleApiError(err, 'Failed to place order');
      setError(errorMessage);
      setIsProcessingPayment(false);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPaymentSettings = () => {
    if (!restaurant?.admin_settings?.payment_gateway) {
      return null;
    }

    const settings = restaurant.admin_settings.payment_gateway;
    
    if (settings.payment_processor !== 'stripe') {
      return null;
    }

    return {
      publishableKey: settings.publishable_key,
      testMode: settings.test_mode || false
    };
  };

  const paymentSettings = getPaymentSettings();

  if (items.length === 0 || !fundraiser) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cart is Empty</h2>
        <p className="text-gray-600 mb-6">Please add items to your cart before checking out.</p>
        <button
          onClick={() => navigate('/wholesale')}
          className="bg-[#c1902f] text-white px-6 py-3 rounded-lg hover:bg-[#d4a43f] transition-colors"
        >
          Browse Fundraisers
        </button>
      </div>
    );
  }

  if (!paymentSettings) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold">Payment System Unavailable</h3>
          <p className="text-sm mt-2">Stripe payment processing is not configured. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wholesale-checkout max-w-6xl mx-auto pb-24 lg:pb-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
        <p className="text-gray-600">
          Complete your order for <span className="font-medium">{fundraiser.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] ${
                    validationErrors.customerName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
                {validationErrors.customerName && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] ${
                    validationErrors.customerEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                  autoComplete="email"
                />
                {validationErrors.customerEmail && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.customerEmail}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f] ${
                    validationErrors.customerPhone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  inputMode="tel"
                />
                {validationErrors.customerPhone && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.customerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Pickup Location */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pickup Location</h2>
            
            <div>
              {/* Single Restaurant Pickup Option */}
              <div className="p-4 border-2 border-[#c1902f] bg-[#c1902f]/5 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-[#c1902f] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {fundraiser?.pickup_display_name || restaurant?.name || 'Hafaloha'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {fundraiser?.pickup_display_address || restaurant?.address || restaurant?.custom_pickup_location || 'Contact for pickup details'}
                    </div>
                    {fundraiser?.pickup_instructions && (
                      <div className="text-sm text-blue-700 mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                        <strong>Pickup Instructions:</strong> {fundraiser.pickup_instructions}
                      </div>
                    )}
                    {fundraiser?.pickup_hours && (
                      <div className="text-sm text-green-700 mt-2">
                        <strong>Pickup Hours:</strong> {fundraiser.pickup_hours}
                      </div>
                    )}
                    {fundraiser?.pickup_contact_name && (
                      <div className="text-sm text-gray-600 mt-2">
                        <strong>Contact:</strong> {fundraiser.pickup_contact_name}
                        {fundraiser.pickup_contact_phone && ` - ${fundraiser.pickup_contact_phone}`}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      Please bring your order confirmation when picking up
                    </div>
                  </div>
                </div>
              </div>

              {validationErrors.pickupLocation && (
                <p className="text-red-600 text-sm mt-2">{validationErrors.pickupLocation}</p>
              )}
              
              {/* Pickup confirmation message */}
              <div className="mt-4 p-3 bg-[#c1902f]/5 border border-[#c1902f]/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-[#c1902f] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-[#c1902f]">
                    <strong>Pickup Notice:</strong> You'll receive confirmation details including pickup instructions via email and SMS after your order is placed.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Participant Selection */}
          {participants.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <ParticipantSelector
                participants={participants}
                selectedParticipantId={formData.participantId}
                onParticipantSelect={(id) => handleInputChange('participantId', id)}
                fundraiserName={fundraiser.name}
                disabled={loading || isProcessingPayment}
              />
            </div>
          )}

          {/* Order Notes */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Notes</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c1902f] focus:border-[#c1902f]"
                placeholder="Any special instructions for your order..."
              />
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment</h2>

            {/* Stripe Checkout - identical UI/flow to regular ordering */}
            <StripeCheckout
              ref={stripeCheckoutRef}
              amount={(getCartTotal() || 0).toFixed(2)}
              publishableKey={paymentSettings.publishableKey}
              testMode={paymentSettings.testMode}
              onPaymentSuccess={(details) => {
                // We still create the wholesale order first, then confirm payment via our backend;
                // this success handler only signals that client confirmation succeeded in test/small flows
                console.log('Payment prepared:', details);
              }}
              onPaymentError={(error) => {
                console.error('Payment error:', error);
                setError('Payment failed. Please try again.');
                setIsProcessingPayment(false);
              }}
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>

            {/* Items */}
            <div className="space-y-3 mb-6">
                  {items.map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  {item.imageUrl ? (
                    <OptimizedImage
                      src={item.imageUrl}
                      alt={item.name}
                      context="cart"
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-grow">
                    <div className="font-medium text-sm">{item.name}</div>
                    
                    {/* Selected Options/Variants */}
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(item.selectedOptions).map(([key, value]) => (
                          <span 
                            key={key}
                            className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-[#c1902f]/10 text-[#c1902f] rounded border border-[#c1902f]/20"
                          >
                            {key.charAt(0).toUpperCase() + key.slice(1)}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600">
                      {formatCurrency(item.price)} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-medium text-sm">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(getCartTotal())}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={loading || isProcessingPayment || !formData.customerName.trim() || !formData.customerEmail.trim() || !formData.customerPhone.trim() || (formData.participantId === undefined)}
              className={`w-full mt-6 py-3 px-4 rounded-lg font-medium transition-colors ${
                loading || isProcessingPayment || !formData.customerName.trim() || !formData.customerEmail.trim() || !formData.customerPhone.trim() || (formData.participantId === undefined)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#c1902f] text-white hover:bg-[#d4a43f]'
              }`}
            >
              {isProcessingPayment ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing Payment...
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Order...
                </div>
              ) : (
                `Place Order • ${formatCurrency(getCartTotal())}`
              )}
            </button>

            {/* Error Display */}
            {(error || cartError) && (
              <div className={`mt-4 p-3 rounded-lg ${
                (error || cartError)?.startsWith('✅') 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm whitespace-pre-line ${
                  (error || cartError)?.startsWith('✅') 
                    ? 'text-green-700' 
                    : 'text-red-700'
                }`}>{error || cartError}</p>
                {cartError && (cartError.includes('Some items in your cart need attention') || cartError.includes('Cart validation failed')) && (
                  <button
                    onClick={async () => {
                      setLoading(true);
                      await removeUnavailableItems();
                      setLoading(false);
                    }}
                    disabled={loading}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Fixing Cart...' : 'Fix Cart Automatically'}
                  </button>
                )}
              </div>
            )}

            {/* Security Info */}
            <div className="mt-4 text-xs text-gray-500 text-center">
              <div className="flex items-center justify-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secure payment processing via Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Sticky mobile place order bar */}
      <MobileStickyBar
        leftTopText="Total"
        leftBottomText={formatCurrency(getCartTotal())}
        buttonLabel={isProcessingPayment ? 'Processing…' : `Place Order • ${formatCurrency(getCartTotal())}`}
        onButtonClick={handlePlaceOrder}
        disabled={loading || isProcessingPayment || !formData.customerName.trim() || !formData.customerEmail.trim() || !formData.customerPhone.trim() || (formData.participantId === undefined)}
      />
    </div>
  );
}