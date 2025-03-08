import React, { useState } from 'react';
import { StatusTimer } from './StatusTimer';

interface CollapsibleOrderCardProps {
  order: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isNew?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onSelectChange?: (selected: boolean) => void;
  renderActions: (order: any) => React.ReactNode;
  getStatusBadgeColor: (status: string) => string;
  formatDate: (dateString: string | null | undefined) => string;
  requiresAdvanceNotice: (order: any) => boolean;
}

export function CollapsibleOrderCard({
  order,
  isExpanded,
  onToggleExpand,
  isNew = false,
  isSelected = false,
  isHighlighted = false,
  onSelectChange,
  renderActions,
  getStatusBadgeColor,
  formatDate,
  requiresAdvanceNotice
}: CollapsibleOrderCardProps) {
  
  // Animation classes for new orders
  const newOrderClasses = isNew 
    ? 'animate-pulse-light border-yellow-300 shadow-yellow-100' 
    : '';
  
  // Highlight classes for orders selected via notification
  const highlightClasses = isHighlighted
    ? 'ring-2 ring-[#c1902f] ring-opacity-70 shadow-md' 
    : '';
  
  return (
    <div 
      id={`order-${order.id}`}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${newOrderClasses} ${highlightClasses} transition-all duration-200`}
    >
      {/* Order header - optimized for mobile and tablet */}
      <div className="flex flex-wrap justify-between items-center p-3 border-b border-gray-100">
        <div className="flex items-center">
          {onSelectChange && (
            <div className="mr-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelectChange(e.target.checked)}
                className="h-5 w-5 text-[#c1902f] focus:ring-[#c1902f] border-gray-300 rounded"
                aria-label="Select order"
              />
            </div>
          )}
          <div>
            <div className="flex items-center">
              {isNew && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
                  NEW
                </span>
              )}
              <h3 className="text-base font-medium text-gray-900">Order #{order.id}</h3>
            </div>
            {order.createdAt && (
              <p className="text-xs text-gray-500">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <StatusTimer 
            createdAt={order.createdAt} 
            statusUpdatedAt={order.statusUpdatedAt} 
            status={order.status} 
          />
          <div className="flex items-center space-x-1">
            {requiresAdvanceNotice(order) && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                24h
              </span>
            )}
            <span
              className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${getStatusBadgeColor(order.status)}
              `}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Order summary (always visible) - improved for mobile */}
      <div className="p-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div className="mb-2 sm:mb-0">
            {order.contact_name && (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Customer: </span>
                <span>{order.contact_name}</span>
              </div>
            )}
            <div className="text-sm">
              <span className="font-medium text-gray-700">Pickup: </span>
              <span>{formatDate((order as any).estimatedPickupTime || (order as any).estimated_pickup_time)}</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-medium text-sm">
              Total: ${Number(order.total || 0).toFixed(2)}
            </p>
            <button
              onClick={onToggleExpand}
              className="text-[#c1902f] hover:text-[#a07929] text-sm font-medium flex items-center mt-1 py-1"
              aria-expanded={isExpanded}
              aria-controls={`order-details-${order.id}`}
            >
              {isExpanded ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Hide Details
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show Details
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded details - with improved mobile layout */}
      {isExpanded && (
        <div 
          id={`order-details-${order.id}`}
          className="p-3 pt-0 border-t border-gray-100 mt-2 animate-expandDown"
        >
          {/* Items with prices aligned to right */}
          <div className="mb-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Order Items:</h4>
            <div className="space-y-2">
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div className="pr-2">
                      <span className="font-medium">
                        {item.name} × {item.quantity}
                      </span>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      ${Number(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No items found</div>
              )}
            </div>
          </div>

          {/* Special instructions */}
          {((order as any).special_instructions || (order as any).specialInstructions) && (
            <div className="mb-4">
              <h4 className="font-medium text-sm text-gray-700 mb-1">Instructions:</h4>
              <p className="text-sm text-gray-600 break-words">
                {(order as any).special_instructions || (order as any).specialInstructions}
              </p>
            </div>
          )}

          {/* Customer contact info */}
          <div className="mb-4">
            <h4 className="font-medium text-sm text-gray-700 mb-1">Contact Info:</h4>
            <div className="text-sm space-y-1">
              {order.contact_name && (
                <div>
                  <span className="font-medium text-gray-700">Name: </span>
                  <span>{order.contact_name}</span>
                </div>
              )}
              {order.contact_phone && (
                <div>
                  <span className="font-medium text-gray-700">Phone: </span>
                  <a href={`tel:${order.contact_phone}`} className="text-blue-600">
                    {order.contact_phone}
                  </a>
                </div>
              )}
              {order.contact_email && (
                <div>
                  <span className="font-medium text-gray-700">Email: </span>
                  <a href={`mailto:${order.contact_email}`} className="text-blue-600 break-words">
                    {order.contact_email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions - with improved touch targets */}
      <div className="p-3 pt-0 border-t border-gray-100">
        {renderActions(order)}
      </div>
    </div>
  );
}
