// src/ordering/components/admin/CollapsibleOrderCard.tsx
import React, { useState } from 'react';
import { StatusTimer } from './StatusTimer';

interface RefundedItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface OrderPayment {
  id: number;
  payment_type: 'initial' | 'additional' | 'refund';
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  description?: string;
  transaction_id?: string;
  payment_details?: any;
  refunded_items?: RefundedItem[];
}

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
  const highlightClasses = isHighlighted
    ? 'ring-2 ring-[#c1902f] ring-opacity-70 shadow-md'
    : '';

  // Calculate the actual total based on the items in the order
  const calculatedTotal = (order.items || []).reduce((sum: number, item: any) => {
    const price = parseFloat(String(item.price)) || 0;
    const qty = parseInt(String(item.quantity), 10) || 0;
    return sum + price * qty;
  }, 0);
  
  // Sum of all refunds
  const refunds = (order.order_payments || []).filter((p: OrderPayment) => p.payment_type === 'refund');
  const totalRefunded = refunds.reduce((sum: number, p: OrderPayment) => sum + parseFloat(String(p.amount)), 0);
  
  // Use the calculated total as the original total, or fall back to order.total if no items
  const originalTotal = calculatedTotal > 0 ? calculatedTotal : parseFloat(String(order.total || 0));
  const netTotal = Math.max(0, originalTotal - totalRefunded);

  // Decide if partial or full
  const isFullyRefunded = totalRefunded > 0 && Math.abs(netTotal) < 0.01;
  const isPartiallyRefunded = totalRefunded > 0 && netTotal > 0;
  
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
            
            {/* Preview of order items in collapsed state */}
            {!isExpanded && order.items && order.items.length > 0 && (
              <div className="mt-2">
                <h4 className="font-medium text-sm text-gray-700">Items:</h4>
                <div className="text-sm text-gray-600 mt-1">
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="inline-flex items-center mr-2 mb-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                        {item.quantity}× {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="text-left sm:text-right">
            <div className="flex items-center justify-end">
              {totalRefunded > 0 ? (
                <>
                  <span className="line-through text-gray-400 mr-2">
                    ${originalTotal.toFixed(2)}
                  </span>
                  <span className="mr-2">
                    ${netTotal.toFixed(2)}
                  </span>
                  {isFullyRefunded ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Refunded
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Partial Refund
                    </span>
                  )}
                </>
              ) : (
                <span>Total: ${originalTotal.toFixed(2)}</span>
              )}
            </div>
            
            {/* Show total refunded amount */}
            {totalRefunded > 0 && (
              <div className="mt-1 text-xs text-red-600">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Refunded: ${totalRefunded.toFixed(2)}
                </div>
              </div>
            )}
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
                  <div key={index} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm">
                      <div className="pr-2">
                        <span className="font-medium">
                          {item.name} × {item.quantity}
                        </span>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        ${Number(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    
                    {/* Display customizations if they exist */}
                    {item.customizations && Object.keys(item.customizations).length > 0 && (
                      <div className="mt-1 ml-2 bg-gray-50 p-2 rounded-md">
                        <div className="text-xs text-gray-600">
                          {Array.isArray(item.customizations) ? (
                            // array format
                            item.customizations.map((custom: any, cidx: number) => (
                              <div key={`custom-${index}-${cidx}`}>
                                {custom.option_name}
                                {custom.price > 0 && ` (+$${custom.price.toFixed(2)})`}
                              </div>
                            ))
                          ) : (
                            // object format
                            Object.entries(item.customizations).map(
                              ([group, options]: [string, any], cidx: number) => (
                                <div key={`custom-${index}-${cidx}`}>
                                  <span className="font-medium">{group}:</span>{' '}
                                  {Array.isArray(options) ? options.join(', ') : options}
                                </div>
                              )
                            )
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Display option groups if they exist */}
                    {item.option_groups && item.option_groups.length > 0 && (
                      <div className="mt-1 ml-2 bg-gray-50 p-2 rounded-md">
                        <div className="text-xs text-gray-600">
                          {item.option_groups.map((group: any, gidx: number) => (
                            <div key={`option-group-${index}-${gidx}`}>
                              <span className="font-medium">{group.name}:</span>{' '}
                              {group.options
                                .filter((opt: any) => opt.selected)
                                .map((opt: any) => opt.name)
                                .join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Display notes if they exist */}
                    {item.notes && item.notes.trim() && (
                      <div className="mt-1 ml-2 text-xs text-gray-500 italic">
                        Note: {item.notes}
                      </div>
                    )}
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
          
          {/* Show subtotal */}
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm text-gray-700">Subtotal:</h4>
              <span className="text-sm font-medium">${originalTotal.toFixed(2)}</span>
            </div>
            
            {/* If there are refunds, show the refund amount and net total */}
            {totalRefunded > 0 && (
              <>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-red-600">Refunded:</span>
                  <span className="text-sm font-medium text-red-600">-${totalRefunded.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Net Total:</span>
                  <span className="text-sm font-medium">${netTotal.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
          
          {/* Render refunds if present */}
          {refunds.length > 0 && (
            <div className="mb-4 bg-red-50 p-3 rounded-md border border-red-100">
              <h4 className="font-medium text-sm text-red-700 mb-1 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 10h10a8 8
                       0 018 8v2M3 10l6
                       6m-6-6l6-6"
                  />
                </svg>
                Refund Information:
              </h4>
              <div className="space-y-2">
                {refunds.map((refund: OrderPayment, idx: number) => (
                    <div key={idx} className="text-sm text-red-600 border-b border-red-100 pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between">
                        <span>Amount: ${parseFloat(String(refund.amount)).toFixed(2)}</span>
                        <span className="text-red-500 text-xs">
                          {new Date(refund.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {refund.description && (
                        <div className="text-xs text-red-500 mt-1">
                          Reason: {refund.description}
                        </div>
                      )}
                      
                      {/* Display refunded items if available */}
                          {refund.refunded_items && refund.refunded_items.length > 0 && (
                            <div className="mt-2 bg-red-100 p-2 rounded">
                              <div className="text-xs font-medium text-red-700 mb-1">Refunded Items:</div>
                              <ul className="list-disc pl-5 text-xs">
                                {refund.refunded_items.map((item: RefundedItem, itemIdx: number) => (
                              <li key={itemIdx} className="mb-1">
                                {item.name} × {item.quantity} (${(item.price * item.quantity).toFixed(2)})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
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
