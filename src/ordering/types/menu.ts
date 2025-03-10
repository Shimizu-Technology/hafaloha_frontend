// src/ordering/types/menu.ts

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface MenuOption {
  id: number;
  name: string;
  additional_price: number;
  available: boolean;
}

export interface OptionGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  options: MenuOption[];
}

/**
 * API response shape for a menu item 
 */
export interface MenuItem {
  // API returns string IDs, but we sometimes work with them as numbers
  id: string;
  name: string;
  description: string;
  price: number;
  cost_to_make?: number;

  /**
   * Just numeric category IDs from your Rails model
   * Example: category_ids: [1, 2, 3]
   */
  category_ids?: number[];

  // Image-related properties
  image: string;  // Used for display - this is REQUIRED (set fallback if needed)
  image_url?: string; // Raw response from API

  // Menu related
  menu_id?: number;
  
  // Option groups
  option_groups?: OptionGroup[];
  
  // Availability
  advance_notice_hours?: number;
  seasonal?: boolean;
  available_from?: string | null;
  available_until?: string | null;
  promo_label?: string | null;
  featured?: boolean;
  
  // Inventory status
  stock_status?: 'in_stock' | 'out_of_stock' | 'low_stock' | 'limited';
  status_note?: string | null;
}

/**
 * Extended MenuItem type for form handling with file upload
 */
export interface MenuItemFormData extends Omit<MenuItem, 'id'> {
  id?: number | string;
  imageFile?: File | null;
}
