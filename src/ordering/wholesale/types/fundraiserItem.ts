// src/ordering/wholesale/types/fundraiserItem.ts
import { FundraiserOptionGroup } from './optionGroups';

export interface FundraiserItem {
  id: number;
  fundraiser_id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  active: boolean;
  stock_quantity?: number;
  enable_stock_tracking?: boolean;
  low_stock_threshold?: number;
  option_groups?: FundraiserOptionGroup[];
  created_at: string;
  updated_at: string;
}

export interface ItemsResponse {
  items: FundraiserItem[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}
