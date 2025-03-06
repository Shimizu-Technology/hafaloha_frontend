// src/ordering/components/CheckoutPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Mail, Phone, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../store/authStore';
import { usePromoStore } from '../store/promoStore';
import { useOrderStore } from '../store/orderStore';
import { useRestaurantStore } from '../../shared/store/restaurantStore';
import { PickupInfo } from './location/PickupInfo';
import { VipCodeInput } from './VipCodeInput';

interface CheckoutFormData {
  name: string;
  email: string;
  phone: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  specialInstructions: string;
  promoCode: string;
  vipCode: string;
}

/**
 * Allows a plus sign, then 3 or 4 digits for "area code," then exactly 7 more digits.
 * e.g. +16711234567 or +17025551234 or +9251234567
 */
function isValidPhone(phoneStr: string) {
  return /^\+\d{3,4}\d{7}$/.test(phoneStr);
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const cartItems = useOrderStore((state) => state.cartItems);
  const addOrder = useOrderStore((state) => state.addOrder);

  const { validatePromoCode, applyDiscount } = usePromoStore();
  const rawTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const initialFormData: CheckoutFormData = {
    name: user ? `${user.first_name} ${user.last_name}` : '',
    email: user?.email || '',
    phone: user?.phone || '', // if user has phone => use it, else blank => +1671 later
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    specialInstructions: '',
    promoCode: '',
    vipCode: '',
  };

  const restaurant = useRestaurantStore((state) => state.restaurant);
  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [finalTotal, setFinalTotal] = useState(rawTotal);
  const [vipCodeValid, setVipCodeValid] = useState(false);

  // If phone is blank => prefill +1671
  useEffect(() => {
    if (formData.phone.trim() === '') {
      setFormData((prev) => ({ ...prev, phone: '+1671' }));
    }
  }, []);

  // If user changes (logs in/out), update name/email/phone
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone || '+1671',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        name: '',
        email: '',
        phone: '+1671',
      }));
    }
  }, [user]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleApplyPromo() {
    const isValid = validatePromoCode(formData.promoCode);
    if (isValid) {
      try {
        // Get the discounted total and update state - handle the Promise properly
        const discountedTotal = await applyDiscount(rawTotal, formData.promoCode);
        setFinalTotal(discountedTotal);
        setAppliedPromo(formData.promoCode);
        toast.success(`Promo code ${formData.promoCode} applied!`);
      } catch (error) {
        console.error('Error applying discount:', error);
        toast.error('Failed to apply promo code. Please try again.');
      }
    } else {
      toast.error('Invalid or expired promo code');
    }
  }

  const handleVipCodeChange = (code: string, valid: boolean) => {
    setFormData((prev) => ({ ...prev, vipCode: code }));
    setVipCodeValid(valid);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check if any item needs 24-hr notice
    const hasAny24hrItem = cartItems.some(
      (it) => (it.advance_notice_hours ?? 0) >= 24
    );

    const finalPhone = formData.phone.trim();
    if (!isValidPhone(finalPhone)) {
      toast.error(
        'Phone must be + (3 or 4 digit area code) + 7 digits, e.g. +16711234567'
      );
      return;
    }

    // Check for VIP-only mode
    if (restaurant?.vip_only_checkout && !vipCodeValid) {
      toast.error('Please enter a valid VIP code to continue');
      return;
    }

    try {
      const newOrder = await addOrder(
        cartItems,
        finalTotal,
        formData.specialInstructions,
        formData.name,
        finalPhone,
        formData.email,
        undefined,
        'credit_card',
        formData.vipCode
      );

      toast.success('Order placed successfully!');

      const estimatedTime = hasAny24hrItem ? '24 hours' : '20–25 min';
      navigate('/order-confirmation', {
        state: {
          orderId: newOrder.id || '12345',
          total: finalTotal,
          estimatedTime,
          hasAny24hrItem,
        },
      });
    } catch (err: any) {
      console.error('Failed to create order:', err);
      toast.error('Failed to place order. Please try again.');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* LEFT: The form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
              <div className="space-y-4">
                {/* NAME */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <User className="inline-block w-4 h-4 mr-2" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md
                      focus:ring-[#c1902f] focus:border-[#c1902f]"
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <Mail className="inline-block w-4 h-4 mr-2" />
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md
                      focus:ring-[#c1902f] focus:border-[#c1902f]"
                  />
                </div>

                {/* PHONE */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <Phone className="inline-block w-4 h-4 mr-2" />
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1671"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md
                      focus:ring-[#c1902f] focus:border-[#c1902f]"
                  />
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="cardNumber"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <CreditCard className="inline-block w-4 h-4 mr-2" />
                    Card Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="cardNumber"
                    name="cardNumber"
                    required
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md
                      focus:ring-[#c1902f] focus:border-[#c1902f]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="expiryDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="expiryDate"
                      name="expiryDate"
                      required
                      placeholder="MM/YY"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md
                        focus:ring-[#c1902f] focus:border-[#c1902f]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cvv"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      CVV <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      required
                      placeholder="123"
                      value={formData.cvv}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md
                        focus:ring-[#c1902f] focus:border-[#c1902f]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* VIP Code Input (only appears when restaurant is in VIP-only mode) */}
            {restaurant?.vip_only_checkout && (
              <VipCodeInput onChange={handleVipCodeChange} />
            )}

            {/* Special Instructions */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Special Instructions</h2>
              <textarea
                name="specialInstructions"
                value={formData.specialInstructions}
                onChange={handleInputChange}
                placeholder="Any special requests or notes for your order?"
                className="w-full px-4 py-2 border border-gray-300 rounded-md
                  focus:ring-[#c1902f] focus:border-[#c1902f]"
                rows={3}
              />
            </div>

            {/* Promo + Total + Submit */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <label
                  htmlFor="promoCode"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Promo Code
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="promoCode"
                    name="promoCode"
                    value={formData.promoCode}
                    onChange={handleInputChange}
                    placeholder="Enter promo code"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md
                      focus:ring-[#c1902f] focus:border-[#c1902f]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 bg-gray-100 text-gray-700
                      rounded-md hover:bg-gray-200"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Total</span>
                <div className="text-right">
                  {appliedPromo && (
                    <span className="block text-sm text-gray-500 line-through">
                      ${rawTotal.toFixed(2)}
                    </span>
                  )}
                  <span className="text-2xl font-bold">
                    ${finalTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                onClick={handleSubmit}
                className="w-full bg-[#c1902f] text-white py-3 px-4
                  rounded-md hover:bg-[#d4a43f] transition-colors duration-200"
              >
                Place Order
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN => Pickup Info */}
        <div className="lg:col-span-5 mt-8 lg:mt-0">
          <PickupInfo />
        </div>
      </div>
    </div>
  );
}
