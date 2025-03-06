import { api } from '../apiClient';

export interface SpecialEvent {
  id: number;
  description: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  vip_only_checkout: boolean;
  code_prefix?: string;
}

export interface SpecialEventCreateParams {
  description: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  vip_only_checkout: boolean;
  code_prefix?: string;
}

// Get all special events for a restaurant
export const getSpecialEvents = async (restaurantId: number): Promise<SpecialEvent[]> => {
  try {
    return await api.get<SpecialEvent[]>('/admin/special_events');
  } catch (error) {
    throw error;
  }
};

// Create a new special event
export const createSpecialEvent = async (restaurantId: number, eventData: SpecialEventCreateParams): Promise<SpecialEvent> => {
  try {
    return await api.post<SpecialEvent>('/admin/special_events', {
      special_event: {
        ...eventData,
        restaurant_id: restaurantId
      }
    });
  } catch (error) {
    throw error;
  }
};

// Set a special event as the current event for a restaurant
export const setAsCurrentEvent = async (restaurantId: number, eventId: number): Promise<any> => {
  try {
    return await api.post(`/admin/special_events/${eventId}/set_as_current`, {});
  } catch (error) {
    throw error;
  }
};
