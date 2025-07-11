// src/ordering/components/admin/reservations/LayoutEditorManager.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useRestaurantStore } from '../../../../shared/store/restaurantStore';
import * as tenantUtils from '../../../../shared/utils/tenantUtils';
import SeatLayoutEditor from './SeatLayoutEditor';
import UnsavedChangesModal from '../../../../shared/components/modals/UnsavedChangesModal';

// Define props interface with navigation guard callback
interface LayoutEditorManagerProps {
  onNavigationAttempt?: (canNavigate: (proceedWithNavigation: () => void) => boolean) => void;
  locationId?: number | null; // Added location ID for multi-location support
}

/**
 * LayoutEditorManager component
 * Manages the seat layout editor within the Admin Dashboard with proper tenant isolation
 * Enhanced with transition effects and iPad optimizations
 */
export const LayoutEditorManager: React.FC<LayoutEditorManagerProps> = ({ onNavigationAttempt, locationId }) => {
  // Get restaurant context from store
  const { restaurant } = useRestaurantStore();
  
  // State for transition effects, unsaved changes, and modal display
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (showUnsavedModal) {
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
      body.style.position = 'fixed'; // Prevent iOS scroll bounce
      body.style.width = '100%';
    } else {
      body.style.overflow = '';
      html.style.overflow = '';
      body.style.position = '';
      body.style.width = '';
    }

    return () => {
      body.style.overflow = '';
      html.style.overflow = '';
      body.style.position = '';
      body.style.width = '';
    };
  }, [showUnsavedModal]);
  
  // Store the navigation callback that triggered the modal
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  
  // Set a small delay to simulate loading for smooth transition
  useEffect(() => {
    const loadTimer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(loadTimer);
  }, []);
  
  // Handle unsaved changes modal confirm/cancel actions
  const handleDiscardChanges = () => {
    setShowUnsavedModal(false);
    // Execute the pending navigation action if one exists
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedModal(false);
    pendingNavigationRef.current = null;
  };
  
  // Handle navigation guard registration with parent component
  useEffect(() => {
    if (onNavigationAttempt) {
      // Register a callback that returns whether navigation should be allowed
      onNavigationAttempt((proceedWithNavigation) => {
        // If there are unsaved changes, show the modal instead of allowing immediate navigation
        if (hasUnsavedChanges) {
          // Store the callback to execute if the user confirms
          pendingNavigationRef.current = proceedWithNavigation;
          setShowUnsavedModal(true);
          return false; // Block immediate navigation, we'll handle it through the modal
        }
        // No unsaved changes, allow navigation
        return true;
      });
    }
  }, [hasUnsavedChanges, onNavigationAttempt]);
  
  // Validate restaurant context for tenant isolation
  if (!tenantUtils.validateRestaurantContext(restaurant)) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          Restaurant context required to manage seat layouts
        </div>
      </div>
    );
  }

  // Create a handler for transition events that can be passed to SeatLayoutEditor
  const handleTransitionStart = () => {
    setIsTransitioning(true);
    // Short timeout for visual feedback
    setTimeout(() => {
      setIsTransitioning(false);
    }, 450);
  };

  return (
    <div className="h-full p-4 overflow-hidden">
      {/* Unsaved changes modal dialog */}
      <UnsavedChangesModal 
        isOpen={showUnsavedModal} 
        message="You have unsaved changes in the layout editor. Discard changes and navigate away?"
        onDiscard={handleDiscardChanges}
        onCancel={handleCancelNavigation}
      />
      
      {/* Header with title and description - using transition opacity effect */}
      <div className={`transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Layout Editor</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Design and manage your restaurant floor layouts and table arrangements.
        </p>
      </div>
      
      {/* Layout editor card - styled to match Floor Plan tab with transition effects */}
      <div className={`bg-white rounded-lg shadow-sm border border-gray-100 mb-6 transition-all duration-500 ease-in-out ${isLoading ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <div className="p-3 flex justify-between items-center">
          <div>
            <div className="flex items-center">
              <div className="text-lg font-medium text-gray-800">
                Seat Layout Editor
              </div>
              {hasUnsavedChanges && (
                <div className="inline-flex items-center bg-blue-50 text-[#0078d4] text-xs font-medium px-2 py-0.5 rounded-full ml-2 align-middle">
                  <span>Unsaved Changes</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-100">
          <SeatLayoutEditor 
            onTransitionStart={handleTransitionStart} 
            isParentTransitioning={isTransitioning}
            onUnsavedChangesChange={setHasUnsavedChanges}
            locationId={locationId}
          />
        </div>
      </div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hafaloha-gold mb-4"></div>
            <p className="text-hafaloha-gold">Loading layout editor...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutEditorManager;
