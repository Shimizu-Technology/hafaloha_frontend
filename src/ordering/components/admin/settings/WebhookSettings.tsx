import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

interface WebhookEndpoint {
  id: number;
  url: string;
  description: string;
  active: boolean;
  event_types: string[];
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

interface WebhookSettingsProps {
  restaurantId?: string;
}

export default function WebhookSettings({ restaurantId }: WebhookSettingsProps) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    description: '',
    event_types: [] as string[]
  });
  
  // Define available event types
  const EVENT_TYPES = [
    'order.created',
    'order.updated',
    'order.status_changed',
    'inventory.updated',
    'inventory.low_stock',
    'menu_item.updated',
    'restaurant.updated'
  ];
  
  // Load webhooks
  useEffect(() => {
    if (!restaurantId) return;
    
    const fetchWebhooks = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get(`/webhook_endpoints?restaurant_id=${restaurantId}`);
        setWebhooks(data as WebhookEndpoint[]);
      } catch (error) {
        console.error('Failed to load webhooks:', error);
        setError('Failed to load webhooks. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWebhooks();
  }, [restaurantId]);
  
  // Create webhook handler
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!restaurantId) {
      setError('Restaurant ID is required');
      return;
    }
    
    try {
      setError(null);
      const created = await api.post('/webhook_endpoints', {
        ...newWebhook,
        restaurant_id: restaurantId
      });
      
      setWebhooks([...webhooks, created as WebhookEndpoint]);
      setNewWebhook({ url: '', description: '', event_types: [] });
    } catch (error) {
      console.error('Failed to create webhook:', error);
      setError('Failed to create webhook. Please try again.');
    }
  };
  
  // Toggle webhook active status
  const toggleWebhookStatus = async (id: number, currentStatus: boolean) => {
    try {
      setError(null);
      await api.patch(`/webhook_endpoints/${id}`, {
        active: !currentStatus
      });
      
      setWebhooks(webhooks.map(webhook => 
        webhook.id === id 
          ? { ...webhook, active: !webhook.active } 
          : webhook
      ));
    } catch (error) {
      console.error('Failed to update webhook status:', error);
      setError('Failed to update webhook status. Please try again.');
    }
  };
  
  // Delete webhook
  const deleteWebhook = async (id: number) => {
    if (!confirm('Are you sure you want to delete this webhook endpoint?')) {
      return;
    }
    
    try {
      setError(null);
      await api.delete(`/webhook_endpoints/${id}`);
      setWebhooks(webhooks.filter(webhook => webhook.id !== id));
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      setError('Failed to delete webhook. Please try again.');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Webhook Endpoints</h2>
        <div className="text-sm text-gray-500">
          Webhooks allow external systems to receive real-time updates from Hafaloha.
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Webhook list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-md">
          {webhooks.length === 0 ? (
            <p className="p-4 text-gray-500">No webhooks configured</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {webhooks.map(webhook => (
                <li key={webhook.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">{webhook.description || webhook.url}</h3>
                      <p className="text-xs text-gray-500">{webhook.url}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {webhook.event_types.map(type => (
                          <span key={type} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleWebhookStatus(webhook.id, webhook.active)}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${
                          webhook.active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {webhook.active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* Add new webhook form */}
      <div className="bg-white shadow overflow-hidden rounded-md p-4">
        <h3 className="text-sm font-medium mb-4">Add New Webhook</h3>
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">URL</label>
            <input
              type="url"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newWebhook.url}
              onChange={e => setNewWebhook({...newWebhook, url: e.target.value})}
              placeholder="https://your-server.com/webhook"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700">Description</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newWebhook.description}
              onChange={e => setNewWebhook({...newWebhook, description: e.target.value})}
              placeholder="Optional description"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700">Event Types</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {EVENT_TYPES.map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded"
                    checked={newWebhook.event_types.includes(type)}
                    onChange={e => {
                      if (e.target.checked) {
                        setNewWebhook({
                          ...newWebhook, 
                          event_types: [...newWebhook.event_types, type]
                        });
                      } else {
                        setNewWebhook({
                          ...newWebhook,
                          event_types: newWebhook.event_types.filter(t => t !== type)
                        });
                      }
                    }}
                  />
                  <span className="ml-2 text-xs">{type}</span>
                </label>
              ))}
            </div>
          </div>
          
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Add Webhook
          </button>
        </form>
      </div>
    </div>
  );
}
