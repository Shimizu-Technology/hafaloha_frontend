// src/ordering/types/menu.ts

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
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string; // e.g. from 'image_url' in your backend
  option_groups?: OptionGroup[];
  advance_notice_hours?: number;

  // --- Seasonal fields ---
  seasonal?: boolean;
  available_from?: string | null;   // or Date, but typically comes as a string
  available_until?: string | null;  // or Date

  // --- Featured ---
  featured?: boolean;

  // --- NEW: Out-of-stock / limited ---
  stock_status?: 'in_stock' | 'out_of_stock' | 'limited';
  status_note?: string | null;
}

/**
 * A cart item is basically a MenuItem plus:
 * - quantity
 * - user-chosen customizations
 * - a per-item notes field
 */
export interface CartItem extends MenuItem {
  quantity: number;
  customizations?: Record<string, string[]>;
  notes?: string; // <-- per-item special instructions
}

export type Category = {
  id: string;
  name: string;
  description?: string;
};
