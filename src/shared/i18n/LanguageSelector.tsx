import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Language options with flags
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' }
];

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    // Save preference to localStorage
    localStorage.setItem('i18nextLng', languageCode);
    // Close dropdown after selection
    setIsOpen(false);
  };

  // Get current language display name
  const getCurrentLanguageName = () => {
    if (i18n.language === 'en' || i18n.language.startsWith('en-')) return 'english';
    if (i18n.language === 'ja' || i18n.language.startsWith('ja-')) return 'japanese';
    if (i18n.language === 'ko' || i18n.language.startsWith('ko-')) return 'korean';
    return 'english'; // Default to English
  };

  return (
    <div className="language-selector flex items-center space-x-2">
      <div className="relative inline-block text-left">
        <div>
          <button
            type="button"
            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c1902f]"
            id="language-menu"
            aria-expanded={isOpen}
            aria-haspopup="true"
            onClick={() => setIsOpen(!isOpen)}
          >
            {languages.find(lang => lang.code === i18n.language)?.flag || '🌐'} 
            <span className="ml-1">{t(`language.${getCurrentLanguageName()}`)}</span>
            <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {isOpen && (
          <div 
            className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
            role="menu" 
            aria-orientation="vertical" 
            aria-labelledby="language-menu"
          >
            <div className="py-1" role="none">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={`
                    block w-full text-left px-4 py-2 text-sm
                    ${i18n.language === language.code 
                      ? 'bg-gray-100 text-gray-900 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'}
                  `}
                  role="menuitem"
                >
                  <span className="mr-2">{language.flag}</span>
                  {language.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LanguageSelector;
