/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'body': ['Source Sans 3', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        'ink': {
          50: '#f8f7f4',
          100: '#efe9de',
          200: '#ddd4c0',
          300: '#c8b89a',
          400: '#b39a76',
          500: '#a58460',
          600: '#8f6d50',
          700: '#755644',
          800: '#61483b',
          900: '#523d34',
          950: '#2d1f1a',
        },
        'paper': {
          50: '#fdfcfa',
          100: '#faf8f3',
          200: '#f5f1e8',
          300: '#ebe4d5',
          400: '#ddd2bc',
          500: '#cdbda0',
        },
        'accent': {
          rust: '#c45c3e',
          teal: '#2a6b6b',
          gold: '#b8860b',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
