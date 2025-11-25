/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aneya-navy': '#0c3555',
        'aneya-teal': '#1d9e99',
        'aneya-seagreen': '#409f88',
        'aneya-cream': '#f6f5ee',
        'aneya-navy-hover': '#0a2a42',
        'aneya-text-secondary': '#517a9a',
        'aneya-text-disabled': '#8fa9be',
        'aneya-soft-pink': '#F0D1DA',
        'aneya-warning-bg': '#FFF9E6',
      },
      fontFamily: {
        'serif': ['Georgia', 'serif'],
        'sans': ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
