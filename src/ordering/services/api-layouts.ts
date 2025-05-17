// src/ordering/services/api-layouts.ts

// Use the exact same API client as the original reservations module
import { apiClient } from '../../shared/api/apiClient';
import { useRestaurantStore } from '../../shared/store/restaurantStore';
import * as tenantUtils from '../../shared/utils/tenantUtils';

// Custom types for API responses
type ApiResponse<T> = {
  data: T;
  [key: string]: any;
};

interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: any;
  request?: any;
}

// Interfaces for Layout data
export interface LayoutData {
  id: number;
  name: string;
  restaurant_id: number;
  location_id?: number;
  sections_data: {
    sections: SeatSection[];
  };
  is_active?: boolean;
  // Added to support the seat_sections array from the backend
  seat_sections?: Array<{
    id: string | number;
    name: string;
    section_type?: string;
    offset_x?: number;
    offset_y?: number;
    orientation?: string;
    floor_number?: number;
    shape?: TableShape;
    dimensions?: TableDimensions;
    rotation?: TableRotation;
    seats?: Array<{
      id: number;
      label?: string;
      position_x: number;
      position_y: number;
      capacity: number;
      status?: string;
      occupant_info?: any;
    }>;
  }>;
}

/**
 * Shape types for tables
 * Currently supporting circle and rectangle
 */
export type TableShape = 'circle' | 'rectangle';

/**
 * Rotation angles for tables in degrees
 * Limited to 90-degree increments for simplicity
 */
export type TableRotation = 0 | 90 | 180 | 270;

/**
 * Dimensions for rectangular tables
 */
export interface TableDimensions {
  width: number;
  height: number;
}

/**
 * SeatSection interface for representing tables and other seating areas
 * Extended with shape, dimensions, and rotation properties
 */
export interface SeatSection {
  id: string;
  dbId?: number;
  name: string;
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
  offsetX: number;
  offsetY: number;
  floorNumber: number;
  seats: Seat[];
  
  // New properties for enhanced layout editor
  // Shape of the table (defaults to circle for backward compatibility)
  shape?: TableShape;
  // Dimensions for non-circular tables
  dimensions?: TableDimensions;
  // Rotation angle in degrees (defaults to 0 for backward compatibility)
  rotation?: TableRotation;
}

export interface Seat {
  id?: number;
  label?: string;
  position_x: number;
  position_y: number;
  capacity: number;
  // Indicates if this seat is positioned at a table corner
  isCorner?: boolean;
}

// Layout API service with tenant isolation
export const layoutsApi = {
  // Get all layouts, optionally filtered by location
  getAllLayouts: async (restaurantId: number, locationId?: number): Promise<LayoutData[]> => {
    const { restaurant } = useRestaurantStore.getState();
    
    if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
      console.error('Restaurant context required for getAllLayouts');
      return [];
    }
    
    try {
      // Build request parameters with restaurant_id and optional location_id
      const requestParams: Record<string, any> = {
        restaurant_id: restaurantId || restaurant.id
      };
      
      // Add location_id parameter if provided
      if (locationId) {
        requestParams.location_id = locationId;
      }
      
      console.log('Fetching layouts with params:', requestParams);
      
      // Match exact format from original implementation - use apiClient like the original module
      // Add explicit headers to request JSON
      const response: AxiosResponse = await apiClient.get('/layouts', {
        params: requestParams,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Layout API response:', response.data);
      
      // Ensure we handle various response formats correctly
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          return response.data as LayoutData[];
        } else if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data as LayoutData[];
        } else if (typeof response.data === 'object') {
          // Some API endpoints return the array inside another property
          for (const key in response.data) {
            if (Array.isArray(response.data[key])) {
              return response.data[key] as LayoutData[];
            }
          }
        }
      }
      
      // Default to empty array if response format is unexpected
      console.warn('Unexpected layout response format:', response.data);
      return [];
    } catch (error) {
      console.error('Error fetching layouts:', error);
      return [];
    }
  },
  
  // Get a specific layout
  getLayout: async (id: number): Promise<LayoutData | null> => {
    const { restaurant } = useRestaurantStore.getState();
    
    if (!restaurant || !tenantUtils.validateRestaurantContext(restaurant)) {
      console.error('Restaurant context required for getLayout');
      return null;
    }
    
    try {
      console.log(`Fetching layout ${id} for restaurant ${restaurant.id}`);
      
      // Match exact format from original implementation - use apiClient like the original module
      const response: AxiosResponse = await apiClient.get(`/layouts/${id}`, {
        params: { restaurant_id: restaurant.id },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Layout ${id} response:`, response.data);
      
      if (response && response.data) {
        // Log the raw response
        console.log('Raw Layout Response:', JSON.stringify(response.data, null, 2));
        
        // Ensure valid sections_data format
        const layoutData = response.data as LayoutData;
        if (!layoutData.sections_data) {
          layoutData.sections_data = { sections: [] };
        } else if (!layoutData.sections_data.sections) {
          layoutData.sections_data = { 
            ...layoutData.sections_data, 
            sections: [] 
          };
        } else {
          // Create maps to look up sections by both ID and name for redundancy
          const sectionShapeMap = new Map<string, { shape: TableShape, dimensions: TableDimensions, rotation: TableRotation }>();
          const nameToShapeMap = new Map<string, { shape: TableShape, dimensions: TableDimensions, rotation: TableRotation }>();
          
          // First extract shape data from the seat_sections array
          if (layoutData.seat_sections && Array.isArray(layoutData.seat_sections)) {
            console.log('Building section shape map from seat_sections data');
            
            layoutData.seat_sections.forEach((section) => {
              const sectionId = section.id?.toString();
              const sectionName = section.name;
              
              if (sectionId) {
                console.log(`Section ${section.name} (ID: ${sectionId}) from seat_sections has shape: ${section.shape}`);
                
                if (section.shape) {
                  // Normalize the shape to ensure it's a valid TableShape
                  const normalizedShape: TableShape = 
                    section.shape === 'rectangle' ? 'rectangle' : 'circle';
                  
                  const shapeData = {
                    shape: normalizedShape,
                    dimensions: section.dimensions || { width: 120, height: 80 },
                    rotation: section.rotation ?? 0
                  };
                  
                  // Map by both ID and name
                  sectionShapeMap.set(sectionId, shapeData);
                  if (sectionName) {
                    nameToShapeMap.set(sectionName, shapeData);
                  }
                }
              }
            });
          }
          
          // Process each section in sections_data to apply the shape information
          layoutData.sections_data.sections = layoutData.sections_data.sections.map(section => {
            const sectionId = section.id?.toString();
            const sectionName = section.name?.toString();
            
            console.log(`Section from server sections_data:`, section);
            console.log(`Section ${section.name} original shape from sections_data: ${section.shape}`);
            
            // Look for shape data first by ID match
            let shapeData = sectionId ? sectionShapeMap.get(sectionId) : undefined;
            
            // If no match by ID, try matching by name
            if (!shapeData && sectionName && nameToShapeMap.has(sectionName)) {
              shapeData = nameToShapeMap.get(sectionName);
              console.log(`Using shape data for section ${sectionName} from NAME match:`, shapeData);
            }
            
            // IMPORTANT: Determine the final shape to use, prioritizing explicit shape values
            const finalShape: TableShape = (() => {
              // First check for explicit 'rectangle' in the section itself
              if (section.shape === 'rectangle') {
                return 'rectangle';
              }
              
              // Then try the shape data from our maps
              if (shapeData?.shape === 'rectangle') {
                return 'rectangle';
              }
              
              // Default to circle
              return 'circle';
            })();
            
            // Create the processed section with the correct shape
            const processedSection = {
              ...section,
              shape: finalShape,
              dimensions: section.dimensions || shapeData?.dimensions || { width: 120, height: 80 },
              rotation: section.rotation ?? shapeData?.rotation ?? 0
            };
            
            console.log(`Section ${section.name} final processed shape: ${processedSection.shape}`);
            return processedSection;
          });
          
          console.log('Final processed sections:', layoutData.sections_data.sections);
        }
        return layoutData;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching layout ${id}:`, error);
      return null;
    }
  },
  
  // Create a new layout
  createLayout: async (data: Partial<LayoutData>) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      console.warn('No valid restaurant context for creating layout');
      throw new Error('Restaurant context required');
    }
    
    // Ensure restaurant_id is set in the data
    const layoutData = {
      ...data,
      restaurant_id: restaurant?.id
    };
    
    // Wrap the layout data in a 'layout' key as expected by the backend
    const wrappedData = {
      layout: layoutData
    };
    
    try {
      // Also add restaurant_id as query param to ensure proper tenant isolation
      const response = await apiClient.post(`/layouts?restaurant_id=${restaurant?.id}`, wrappedData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }) as ApiResponse<LayoutData>;
      return response.data;
    } catch (error) {
      console.error('Error creating layout:', error);
      throw error;
    }
  },
  
  // Update an existing layout
  updateLayout: async (id: number, data: Partial<LayoutData>) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      console.warn('No valid restaurant context for updating layout');
      throw new Error('Restaurant context required');
    }
    
    // Ensure restaurant_id is set
    const layoutData = {
      ...data,
      restaurant_id: restaurant?.id
    };
    
    // Wrap the layout data in a 'layout' key as expected by the backend
    const wrappedData = {
      layout: layoutData
    };
    
    try {
      console.log('Updating layout with wrapped data:', wrappedData);
      const response = await apiClient.patch(`/layouts/${id}?restaurant_id=${restaurant?.id}`, wrappedData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }) as ApiResponse<LayoutData>;
      return response.data;
    } catch (error) {
      console.error('Error updating layout:', error);
      throw error;
    }
  },
  
  // Activate a layout
  activateLayout: async (id: number) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      console.warn('No valid restaurant context for activating layout');
      throw new Error('Restaurant context required');
    }
    
    try {
      console.log(`Activating layout ID ${id} for restaurant ${restaurant?.id}`);
      const response = await apiClient.post(`/layouts/${id}/activate`, {
        restaurant_id: restaurant?.id || 0
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }) as ApiResponse<Record<string, any>>;
      
      console.log('Activation response:', response.data);
      
      // After activating, fetch the layout with updated is_active status
      const updatedLayout = await layoutsApi.getLayout(id);
      console.log('Updated layout after activation:', updatedLayout);
      
      // Fetch all layouts to refresh the list with updated active statuses
      await layoutsApi.getAllLayouts(restaurant?.id || 0);
      
      return updatedLayout;
    } catch (error) {
      console.error('Error activating layout:', error);
      throw error;
    }
  },
  
  // Update a seat
  updateSeat: async (id: number, data: Partial<Seat>) => {
    // Get restaurant context from store
    const { restaurant } = useRestaurantStore.getState();
    
    // Validate restaurant context
    if (!tenantUtils.validateRestaurantContext(restaurant)) {
      console.warn('No valid restaurant context for updating seat');
      throw new Error('Restaurant context required');
    }
    
    try {
      const response = await apiClient.patch(`/seats/${id}`, { ...data, restaurant_id: restaurant?.id }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }) as ApiResponse<Seat>;
      return response.data;
    } catch (error) {
      console.error('Error updating seat:', error);
      throw error;
    }
  }
};

// Export to be used in api-services.ts
export default layoutsApi;
