/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  "./*.html",
  "./*.js",
  "./products/**/*.html",
  "./brands/**/*.html",
  "./categories/**/*.html"
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#f5f7fb',
        secondary: '#ffffff',
        accent: '#2563eb',
        accentHover: '#1d4ed8',
        gold: '#f59e0b',
      }
    }
  },
  plugins: [],
}
