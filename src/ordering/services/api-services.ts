// src/ordering/services/api-services.ts

/**
 * This file re-exports the API services from the reservations module
 * to be used by the ordering module's reservation components.
 * 
 * This allows us to use the same API services in both modules without
 * duplicating code.
 */

export { 
  blockedPeriodsApi,
  locationCapacitiesApi
} from '../../reservations/services/table-management-api';

export type {
  TableShape,
  TableRotation,
  TableDimensions
} from './api-layouts';

export type { 
  BlockedPeriod, 
  LocationCapacity,
  AvailableCapacity
} from '../../reservations/services/table-management-api';

// Import layout API services
export { 
  layoutsApi, 
  type LayoutData, 
  type SeatSection, 
  type Seat 
} from './api-layouts';

export {
  locationsApi
} from '../../reservations/services/locations-api';

export type {
  Location
} from '../../reservations/services/locations-api';

// Re-export date-fns utilities used in reservation components
export { format, parseISO } from 'date-fns';
