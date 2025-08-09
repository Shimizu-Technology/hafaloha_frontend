// src/wholesale/components/OrderConfirmation.tsx
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle, MapPin, Clock, User, Phone, Mail, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRestaurantStore } from '../../shared/store/restaurantStore';
import { formatPhoneNumber } from '../../shared/utils/formatters';
import { wholesaleApi, WholesaleOrder } from '../services/wholesaleApi';

interface WholesaleOrderItem {
  item_id: number;
  name: string;
  description?: string;
  price_cents: number;
  quantity: number;
  line_total_cents: number;
  selected_options?: Record<string, string>;
}

// Extend the existing WholesaleOrder type with additional fields we need
interface WholesaleOrderDetails extends WholesaleOrder {
  notes?: string;
  items: WholesaleOrderItem[];
  estimated_pickup_time?: string;
}

export default function OrderConfirmation() {
  const { orderId: urlOrderId } = useParams<{ orderId: string }>();
  const { restaurant } = useRestaurantStore();
  const { state } = useLocation() as {
    state?: {
      orderDetails?: WholesaleOrderDetails;
      orderId?: string;
      total?: number;
    };
  };

  const [orderDetails, setOrderDetails] = useState<WholesaleOrderDetails | null>(state?.orderDetails || null);
  const [loading, setLoading] = useState(!orderDetails);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    items: true,
    contact: true, // Show contact info by default
    fundraiser: false,
    instructions: false
  });

  // Get order ID from URL params or state
  const orderId = urlOrderId || state?.orderId || orderDetails?.id?.toString() || 'N/A';

  // Fetch order details if not provided in state
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (orderDetails || !orderId || orderId === 'N/A') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await wholesaleApi.getOrder(parseInt(orderId));
        
        if (response.success && response.data && response.data.order) {
          setOrderDetails(response.data.order as WholesaleOrderDetails);
        } else {
          console.error('Invalid response structure:', response);
          setError('Invalid order data received');
        }
      } catch (err: any) {
        console.error('Failed to fetch wholesale order details:', err);
        setError(`Unable to load order details: ${err.message}`);
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

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#c1902f] mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your wholesale order details...</p>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Wholesale Order Confirmation</h1>
          <p className="text-lg text-red-600 mb-4">{error || 'Order details not available'}</p>
          <p className="text-gray-600 mb-8">
            Order #{orderId} {error ? 'could not be loaded' : 'has been received'}
          </p>
          <Link
            to="/wholesale"
            className="inline-flex items-center px-6 py-3 border border-transparent
                       text-base font-medium rounded-md text-white bg-[#c1902f]
                       hover:bg-[#d4a43f]"
          >
            Return to Wholesale
          </Link>
        </div>
      </div>
    );
  }

  const orderDate = formatDateTime(orderDetails.createdAt);
  const estimatedPickup = formatDateTime(orderDetails.estimated_pickup_time);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Wholesale Order Confirmed!
          </h1>
          <p className="text-lg text-gray-600">
            Order #{orderDetails.orderNumber}
          </p>
          {orderDate && (
            <p className="text-sm text-gray-500 mt-1">
              Placed on {orderDate.date} at {orderDate.time}
            </p>
          )}
        </div>

        {/* Alert Messages */}
        <div className="space-y-3 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Users className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-blue-800 font-semibold">Wholesale Order</p>
                <p className="text-blue-700 text-sm mt-1">
                  This order is supporting {orderDetails.fundraiser.name} - {orderDetails.participant?.name || 'Participant'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              Thank you for supporting our fundraiser! We'll process your wholesale order and send you pickup instructions via email and SMS.
            </p>
            <p className="text-sm text-gray-500">
              Please show your order number when picking up.
            </p>
          </div>
        </div>

        {/* Fundraiser Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <button
            onClick={() => toggleSection('fundraiser')}
            className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900">Fundraiser Details</h3>
            {expandedSections.fundraiser ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {expandedSections.fundraiser && (
            <div className="px-4 pb-4 border-t border-gray-200 space-y-3 mt-4">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-gray-500 mr-3" />
                <div>
                  <span className="font-medium text-gray-900">{orderDetails.fundraiser.name}</span>
                </div>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-500 mr-3" />
                <div>
                  <span className="text-gray-900">Supporting: {orderDetails.participant?.name || 'Participant'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="space-y-4">
            {/* Pickup Location */}
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-[#c1902f] mt-1 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {orderDetails?.fundraiser?.pickup_display_name || restaurant?.name || 'Pickup Location'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {orderDetails?.fundraiser?.pickup_display_address || restaurant?.address || "Contact for pickup details"}
                </p>
                {orderDetails?.fundraiser?.pickup_instructions && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <strong className="text-blue-800">Pickup Instructions:</strong>
                    <span className="text-blue-700 ml-1">{orderDetails.fundraiser.pickup_instructions}</span>
                  </div>
                )}
                {orderDetails?.fundraiser?.pickup_hours && (
                  <p className="text-green-700 text-sm font-medium mt-1">
                    🕒 Pickup Hours: {orderDetails.fundraiser.pickup_hours}
                  </p>
                )}
                {orderDetails?.fundraiser?.pickup_contact_name && (
                  <p className="text-gray-600 text-sm mt-1">
                    👤 Contact: {orderDetails.fundraiser.pickup_contact_name}
                    {orderDetails.fundraiser.pickup_contact_phone && ` - ${orderDetails.fundraiser.pickup_contact_phone}`}
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orderDetails?.fundraiser?.pickup_display_address || restaurant?.address || "Barrigada, Guam")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#c1902f] hover:text-[#d4a43f] text-sm mt-2 inline-block"
                >
                  📍 View on Maps
                </a>
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
              <div className="space-y-4 mt-4">
                {orderDetails.items?.map((item, index) => (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-sm text-gray-500">
                              {formatPrice(item.price_cents)} × {item.quantity}
                            </p>
                            <p className="font-medium text-gray-900">
                              {formatPrice(item.line_total_cents)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Selected Options */}
                        {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                          <div className="text-sm text-gray-600 mt-2">
                            {Object.entries(item.selected_options).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium capitalize">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )) || <p className="text-gray-500 text-center py-4">No items found</p>}
              </div>

              {/* Order Total */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-lg font-semibold text-gray-900">
                  <span>Total:</span>
                  <span>{formatPrice(orderDetails.totalCents)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <button
            onClick={() => toggleSection('contact')}
            className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900">Your Contact Information</h3>
            {expandedSections.contact ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {expandedSections.contact && (
            <div className="px-4 pb-4 border-t border-gray-200 space-y-3 mt-4">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-500 mr-3" />
                <span className="text-gray-900">{orderDetails.customerName}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-500 mr-3" />
                <span className="text-gray-900">{orderDetails.customerPhone}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-500 mr-3" />
                <span className="text-gray-900">{orderDetails.customerEmail}</span>
              </div>
              {orderDetails.shippingAddress && (
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-gray-500 mr-3 mt-0.5" />
                  <span className="text-gray-900">{orderDetails.shippingAddress}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Special Instructions */}
        {orderDetails.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <button
              onClick={() => toggleSection('instructions')}
              className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-t-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900">Order Notes</h3>
              {expandedSections.instructions ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {expandedSections.instructions && (
              <div className="px-4 pb-4 border-t border-gray-200 mt-4">
                <p className="text-gray-900 whitespace-pre-wrap">{orderDetails.notes}</p>
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
            to="/wholesale"
            className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent
                       text-base font-medium rounded-md text-white bg-[#c1902f]
                       hover:bg-[#d4a43f] transition-colors"
          >
            Browse More Items
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