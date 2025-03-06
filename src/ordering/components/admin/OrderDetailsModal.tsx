// src/ordering/components/admin/OrderDetailsModal.tsx
import React from 'react';

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
}

export function OrderDetailsModal({
  order,
  onClose
}: OrderDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-md max-w-lg w-full p-4 relative animate-slideUp">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="text-lg font-bold mb-3">Order #{order.id}</h3>
        <p className="text-xs text-gray-500 mb-3">
          Placed: {new Date(order.createdAt).toLocaleString()}
        </p>

        <p className="font-medium mb-2 text-sm">Items:</p>
        <div className="space-y-2 mb-4">
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <div>
                <p className="font-medium">
                  {item.name} × {item.quantity}
                </p>
                {item.notes && (
                  <p className="text-xs text-gray-600">Notes: {item.notes}</p>
                )}
              </div>
              <p>${Number(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
          <p className="font-medium">
            Total: ${Number(order.total || 0).toFixed(2)}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#c1902f] text-white text-sm rounded hover:bg-[#d4a43f]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
