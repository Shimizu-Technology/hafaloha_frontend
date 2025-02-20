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

export interface MenuItem {
  // If Rails returns numeric IDs, you can do `id: number;`
  id: string;
  name: string;
  description: string;
  price: number;

  /**
   * Just numeric category IDs from your Rails model
   * Example: category_ids: [1, 2, 3]
   */
  category_ids?: number[];

  image: string; // from image_url
  option_groups?: OptionGroup[];
  advance_notice_hours?: number;
  seasonal?: boolean;
  available_from?: string | null;
  available_until?: string | null;
  featured?: boolean;
  stock_status?: 'in_stock' | 'out_of_stock' | 'low_stock';
  status_note?: string | null;
}
