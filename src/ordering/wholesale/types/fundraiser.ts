// src/ordering/wholesale/types/fundraiser.ts

export interface Fundraiser {
  id?: number;
  name: string;
  slug: string;
  description: string;
  banner_image_url?: string;
  active: boolean;
  featured: boolean;
  start_date: string | null;
  end_date: string | null;
  restaurant_id?: number;
  created_at?: string;
  updated_at?: string;
  order_code?: string;
}

export interface FundraiserParticipant {
  id: number;
  name: string;
  email?: string;
  fundraiser_id: number;
  image_url?: string;
  goal_amount?: number;
  current_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FundraiserItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  fundraiser_id: number;
  available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FundraiserParams {
  page?: number;
  per_page?: number;
  status?: 'active' | 'inactive' | 'all';
  active?: boolean;
  featured?: boolean;
  search?: string;
  restaurant_id?: number;
  current?: boolean;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface FundraiserListResponse {
  fundraisers: Fundraiser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
