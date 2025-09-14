// src/wholesale/services/wholesaleApi.ts
import { apiClient } from '../../shared/api/apiClient';

// Types for Wholesale API responses
export interface WholesaleFundraiser {
  id: number;
  name: string;
  slug: string;
  description?: string;
  startDate: string;
  endDate: string;
  contactEmail?: string;
  contactPhone?: string;
  termsAndConditions?: string;
  status: string;
  participantCount: number;
  itemCount: number;
  totalOrders: number;
  totalRevenue: number;
  
  // Pickup information
  pickup_display_name?: string;
  pickup_display_address?: string;
  pickup_instructions?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_hours?: string;
  
  // Image URLs
  card_image_url?: string;
  banner_url?: string;
  has_card_image?: boolean;
  has_banner_image?: boolean;
  
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface WholesaleOptionGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  position: number;
  enable_inventory_tracking?: boolean;
  options: WholesaleOption[];
}

export interface WholesaleOption {
  id: number;
  name: string;
  additional_price: number;
  available: boolean;
  position: number;
  stock_quantity?: number;
  damaged_quantity?: number;
  low_stock_threshold?: number;
}

export interface WholesaleItem {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  price_cents: number;
  position: number;
  sort_order: number;
  options: Record<string, any>;
  option_groups?: WholesaleOptionGroup[];
  active: boolean;
  track_inventory: boolean;
  track_variants?: boolean;
  in_stock: boolean;
  stock_status: string;
  available_quantity?: number;
  uses_option_level_inventory?: boolean;
  effective_available_quantity?: number;
  item_variants?: WholesaleItemVariant[];
  images: WholesaleItemImage[];
  primary_image_url?: string;
  total_ordered: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface WholesaleItemVariant {
  id: number;
  variant_key: string;
  variant_name: string;
  stock_quantity: number;
  damaged_quantity: number;
  low_stock_threshold?: number;
  active: boolean;
}

export interface WholesaleItemImage {
  id: number;
  image_url: string;
  alt_text?: string;
  position: number;
  primary: boolean;
}

export interface WholesaleParticipant {
  id: number;
  name: string;
  slug: string;
  description?: string;
  photoUrl?: string;
  hasGoal: boolean;
  goalAmount?: number;
  currentAmount: number;
  goalProgressPercentage?: number;
  goalRemaining?: number;
  goalStatus: string;
  totalOrders: number;
  totalRaised: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface WholesaleFundraiserDetail extends WholesaleFundraiser {
  items: WholesaleItem[];
  participants: WholesaleParticipant[];
}

export interface WholesaleCartItem {
  itemId: number;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  priceCents: number;
  quantity: number;
  lineTotal: number;
  lineTotalCents: number;
  imageUrl?: string;
  addedAt: string;
  updatedAt: string;
}

export interface WholesaleCartSummary {
  items: WholesaleCartItem[];
  fundraiser?: {
    id: number;
    name: string;
    slug: string;
  };
  totals: {
    itemCount: number;
    totalQuantity: number;
    subtotal: number;
    subtotalCents: number;
  };
  cartUrl: string;
  checkoutUrl: string;
}

export interface WholesaleOrder {
  id: number;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: string;
  total: number;
  totalCents: number;
  itemCount: number;
  uniqueItemCount: number;
  fundraiser: {
    id: number;
    name: string;
    slug: string;
    pickup_display_name?: string;
    pickup_display_address?: string;
    pickup_instructions?: string;
    pickup_contact_name?: string;
    pickup_contact_phone?: string;
    pickup_hours?: string;
  };
  participant?: {
    id: number;
    name: string;
    slug: string;
  };
  paymentStatus: string;
  totalPaid: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  order: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress?: string;
    notes?: string;
    participantId?: number;
  };
  cart_items: Array<{
    item_id: number;
    fundraiser_id: number;
    name: string;
    description?: string;
    quantity: number;
    price_cents: number;
    line_total_cents: number;
    selected_options?: Record<string, any>; // Backend format: group ID -> option IDs array
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

class WholesaleApiService {
  private readonly baseUrl = '/wholesale';

  // Fundraisers
  async getFundraisers(): Promise<ApiResponse<{ fundraisers: WholesaleFundraiser[] }>> {
    const response = await apiClient.get(`${this.baseUrl}/fundraisers`);
    return response.data;
  }

  async getFundraiser(slug: string): Promise<ApiResponse<{ fundraiser: WholesaleFundraiserDetail }>> {
    const response = await apiClient.get(`${this.baseUrl}/fundraisers/${slug}`);
    return response.data;
  }

  // Items
  async getFundraiserItems(fundraiserSlug: string): Promise<ApiResponse<{ items: WholesaleItem[] }>> {
    const response = await apiClient.get(`${this.baseUrl}/fundraisers/${fundraiserSlug}/items`);
    return response.data;
  }

  async getItem(itemId: number): Promise<ApiResponse<{ item: WholesaleItem }>> {
    const response = await apiClient.get(`${this.baseUrl}/items/${itemId}`);
    return response.data;
  }

  async checkItemAvailability(itemId: number, quantity: number): Promise<ApiResponse<{ available: boolean; availableQuantity: string | number; stockStatus: string }>> {
    const response = await apiClient.post(`${this.baseUrl}/items/${itemId}/check_availability`, {
      quantity
    });
    return response.data;
  }

  // Cart
  async getCart(): Promise<ApiResponse<{ cart: WholesaleCartSummary }>> {
    const response = await apiClient.get(`${this.baseUrl}/cart`);
    return response.data;
  }

  async addToCart(itemId: number, quantity: number): Promise<ApiResponse<{ cart: WholesaleCartSummary }>> {
    const response = await apiClient.post(`${this.baseUrl}/cart/add`, {
      item_id: itemId,
      quantity
    });
    return response.data;
  }

  async updateCartItem(itemId: number, quantity: number): Promise<ApiResponse<{ cart: WholesaleCartSummary }>> {
    const response = await apiClient.put(`${this.baseUrl}/cart/update`, {
      item_id: itemId,
      quantity
    });
    return response.data;
  }

  async removeFromCart(itemId: number): Promise<ApiResponse<{ cart: WholesaleCartSummary }>> {
    const response = await apiClient.delete(`${this.baseUrl}/cart/remove`, {
      params: { item_id: itemId }
    });
    return response.data;
  }

  async clearCart(): Promise<ApiResponse<{ cart: WholesaleCartSummary }>> {
    const response = await apiClient.delete(`${this.baseUrl}/cart/clear`);
    return response.data;
  }

  async validateCart(cartItems?: any[]): Promise<ApiResponse<{ cart: WholesaleCartSummary; valid: boolean; issues?: any[] }>> {
    if (cartItems && cartItems.length > 0) {
      // Send cart items as POST data for validation
      const response = await apiClient.post(`${this.baseUrl}/cart/validate`, { cart_items: cartItems });
      return response.data;
    } else {
      // Empty cart validation
      const response = await apiClient.get(`${this.baseUrl}/cart/validate`);
      return response.data;
    }
  }

  // Orders
  async getOrders(): Promise<ApiResponse<{ orders: WholesaleOrder[] }>> {
    const response = await apiClient.get(`${this.baseUrl}/orders`);
    return response.data;
  }

  async getOrder(orderId: number): Promise<ApiResponse<{ order: WholesaleOrder }>> {
    const response = await apiClient.get(`${this.baseUrl}/orders/${orderId}`);
    return response.data;
  }

  async createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<{ order: WholesaleOrder; test_mode?: boolean }>> {
    const response = await apiClient.post(`${this.baseUrl}/orders`, orderData);
    return response.data;
  }

  async cancelOrder(orderId: number): Promise<ApiResponse<{ order: WholesaleOrder }>> {
    const response = await apiClient.delete(`${this.baseUrl}/orders/${orderId}/cancel`);
    return response.data;
  }

  // Payments
  async createPayment(orderId: number): Promise<ApiResponse<{ payment: any; stripe: { clientSecret: string; publishableKey: string } }>> {
    const response = await apiClient.post(`${this.baseUrl}/orders/${orderId}/payments`);
    return response.data;
  }

  async confirmPayment(orderId: number, paymentId: number): Promise<ApiResponse<{ payment: any; order: any }>> {
    const response = await apiClient.post(`${this.baseUrl}/orders/${orderId}/payments/${paymentId}/confirm`);
    return response.data;
  }

  // NEW: Variant API methods
  
  // Get all variants for an item
  async getItemVariants(itemId: number): Promise<ApiResponse<{ variants: WholesaleItemVariant[]; item: any }>> {
    const response = await apiClient.get(`${this.baseUrl}/items/${itemId}/variants`);
    return response.data;
  }
  
  // Get specific variant details
  async getItemVariant(itemId: number, variantId: number): Promise<ApiResponse<{ variant: WholesaleItemVariant }>> {
    const response = await apiClient.get(`${this.baseUrl}/items/${itemId}/variants/${variantId}`);
    return response.data;
  }
  
  // Get variant stock status
  async getVariantStockStatus(itemId: number, variantId: number): Promise<ApiResponse<{ stock_status: any }>> {
    const response = await apiClient.get(`${this.baseUrl}/items/${itemId}/variants/${variantId}/stock_status`);
    return response.data;
  }
  
  // Check variant availability for specific quantity
  async checkVariantAvailability(itemId: number, variantId: number, quantity: number): Promise<ApiResponse<{ availability: any }>> {
    const response = await apiClient.post(`${this.baseUrl}/items/${itemId}/variants/${variantId}/check_availability`, { quantity });
    return response.data;
  }
  
  // Bulk stock check for multiple variants
  async bulkVariantStockCheck(itemId: number, variants: Array<{ variant_key: string; quantity?: number }>): Promise<ApiResponse<{ results: any[]; item: any }>> {
    const response = await apiClient.post(`${this.baseUrl}/items/${itemId}/variants/bulk_stock_check`, { variants });
    return response.data;
  }
  
  // Validate option combinations for variants
  async validateVariantCombinations(itemId: number, combinations: Array<{ selected_options: Record<string, number[]> }>): Promise<ApiResponse<{ results: any[]; item: any }>> {
    const response = await apiClient.post(`${this.baseUrl}/items/${itemId}/variants/validate_combinations`, { combinations });
    return response.data;
  }
  
  // Direct variant access (by variant ID)
  async getVariant(variantId: number): Promise<ApiResponse<{ variant: WholesaleItemVariant }>> {
    const response = await apiClient.get(`${this.baseUrl}/variants/${variantId}`);
    return response.data;
  }
  
  // Get direct variant stock status
  async getDirectVariantStockStatus(variantId: number): Promise<ApiResponse<{ stock_status: any }>> {
    const response = await apiClient.get(`${this.baseUrl}/variants/${variantId}/stock_status`);
    return response.data;
  }
  
  // Check direct variant availability
  async checkDirectVariantAvailability(variantId: number, quantity: number): Promise<ApiResponse<{ availability: any }>> {
    const response = await apiClient.post(`${this.baseUrl}/variants/${variantId}/check_availability`, { quantity });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; service: string; timestamp: string; version: string }>> {
    const response = await apiClient.get(`${this.baseUrl}/health`);
    return response.data;
  }

  async apiInfo(): Promise<ApiResponse<{ service: string; version: string; description: string; endpoints: Record<string, string> }>> {
    const response = await apiClient.get(`${this.baseUrl}/api/info`);
    return response.data;
  }
}

// Export a singleton instance
export const wholesaleApi = new WholesaleApiService();