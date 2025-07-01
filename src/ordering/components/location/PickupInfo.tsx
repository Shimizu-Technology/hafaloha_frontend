// src/ordering/components/location/PickupInfo.tsx
import { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Phone } from 'lucide-react';
import { useRestaurantStore } from '../../../shared/store/restaurantStore';
import { formatPhoneNumber } from '../../../shared/utils/formatters';
import { locationsApi } from '../../../shared/api/endpoints/locations';
import { Location } from '../../../shared/types/Location';

interface PickupInfoProps {
  locationId?: number | null;
}

export function PickupInfo({ locationId }: PickupInfoProps = {}) {
  const { restaurant } = useRestaurantStore();
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousLocationId = useRef<number | null | undefined>(null);
  
  // Fetch location details if locationId is provided
  useEffect(() => {
    if (locationId) {
      // Only start transition if the locationId has changed
      if (previousLocationId.current !== locationId) {
        setIsTransitioning(true);
        setIsLoading(true);
        setError(null);
        
        // Small delay before fetching to allow for smooth transition
        const transitionTimer = setTimeout(() => {
          locationsApi.getLocation(locationId)
            .then(locationData => {
              setLocation(locationData);
            })
            .catch(err => {
              console.error('Error fetching location details:', err);
              setError('Failed to load location details');
            })
            .finally(() => {
              setIsLoading(false);
              // Add a small delay before ending the transition to ensure smooth animation
              setTimeout(() => {
                setIsTransitioning(false);
              }, 150);
            });
        }, 150);
        
        previousLocationId.current = locationId;
        return () => clearTimeout(transitionTimer);
      }
    } else {
      // Reset location if locationId is null
      setLocation(null);
      previousLocationId.current = null;
    }
  }, [locationId]);
  
  // Determine pickup information with proper priority:
  // 1. Custom pickup location/instructions (highest priority)
  // 2. Selected location details
  // 3. Restaurant default info (fallback)
  
  const hasCustomLocation = !!restaurant?.custom_pickup_location;
  const hasCustomInstructions = !!restaurant?.admin_settings?.custom_pickup_instructions;
  
  // Priority: Custom location > Location address > Restaurant address
  const address = restaurant?.custom_pickup_location || location?.address || restaurant?.address || "Barrigada, Guam";
  
  // Priority: Location phone > Restaurant phone
  const phoneNumber = formatPhoneNumber(location?.phone_number || restaurant?.phone_number) || "+1 (702) 742-1168";
  
  // Determine the location title
  let locationTitle;
  if (hasCustomLocation) {
    locationTitle = 'Special Pickup Location';
  } else if (location) {
    locationTitle = location.name;
  } else {
    locationTitle = restaurant?.name || 'Location';
  }
  
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  
  // Get custom pickup instructions or use defaults
  const customInstructions = restaurant?.admin_settings?.custom_pickup_instructions;
  const defaultInstructions = [
    "Park in the designated pickup spots",
    "Come inside and show your order number at the counter", 
    "Your order will be ready at the time indicated"
  ];

  return (
    <div className="bg-white p-2 rounded-lg border border-gray-200">
      {/* Add transition classes */}
      <div className={`transition-opacity duration-300 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      {isLoading ? (
        <div className="py-4 text-center text-gray-500">Loading location information...</div>
      ) : error ? (
        <div className="py-4 text-center text-red-500">{error}</div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-[#c1902f] mt-1 mr-3" />
              <div>
                <p className="font-medium">{locationTitle}</p>
                <p className="text-gray-600">{address}</p>
                {hasCustomLocation && (
                  <p className="text-amber-600 text-sm font-medium mt-1">
                    ⚠️ Special pickup location - please note this is not our usual address
                  </p>
                )}
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#c1902f] hover:text-[#d4a43f] text-sm mt-1 inline-block"
                >
                  View on Google Maps
                </a>
              </div>
            </div>

            <div className="flex items-start">
              <Clock className="h-5 w-5 text-[#c1902f] mt-1 mr-3" />
              <div>
                <p className="font-medium">Hours</p>
                <p className="text-gray-600">Open Daily: 11AM - 9PM</p>
                <p className="text-sm text-gray-500">
                  Orders must be picked up during business hours
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Phone className="h-5 w-5 text-[#c1902f] mt-1 mr-3" />
              <div>
                <p className="font-medium">Contact</p>
                <p className="text-gray-600">{phoneNumber}</p>
                <p className="text-sm text-gray-500">
                  Call us if you need to modify your order
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">
              Pickup Instructions
              {hasCustomInstructions && (
                <span className="ml-2 text-xs text-amber-600 font-normal">
                  (Special Instructions)
                </span>
              )}
            </h4>
            
            {hasCustomInstructions ? (
              <div className="text-gray-600 whitespace-pre-line">
                {customInstructions}
              </div>
            ) : (
              <ol className="list-decimal list-inside text-gray-600 space-y-2">
                {defaultInstructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
