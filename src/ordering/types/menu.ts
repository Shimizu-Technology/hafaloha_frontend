export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  customizations?: {
    name: string;
    options: string[];
    maxChoices?: number;
  }[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  customizations?: Record<string, string[]>;
}

export type Category = {
  id: string;
  name: string;
  description?: string;
};
