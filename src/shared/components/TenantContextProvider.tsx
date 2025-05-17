// src/shared/components/TenantContextProvider.tsx
import { ReactNode } from 'react';
import { useTenantInitialization } from '../hooks/useTenantInitialization';

interface TenantContextProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes tenant context for the entire application
 * This should be placed high in the component tree, ideally at the app root level
 */
export default function TenantContextProvider({ children }: TenantContextProviderProps) {
  const { error } = useTenantInitialization();

  if (error) {
    // You can customize this error UI as needed
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="p-6 max-w-md bg-white rounded-lg shadow-lg border border-red-200">
          <div className="flex items-center mb-4">
            <div className="text-red-500 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Restaurant Not Found</h2>
          </div>
          <p className="text-gray-700 mb-4">
            We're unable to connect to the restaurant. This could be due to:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-4">
            <li>An incorrect restaurant ID in the URL</li>
            <li>The restaurant being temporarily unavailable</li>
            <li>Your session has expired</li>
          </ul>
          <p className="text-gray-700">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
