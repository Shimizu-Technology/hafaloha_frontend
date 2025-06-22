import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd());
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    // Build optimizations
    build: {
      // Increase chunk size warning limit to 1MB (from default 500KB)
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Manual chunks for better code splitting
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@headlessui/react', 'lucide-react'],
            'chart-vendor': ['recharts'],
            'payment-vendor': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
            'util-vendor': ['axios', 'date-fns', 'zustand'],
            
            // Admin chunks - split by functionality
            'admin-dashboard': [
              './src/ordering/components/admin/AdminDashboard.tsx'
            ],
            'admin-orders': [
              './src/ordering/components/admin/OrderManager.tsx',
              './src/ordering/components/admin/StaffOrderModal.tsx',
              './src/ordering/components/admin/AdminEditOrderModal.tsx'
            ],
            'admin-menu': [
              './src/ordering/components/admin/MenuManager.tsx'
            ],
            'admin-staff': [
              './src/ordering/components/admin/StaffManagement.tsx'
            ],
            'admin-analytics': [
              './src/ordering/components/admin/AnalyticsManager.tsx'
            ],
            'admin-settings': [
              './src/ordering/components/admin/SettingsManager.tsx'
            ],
            
            // Shared chunks
            'shared-auth': [
              './src/shared/auth',
              './src/shared/components/auth'
            ],
            'shared-api': [
              './src/shared/api',
              './src/ordering/lib/api.ts'
            ]
          }
        }
      },
      // Enable minification for better compression
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true
        }
      }
    },
    // Explicitly define env variables
    define: {
      'import.meta.env.VITE_PUBLIC_POSTHOG_KEY': JSON.stringify(env.VITE_PUBLIC_POSTHOG_KEY),
      'import.meta.env.VITE_PUBLIC_POSTHOG_HOST': JSON.stringify(env.VITE_PUBLIC_POSTHOG_HOST),
    }
  };
});
