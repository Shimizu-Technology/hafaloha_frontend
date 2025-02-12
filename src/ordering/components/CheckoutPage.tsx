// src/ordering/components/CheckoutPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Mail, Phone, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../store/authStore';  // We import our auth store
import { usePromoStore } from '../store/promoStore';
import { useOrderStore } from '../store/orderStore';
import { PickupInfo } from './location/PickupInfo';

interface CheckoutFormData {
  name: string;
  email: string;
  phone: string; // We'll pre-fill +1671 if empty
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  specialInstructions: string;
  promoCode: string;
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
    phone: user?.phone || '',  // if user has a phone, use it, else blank => we'll fill +1671 below
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    specialInstructions: '',
    promoCode: ''
  };

  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [finalTotal, setFinalTotal] = useState(rawTotal);

  // On mount or if phone changes from user => if blank => set +1671
  useEffect(() => {
    if (formData.phone.trim() === '') {
      setFormData((prev) => ({ ...prev, phone: '+1671' }));
    }
  }, []);

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

  function handleApplyPromo() {
    const isValid = validatePromoCode(formData.promoCode);
    if (isValid) {
      const discounted = applyDiscount(rawTotal, formData.promoCode);
      setFinalTotal(discounted);
      setAppliedPromo(formData.promoCode);
      toast.success(`Promo code ${formData.promoCode} applied!`);
    } else {
      toast.error('Invalid or expired promo code');
    }
  }

  // If user leaves phone as +1671 => treat as blank
  function normalizePhone(phoneStr: string) {
    const trimmed = phoneStr.trim();
    if (trimmed === '+1671' || trimmed === '+1671-') {
      return '';
    }
    return trimmed;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Check for 24 hr item
      const hasAny24hrItem = cartItems.some(
        (it) => (it.advance_notice_hours ?? 0) >= 24
      );

      // Normalize phone
      const finalPhone = normalizePhone(formData.phone);

      const newOrder = await addOrder(
        cartItems,
        finalTotal,
        formData.specialInstructions,
        formData.name,
        finalPhone,
        formData.email
      );

      toast.success('Order placed successfully!');

      const estimatedTime = hasAny24hrItem ? '24 hours' : '20–25 min';

      navigate('/ordering/order-confirmation', {
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
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <User className="inline-block w-4 h-4 mr-2" />
                    Full Name
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
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <Mail className="inline-block w-4 h-4 mr-2" />
                    Email
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
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <Phone className="inline-block w-4 h-4 mr-2" />
                    Phone
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
                    Card Number
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
                      Expiry Date
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
                      CVV
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
