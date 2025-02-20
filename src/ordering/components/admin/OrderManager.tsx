// src/ordering/components/admin/OrderManager.tsx
import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../../store/orderStore';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

interface OrderManagerProps {
  selectedOrderId?: number | null;
  setSelectedOrderId?: (id: number | null) => void;
}

export function OrderManager({ selectedOrderId, setSelectedOrderId }: OrderManagerProps) {
  const {
    orders,
    fetchOrders,
    updateOrderStatus,
    updateOrderData,
    loading,
    error
  } = useOrderStore();

  // which order is selected for the "details" modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // which “tab” we are viewing
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');

  // for the “Set ETA” modal
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [orderToPrep, setOrderToPrep] = useState<any | null>(null);

  // for the “Edit Order” modal
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  // fetch all orders on mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // if the parent sets a selectedOrderId => open the details
  useEffect(() => {
    if (selectedOrderId) {
      const found = orders.find(o => Number(o.id) === selectedOrderId);
      setSelectedOrder(found || null);
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, orders]);

  // filter the orders by selectedStatus
  const filteredOrders =
    selectedStatus === 'all'
      ? orders
      : orders.filter(order => order.status === selectedStatus);

  function closeModal() {
    setSelectedOrder(null);
    if (setSelectedOrderId) {
      setSelectedOrderId(null);
    }
  }

  // handle ETA confirm => patch status=preparing & estimated_pickup_time
  async function handleConfirmEta() {
    if (!orderToPrep) {
      setShowEtaModal(false);
      return;
    }
    const pickupTime = new Date(Date.now() + etaMinutes * 60_000).toISOString();

    await updateOrderStatus(orderToPrep.id, 'preparing', pickupTime);

    setShowEtaModal(false);
    setEtaMinutes(5);
    setOrderToPrep(null);
  }

  // color badges
  const getStatusBadgeColor = (status: OrderStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No pickup time set';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? 'No pickup time set' : d.toLocaleString();
  };

  // Called when admin finishes editing the order in the modal
  async function handleSaveEdit(updatedData: any) {
    // updatedData might contain items, total, status, instructions, etc.
    await updateOrderData(updatedData.id, updatedData);
    setEditingOrder(null);
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {loading && <p>Loading orders...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <div className="flex flex-nowrap space-x-3 overflow-x-auto py-1">
          {(['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'] as const).map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`
                flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-md 
                ${
                  selectedStatus === status
                    ? 'bg-[#c1902f] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-6">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Order #{order.id}</h3>
                {order.createdAt && (
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
              <span
                className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${getStatusBadgeColor(order.status)}
                `}
              >
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>

            {/* Items */}
            <div className="border-t border-b py-4 mb-4">
              <h4 className="font-medium mb-2">Order Items:</h4>
              {order.items.map((item: any, index: number) => (
                <div key={index} className="mb-2">
                  <p className="font-medium">
                    {item.name} × {item.quantity}
                  </p>
                  {item.customizations &&
                    Object.entries(item.customizations).map(([gName, values]) => (
                      <p key={gName} className="text-sm text-gray-600">
                        {gName}: {(values as string[]).join(', ')}
                      </p>
                    ))}
                  {item.notes && (
                    <p className="text-sm text-gray-600">Notes: {item.notes}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Contact & pickup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Customer</h4>
                <p>{order.contact_name || 'Guest'}</p>
                <p>{order.contact_phone || ''}</p>
                <p>{order.contact_email || ''}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700">Pickup Time</h4>
                <p>{formatDate(order.estimatedPickupTime)}</p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700">Special Instructions</h4>
              <p>{order.special_instructions || 'None'}</p>
            </div>

            <div className="flex justify-between items-center">
              <p className="font-medium">
                Total: ${Number(order.total || 0).toFixed(2)}
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Edit button for admin => open the edit modal */}
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  onClick={() => setEditingOrder(order)}
                >
                  Edit
                </button>

                {order.status === 'pending' && (
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    onClick={() => {
                      setOrderToPrep(order);
                      setEtaMinutes(5);
                      setShowEtaModal(true);
                    }}
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                  >
                    Mark as Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                  >
                    Complete Order
                  </button>
                )}
                {(order.status === 'pending' || order.status === 'preparing') && (
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details modal */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={closeModal} />
      )}

      {/* “Set ETA” modal */}
      {showEtaModal && orderToPrep && (
        <SetEtaModal
          order={orderToPrep}
          etaMinutes={etaMinutes}
          setEtaMinutes={setEtaMinutes}
          onClose={() => {
            setShowEtaModal(false);
            setOrderToPrep(null);
          }}
          onConfirm={handleConfirmEta}
        />
      )}

      {/* “Edit Order” modal */}
      {editingOrder && (
        <AdminEditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

function OrderDetailsModal({
  order,
  onClose
}: {
  order: any;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md max-w-lg w-full p-6 relative">
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

        <h3 className="text-xl font-bold mb-4">Order #{order.id}</h3>
        <p className="text-sm text-gray-500 mb-4">
          Placed: {new Date(order.createdAt).toLocaleString()}
        </p>

        <p className="font-medium mb-2">Items:</p>
        {order.items.map((item: any, idx: number) => (
          <div key={idx} className="mb-2">
            <p>
              {item.name} × {item.quantity}
            </p>
            {item.notes && (
              <p className="text-sm text-gray-600">Notes: {item.notes}</p>
            )}
          </div>
        ))}

        <p className="font-medium mt-4">
          Total: ${Number(order.total || 0).toFixed(2)}
        </p>

        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-[#c1902f] text-white rounded hover:bg-[#d4a43f]"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * The “Set ETA” modal for pending->preparing
 */
function SetEtaModal({
  order,
  etaMinutes,
  setEtaMinutes,
  onClose,
  onConfirm,
}: {
  order: any;
  etaMinutes: number;
  setEtaMinutes: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const possibleEtas = Array.from({ length: 12 }, (_, i) => (i + 1) * 5);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md max-w-sm w-full p-6 relative">
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

        <h3 className="text-xl font-bold mb-4">Set ETA for Order #{order.id}</h3>
        <p className="text-sm text-gray-600 mb-4">
          How many minutes from now until this order should be ready?
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ETA (in minutes)
          </label>
          <select
            value={etaMinutes}
            onChange={(e) => setEtaMinutes(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            {possibleEtas.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * “Admin Edit Order” modal for adjusting items, total, instructions, etc.
 * This example is minimal. We just show a text area for JSON items, total, and status.
 * In a real app, you’d have a nicer UI for each item row, etc.
 */
function AdminEditOrderModal({
  order,
  onClose,
  onSave,
}: {
  order: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}) {
  // Local state for items, total, etc.
  const [localItems, setLocalItems] = useState(() => {
    // Make a shallow copy so we don’t mutate the original object
    return order.items ? [...order.items] : [];
  });
  const [localTotal, setLocalTotal] = useState<string>(String(order.total || '0'));
  const [localStatus, setLocalStatus] = useState(order.status);
  const [localInstructions, setLocalInstructions] = useState(order.special_instructions || '');

  // Handle changing a single item row
  function handleItemChange(index: number, field: string, value: string | number) {
    setLocalItems((prev) => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        [field]: field === 'price' ? parseFloat(String(value)) : value,
      };
      return newItems;
    });
  }

  // Remove one item row
  function handleRemoveItem(index: number) {
    setLocalItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Add a new blank item row
  function handleAddItem() {
    setLocalItems((prev) => [
      ...prev,
      {
        id: null,
        name: '',
        quantity: 1,
        price: 0.0,
        notes: '',
      },
    ]);
  }

  // Called by the “Save” button
  function handleSave() {
    // Convert total to a float
    const parsedTotal = parseFloat(localTotal) || 0.0;

    // Build our updated order data
    const updated = {
      ...order,
      items: localItems,
      total: parsedTotal,
      status: localStatus,
      special_instructions: localInstructions,
    };

    onSave(updated);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md max-w-2xl w-full p-6 relative space-y-6">
        {/* Close button (X) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="text-xl font-bold">Edit Order #{order.id}</h3>

        {/* ITEMS TABLE */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Items</h4>
          <table className="w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border-b text-left">Name</th>
                <th className="p-2 border-b text-left">Qty</th>
                <th className="p-2 border-b text-left">Price</th>
                <th className="p-2 border-b text-left">Notes</th>
                <th className="p-2 border-b"></th>
              </tr>
            </thead>
            <tbody>
              {localItems.map((item, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="p-2">
                    <input
                      type="text"
                      className="border w-full rounded px-2 py-1"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    />
                  </td>
                  <td className="p-2" style={{ width: '70px' }}>
                    <input
                      type="number"
                      className="border w-full rounded px-2 py-1"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10))}
                    />
                  </td>
                  <td className="p-2" style={{ width: '90px' }}>
                    <input
                      type="number"
                      className="border w-full rounded px-2 py-1"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="border w-full rounded px-2 py-1"
                      value={item.notes || ''}
                      onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            onClick={handleAddItem}
            className="mt-2 inline-block px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
          >
            + Add Item
          </button>
        </div>

        {/* TOTAL / STATUS / INSTRUCTIONS */}
        <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
            <input
              type="number"
              step="0.01"
              className="border border-gray-300 rounded px-3 py-2 w-full"
              value={localTotal}
              onChange={(e) => setLocalTotal(e.target.value)}
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="border border-gray-300 rounded px-3 py-2 w-full"
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value)}
            >
              {['pending', 'preparing', 'ready', 'completed', 'cancelled'].map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
          <textarea
            className="border border-gray-300 rounded px-3 py-2 w-full"
            rows={2}
            value={localInstructions}
            onChange={(e) => setLocalInstructions(e.target.value)}
          />
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#c1902f] text-white rounded-md hover:bg-[#d4a43f]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
