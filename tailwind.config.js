// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Pacifico', 'cursive'],
      },
      fontSize: {
        base: '1.125rem', // ~18px
      },
      colors: {
        // Keep or rename these as needed:
        'hafaloha-pink': '#eb578c',
        'hafaloha-teal': '#45c0b5',
        'hafaloha-yellow': '#ffd84c',
        'hafaloha-coral': '#ff7f6a',

        // The gold you use in ordering:
        'hafaloha-gold': '#c1902f',
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'shimmer': 'shimmer 2s infinite linear',
        'slideUp': 'slideUp 0.3s ease-out',
        'slideDown': 'slideDown 0.3s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      transitionDuration: {
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
      },
    },
  },
  plugins: [],
};
