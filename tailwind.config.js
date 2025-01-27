/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontSize: {
        base: '1.125rem', // ~18px
      },
      colors: {
        // Replace old “orange-600” usage with these
        'hafaloha-pink': '#eb578c',   // bright pink
        'hafaloha-teal': '#45c0b5',   // turquoise/teal
        'hafaloha-yellow': '#ffd84c', // tropical sunshine
        // And maybe a mild coral:
        'hafaloha-coral': '#ff7f6a',
        // ...
      },
    },
  },
  plugins: [],
};
