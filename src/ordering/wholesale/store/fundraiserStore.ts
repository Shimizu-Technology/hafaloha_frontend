// src/ordering/wholesale/store/fundraiserStore.ts

import { create } from 'zustand';
import fundraiserService, { 
  Fundraiser, 
  FundraiserParams
} from '../services/fundraiserService';

interface FundraiserState {
  // Fundraisers list
  fundraisers: Fundraiser[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
  
  // Current fundraiser
  currentFundraiser: Fundraiser | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingFundraiser: boolean;
  
  // Error state
  error: string | null;
  
  // Fetch functions
  fetchFundraisers: (params?: FundraiserParams) => Promise<{ fundraisers: Fundraiser[] }>;
  fetchFundraiserById: (id: number) => Promise<void>;
  fetchFundraiserBySlug: (slug: string) => Promise<void>;
  
  // Clear functions
  clearCurrentFundraiser: () => void;
  clearError: () => void;
}

const useFundraiserStore = create<FundraiserState>((set) => ({
  // Initial state
  fundraisers: [],
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  perPage: 25,
  currentFundraiser: null,
  isLoading: false,
  isLoadingFundraiser: false,
  error: null,
  
  // Fetch all fundraisers with optional filtering
  fetchFundraisers: async (params = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fundraiserService.getFundraisers(params);
      
      set({
        fundraisers: response.fundraisers,
        totalCount: response.meta.total_count,
        currentPage: response.meta.current_page,
        totalPages: response.meta.total_pages,
        perPage: response.meta.per_page,
        isLoading: false
      });
      
      return { fundraisers: response.fundraisers };
    } catch (error) {
      console.error('Error fetching fundraisers:', error);
      set({ 
        error: 'Failed to fetch fundraisers. Please try again later.',
        isLoading: false 
      });
      return { fundraisers: [] };
    }
  },
  
  // Fetch a specific fundraiser by ID
  fetchFundraiserById: async (id: number) => {
    set({ isLoadingFundraiser: true, error: null });
    
    try {
      const fundraiser = await fundraiserService.getFundraiser(id);
      set({ currentFundraiser: fundraiser, isLoadingFundraiser: false });
    } catch (error) {
      console.error('Error fetching fundraiser:', error);
      set({ 
        error: 'Failed to load fundraiser details', 
        isLoadingFundraiser: false 
      });
    }
  },
  
  // Fetch a specific fundraiser by slug
  fetchFundraiserBySlug: async (slug: string) => {
    set({ isLoadingFundraiser: true, error: null });
    
    try {
      const fundraiser = await fundraiserService.getFundraiserBySlug(slug);
      set({ currentFundraiser: fundraiser, isLoadingFundraiser: false });
    } catch (error) {
      console.error(`Error fetching fundraiser with slug ${slug}:`, error);
      set({ 
        error: 'Failed to fetch fundraiser details. Please try again later.',
        isLoadingFundraiser: false 
      });
    }
  },
  
  // Clear the current fundraiser
  clearCurrentFundraiser: () => {
    set({ currentFundraiser: null });
  },
  
  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

export default useFundraiserStore;
