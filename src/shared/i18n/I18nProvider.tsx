import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  // Initialize i18n
  useEffect(() => {
    // This is where we could add any additional i18n initialization if needed
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default I18nProvider;
