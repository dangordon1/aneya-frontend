/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'clara-purple': '#351431',
        'clara-pink': '#F0D1DA',
        'clara-purple-hover': '#4A1E45',
        'clara-text-secondary': '#5C3E53',
        'clara-text-disabled': '#8B7A87',
      },
      fontFamily: {
        'serif': ['Georgia', 'serif'],
        'sans': ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
