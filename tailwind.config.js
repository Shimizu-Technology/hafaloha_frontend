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
    },
  },
  plugins: [],
};
