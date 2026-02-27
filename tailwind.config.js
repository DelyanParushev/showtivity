/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Showtivity dark theme palette
        bg: {
          primary: '#0f0f14',
          secondary: '#161620',
          card: '#1c1c28',
          elevated: '#242432',
        },
        accent: {
          primary: '#e50914',   // Netflix-style red
          secondary: '#b91c1c',
          muted: 'rgba(229,9,20,0.15)',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#475569',
        },
        status: {
          watching: '#3b82f6',
          running: '#10b981',
          watchlist: '#8b5cf6',
          waiting: '#f59e0b',
          ended: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
