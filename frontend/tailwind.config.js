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
          red: '#D91A2A',       // Strong Flystar Red
          blue: '#0B2545',      // Deep Flystar Blue
          lightblue: '#134074',   // Bright accent blue
          navy: '#081F3E',       // Dark corporate background blue
          dark: '#051329',       // Deepest blue/black for headers
          green: '#10B981',     // Success checkmark green accent
          light: '#F8FAFC',     // Clean background slate/white
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
