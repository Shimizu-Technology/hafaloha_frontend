import React, { useEffect, useRef, useState } from 'react';

interface PayPalCardFieldsProps {
  onCardFieldsReady: (isValid: boolean) => void;
  onError?: (error: Error) => void;
}

export function PayPalCardFields({
  onCardFieldsReady,
  onError
}: PayPalCardFieldsProps) {
  const [isValid, setIsValid] = useState(false);
  const cardNumberContainerRef = useRef<HTMLDivElement>(null);
  const cardExpiryContainerRef = useRef<HTMLDivElement>(null);
  const cardCvvContainerRef = useRef<HTMLDivElement>(null);
  const fieldsRendered = useRef(false);

  // Render card fields when the component mounts
  useEffect(() => {
    if (!window.paypal || fieldsRendered.current) return;

    try {
      // Initialize card number field
      const cardNumberField = window.paypal.CardNumberField();
      const cardExpiryField = window.paypal.CardExpiryField();
      const cardCvvField = window.paypal.CardCvvField();

      // Create a state tracker for card fields
      const fieldsState = {
        number: false,
        expiry: false,
        cvv: false
      };

      // Helper to check if all fields are valid
      const checkAllFieldsValid = () => {
        const allValid = fieldsState.number && fieldsState.expiry && fieldsState.cvv;
        
        setIsValid(allValid);
        onCardFieldsReady(allValid);
      };

      // Set up event handlers before rendering
      cardNumberField.on('validityChange', (event: any) => {
        fieldsState.number = event.isValid;
        checkAllFieldsValid();
      });
      
      cardNumberField.on('cardTypeChange', (event: any) => {
        // Optionally handle card type change (Visa, Mastercard, etc.)
        console.log('Card type changed:', event.cardType);
      });
      
      cardExpiryField.on('validityChange', (event: any) => {
        fieldsState.expiry = event.isValid;
        checkAllFieldsValid();
      });
      
      cardCvvField.on('validityChange', (event: any) => {
        fieldsState.cvv = event.isValid;
        checkAllFieldsValid();
      });

      // Render the fields
      if (cardNumberContainerRef.current) {
        cardNumberField.render(cardNumberContainerRef.current);
      }
      
      if (cardExpiryContainerRef.current) {
        cardExpiryField.render(cardExpiryContainerRef.current);
      }
      
      if (cardCvvContainerRef.current) {
        cardCvvField.render(cardCvvContainerRef.current);
      }

      fieldsRendered.current = true;
    } catch (error) {
      console.error('Error rendering PayPal card fields:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to render card fields'));
      }
    }

    // Clean up function
    return () => {
      fieldsRendered.current = false;
    };
  }, [onCardFieldsReady, onError]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {/* Card Number */}
        <div>
          <label htmlFor="card-number" className="block text-sm font-medium text-gray-700 mb-1">
            Card Number
          </label>
          <div 
            id="card-number" 
            ref={cardNumberContainerRef}
            className="h-10 p-2 border border-gray-300 rounded-md focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"
          ></div>
          <div className="mt-1">
            <p className="text-xs text-gray-500">
              Enter the 16-digit card number
            </p>
          </div>
        </div>

        {/* Expiry and CVV in a two-column layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Expiry Date */}
          <div>
            <label htmlFor="card-expiry" className="block text-sm font-medium text-gray-700 mb-1">
              Expiration Date
            </label>
            <div 
              id="card-expiry" 
              ref={cardExpiryContainerRef}
              className="h-10 p-2 border border-gray-300 rounded-md focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"
            ></div>
          </div>
          
          {/* CVV */}
          <div>
            <label htmlFor="card-cvv" className="block text-sm font-medium text-gray-700 mb-1">
              CVV
            </label>
            <div 
              id="card-cvv" 
              ref={cardCvvContainerRef}
              className="h-10 p-2 border border-gray-300 rounded-md focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"
            ></div>
          </div>
        </div>
      </div>

      {/* Valid status indicator */}
      <div className="flex items-center">
        <div className={`h-2 w-2 rounded-full mr-2 ${isValid ? 'bg-green-500' : 'bg-gray-300'}`}></div>
        <span className="text-xs text-gray-500">
          {isValid ? 'Card information is valid' : 'Please complete all card fields'}
        </span>
      </div>
    </div>
  );
}
