import React, { useEffect } from 'react';
import { MapPin, Clock, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';
import { formatPhoneNumber } from '../../../shared/utils/formatters';

export function PickupInfo() {
  const { t } = useTranslation();
  const { restaurant, fetchRestaurant, loading } = useRestaurantStore();
  
  useEffect(() => {
    // Always fetch restaurant data to ensure it's up to date
    fetchRestaurant();
  }, [fetchRestaurant]);
  
  const address = restaurant?.address || "955 Pale San Vitores Rd, Tamuning, Guam 96913";
  const phoneNumber = formatPhoneNumber(restaurant?.phone_number) || "+1 (671) 989-3444";
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">{t('checkout.pickupInformation')}</h3>
      
      <div className="space-y-4">
        <div className="flex items-start">
          <MapPin className="h-5 w-5 text-[#c1902f] mt-1 mr-3" />
          <div>
            <p className="font-medium">{t('checkout.location')}</p>
            <p className="text-gray-600">{address}</p>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c1902f] hover:text-[#d4a43f] text-sm mt-1 inline-block"
            >
              {t('checkout.viewOnGoogleMaps')}
            </a>
          </div>
        </div>

        <div className="flex items-start">
          <Clock className="h-5 w-5 text-[#c1902f] mt-1 mr-3" />
          <div>
            <p className="font-medium">{t('checkout.hours')}</p>
            <p className="text-gray-600">{t('checkout.openDaily')}: 11AM - 9PM</p>
            <p className="text-sm text-gray-500">
              {t('checkout.ordersMustBe')}
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <Phone className="h-5 w-5 text-[#c1902f] mt-1 mr-3" />
          <div>
            <p className="font-medium">{t('checkout.contact')}</p>
            <p className="text-gray-600">{phoneNumber}</p>
            <p className="text-sm text-gray-500">
              {t('checkout.callUsIf')}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="font-medium mb-2">{t('checkout.pickupInstructions')}</h4>
        <ol className="list-decimal list-inside text-gray-600 space-y-2">
          <li>{t('checkout.parkIn')}</li>
          <li>{t('checkout.comeInside')}</li>
          <li>{t('checkout.yourOrderWill')}</li>
        </ol>
      </div>
    </div>
  );
}
