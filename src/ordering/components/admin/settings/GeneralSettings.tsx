// src/ordering/components/admin/settings/GeneralSettings.tsx

import React, { useEffect, useState } from 'react';
import { api } from '../../../../shared/api';
import { toast } from 'react-hot-toast';
import AllowedOriginsSettings from './AllowedOriginsSettings';
import { LoadingSpinner } from '../../../../shared/components/ui';

interface SiteSettings {
  id: number;
  hero_image_url: string | null;
  spinner_image_url: string | null;
}

export function GeneralSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [spinnerFile, setSpinnerFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  async function fetchSiteSettings() {
    // Set up a timer to show loading state only if the request takes longer than 500ms
    const loadingTimer = setTimeout(() => {
      setLoading(true);
    }, 500);
    
    try {
      const data = await api.get<SiteSettings>('/admin/site_settings');
      setSettings(data);
    } catch (err: any) {
      console.error('Failed to load site settings:', err);
      toast.error('Failed to load site settings');
    } finally {
      // Clear the timer and set loading to false
      clearTimeout(loadingTimer);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    // If no new files, do nothing
    if (!heroFile && !spinnerFile) {
      toast('No new images selected; nothing to update.', { icon: 'ℹ️' });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (heroFile)    formData.append('hero_image', heroFile);
      if (spinnerFile) formData.append('spinner_image', spinnerFile);

      // Create a loading overlay element
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      
      // Create the spinner container
      const spinnerContainer = document.createElement('div');
      spinnerContainer.className = 'bg-gray-800 p-4 rounded flex flex-col items-center justify-center';
      
      // Create the spinner image container
      const spinnerImageContainer = document.createElement('div');
      spinnerImageContainer.className = 'bg-white p-2 rounded mb-2';
      
      // Create the spinner image
      const spinnerImage = document.createElement('img');
      spinnerImage.src = settings.spinner_image_url || '/hafaloha-logo-white-bg.png';
      spinnerImage.alt = 'Loading...';
      spinnerImage.className = 'h-16 w-16 animate-spin object-contain';
      
      // Create the loading text
      const loadingText = document.createElement('p');
      loadingText.className = 'text-white font-medium';
      loadingText.textContent = 'Loading...';
      
      // Assemble the elements
      spinnerImageContainer.appendChild(spinnerImage);
      spinnerContainer.appendChild(spinnerImageContainer);
      spinnerContainer.appendChild(loadingText);
      loadingOverlay.appendChild(spinnerContainer);
      
      // Add to the document
      document.body.appendChild(loadingOverlay);

      const updated = await api.upload<SiteSettings>('/admin/site_settings', formData, 'PATCH');
      setSettings(updated);
      toast.success('Site settings updated!');

      // Clear file inputs
      setHeroFile(null);
      setSpinnerFile(null);
      
      // Update the site settings store to reflect the new spinner image
      // This will ensure the LoadingSpinner component uses the new image
      const siteSettingsStore = await import('../../../../shared/store/siteSettingsStore');
      siteSettingsStore.useSiteSettingsStore.getState().fetchSiteSettings();
      
      // Remove the loading overlay
      document.body.removeChild(loadingOverlay);
    } catch (err: any) {
      console.error('Failed to update site settings:', err);
      toast.error('Failed to update settings');
      
      // Remove the loading overlay in case of error
      const errorOverlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50.flex.items-center.justify-center.z-50');
      if (errorOverlay && errorOverlay.parentNode) {
        errorOverlay.parentNode.removeChild(errorOverlay);
      }
    } finally {
      setLoading(false);
    }
  }

  // If we're still loading for the very first time:
  if (loading && !settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  return (
    <div className="mt-4">
      {settings && (
        <div>
          <p className="text-sm text-gray-600 mb-6">
            Update the images displayed on your homepage's hero section and
            the loading spinner.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 pb-2 border-b border-gray-200">Brand Images</h3>
              
              {/* Grid for Hero & Spinner cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* HERO IMAGE CARD */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col">
                  <h4 className="text-base font-semibold mb-4 text-gray-800">
                    Hero Image
                  </h4>

                  {settings.hero_image_url ? (
                    <img
                      src={settings.hero_image_url}
                      alt="Current Hero"
                      className="mb-3 w-full max-h-48 object-contain border rounded-md"
                    />
                  ) : (
                    <div className="mb-3 w-full h-32 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-md">
                      <p className="text-sm text-gray-500">No hero image set yet</p>
                    </div>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Choose a new file:
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
                      className="mt-1 block w-full cursor-pointer text-sm
                                file:mr-4 file:py-2 file:px-4
                                file:rounded file:border-0
                                file:text-sm file:font-semibold
                                file:bg-[#c1902f] file:text-white
                                hover:file:bg-[#d4a43f]"
                    />
                  </label>
                </div>

                {/* SPINNER IMAGE CARD */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col">
                  <h4 className="text-base font-semibold mb-4 text-gray-800">
                    Spinner Image
                  </h4>

                  {settings.spinner_image_url ? (
                    <img
                      src={settings.spinner_image_url}
                      alt="Current Spinner"
                      className="mb-3 w-full max-h-48 object-contain border rounded-md"
                    />
                  ) : (
                    <div className="mb-3 w-full h-32 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-md">
                      <p className="text-sm text-gray-500">No spinner image set yet</p>
                    </div>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Choose a new file:
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSpinnerFile(e.target.files?.[0] || null)}
                      className="mt-1 block w-full cursor-pointer text-sm
                                file:mr-4 file:py-2 file:px-4
                                file:rounded file:border-0
                                file:text-sm file:font-semibold
                                file:bg-[#c1902f] file:text-white
                                hover:file:bg-[#d4a43f]"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-5 py-2
                          bg-[#c1902f] text-white font-medium 
                          rounded-md hover:bg-[#d4a43f]
                          focus:outline-none focus:ring-2 focus:ring-[#c1902f]
                          transition-colors"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
          
          {/* CORS Configuration Section - Hidden for now */}
          {/* 
          <div className="border-t pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">CORS Configuration</h3>
            <AllowedOriginsSettings 
              onSaved={() => toast.success('Allowed origins updated successfully')}
            />
          </div>
          */}
        </div>
      )}
    </div>
  );
}
