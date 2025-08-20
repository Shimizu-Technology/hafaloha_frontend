// src/wholesale/components/FundraiserDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { wholesaleApi, WholesaleFundraiserDetail } from '../services/wholesaleApi';
import { useWholesaleCart } from '../context/WholesaleCartProvider';
import { useCartConflict } from '../hooks/useCartConflict';
import VariantSelector from './VariantSelector';
import WholesaleCustomizationModal from './WholesaleCustomizationModal';
import CartConflictModal from './CartConflictModal';
import MobileStickyBar from './MobileStickyBar';
import OptimizedImage from '../../shared/components/ui/OptimizedImage';
import ImageCarousel from './ImageCarousel';

export default function FundraiserDetail() {
  const { fundraiserSlug } = useParams<{ fundraiserSlug: string }>();
  const navigate = useNavigate();
  const [fundraiser, setFundraiser] = useState<WholesaleFundraiserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  
  const { addToCart, getItemCount, getCartTotal } = useWholesaleCart();
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

  useEffect(() => {
    if (fundraiserSlug) {
      loadFundraiser(fundraiserSlug);
    }
  }, [fundraiserSlug]);

  const loadFundraiser = async (slug: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await wholesaleApi.getFundraiser(slug);
      
      if (response.success && response.data) {
        const fundraiserData = response.data.fundraiser;
        setFundraiser(fundraiserData);
        
        // Check for cart conflicts when loading a different fundraiser
        checkCartConflict(
          {
            id: fundraiserData.id,
            name: fundraiserData.name,
            slug: fundraiserData.slug
          },
          () => {
            // Success callback - fundraiser is set in the cart context by the hook
          }
        );
      } else {
        setError(response.message || 'Failed to load fundraiser');
      }
    } catch (err: any) {
      // Gracefully handle not found or forbidden by redirecting to the list with a flash message
      const status = err?.response?.status;
      if (status === 404 || status === 403) {
        navigate('/wholesale', {
          replace: true,
          state: {
            flash: {
              type: 'warning',
              message:
                status === 404
                  ? 'That fundraiser is not available.'
                  : 'This fundraiser is not currently accepting orders.'
            }
          }
        });
        return;
      }
      console.error('Error loading fundraiser:', err);
      setError('Unable to load fundraiser. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasVariants = (item: any) => {
    return item.options?.size_options?.length > 0 || item.options?.color_options?.length > 0;
  };

  const hasOptionGroups = (item: any) => {
    return item.option_groups && item.option_groups.length > 0;
  };

  const handleItemClick = (item: any) => {
    if (hasOptionGroups(item)) {
      // Use new option groups system
      setSelectedItem(item);
    } else if (hasVariants(item)) {
      // Use legacy variant system
      setSelectedItem(item);
    } else {
      // Simple add to cart
      handleAddToCart(item, {});
    }
  };

  const handleAddToCart = (item: any, selectedOptions: { [key: string]: string } = {}) => {
    if (!fundraiser) return;

    // Check for cart conflict first
    const canAdd = checkCartConflict(
      {
        id: fundraiser.id,
        name: fundraiser.name,
        slug: fundraiser.slug
      },
      () => {
        // Success callback - actually add to cart
        // For simple items (no customization), use empty backend options and display options
        const backendOptions = {}; // No option groups for simple items
        const displayOptions = selectedOptions; // Keep original for display
        
        const success = addToCart({
          id: `${item.id}-${Date.now()}-${JSON.stringify(selectedOptions)}`,
          itemId: item.id,
          fundraiserId: fundraiser.id,
          name: item.name,
          description: item.description,
          sku: item.sku,
          price: item.price,
          priceCents: item.price_cents,
          imageUrl: item.primary_image_url,
          options: backendOptions, // Backend format (empty for simple items)
          selectedOptions: displayOptions // Display format for UI
        }, 1);

        if (!success) {
          console.warn('Failed to add item to cart');
        }
      }
    );

    // If there was a conflict, the modal will handle it
    if (!canAdd) {
      return;
    }
  };

  const handleVariantSelection = (selectedOptions: { [key: string]: string }) => {
    if (selectedItem) {
      // For legacy variants, we need to convert to the new backend format
      // Since legacy variants don't have option group IDs, we'll create a synthetic format
      // that the backend can understand, but this should be rare since we're using option groups now
      
      // Create both backend format (empty since no real option groups) and display format
      const backendOptions = {}; // Legacy variants don't map to option groups
      const displayOptions = selectedOptions; // Keep original for display
      
      // Add to cart with both formats
      const success = addToCart({
        id: `${selectedItem.id}-${Date.now()}-${JSON.stringify(selectedOptions)}`,
        itemId: selectedItem.id,
        fundraiserId: fundraiser!.id,
        name: selectedItem.name,
        description: selectedItem.description,
        sku: selectedItem.sku,
        price: selectedItem.price,
        priceCents: selectedItem.price_cents,
        imageUrl: selectedItem.primary_image_url,
        options: backendOptions, // Empty for legacy variants
        selectedOptions: displayOptions // Display format for UI
      }, 1);

      if (success) {
        setSelectedItem(null);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isFromDifferentFundraiser = () => {
    if (!fundraiser || !hasCartItems || !currentFundraiserId) return false;
    return currentFundraiserId !== fundraiser.id;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-[#c1902f] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading fundraiser...</p>
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
            <h3 className="text-lg font-semibold">Unable to Load Fundraiser</h3>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <div className="space-x-4">
            <button 
              onClick={() => fundraiserSlug && loadFundraiser(fundraiserSlug)}
              className="bg-[#c1902f] text-white px-4 py-2 rounded-md hover:bg-[#d4a43f] transition-colors"
            >
              Try Again
            </button>
            <Link 
              to="/wholesale"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Back to Fundraisers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!fundraiser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Fundraiser not found</h2>
          <Link 
            to="/wholesale"
            className="text-[#c1902f] hover:text-[#d4a43f]"
          >
            Back to Fundraisers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
      {/* Banner Image */}
      {fundraiser.banner_url && (
        <div className="mb-6 rounded-lg overflow-hidden shadow-sm">
          <div className="w-full aspect-[16/9]">
            <OptimizedImage 
              src={fundraiser.banner_url} 
              alt={`${fundraiser.name} banner`}
              context="hero"
              className="w-full h-full object-cover object-center"
              isLCP={true}
              priority={true}
            />
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link 
              to="/wholesale"
              className="text-[#c1902f] hover:text-[#d4a43f] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{fundraiser.name}</h1>
              {(fundraiser.startDate || fundraiser.endDate) && (
                <p className="text-gray-600 text-sm">
                  {fundraiser.startDate && formatDate(fundraiser.startDate)} 
                  {fundraiser.startDate && fundraiser.endDate && ' - '}
                  {fundraiser.endDate && formatDate(fundraiser.endDate)}
                </p>
              )}
            </div>
          </div>
          
          {/* Top-level View Cart button removed for cleaner layout; floating bar remains on mobile */}
        </div>

        {fundraiser.description && (
          <div className="bg-white/80 backdrop-blur-sm border-l-2 border-[#c1902f]/70 rounded-lg p-4 shadow-sm mb-6">
            <p className="text-gray-600 leading-relaxed">{fundraiser.description}</p>
          </div>
        )}

        {/* Cart Conflict Warning Banner */}
        {isFromDifferentFundraiser() && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h4 className="font-medium text-orange-800 mb-1">
                  You're viewing a different fundraiser
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  You currently have items from another fundraiser in your cart. Click "Switch Fundraiser" on any item to change fundraisers, or{' '}
                  <Link to="/wholesale/cart" className="font-medium underline hover:text-orange-800">
                    complete your current order
                  </Link>
                  {' '}first.
                </p>
                <div className="flex items-center space-x-3">
                  <Link 
                    to="/wholesale/cart"
                    className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                  >
                    View Cart
                  </Link>
                  <span className="text-sm text-orange-600">
                    {getItemCount()} item{getItemCount() !== 1 ? 's' : ''} in cart
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats block removed (Items Available, Participants, Total Orders, Total Raised) */}
      </div>

      {/* Items Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Items</h2>
        
        {!fundraiser.items || fundraiser.items.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-600">No items available for this fundraiser yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {fundraiser.items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
                {/* Item Image Carousel */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden flex-shrink-0">
                  <ImageCarousel
                    images={item.images}
                    primaryImageUrl={item.primary_image_url}
                    itemName={item.name}
                    className="w-full h-full"
                  />
                  
                  {/* Stock status badge */}
                  {!item.in_stock && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        {item.stock_status || 'Out of Stock'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Item Details - Flex container to fill remaining space */}
                <div className="p-3 flex flex-col flex-1">
                  {/* Title - Compact height section */}
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 min-h-[2.25rem] leading-tight text-sm">
                      {item.name}
                    </h3>
                  </div>
                  
                  {/* Description - Only show if exists, no minimum height */}
                  {item.description && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  )}

                  {/* Option indicators - Show option groups or legacy variants */}
                  {(hasOptionGroups(item) || hasVariants(item)) && (
                    <div className="mb-2">
                      <div className="flex flex-wrap gap-1">
                        {hasOptionGroups(item) && item.option_groups?.map((group: any) => (
                          <span key={group.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[#c1902f]/10 text-[#c1902f]">
                            {group.name} ({group.options?.length || 0} options)
                          </span>
                        ))}
                        {!hasOptionGroups(item) && item.options?.size_options?.length > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[#c1902f]/10 text-[#c1902f]">
                            {item.options.size_options.length} sizes
                          </span>
                        )}
                        {!hasOptionGroups(item) && item.options?.color_options?.length > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[#c1902f]/10 text-[#c1902f]">
                            {item.options.color_options.length} colors
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* SKU - Only show if exists */}
                  {item.sku && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                    </div>
                  )}

                  {/* Price and Button - Push to bottom with smaller gap */}
                  <div className="mt-auto flex flex-col gap-2">
                    <span className="text-base font-semibold text-[#c1902f]">
                      {formatCurrency(item.price)}
                    </span>
                    
                    <button
                      onClick={() => handleItemClick(item)}
                      disabled={!item.in_stock}
                      className={`w-full flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm transition-all duration-200 ${
                        !item.in_stock
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : isFromDifferentFundraiser()
                            ? 'bg-orange-100 text-orange-600 border-orange-200 cursor-pointer hover:bg-orange-200'
                            : 'text-white bg-[#c1902f] hover:bg-[#d4a43f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f] transform hover:-translate-y-0.5'
                      }`}
                    >
                      {!item.in_stock
                        ? 'Out of Stock'
                        : isFromDifferentFundraiser()
                          ? 'Switch Fundraiser'
                          : hasOptionGroups(item)
                            ? 'Customize'
                            : hasVariants(item) 
                              ? 'Select Options' 
                              : 'Add to Cart'
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participants Section */}
      {fundraiser.participants && fundraiser.participants.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Participants</h2>
          <div className="bg-white/80 backdrop-blur-sm border-l-2 border-[#c1902f]/70 rounded-lg p-4 shadow-sm mb-6">
            <p className="text-gray-600 leading-relaxed">
              You can select a specific participant to support when you checkout.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fundraiser.participants.map((participant) => (
              <div key={participant.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3">
                  {participant.photoUrl ? (
                    <OptimizedImage 
                      src={participant.photoUrl} 
                      alt={participant.name || 'Participant'}
                      context="cart"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{participant.name || 'Unnamed Participant'}</h3>
                    {participant.hasGoal && participant.goalAmount && (
                      <div className="text-xs text-gray-500">
                        Goal: {formatCurrency(participant.goalAmount)}
                      </div>
                    )}
                  </div>
                </div>
                
                {participant.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2 leading-relaxed">
                    {participant.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customization Modals */}
      {selectedItem && hasOptionGroups(selectedItem) && fundraiser && (
        <WholesaleCustomizationModal
          item={selectedItem}
          fundraiserId={fundraiser.id}
          onClose={() => setSelectedItem(null)}
        />
      )}
      
      {/* Legacy Variant Selector Modal */}
      {selectedItem && !hasOptionGroups(selectedItem) && hasVariants(selectedItem) && (
        <VariantSelector
          item={selectedItem}
          isOpen={selectedItem !== null}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleVariantSelection}
        />
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

      {/* Mobile sticky cart bar */}
      {getItemCount() > 0 && (
        <MobileStickyBar
          leftTopText="Cart"
          leftBottomText={`${getItemCount()} item${getItemCount() !== 1 ? 's' : ''} • ${formatCurrency(getCartTotal())}`}
          buttonLabel="View Cart"
          buttonTo="/wholesale/cart"
        />
      )}
    </div>
  );
}