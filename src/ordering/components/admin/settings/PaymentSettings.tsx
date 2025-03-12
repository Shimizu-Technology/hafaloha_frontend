import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../../shared/api/apiClient';
import { LoadingSpinner, SettingsHeader } from '../../../../shared/components/ui';
import { CreditCard } from 'lucide-react';

// Simple Switch component since @headlessui/react might not be available
const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}> = ({ checked, onChange, className, children }) => {
  return (
    <button
      type="button"
      className={`${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      } relative inline-flex h-6 w-11 items-center rounded-full ${className || ''}`}
      onClick={() => onChange(!checked)}
    >
      {children}
      <span
        className={`${
          checked ? 'translate-x-6' : 'translate-x-1'
        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
      />
    </button>
  );
};

interface PaymentSettings {
  test_mode: boolean;
  client_id: string;
  client_secret: string;
  environment: 'sandbox' | 'production';
}

export function PaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({
    test_mode: true,
    client_id: '',
    client_secret: '',
    environment: 'sandbox'
  });

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const response: any = await api.get('/admin/settings');
        
        // Extract payment gateway settings from admin_settings
        const paymentGateway = response.admin_settings?.payment_gateway || {};
        
        setSettings({
          test_mode: paymentGateway.test_mode !== false, // Default to true if not set
          client_id: paymentGateway.client_id || '',
          client_secret: paymentGateway.client_secret || '',
          environment: paymentGateway.environment || 'sandbox'
        });
      } catch (error) {
        console.error('Failed to fetch payment settings:', error);
        toast.error('Failed to load payment settings');
      } finally {
        setLoading(false);
      }
    }
    
    fetchSettings();
  }, []);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle test mode toggle
  const handleTestModeToggle = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      test_mode: enabled
    }));
  };

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Get current admin settings first
      const currentSettings: any = await api.get('/admin/settings');
      
      // Create the payload with the updated payment gateway settings
      // The 'restaurant' property is required by the backend controller
      const payload = {
        restaurant: {
          admin_settings: {
            // Preserve existing admin settings
            ...(currentSettings.admin_settings || {}),
            // Update payment gateway settings
            payment_gateway: {
              test_mode: settings.test_mode,
              client_id: settings.client_id,
              client_secret: settings.client_secret,
              environment: settings.environment
            }
          }
        }
      };
      
      await api.patch('/admin/settings', payload);
      toast.success('Payment settings saved successfully');
    } catch (error) {
      console.error('Failed to save payment settings:', error);
      toast.error('Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <SettingsHeader 
          title="Payment Gateway Settings"
          description="Configure your payment processing settings."
          icon={<CreditCard className="h-6 w-6" />}
        />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        {/* Test Mode Description */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">Test Mode</h3>
            <p className="text-sm text-gray-500">
              Enable test mode to allow orders without payment processing
            </p>
          </div>
          <Switch 
            checked={settings.test_mode}
            onChange={handleTestModeToggle}
            className={`${
              settings.test_mode ? 'bg-blue-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span className="sr-only">Enable test mode</span>
          </Switch>
        </div>
      </div>
      
      {/* PayPal Credentials */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-4">PayPal Credentials</h3>
        
        <div className="space-y-4">
          {/* Environment Selection */}
          <div>
            <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-1">
              Environment
            </label>
            <select
              id="environment"
              name="environment"
              value={settings.environment}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production (Live)</option>
            </select>
          </div>
          
          {/* Client ID */}
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
              Client ID
            </label>
            <input
              type="text"
              id="client_id"
              name="client_id"
              value={settings.client_id}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your PayPal Client ID"
            />
          </div>
          
          {/* Client Secret */}
          <div>
            <label htmlFor="client_secret" className="block text-sm font-medium text-gray-700 mb-1">
              Client Secret
            </label>
            <input
              type="password"
              id="client_secret"
              name="client_secret"
              value={settings.client_secret}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your PayPal Client Secret"
            />
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>How to get PayPal credentials:</strong>
          </p>
          <ol className="text-sm text-blue-700 list-decimal pl-5 mt-2">
            <li>Go to <a href="https://developer.paypal.com/dashboard/" target="_blank" rel="noopener noreferrer" className="underline">PayPal Developer Dashboard</a></li>
            <li>Log in with your PayPal Business account</li>
            <li>Navigate to "My Apps & Credentials"</li>
            <li>Create a new REST API app or select an existing one</li>
            <li>Copy the Client ID and Secret from the app credentials</li>
            <li>Make sure "Advanced (Expanded) Credit and Debit Card Payments" is enabled</li>
          </ol>
        </div>
      </div>
      
      {/* Test Mode Warning */}
      {settings.test_mode && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-700">
            <strong>Test Mode is enabled.</strong> Orders will be created without actual payment processing.
            This is useful for testing the ordering flow without real payments.
          </p>
        </div>
      )}
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="inline-block mr-2">
                <LoadingSpinner showText={false} className="h-4 w-4" />
              </span>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}
