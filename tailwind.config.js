/** @type {import('tailwindcss').Config} */
export default {
  prefix: 'plm-',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      colors: {
        cream: '#FAF8F5',
        charcoal: '#1A1A1A',
        'charcoal-light': '#2D2D2D',
        warm: {
          50: '#FDFCFB',
          100: '#FAF8F5',
          200: '#F0EDE8',
          300: '#E0DCD5',
          400: '#C4BFB6',
          500: '#9E9A93',
          600: '#6B6760',
          700: '#4A4640',
          800: '#2D2A26',
          900: '#1A1A1A',
        },
      },
    },
  },
  plugins: [],
}
