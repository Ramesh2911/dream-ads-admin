/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#07080C',
          900: '#0A0B10',
          850: '#0E1017',
          800: '#12141C',
          700: '#1A1D27',
          600: '#242836',
        },
        accent: {
          gold: '#FFD86F',
          goldDark: '#F7A83E',
          violet: '#7C5CFF',
          blue: '#4F8CFF',
          green: '#34D399',
          red: '#F87171',
          pink: '#F472B6',
        },
        brand: {
          navy: '#050B1F',
          navyLight: '#0A1540',
          blue: '#2E6BFF',
          blueLight: '#3B82F6',
          goldDeep: '#B45309',
        },
      },
      fontFamily: {
        display: ['"Segoe UI"', 'system-ui', 'sans-serif'],
        sans: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(124, 92, 255, 0.25)',
        'glow-gold': '0 0 24px rgba(255, 216, 111, 0.2)',
        'glow-goldStrong': '0 0 48px rgba(255, 216, 111, 0.35), 0 0 120px rgba(46, 107, 255, 0.25)',
        'glow-blueSoft': '0 0 40px rgba(46, 107, 255, 0.3)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-violet': 'linear-gradient(135deg, #7C5CFF 0%, #4F8CFF 100%)',
        'gradient-gold': 'linear-gradient(135deg, #FFD86F 0%, #F7A83E 100%)',
        'gradient-card': 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.35s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        float: 'float 6s ease-in-out infinite',
        sweep: 'sweep 3.2s ease-in-out infinite',
        'spin-slow': 'spin 14s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(-1.5deg)' },
          '50%': { transform: 'translateY(-14px) rotate(1.5deg)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)', opacity: '0' },
          '25%': { opacity: '0.9' },
          '60%': { opacity: '0.9' },
          '100%': { transform: 'translateX(220%) skewX(-18deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
