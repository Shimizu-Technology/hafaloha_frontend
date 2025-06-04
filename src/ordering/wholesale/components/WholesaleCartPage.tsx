// src/ordering/wholesale/components/WholesaleCartPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, Users, Settings } from 'lucide-react';
import { useWholesaleCartStore } from '../store/wholesaleCartStore';
import fundraiserService, { Fundraiser, FundraiserItem } from '../services/fundraiserService';
import OptimizedImage from '../../../shared/components/ui/OptimizedImage';
import QuickViewModal from './QuickViewModal';

const WholesaleCartPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State to store fundraiser information
  const [fundraisers, setFundraisers] = useState<Record<number, Fundraiser>>({});
  const [loading, setLoading] = useState<boolean>(false);
  
  // State for customization modal
  const [itemToCustomize, setItemToCustomize] = useState<FundraiserItem | null>(null);
  
  // Get cart state and functions from our wholesale cart store
  const { 
    cartItems, 
    setCartQuantity, 
    removeFromCart, 
    setCartItemNotes
  } = useWholesaleCartStore();
  
  // Fetch fundraiser details for all unique fundraiser IDs in the cart
  useEffect(() => {
    const fetchFundraiserDetails = async () => {
      // Get unique fundraiser IDs from cart items
      const fundraiserIds = Array.from(new Set(cartItems.map(item => item.fundraiserId)));
      
      // Skip if no fundraiser IDs or if we already have all the fundraisers loaded
      if (fundraiserIds.length === 0 || 
          fundraiserIds.every(id => fundraisers[id])) {
        return;
      }
      
      setLoading(true);
      
      try {
        // Fetch details for each fundraiser ID we don't already have
        const newFundraisers: Record<number, Fundraiser> = {...fundraisers};
        
        for (const id of fundraiserIds) {
          if (!fundraisers[id]) {
            try {
              const fundraiser = await fundraiserService.getFundraiser(id);
              newFundraisers[id] = fundraiser;
            } catch (error) {
              console.error(`Error fetching fundraiser ${id}:`, error);
            }
          }
        }
        
        setFundraisers(newFundraisers);
      } catch (error) {
        console.error('Error fetching fundraiser details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFundraiserDetails();
  }, [cartItems, fundraisers]);
  
  // We no longer need to manage participants state here as it's handled by the ParticipantSelector component
  
  // Calculate total
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Unused for now, but could be helpful for future grouping by participant
  // const itemsByParticipant = cartItems.reduce((groups, item) => {
  //   const participantId = item.participantId || 0;
  //   
  //   if (!groups[participantId]) {
  //     groups[participantId] = {
  //       participantId,
  //       items: []
  //     };
  //   }
  //   
  //   groups[participantId].items.push(item);
  //   
  //   return groups;
  // }, {} as Record<number, { participantId: number; items: typeof cartItems }>);
  
  // Empty cart view
  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Your fundraiser cart is empty</h2>
        <p className="text-gray-600 mb-8">
          Support a fundraiser by adding items to your cart!
        </p>
        <button
          onClick={() => navigate('/wholesale')}
          className="inline-flex items-center px-6 py-3 border border-transparent
                     text-base font-medium rounded-md text-white
                     bg-[#c1902f] hover:bg-[#d4a43f]"
        >
          Browse Fundraisers
        </button>
      </div>
    );
  }
  
  return (
    <>
      {/* Customization Modal */}
      {itemToCustomize && (
        <QuickViewModal
          item={itemToCustomize}
          onClose={() => setItemToCustomize(null)}
          onAddToCart={(updatedItem) => {
            // Get the original item to preserve its quantity
            const originalItemKey = useWholesaleCartStore.getState()._getItemKey({
              id: String(itemToCustomize.id),
              fundraiserId: itemToCustomize.fundraiser_id,
              name: itemToCustomize.name,
              price: itemToCustomize.price,
              quantity: 1 // Default quantity
            });
            
            // Find the original item to get its quantity
            const originalItem = cartItems.find(item => 
              useWholesaleCartStore.getState()._getItemKey(item) === originalItemKey
            );
            
            // Remove the old item from cart
            removeFromCart(originalItemKey);
            
            // Add updated item to cart with preserved quantity
            useWholesaleCartStore.getState().addToCart({
              id: String(updatedItem.id),
              fundraiserId: updatedItem.fundraiser_id,
              name: updatedItem.name,
              price: updatedItem.price,
              quantity: originalItem?.quantity || 1,
              // Get customizations from QuickViewModal's return value
              customizations: (updatedItem as any).customizations,
            });
            
            setItemToCustomize(null);
          }}
          showCustomizeOptions={true}
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/wholesale')}
        className="flex items-center text-[#c1902f] hover:text-[#d4a43f] font-medium mb-6"
      >
        <ArrowLeft size={18} className="mr-2" />
        Back to Fundraisers
      </button>
      
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
        Your Fundraiser Cart
      </h1>
      
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Cart items list */}
        <div className="lg:col-span-7">
          {
            cartItems.map((item) => {
              // Generate a unique key for this item using our composite key function
              const itemKey = useWholesaleCartStore.getState()._getItemKey(item);
              
              return (
                <div
                  key={itemKey}
                  className="flex flex-col sm:flex-row sm:items-start
                           space-y-4 sm:space-y-0 sm:space-x-4 py-6 border-b"
                >
                  {/* Image */}
                  <OptimizedImage
                    src={item.image}
                    alt={item.name}
                    className="w-full sm:w-24 h-48 sm:h-24 object-cover rounded-md"
                    context="cart"
                    fallbackSrc="/placeholder-food.png"
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    
                    {/* Fundraiser info */}
                    <div className="mt-1 text-sm text-gray-600 flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      <span>
                        {loading && !fundraisers[item.fundraiserId] ? (
                          'Loading fundraiser info...'
                        ) : fundraisers[item.fundraiserId] ? (
                          `Fundraiser: ${fundraisers[item.fundraiserId].name}`
                        ) : (
                          `Fundraiser ID: ${item.fundraiserId}`
                        )}
                      </span>
                    </div>
                    
                    {/* If customizations exist, show them with their prices */}
                    {item.customizations && Object.keys(item.customizations).length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 border border-gray-100 rounded-md">
                        <div className="text-xs uppercase font-semibold mb-1 text-gray-700">Customizations:</div>
                        
                        {item.basePrice && (
                          <p className="text-xs mb-1 text-gray-500">Base price: ${item.basePrice.toFixed(2)}</p>
                        )}
                        
                        {Object.entries(item.customizations).map(([groupName, picks], idx) => (
                          <div key={`${itemKey}-${idx}`} className="ml-2 mb-1">
                            <p className="text-xs font-medium">
                              <strong>{groupName}</strong>
                            </p>
                            {Array.isArray(picks) && picks.map((pick, pickIdx) => (
                              <p key={`${itemKey}-${idx}-${pickIdx}`} className="ml-3 text-xs flex justify-between">
                                <span>• {pick}</span>
                                {item.customizationPrices && item.customizationPrices[pick] > 0 && (
                                  <span className="text-gray-500 ml-2">+${item.customizationPrices[pick].toFixed(2)}</span>
                                )}
                              </p>
                            ))}
                          </div>
                        ))}
                        
                        {/* Display total price with customizations */}
                        <p className="text-xs mt-2 pt-1 border-t border-gray-100 font-medium">
                          Total price per item: ${item.price.toFixed(2)}
                        </p>
                      </div>
                    )}
                    
                    {/* Message about participant selection at checkout */}
                    <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Users className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="ml-2">
                          <p className="text-sm text-blue-700">
                            You'll select which participant to support during checkout.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Item notes */}
                    <textarea
                      className="mt-2 w-full border border-gray-300 rounded-md p-2 text-sm
                               focus:ring-[#c1902f] focus:border-[#c1902f]"
                      placeholder="Any notes for this item?"
                      value={item.notes || ''}
                      onChange={(e) => setCartItemNotes(itemKey, e.target.value)}
                    />

                    <div className="flex flex-wrap items-center justify-between mt-4 gap-2">
                      {/* Quantity controls */}
                      <div className="flex items-center border rounded-md">
                        <button
                          className="p-2 text-gray-600 hover:text-gray-900"
                          onClick={() => setCartQuantity(itemKey, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-2 border-x">{item.quantity}</span>
                        <button
                          className="p-2 text-gray-600 hover:text-gray-900"
                          onClick={() => setCartQuantity(itemKey, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                       {/* Action buttons */}
                       <div className="flex items-center mt-2">
                         {/* "Customize Again" button - only show for items with customizations */}
                         {item.customizations && Object.keys(item.customizations).length > 0 && (
                           <button
                             className="mr-2 px-3 py-1.5 text-sm text-[#c1902f] border border-[#c1902f] rounded-md hover:bg-[#c1902f]/10 flex items-center"
                             onClick={() => {
                               // Convert the cart item back to a fundraiser item for customization
                               // Use basePrice if available, otherwise use the current price
                               const priceToUse = item.basePrice || item.price;
                               
                               setItemToCustomize({
                                 id: parseInt(item.id),
                                 name: item.name,
                                 price: priceToUse, // Use the base price without customizations
                                 fundraiser_id: item.fundraiserId,
                                 description: "",  // Required fields for FundraiserItem
                                 created_at: "",
                                 updated_at: "",
                                 // Add the original customizations to preserve them
                                 customizations: item.customizations,
                                 // Also preserve customization prices if available
                                 customizationPrices: item.customizationPrices
                               } as unknown as FundraiserItem);
                             }}
                           >
                             <Settings className="h-4 w-4 mr-1" />
                             Customize Again
                           </button>
                         )}
                         
                         {/* Remove item */}
                         <button
                           className="text-red-600 hover:text-red-800 p-2"
                           onClick={() => removeFromCart(itemKey)}
                         >
                           <Trash2 className="h-5 w-5" />
                         </button>
                       </div>
                     </div>
                   </div>

                   {/* Price */}
                   <div className="text-right">
                     <span className="text-lg font-medium text-gray-900">
                       {formatCurrency(item.price * item.quantity)}
                     </span>
                   </div>
                </div>
              );
            })
          }
        </div>

        {/* Order summary */}
        <div className="lg:col-span-5 mt-8 lg:mt-0">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Order Summary
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-lg font-medium">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <button
                className="w-full flex items-center justify-center px-6 py-3 border
                         border-transparent text-base font-medium rounded-md text-white
                         bg-[#c1902f] hover:bg-[#d4a43f]"
                onClick={() => navigate('/wholesale/checkout')}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default WholesaleCartPage;
