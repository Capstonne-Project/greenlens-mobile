/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:         '#139B40',
        'primary-light': '#E8F7ED',
        'primary-dark':  '#0D7A31',
      },
    },
  },
  plugins: [],
};
