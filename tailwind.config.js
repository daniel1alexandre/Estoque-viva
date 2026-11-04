/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#38a4f6',
          500: '#0e85e6',
          600: '#0267c5',
          700: '#03529f',
          800: '#074683',
          900: '#0c3b6c',
        }
      }
    },
  },
  plugins: [],
}

