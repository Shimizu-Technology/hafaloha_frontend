// src/data/menu.ts
import type { Category, MenuItem } from '../types/menu';

export const categories: Category[] = [
  {
    id: 'appetizers',
    name: 'Appetizers',
    description: 'Start your meal with these island favorites'
  },
  {
    id: 'poke',
    name: 'Poke Bowls',
    description: 'Fresh Hawaiian-style fish with your choice of toppings'
  },
  {
    id: 'burgers',
    name: 'Island Burgers',
    description: 'Signature burgers with a tropical twist'
  },
  {
    id: 'desserts',
    name: 'Desserts',
    description: 'Cool down with our tropical treats'
  },
  {
    id: 'drinks',
    name: 'Drinks',
    description: 'Refresh yourself with island beverages'
  }
];

// With backend data, we no longer need hardcoded menu items.
export const menuItems: MenuItem[] = [];
