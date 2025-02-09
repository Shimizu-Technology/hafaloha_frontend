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
  option_groups?: OptionGroup[]; // <-- The new nested array

  // If you want to keep your old "customizations" array, you can remove or ignore it.
  // For example, if the backend used to store them as static:
  //   customizations?: {
  //     name: string;
  //     options: string[];
  //     maxChoices?: number;
  //   }[];
}

// A cart item is a MenuItem + quantity + a "customizations" object 
// that stores the user's final picks from the OptionGroups
export interface CartItem extends MenuItem {
  quantity: number;
  // user-chosen selections, e.g. { "Size": ["Large"], "Flavors": ["Mango"] }
  customizations?: Record<string, string[]>;
}

export type Category = {
  id: string;
  name: string;
  description?: string;
};
