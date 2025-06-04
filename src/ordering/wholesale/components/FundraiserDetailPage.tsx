// src/ordering/wholesale/components/FundraiserDetailPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ShoppingBag, Share2, Search, Star, SlidersHorizontal, Tag } from 'lucide-react';
import useFundraiserStore from '../store/fundraiserStore';
import { useWholesaleCartStore } from '../store/wholesaleCartStore';
import FundraiserItemCard from './FundraiserItemCard';
import QuickViewModal from './QuickViewModal';
import { FundraiserItem } from '../services/fundraiserService';
// toastUtils removed as we no longer show toasts for cart additions
import fundraiserService from '../services/fundraiserService';

const FundraiserDetailPage: React.FC = () => {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  
  // Get state and functions from the store
  const { 
    currentFundraiser, 
    isLoadingFundraiser, 
    fetchFundraiserById, 
    clearCurrentFundraiser 
  } = useFundraiserStore();
  
  // Local state for items
  const [items, setItems] = useState<FundraiserItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // State for share tooltip
  const [showShareTooltip, setShowShareTooltip] = useState<boolean>(false);
  
  // State for quick view modal
  const [quickViewItem, setQuickViewItem] = useState<FundraiserItem | null>(null);
  
  // State for customize modal
  const [customizeItem, setCustomizeItem] = useState<FundraiserItem | null>(null);
  
  // We no longer need local cart state since we're using the wholesale cart store

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Ongoing';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Load fundraiser data
  useEffect(() => {
    // Check if we're using the new slug-based route or the old ID-based route
    if (id) {
      // ID-based route (legacy)
      fetchFundraiserById(parseInt(id, 10));
    } else if (slug) {
      // Try to parse as number first (for backward compatibility with ID in slug position)
      const slugAsNumber = parseInt(slug, 10);
      if (!isNaN(slugAsNumber) && slug === slugAsNumber.toString()) {
        fetchFundraiserById(slugAsNumber);
      } else {
        // Slug-based route (new preferred way)
        fundraiserService.getFundraiserBySlug(slug)
          .then(fundraiser => {
            useFundraiserStore.setState({ currentFundraiser: fundraiser, isLoadingFundraiser: false });
          })
          .catch(error => {
            console.error('Error fetching fundraiser by slug:', error);
            setErrorMessage('Fundraiser not found');
            useFundraiserStore.setState({ isLoadingFundraiser: false });
          });
      }
    }
    
    return () => {
      clearCurrentFundraiser();
    };
  }, [slug, id, fetchFundraiserById, clearCurrentFundraiser]);
  
  // Load items when fundraiser is loaded
  useEffect(() => {
    if (currentFundraiser) {
      fundraiserService.getItems(currentFundraiser.id)
        .then(data => {
          setItems(data);
        })
        .catch(err => {
          console.error('Error fetching items:', err);
          setErrorMessage('Failed to load items');
        });
    }
  }, [currentFundraiser]);
  
  // Handle share button click
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentFundraiser?.name || 'Fundraiser',
        text: `Support ${currentFundraiser?.name} fundraiser!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowShareTooltip(true);
    }
  };
  
  // Get the addToCart function from the wholesale cart store
  const { addToCart } = useWholesaleCartStore();
  
  // Handle add to cart
  const handleAddToCart = (item: FundraiserItem) => {
    if (!currentFundraiser) return;
    
    // Get the current fundraiser ID
    const fundraiserIdNum = currentFundraiser.id;
    
    // Convert FundraiserItem to WholesaleCartItem and add to cart
    addToCart({
      id: item.id.toString(), // Ensure id is a string as required by CartItem interface
      name: item.name,
      price: item.price,
      image: item.image_url || '',
      fundraiserId: fundraiserIdNum,
      quantity: 1,
      notes: ''
    });
    
    // No toast notification needed for cart additions
  };
  
  // Handle quick view
  const handleQuickView = (item: FundraiserItem) => {
    setQuickViewItem(item);
  };
  
  // Close quick view modal
  const closeQuickView = () => {
    setQuickViewItem(null);
  };

  // Handle customize
  const handleCustomize = (item: FundraiserItem) => {
    console.log('Opening customize modal for item:', item);
    setCustomizeItem(item);
  };
  
  // Close customize modal
  const closeCustomize = () => {
    setCustomizeItem(null);
  };

  // Filter and sort items
  const getFilteredItems = () => {
    if (!items.length) return { filteredItems: [], featuredItems: [], categories: ['all'] };
    
    // Extract unique categories from items
    const categories = ['all', ...Array.from(new Set(items.map(item => item.category || 'uncategorized')))];

    // Filter and sort items
    const filteredItems = items
      .filter(item => {
        // Filter by search term
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
          item.name.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower))
        );
        
        // Filter by category
        const matchesCategory = selectedCategory === 'all' || 
          (item.category || 'uncategorized') === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return sortDirection === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        } else if (sortBy === 'price') {
          return sortDirection === 'asc'
            ? a.price - b.price
            : b.price - a.price;
        }
        return 0;
      });
    
    // Get featured items (lowest 3 prices)
    const featuredItems = [...items]
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);

    return { filteredItems, featuredItems, categories };
  };

  const filteredData = getFilteredItems();
  const { filteredItems, featuredItems, categories } = filteredData;

  if (isLoadingFundraiser) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c1902f]"></div>
      </div>
    );
  }
  
  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6">
          <p>{errorMessage}</p>
        </div>
        <button
          onClick={() => navigate('/wholesale')}
          className="flex items-center text-[#c1902f] hover:text-[#d4a43f] font-medium"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Fundraisers
        </button>
      </div>
    );
  }
  
  if (!currentFundraiser) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          <p>Fundraiser not found.</p>
        </div>
        <button
          onClick={() => navigate('/wholesale')}
          className="flex items-center text-[#c1902f] hover:text-[#d4a43f] font-medium"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Fundraisers
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Back button */}
      <button
        onClick={() => navigate('/wholesale')}
        className="flex items-center text-[#c1902f] hover:text-[#d4a43f] font-medium mb-6"
      >
        <ArrowLeft size={18} className="mr-2" />
        Back to Fundraisers
      </button>
      
      {/* Fundraiser header with enhanced banner */}
      <div className="relative mb-8">
        <div className="w-full h-80 md:h-96 bg-gray-200 rounded-xl overflow-hidden shadow-lg">
          {currentFundraiser.banner_image_url ? (
            <>
              <img 
                src={currentFundraiser.banner_image_url} 
                alt={currentFundraiser.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-[#c1902f]/20 to-[#e6b94d]/20">
              <span className="text-gray-500 text-lg">No banner image</span>
            </div>
          )}
          
          {/* Banner content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-md">{currentFundraiser.name}</h1>
            <p className="text-white/90 text-lg mb-4 max-w-2xl line-clamp-2 drop-shadow-md">{currentFundraiser.description}</p>
            
            <div className="flex flex-wrap gap-3">
              <div className={`bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center`}>
                Active
              </div>
              <button 
                onClick={handleShare}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-sm font-medium px-3 py-1 rounded-full flex items-center transition-colors duration-200 relative"
              >
                <Share2 size={14} className="mr-1" />
                Share
                {showShareTooltip && (
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Link copied!
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fundraiser details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-wrap gap-6 justify-between items-center mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <Calendar size={18} className="mr-2 text-[#c1902f]" />
              <span>
                <strong>Start:</strong> {formatDate(currentFundraiser.start_date)}
              </span>
            </div>
            <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <Calendar size={18} className="mr-2 text-[#c1902f]" />
              <span>
                <strong>End:</strong> {formatDate(currentFundraiser.end_date)}
              </span>
            </div>
            <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <ShoppingBag size={18} className="mr-2 text-[#c1902f]" />
              <span>
                <strong>Fundraiser ID:</strong> {currentFundraiser.id}
              </span>
            </div>
            <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <ShoppingBag size={18} className="mr-2 text-[#c1902f]" />
              <span>
                <strong>Items:</strong> {items.length}
              </span>
            </div>
          </div>
        </div>
        
        <div className="prose max-w-none bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">About This Fundraiser</h2>
          <p className="text-gray-700">{currentFundraiser.description}</p>
        </div>
      </div>
      
      {/* Note about participant selection at checkout */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              You'll be able to select which participant to support during checkout.
            </p>
          </div>
        </div>
      </div>
      
      {/* Items section */}
      <section className="mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Items</h2>
          
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
            
            {/* Sort and filter buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                <SlidersHorizontal size={18} />
                <span>Sort & Filter</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Sort and filter options */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 animate-slideDown">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy('name')}
                    className={`px-3 py-1 rounded-md text-sm ${sortBy === 'name' ? 'bg-[#c1902f] text-white' : 'bg-white border'}`}
                  >
                    Name
                  </button>
                  <button
                    onClick={() => setSortBy('price')}
                    className={`px-3 py-1 rounded-md text-sm ${sortBy === 'price' ? 'bg-[#c1902f] text-white' : 'bg-white border'}`}
                  >
                    Price
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <button
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-1 rounded-md text-sm bg-white border flex items-center gap-1"
                >
                  {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
              
              {/* Categories filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${selectedCategory === category ? 'bg-[#c1902f] text-white' : 'bg-white border'}`}
                    >
                      {category === 'all' ? 'All' : category}
                      {category !== 'all' && <Tag size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Featured items */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="text-[#c1902f]" size={20} />
            <h3 className="text-lg font-semibold">Featured Items</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredItems.map(item => (
              <FundraiserItemCard
                key={item.id}
                item={item}
                featured={true}
                onAddToCart={handleAddToCart}
                onQuickView={handleQuickView}
                onCustomize={handleCustomize}
              />
            ))}
          </div>
        </div>
        
        {/* All items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">All Items</h3>
            <div className="text-sm text-gray-500">{filteredItems.length} items</div>
          </div>
          
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <FundraiserItemCard
                  key={item.id}
                  item={item}
                  onAddToCart={handleAddToCart}
                  onQuickView={handleQuickView}
                  onCustomize={handleCustomize}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <p className="text-gray-500">No items found matching your search criteria.</p>
            </div>
          )}
          
          {/* View all items button */}
          {items.length > 9 && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => navigate(`/wholesale/${currentFundraiser?.slug}/items`)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#c1902f] text-[#c1902f] rounded-lg hover:bg-[#c1902f]/5 transition-colors duration-300"
              >
                <ShoppingBag size={18} />
                View All Items
              </button>
            </div>
          )}
        </div>
      </section>
      
      {/* Quick view modal */}
      {quickViewItem && (
        <QuickViewModal
          item={quickViewItem}
          onClose={closeQuickView}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Customize modal - temporarily using QuickViewModal */}
      {customizeItem && (
        <QuickViewModal
          item={customizeItem}
          onClose={closeCustomize}
          onAddToCart={handleAddToCart}
          showCustomizeOptions={true}
        />
      )}
    </div>
  );
};

export default FundraiserDetailPage;
