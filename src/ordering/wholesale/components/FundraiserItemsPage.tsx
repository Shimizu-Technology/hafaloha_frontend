// src/ordering/wholesale/components/FundraiserItemsPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  SlidersHorizontal, 
  Tag, 
  ChevronLeft, 
  ChevronRight,
  ShoppingCart
} from 'lucide-react';
import toastUtils from '../../../shared/utils/toastUtils';
import useFundraiserStore from '../store/fundraiserStore';
import useCartStore from '../store/cartStore';
import { FundraiserItem, FundraiserParticipant } from '../services/fundraiserService';
import fundraiserService from '../services/fundraiserService';
import FundraiserItemCard from './FundraiserItemCard';
import QuickViewModal from './QuickViewModal';
import FundraiserItemComponent from './FundraiserItem';
import { FundraiserOptionGroup } from '../types/optionGroups';

const FundraiserItemsPage: React.FC = () => {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  
  // Get state and functions from the store
  const { 
    currentFundraiser, 
    isLoadingFundraiser, 
    fetchFundraiserById, 
    clearCurrentFundraiser 
  } = useFundraiserStore();
  
  // Local state for items and participants
  const [items, setItems] = useState<FundraiserItem[]>([]);
  const [participants, setParticipants] = useState<FundraiserParticipant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<FundraiserParticipant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  
  // State for quick view and customize modals
  const [quickViewItem, setQuickViewItem] = useState<FundraiserItem | null>(null);
  const [customizeItem, setCustomizeItem] = useState<FundraiserItem | null>(null);
  
  // Get cart functions from cart store
  const { addItem, getTotalItems, setSelectedParticipant: setCartSelectedParticipant } = useCartStore();
  
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
  
  // Load participants and items when fundraiser is loaded
  useEffect(() => {
    if (currentFundraiser) {
      setIsLoading(true);
      
      // Fetch participants
      fundraiserService.getParticipants(currentFundraiser.id)
        .then(data => {
          setParticipants(data);
        })
        .catch(err => {
          console.error('Error fetching participants:', err);
        });
      
      // Fetch items
      fundraiserService.getItems(currentFundraiser.id)
        .then(data => {
          console.log(`[FundraiserItemsPage] Fetched ${data.length} items for fundraiser ID ${currentFundraiser.id}`);
          console.log('[FundraiserItemsPage] First item sample:', data[0]);
          
          // Check if fundraiser_id is missing and add it
          const itemsWithFundraiserId = data.map(item => {
            if (!item.fundraiser_id) {
              console.log(`[FundraiserItemsPage] Adding missing fundraiser_id ${currentFundraiser.id} to item ${item.id}`);
              return {
                ...item,
                fundraiser_id: currentFundraiser.id
              };
            }
            return item;
          });
          
          setItems(itemsWithFundraiserId);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching items:', err);
          setErrorMessage('Failed to load items');
          setIsLoading(false);
        });
    }
  }, [currentFundraiser]);

  // Participant selection is handled directly in the dropdown onChange
  
  // Update cart store when participant changes
  useEffect(() => {
    if (selectedParticipant) {
      setCartSelectedParticipant(selectedParticipant.id, selectedParticipant.name);
    }
  }, [selectedParticipant, setCartSelectedParticipant]);

  // Handle add to cart
  const handleAddToCart = (item: FundraiserItem) => {
    if (!selectedParticipant) {
      toastUtils.error('Please select a participant to support');
      return;
    }
    
    addItem(item, selectedParticipant.id, selectedParticipant.name);
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
    setCustomizeItem(item);
  };

  // Close customize modal
  const closeCustomize = () => {
    setCustomizeItem(null);
  };

  // Filter and sort items
  const getFilteredItems = () => {
    if (!items.length) return { filteredItems: [], categories: ['all'], totalPages: 1 };
    
    console.log(`[FundraiserItemsPage] getFilteredItems - items count: ${items.length}`); 
    console.log('[FundraiserItemsPage] Item sample with fundraiser_id check:', items[0]);
    
    // Extract unique categories from items
    const categories = ['all', ...Array.from(new Set(items.map(item => item.category || 'uncategorized')))];

    // Filter items
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
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    
    return { filteredItems, categories, totalPages };
  };

  const { filteredItems, categories, totalPages } = getFilteredItems();
  
  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  };
  
  const currentItems = getCurrentPageItems();
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <button
            onClick={() => navigate(`/wholesale/${currentFundraiser?.slug}`)}
            className="flex items-center text-[#c1902f] hover:text-[#d4a43f] font-medium mb-2"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Fundraiser
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{currentFundraiser.name} - Items</h1>
        </div>
        
        {/* Participant selection dropdown */}
        <div className="w-full sm:w-auto">
          <label htmlFor="participant-select" className="block text-sm font-medium text-gray-700 mb-1">
            Supporting
          </label>
          <select
            id="participant-select"
            value={selectedParticipant?.id || ''}
            onChange={(e) => {
              const participantId = parseInt(e.target.value, 10);
              const participant = participants.find(p => p.id === participantId) || null;
              setSelectedParticipant(participant);
            }}
            className="w-full sm:w-64 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#c1902f] focus:border-[#c1902f]"
          >
            <option value="">Select a participant</option>
            {participants.map(participant => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <h2 className="text-xl font-bold text-gray-900">Browse Items</h2>
          
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
            
            {/* Sort and filter buttons */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <SlidersHorizontal size={18} />
              <span>Sort & Filter</span>
            </button>
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
                    onClick={() => {
                      setSortBy('name');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-md text-sm ${sortBy === 'name' ? 'bg-[#c1902f] text-white' : 'bg-white border'}`}
                  >
                    Name
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('price');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-md text-sm ${sortBy === 'price' ? 'bg-[#c1902f] text-white' : 'bg-white border'}`}
                  >
                    Price
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <button
                  onClick={() => {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    setCurrentPage(1);
                  }}
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
                      onClick={() => {
                        setSelectedCategory(category);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${selectedCategory === category ? 'bg-[#c1902f] text-white' : 'bg-white border'}`}
                    >
                      {category === 'all' ? 'All' : category}
                      {category !== 'all' && <Tag size={14} />}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Items per page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 rounded-md text-sm bg-white border"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={36}>36</option>
                  <option value={48}>48</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* Items grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500">
              {filteredItems.length} items found
            </div>
            
            {selectedParticipant && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                Supporting: {selectedParticipant.name}
              </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#c1902f]"></div>
            </div>
          ) : currentItems.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentItems.map(item => {
                  console.log(`[FundraiserItemsPage] Rendering item ${item.id} with fundraiser_id: ${item.fundraiser_id || 'MISSING'}`);
                  // Make sure we have a valid fundraiser_id (must be a number, not undefined)
                  const fundraiserId = item.fundraiser_id || (currentFundraiser ? currentFundraiser.id : 0);
                  
                  return (
                    <FundraiserItemCard
                      key={item.id}
                      item={{
                        ...item,
                        // Ensure fundraiser_id is set
                        fundraiser_id: fundraiserId
                      }}
                      selectedParticipantId={selectedParticipant?.id || null}
                      onAddToCart={handleAddToCart}
                      onQuickView={handleQuickView}
                      onCustomize={handleCustomize}
                    />
                  );
                })}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-md ${
                        currentPage === 1 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-10 h-10 rounded-md ${
                          currentPage === page
                            ? 'bg-[#c1902f] text-white'
                            : 'bg-white border hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-md ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <p className="text-gray-500">No items found matching your search criteria.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Cart summary footer */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4 z-10">
          <div className="container mx-auto flex justify-between items-center">
            <div>
              <span className="font-medium">{getTotalItems()} items</span>
              <span className="mx-2">|</span>
              <span className="font-semibold">View cart for total</span>
            </div>
            <Link
              to="/wholesale/cart"
              className="bg-[#c1902f] hover:bg-[#d4a43f] text-white px-6 py-2 rounded-lg flex items-center"
            >
              <ShoppingCart size={18} className="mr-2" />
              View Cart
            </Link>
          </div>
        </div>
      )}
      
      {/* Quick view modal */}
      {quickViewItem && (
        <QuickViewModal
          item={quickViewItem}
          onClose={closeQuickView}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Customize modal */}
      {customizeItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Customize {customizeItem.name}</h2>
              <p className="text-sm text-gray-600 mt-1">Select your options below</p>
            </div>
            
            <div className="p-6">
              {/* This will automatically fetch and display option groups using the FundraiserItem component */}
              <FundraiserItemComponent
                item={{
                  id: customizeItem.id,
                  name: customizeItem.name,
                  price: customizeItem.price,
                  imageUrl: customizeItem.image_url || '',
                  description: customizeItem.description
                }}
                fundraiserId={customizeItem.fundraiser_id}
                selectedParticipantId={selectedParticipant?.id}
              />
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={closeCustomize}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg mr-2"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (selectedParticipant) {
                      addItem(
                        customizeItem, 
                        selectedParticipant.id, 
                        selectedParticipant.name
                      );
                      closeCustomize();
                    } else {
                      toastUtils.error('Please select a participant to support');
                    }
                  }}
                  className="bg-[#c1902f] hover:bg-[#d4a43f] text-white px-4 py-2 rounded-lg"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundraiserItemsPage;
