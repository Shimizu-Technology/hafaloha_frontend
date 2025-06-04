// src/ordering/wholesale/components/WholesaleLandingPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { Search, ArrowUpDown, Star } from 'lucide-react';
import FundraiserCard from './FundraiserCard';
import useFundraiserStore from '../store/fundraiserStore';
import fundraiserService, { FundraiserParams, Fundraiser, FundraiserListResponse } from '../services/fundraiserService';

const WholesaleLandingPage: React.FC = () => {
  // Get state and functions from the store
  const { 
    fundraisers, 
    totalCount, 
    isLoading, 
    error,
    fetchFundraisers 
  } = useFundraiserStore();
  
  // Local state for filters and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showCurrentOnly, setShowCurrentOnly] = useState(true);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [featuredFundraisers, setFeaturedFundraisers] = useState<Fundraiser[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };
  
  // Apply filters and fetch fundraisers
  const applyFilters = useCallback(() => {
    const params: FundraiserParams = {
      page: 1,
      per_page: 1000, // Set a very large number to fetch all fundraisers
      active: showActiveOnly,
      current: showCurrentOnly,
      search: searchTerm || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection
    };
    
    fetchFundraisers(params);
  }, [fetchFundraisers, showActiveOnly, showCurrentOnly, searchTerm, sortBy, sortDirection]);
  
  // Fetch featured fundraisers directly from the API without affecting the main store
  const fetchFeatured = useCallback(() => {
    setIsLoadingFeatured(true);
    
    const params: FundraiserParams = {
      page: 1,
      per_page: 1000, // Set a very large number to fetch all fundraisers
      active: true,
      current: true,
      featured: true, // Only fetch featured fundraisers
      sort_by: 'created_at',
      sort_direction: 'desc'
    };
    
    // Use the service directly instead of the store to avoid race conditions
    fundraiserService.getFundraisers(params)
      .then((response: FundraiserListResponse) => {
        // Show all featured fundraisers
        setFeaturedFundraisers(response.fundraisers);
        setIsLoadingFeatured(false);
      })
      .catch(() => {
        setIsLoadingFeatured(false);
      });
  }, []);
  
  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  // Change sort field
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  // Load fundraisers on initial render and when filters change
  useEffect(() => {
    applyFilters();
  }, [showActiveOnly, showCurrentOnly, sortBy, sortDirection, applyFilters]);
  
  // Load featured fundraisers on initial render
  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);
  
  // No pagination needed as we're fetching all fundraisers at once
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-[#c1902f] to-[#e6b94d] rounded-xl shadow-lg mb-8 p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Support Our Fundraisers
        </h1>
        <p className="text-white/90 text-lg">
          Browse our current fundraising campaigns and help support local organizations while enjoying our delicious products.
        </p>
      </div>
      
      {/* Featured fundraisers section */}
      {!isLoadingFeatured && featuredFundraisers.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center mb-6">
            <Star className="text-[#c1902f] mr-2" size={20} />
            <h2 className="text-2xl font-bold text-gray-900">Featured Fundraisers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredFundraisers.map(fundraiser => (
              <FundraiserCard key={`featured-${fundraiser.id}`} fundraiser={fundraiser} featured={true} />
            ))}
          </div>
        </div>
      )}
      
      {/* Filters and search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col gap-6">
          {/* Checkboxes */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="active-only" 
                checked={showActiveOnly}
                onChange={() => setShowActiveOnly(!showActiveOnly)}
                className="w-4 h-4 text-[#c1902f] rounded focus:ring-[#c1902f]"
              />
              <label htmlFor="active-only" className="ml-2 text-gray-700">
                Active fundraisers only
              </label>
            </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="current-only" 
                checked={showCurrentOnly}
                onChange={() => setShowCurrentOnly(!showCurrentOnly)}
                className="w-4 h-4 text-[#c1902f] rounded focus:ring-[#c1902f]"
              />
              <label htmlFor="current-only" className="ml-2 text-gray-700">
                Current date range only
              </label>
            </div>
          </div>
          
          {/* Search and sort controls */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input 
                type="text" 
                placeholder="Search fundraisers..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-[#c1902f] focus:border-[#c1902f]"
              />
              <button 
                type="submit"
                className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"
              >
                <Search size={18} />
              </button>
            </form>
            
            <div className="flex items-center gap-2 min-w-[200px]">
              <label htmlFor="sort-by" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={handleSortChange}
                className="flex-1 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f] text-sm"
              >
                <option value="created_at">Date Added</option>
                <option value="name">Name</option>
                <option value="start_date">Start Date</option>
                <option value="end_date">End Date</option>
              </select>
              
              <button
                onClick={toggleSortDirection}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
              >
                <ArrowUpDown size={16} className={sortDirection === 'asc' ? 'transform rotate-180' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Fundraisers grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c1902f]"></div>
        </div>
      ) : totalCount > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {fundraisers.map(fundraiser => (
              <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} />
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Fundraisers Found</h3>
          <p className="text-gray-600 mb-6">
            There are currently no fundraisers matching your search criteria.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setShowActiveOnly(true);
              setShowCurrentOnly(true);
              fetchFundraisers({ active: true, current: true });
            }}
            className="bg-[#c1902f] hover:bg-[#d4a43f] text-white font-medium py-2 px-4 rounded transition-colors duration-300"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default WholesaleLandingPage;
