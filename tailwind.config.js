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
        'card-flip': {
          '0%': { transform: 'rotateY(180deg) scale(0.8)', opacity: '0' },
          '60%': { transform: 'rotateY(0deg) scale(1.05)', opacity: '1' },
          '100%': { transform: 'rotateY(0deg) scale(1)', opacity: '1' },
        },
        'card-shine': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pack-shake': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '10%': { transform: 'rotate(-3deg)' },
          '20%': { transform: 'rotate(3deg)' },
          '30%': { transform: 'rotate(-3deg)' },
          '40%': { transform: 'rotate(3deg)' },
          '50%': { transform: 'rotate(-2deg)' },
          '60%': { transform: 'rotate(2deg)' },
          '70%': { transform: 'rotate(-1deg)' },
          '80%': { transform: 'rotate(1deg)' },
          '90%': { transform: 'rotate(0deg)' },
        },
        'pack-burst': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.8' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
        'card-enter': {
          '0%': { transform: 'translateY(100%) scale(0.5)', opacity: '0' },
          '70%': { transform: 'translateY(-5%) scale(1.02)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'shimmer': {
          '0%': { left: '-100%' },
          '100%': { left: '200%' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'card-flip': 'card-flip 0.6s ease-out forwards',
        'card-shine': 'card-shine 2s linear infinite',
        'pack-shake': 'pack-shake 0.8s ease-in-out',
        'pack-burst': 'pack-burst 0.4s ease-out forwards',
        'card-enter': 'card-enter 0.5s ease-out forwards',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
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
