// src/ordering/components/admin/settings/GeneralSettings.tsx

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { toast } from 'react-hot-toast';

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
    setLoading(true);
    try {
      const data = await api.get('/admin/site_settings');
      setSettings(data);
    } catch (err: any) {
      console.error('Failed to load site settings:', err);
      toast.error('Failed to load site settings');
    } finally {
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

      const updated = await api.upload('/admin/site_settings', 'PATCH', formData);
      setSettings(updated);
      toast.success('Site settings updated!');

      // Clear file inputs
      setHeroFile(null);
      setSpinnerFile(null);
    } catch (err: any) {
      console.error('Failed to update site settings:', err);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  }

  // If we’re still loading for the very first time:
  if (loading && !settings) {
    return <p className="text-gray-500 mt-4">Loading site settings...</p>;
  }

  return (
    <div className="mt-4">
      {settings && (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Optional intro text */}
          <p className="text-sm text-gray-600">
            Update the images displayed on your homepage’s hero section and
            the loading spinner. Using “object-contain” ensures the entire 
            image is shown without cropping.
          </p>

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
                  className="
                    mb-3 w-full max-h-48 
                    object-contain border rounded-md
                  "
                />
              ) : (
                <div className="
                  mb-3 w-full h-32 
                  flex items-center justify-center 
                  bg-gray-50 border border-dashed border-gray-300 
                  rounded-md
                ">
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
                  className="
                    mb-3 w-full max-h-48 
                    object-contain border rounded-md
                  "
                />
              ) : (
                <div className="
                  mb-3 w-full h-32
                  flex items-center justify-center
                  bg-gray-50 border border-dashed border-gray-300
                  rounded-md
                ">
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

          <div className="flex justify-end">
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
      )}
    </div>
  );
}
