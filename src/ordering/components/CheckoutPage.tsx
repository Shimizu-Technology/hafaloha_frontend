// src/ordering/components/CheckoutPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Mail, Phone, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { useAuthStore } from '../store/authStore';
import { usePromoStore } from '../store/promoStore';
import { useOrderStore } from '../store/orderStore';
import { PickupInfo } from './location/PickupInfo';

interface CheckoutFormData {
  name: string;
  email: string;
  phone: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  specialInstructions: string;
  promoCode: string;
}

/**
 * Allows a plus sign, then 3 or 4 digits for "area code," then exactly 7 more digits.
 * e.g. +16711234567 or +17025551234 or +9251234567
 */
function isValidPhone(phoneStr: string) {
  return /^\+\d{3,4}\d{7}$/.test(phoneStr);
}

export function CheckoutPage() {
  const { t } = useTranslation();
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
  };

  const [formData, setFormData] = useState<CheckoutFormData>(initialFormData);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [finalTotal, setFinalTotal] = useState(rawTotal);

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
        toast.success(t('toasts.promoApplied', { code: formData.promoCode }));
      } catch (error) {
        console.error('Error applying discount:', error);
        toast.error(t('toasts.promoError'));
      }
    } else {
      toast.error(t('toasts.invalidPromo'));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Check if any item needs 24-hr notice
    const hasAny24hrItem = cartItems.some(
      (it) => (it.advance_notice_hours ?? 0) >= 24
    );

    const finalPhone = formData.phone.trim();
    if (!isValidPhone(finalPhone)) {
      toast.error(t('toasts.phoneFormat'));
      return;
    }

    try {
      const newOrder = await addOrder(
        cartItems,
        finalTotal,
        formData.specialInstructions,
        formData.name,
        finalPhone,
        formData.email
      );

      toast.success(t('toasts.orderSuccess'));

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
      toast.error(t('toasts.orderError'));
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('checkout.title')}</h1>
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* LEFT: The form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">{t('checkout.contactInformation')}</h2>
              <div className="space-y-4">
                {/* NAME */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <User className="inline-block w-4 h-4 mr-2" />
                    {t('checkout.fullName')} <span className="text-red-500">*</span>
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
                    {t('checkout.email')} <span className="text-red-500">*</span>
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
                    {t('checkout.phone')} <span className="text-red-500">*</span>
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
              <h2 className="text-xl font-semibold mb-4">{t('checkout.paymentInformation')}</h2>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="cardNumber"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    <CreditCard className="inline-block w-4 h-4 mr-2" />
                    {t('checkout.cardNumber')} <span className="text-red-500">*</span>
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
                      {t('checkout.expiryDate')} <span className="text-red-500">*</span>
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
                      {t('checkout.cvv')} <span className="text-red-500">*</span>
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
              <h2 className="text-xl font-semibold mb-4">{t('checkout.specialInstructions')}</h2>
              <textarea
                name="specialInstructions"
                value={formData.specialInstructions}
                onChange={handleInputChange}
                placeholder={t('checkout.specialInstructionsPlaceholder')}
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
                  {t('checkout.promoCode')}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="promoCode"
                    name="promoCode"
                    value={formData.promoCode}
                    onChange={handleInputChange}
                    placeholder={t('checkout.promoCodePlaceholder')}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md
                      focus:ring-[#c1902f] focus:border-[#c1902f]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 bg-gray-100 text-gray-700
                      rounded-md hover:bg-gray-200"
                  >
                    {t('checkout.apply')}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">{t('checkout.total')}</span>
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
                {t('checkout.placeOrder')}
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
