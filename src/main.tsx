// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';          // merged Tailwind + custom CSS
import RootApp from './RootApp';  // top-level router
import './shared/i18n/i18n'; // Import i18n configuration

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>
);
