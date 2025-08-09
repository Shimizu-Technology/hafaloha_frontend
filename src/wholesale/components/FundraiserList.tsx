// src/wholesale/components/FundraiserList.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wholesaleApi, WholesaleFundraiser } from '../services/wholesaleApi';
import { useWholesaleCart } from '../context/WholesaleCartProvider';
import { useCartConflict } from '../hooks/useCartConflict';
import CartConflictModal from './CartConflictModal';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';

export default function FundraiserList() {
  const [fundraisers, setFundraisers] = useState<WholesaleFundraiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { getItemCount, fundraiser: currentFundraiser } = useWholesaleCart();
  const { 
    isModalOpen, 
    conflictData, 
    hasCartItems, 
    currentFundraiserId,
    checkCartConflict, 
    handleClearAndContinue, 
    handleCancelAndStay, 
    closeModal 
  } = useCartConflict();

  // Note: currentFundraiserId now includes fallback logic in useCartConflict hook

  useEffect(() => {
    loadFundraisers();
  }, []);

  const loadFundraisers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await wholesaleApi.getFundraisers();
      
      if (response.success && response.data) {
        setFundraisers(response.data.fundraisers);
      } else {
        setError(response.message || 'Failed to load fundraisers');
      }
    } catch (err) {
      console.error('Error loading fundraisers:', err);
      setError('Unable to load fundraisers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Only show fundraisers that are currently active/current
  const visibleFundraisers = fundraisers.filter(f => f.status === 'current');

  const filteredFundraisers = visibleFundraisers.filter(fundraiser =>
    fundraiser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (fundraiser.description && fundraiser.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );



  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-[#c1902f] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading fundraisers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold">Unable to Load Fundraisers</h3>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <button 
            onClick={loadFundraisers}
            className="bg-[#c1902f] text-white px-4 py-2 rounded-md hover:bg-[#d4a43f] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
        Fundraisers
      </h1>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Support your favorite teams and organizations by purchasing their fundraising merchandise.
      </p>

      {/* Cart indicator */}
      {getItemCount() > 0 && currentFundraiser && (
        <div className="bg-white/80 backdrop-blur-sm border-l-2 border-[#c1902f]/70 rounded-lg p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-[#c1902f]/10 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#c1902f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m2.6 8L6 8.5M7 13l-2 8h13" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-900">
                <div className="font-semibold">{getItemCount()} {getItemCount() === 1 ? 'item' : 'items'} in cart</div>
                <div className="text-gray-600 text-sm">for {currentFundraiser.name}</div>
              </div>
            </div>
            <Link 
              to="/wholesale/cart"
              className="inline-flex items-center bg-[#c1902f] text-white px-4 py-2 rounded-md hover:bg-[#d4a43f] transition-colors font-medium shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              View Cart
            </Link>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
          </div>
          <input
            type="search"
            placeholder="Search fundraisers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full p-3 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-[#c1902f] focus:border-[#c1902f] shadow-sm"
          />
        </div>
      </div>

      {/* Fundraiser Grid */}
      {filteredFundraisers.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No fundraisers found' : 'No active fundraisers'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Try adjusting your search terms.' 
                : 'Check back later for new fundraising campaigns.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFundraisers.map((fundraiser) => {
            const isCurrentFundraiser = currentFundraiserId === fundraiser.id;
            const hasConflict = hasCartItems && !isCurrentFundraiser;
            
            return (
              <div
                key={fundraiser.id}
                onClick={() => {
                  if (hasConflict) {
                    checkCartConflict(
                      { id: fundraiser.id, name: fundraiser.name, slug: fundraiser.slug },
                      () => { window.location.href = `/wholesale/${fundraiser.slug}`; }
                    );
                  } else {
                    window.location.href = `/wholesale/${fundraiser.slug}`;
                  }
                }}
                className={`cursor-pointer bg-white rounded-lg shadow-sm border overflow-hidden group transition-all h-full flex flex-col ${
                isCurrentFundraiser 
                  ? 'border-[#c1902f] ring-2 ring-[#c1902f]/20' 
                  : hasConflict
                    ? 'border-orange-200 hover:shadow-md'
                    : 'border-gray-200 hover:shadow-md'
              }`}
              >
                {/* Cart Status Badge */}
                {isCurrentFundraiser && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#c1902f] text-white shadow-sm">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m2.6 8L6 8.5M7 13l-2 8h13" />
                      </svg>
                      In Cart
                    </div>
                  </div>
                )}
                
                {/* Card Image */}
                <div className="aspect-[4/3] w-full bg-gray-100 relative overflow-hidden">
                  <OptimizedImage
                    src={fundraiser.card_image_url || '/placeholder-food.png'}
                    alt={fundraiser.name}
                    context="featured"
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      hasConflict ? 'group-hover:scale-105 opacity-75' : 'group-hover:scale-105'
                    }`}
                  />
                  
                  {/* Conflict Overlay */}
                  {hasConflict && (
                    <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                      <div className="bg-white/90 rounded-full p-2">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              
              {/* Card Content */}
              <div className="p-6 flex flex-col flex-1">
                {/* Title */}
                <h3 className="text-xl font-semibold text-gray-900 line-clamp-2 leading-tight mb-3 min-h-[3.5rem] flex items-start">
                  {fundraiser.name}
                </h3>

                {/* Description */}
                <div className="flex-1 mb-6 min-h-[4rem] flex items-start">
                  {fundraiser.description ? (
                    <p className="text-gray-600 line-clamp-3 leading-relaxed text-sm">
                      {fundraiser.description}
                    </p>
                  ) : (
                    <p className="text-gray-400 italic text-sm">No description available</p>
                  )}
                </div>

                {/* Action Button */}
                {hasConflict ? (
                  <button
                    onClick={() => {
                      checkCartConflict(
                        {
                          id: fundraiser.id,
                          name: fundraiser.name,
                          slug: fundraiser.slug
                        },
                        () => {
                          // Navigate to the fundraiser after clearing cart
                          window.location.href = `/wholesale/${fundraiser.slug}`;
                        }
                      );
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Switch Fundraiser
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                ) : (
                  <Link
                    to={`/wholesale/${fundraiser.slug}`}
                    className={`w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:-translate-y-0.5 transition-all duration-200 ${
                      isCurrentFundraiser
                        ? 'text-white bg-[#c1902f] hover:bg-[#d4a43f] focus:ring-[#c1902f]'
                        : 'text-white bg-[#c1902f] hover:bg-[#d4a43f] focus:ring-[#c1902f]'
                    }`}
                  >
                    {isCurrentFundraiser ? 'Continue Shopping' : 'View Items & Shop'}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Cart Conflict Modal */}
      {conflictData && (
        <CartConflictModal
          isOpen={isModalOpen}
          onClose={closeModal}
          currentFundraiser={conflictData.currentFundraiser}
          newFundraiser={conflictData.newFundraiser}
          itemCount={conflictData.itemCount}
          onClearAndContinue={handleClearAndContinue}
          onCancelAndStay={handleCancelAndStay}
        />
      )}

      {/* Mobile sticky mini-cart bar */}
      {getItemCount() > 0 && currentFundraiser && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">In cart for {currentFundraiser.name}</div>
              <div className="text-sm font-semibold text-gray-900">{getItemCount()} item{getItemCount() !== 1 ? 's' : ''}</div>
            </div>
            <Link 
              to="/wholesale/cart"
              className="inline-flex items-center bg-[#c1902f] text-white px-4 py-2 rounded-md hover:bg-[#d4a43f] transition-colors font-medium shadow-sm"
            >
              View Cart
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}