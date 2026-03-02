import { Location } from "../types/Location";
import { Restaurant } from "../store/restaurantStore";

const DEFAULT_ADDRESS = "Barrigada, Guam";
const DEFAULT_HOURS = "Open Daily: 11AM - 9PM";

interface PickupDisplayOverrideSettings {
  override_enabled?: boolean;
  name?: string;
  address?: string;
  google_maps_url?: string;
  hours_text?: string;
  instructions?: string;
}

export interface ResolvedPickupDisplay {
  usingOverride: boolean;
  title: string;
  address: string;
  googleMapsUrl: string;
  hoursText: string;
  phoneNumber?: string;
  instructions?: string;
}

interface ResolvePickupDisplayParams {
  restaurant: Restaurant | null;
  location?: Location | null;
  fallbackLocationName?: string;
  fallbackAddress?: string;
}

const normalizeText = (value: unknown): string => String(value || "").trim();

const getPickupOverride = (
  restaurant: Restaurant | null
): PickupDisplayOverrideSettings => {
  const adminSettings = restaurant?.admin_settings || {};
  const pickupDisplay = adminSettings.pickup_display || {};

  return pickupDisplay as PickupDisplayOverrideSettings;
};

const shouldUseLegacyOverride = (restaurant: Restaurant | null): boolean => {
  if (!restaurant) return false;

  const adminSettings = restaurant.admin_settings || {};
  return Boolean(
    normalizeText(restaurant.custom_pickup_location) ||
      normalizeText(adminSettings.custom_pickup_google_maps_url) ||
      normalizeText(adminSettings.custom_pickup_hours) ||
      normalizeText(adminSettings.custom_pickup_instructions)
  );
};

export const resolvePickupDisplay = ({
  restaurant,
  location,
  fallbackLocationName,
  fallbackAddress,
}: ResolvePickupDisplayParams): ResolvedPickupDisplay => {
  const adminSettings = restaurant?.admin_settings || {};
  const pickupOverride = getPickupOverride(restaurant);
  const hasPickupDisplayConfig = Object.keys(pickupOverride).length > 0;
  const hasExplicitToggle =
    typeof pickupOverride.override_enabled === "boolean";
  const usingOverride = hasExplicitToggle
    ? pickupOverride.override_enabled === true
    : shouldUseLegacyOverride(restaurant);

  const resolvedAddress = normalizeText(
    usingOverride
      ? pickupOverride.address ||
          (!hasPickupDisplayConfig ? restaurant?.custom_pickup_location : "") ||
          fallbackAddress ||
          location?.address ||
          restaurant?.address ||
          DEFAULT_ADDRESS
      : location?.address || fallbackAddress || restaurant?.address || DEFAULT_ADDRESS
  );

  const title = normalizeText(
    usingOverride
      ? pickupOverride.name || "Special Pickup Location"
      : location?.name || fallbackLocationName || restaurant?.name || "Pickup Location"
  );

  const customMapsUrl = normalizeText(
    usingOverride
      ? pickupOverride.google_maps_url ||
          (!hasPickupDisplayConfig
            ? adminSettings.custom_pickup_google_maps_url
            : "")
      : ""
  );

  const googleMapsUrl =
    customMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      resolvedAddress
    )}`;

  const hoursText = normalizeText(
    pickupOverride.hours_text ||
      (!hasPickupDisplayConfig ? adminSettings.custom_pickup_hours : "") ||
      restaurant?.hours ||
      DEFAULT_HOURS
  );

  const instructions = normalizeText(
    usingOverride
      ? pickupOverride.instructions ||
          (!hasPickupDisplayConfig
            ? adminSettings.custom_pickup_instructions
            : "")
      : ""
  );

  const phoneNumber = normalizeText(location?.phone_number || restaurant?.phone_number);

  return {
    usingOverride,
    title,
    address: resolvedAddress,
    googleMapsUrl,
    hoursText,
    phoneNumber: phoneNumber || undefined,
    instructions: instructions || undefined,
  };
};
