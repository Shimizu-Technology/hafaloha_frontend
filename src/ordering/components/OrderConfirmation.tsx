// src/ordering/components/OrderConfirmation.tsx
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle, MapPin, Clock, User, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useRestaurantStore } from '../../shared/store/restaurantStore';
import { formatPhoneNumber } from '../../shared/utils/formatters';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: Record<string, string[]>;
  notes?: string;
}

interface MerchandiseItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant_id?: number;
  size?: string;
  color?: string;
  notes?: string;
}

interface OrderDetails {
  id: string;
  order_number?: string;
  status: string;
  total: number;
  subtotal?: number;
  items: OrderItem[];
  merchandise_items?: MerchandiseItem[];
  special_instructions?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at?: string;
  estimated_pickup_time?: string;
  location_name?: string;
  location_address?: string;
  requires_advance_notice?: boolean;
  max_advance_notice_hours?: number;
  is_staff_order?: boolean;
  staff_member_name?: string;
}

export function OrderConfirmation() {
  const { orderId: urlOrderId } = useParams<{ orderId: string }>();
  const { restaurant } = useRestaurantStore();
  const { state } = useLocation() as {
    state?: {
      orderDetails?: OrderDetails;
      orderId?: string;
      total?: number;
      hasAny24hrItem?: boolean;
      locationName?: string;
      locationAddress?: string;
    };
  };

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(state?.orderDetails || null);
  const [loading, setLoading] = useState(!orderDetails);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    items: true,
    contact: false,
    instructions: false
  });

  // Get order ID from URL params or state
  const orderId = urlOrderId || state?.orderId || orderDetails?.id || 'N/A';

  // Fetch order details if not provided in state
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (orderDetails || !orderId || orderId === 'N/A') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get<OrderDetails>(`/orders/${orderId}`);
        setOrderDetails(response);
      } catch (err: any) {
        console.error('Failed to fetch order details:', err);
        setError('Unable to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, orderDetails]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatCustomizations = (customizations?: Record<string, string[]>) => {
    if (!customizations || Object.keys(customizations).length === 0) {
      return null;
    }

    return Object.entries(customizations).map(([groupName, options]) => (
      <div key={groupName} className="text-sm text-gray-600 mt-1">
        <span className="font-medium">{groupName}:</span> {Array.isArray(options) ? options.join(', ') : options}
      </div>
    ));
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const calculateItemSubtotal = (price: number, quantity: number) => price * quantity;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#c1902f] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Confirmation</h1>
          <p className="text-lg text-red-600 mb-4">{error || 'Order details not available'}</p>
          <p className="text-gray-600 mb-8">
            Order #{orderId} {error ? 'could not be loaded' : 'has been received'}
          </p>
          <Link
            to="/menu"
            className="inline-flex items-center px-6 py-3 border border-transparent
                       text-base font-medium rounded-md text-white bg-[#c1902f]
                       hover:bg-[#d4a43f]"
          >
            Continue Ordering
          </Link>
        </div>
      </div>
    );
  }

  const orderDate = formatDateTime(orderDetails.created_at);
  const estimatedPickup = formatDateTime(orderDetails.estimated_pickup_time);
  const hasAdvanceNotice = orderDetails.requires_advance_notice || orderDetails.max_advance_notice_hours;
  
  // Calculate totals
  const foodItemsTotal = orderDetails.items.reduce((sum, item) => sum + calculateItemSubtotal(item.price, item.quantity), 0);
  const merchandiseTotal = (orderDetails.merchandise_items || []).reduce((sum, item) => sum + calculateItemSubtotal(item.price, item.quantity), 0);
  const allItemsTotal = foodItemsTotal + merchandiseTotal;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-lg text-gray-600">
            Order #{orderDetails.order_number || orderId}
          </p>
          {orderDate && (
            <p className="text-sm text-gray-500 mt-1">
              Placed on {orderDate.date} at {orderDate.time}
            </p>
          )}
        </div>

        {/* Alert Messages */}
        <div className="space-y-3 mb-6">
          {hasAdvanceNotice && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-semibold">Advance Notice Required</p>
                  <p className="text-red-700 text-sm mt-1">
                    One or more items in your order requires {orderDetails.max_advance_notice_hours || 24} hours advance notice.
                  </p>
                </div>
              </div>
            </div>
          )}

          {orderDetails.is_staff_order && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <User className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 font-semibold">Staff Order</p>
                  <p className="text-blue-700 text-sm mt-1">
                    Order for: {orderDetails.staff_member_name || 'Staff Member'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              We'll send you an ETA as soon as the staff begins preparing your order.
            </p>
            <p className="text-sm text-gray-500">
              Please show your order number when picking up.
            </p>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="space-y-4">
            {/* Pickup Location */}
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-[#c1902f] mt-1 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {restaurant?.custom_pickup_location ? 'Special Pickup Location' : 
                   orderDetails.location_name || restaurant?.name || 'Pickup Location'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {restaurant?.custom_pickup_location || orderDetails.location_address || restaurant?.address || "Barrigada, Guam"}
                </p>
                {restaurant?.custom_pickup_location && (
                  <p className="text-amber-600 text-sm font-medium mt-1">
                    ⚠️ Special pickup location - please note this is not our usual address
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant?.custom_pickup_location || orderDetails.location_address || restaurant?.address || "Barrigada, Guam")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#c1902f] hover:text-[#d4a43f] text-sm mt-1 inline-block"
                >
                  View on Google Maps
                </a>
              </div>
            </div>

            {/* Hours */}
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-[#c1902f] mt-1 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Hours</h4>
                <p className="text-gray-600 text-sm">Open Daily: 11AM - 9PM</p>
                <p className="text-xs text-gray-500">
                  Orders must be picked up during business hours
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-[#c1902f] mt-1 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Contact</h4>
                <p className="text-gray-600 text-sm">
                  {formatPhoneNumber(restaurant?.phone_number) || "+1 (671) 989-3444"}
                </p>
                <p className="text-xs text-gray-500">
                  Call us if you need to modify your order
                </p>
              </div>
            </div>

            {/* Pickup Instructions */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">
                Pickup Instructions
                {restaurant?.admin_settings?.custom_pickup_instructions && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">
                    (Special Instructions)
                  </span>
                )}
              </h4>
              
              {restaurant?.admin_settings?.custom_pickup_instructions ? (
                <div className="text-gray-600 text-sm whitespace-pre-line">
                  {restaurant.admin_settings.custom_pickup_instructions}
                </div>
              ) : (
                <ol className="list-decimal list-inside text-gray-600 text-sm space-y-1">
                  <li>Park in the designated pickup spots</li>
                  <li>Come inside and show your order number at the counter</li>
                  <li>Your order will be ready at the time indicated</li>
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <button
            onClick={() => toggleSection('items')}
            className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
            {expandedSections.items ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {expandedSections.items && (
            <div className="px-4 pb-4 border-t border-gray-200">
              {/* Food Items */}
              {orderDetails.items.length > 0 && (
                <div className="space-y-4 mt-4">
                  {orderDetails.items.map((item, index) => (
                    <div key={`food-${index}`} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-gray-900 truncate pr-2">{item.name}</h4>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm text-gray-500">
                                {formatPrice(item.price)} × {item.quantity}
                              </p>
                              <p className="font-medium text-gray-900">
                                {formatPrice(calculateItemSubtotal(item.price, item.quantity))}
                              </p>
                            </div>
                          </div>
                          
                          {/* Customizations */}
                          {formatCustomizations(item.customizations)}
                          
                          {/* Notes */}
                          {item.notes && (
                            <div className="text-sm text-gray-600 mt-2 italic">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Merchandise Items */}
              {orderDetails.merchandise_items && orderDetails.merchandise_items.length > 0 && (
                <div className="space-y-4 mt-6 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-700">Merchandise</h4>
                  {orderDetails.merchandise_items.map((item, index) => (
                    <div key={`merch-${index}`} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h5 className="font-medium text-gray-900 truncate pr-2">{item.name}</h5>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm text-gray-500">
                                {formatPrice(item.price)} × {item.quantity}
                              </p>
                              <p className="font-medium text-gray-900">
                                {formatPrice(calculateItemSubtotal(item.price, item.quantity))}
                              </p>
                            </div>
                          </div>
                          
                          {/* Merchandise details */}
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            {item.size && <div>Size: {item.size}</div>}
                            {item.color && <div>Color: {item.color}</div>}
                            {item.notes && <div className="italic">Note: {item.notes}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Total */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  {orderDetails.items.length > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Food Items Subtotal:</span>
                      <span>{formatPrice(foodItemsTotal)}</span>
                    </div>
                  )}
                  {merchandiseTotal > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Merchandise Subtotal:</span>
                      <span>{formatPrice(merchandiseTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total:</span>
                    <span>{formatPrice(orderDetails.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact Information */}
        {(orderDetails.contact_name || orderDetails.contact_phone || orderDetails.contact_email) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <button
              onClick={() => toggleSection('contact')}
              className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              {expandedSections.contact ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.contact && (
              <div className="px-4 pb-4 border-t border-gray-200 space-y-3 mt-4">
                {orderDetails.contact_name && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-500 mr-3" />
                    <span className="text-gray-900">{orderDetails.contact_name}</span>
                  </div>
                )}
                {orderDetails.contact_phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-500 mr-3" />
                    <span className="text-gray-900">{orderDetails.contact_phone}</span>
                  </div>
                )}
                {orderDetails.contact_email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-500 mr-3" />
                    <span className="text-gray-900">{orderDetails.contact_email}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Special Instructions */}
        {orderDetails.special_instructions && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <button
              onClick={() => toggleSection('instructions')}
              className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900">Special Instructions</h3>
              {expandedSections.instructions ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.instructions && (
              <div className="px-4 pb-4 border-t border-gray-200 mt-4">
                <p className="text-gray-900 whitespace-pre-wrap">{orderDetails.special_instructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Estimated Pickup Time */}
        {estimatedPickup && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-[#c1902f] mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900">Estimated Pickup</h3>
                <p className="text-gray-600">{estimatedPickup.date} at {estimatedPickup.time}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Link
            to="/menu"
            className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent
                       text-base font-medium rounded-md text-white bg-[#c1902f]
                       hover:bg-[#d4a43f] transition-colors"
          >
            Order More
          </Link>
          <Link
            to="/"
            className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-[#c1902f]
                       text-base font-medium rounded-md text-[#c1902f]
                       hover:bg-gray-50 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
