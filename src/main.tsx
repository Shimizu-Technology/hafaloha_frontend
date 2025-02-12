import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';

import './index.css';
import RootApp from './RootApp';

// Read from import.meta.env
const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
// If you have a custom API:
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;  // possibly undefined if not set

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        // Only add audience/scope if you do have a custom API in Auth0
        ...(audience ? { audience } : {}),
        // scope: 'read:orders write:orders' // optional if using custom API scopes
      }}
    >
      <RootApp />
    </Auth0Provider>
  </StrictMode>
);
