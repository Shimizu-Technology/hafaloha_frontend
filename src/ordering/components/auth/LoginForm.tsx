// src/ordering/components/auth/LoginForm.tsx
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export function LoginForm() {
  const { loginWithRedirect, isLoading, error } = useAuth0();

  // You can show a spinner or some placeholder if isLoading is true
  if (isLoading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  // If there's an Auth0 error, you can display it
  // (Though typically Auth0 handles errors on the Universal Login screen.)
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
      <h2 className="text-2xl font-bold mb-6">Welcome Back!</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error.message}
        </div>
      )}

      <button
        onClick={() => loginWithRedirect()}
        className="w-full bg-[#c1902f] text-white py-2 px-4 rounded-md
                   hover:bg-[#d4a43f] transition-colors duration-200"
      >
        Sign In with Auth0
      </button>
    </div>
  );
}
