/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
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
          navy: 'rgb(var(--panel) / <alpha-value>)',
          navyLight: 'rgb(var(--panel2) / <alpha-value>)',
          blue: '#2E6BFF',
          blueLight: '#3B82F6',
          goldDeep: '#B45309',
        },
        /* semantic theme tokens (defined in index.css :root / html.light) */
        heading: 'rgb(var(--heading) / <alpha-value>)',
        body: 'rgb(var(--body) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        dim: 'rgb(var(--dim) / <alpha-value>)',
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        panel2: 'rgb(var(--panel2) / <alpha-value>)',
        canvas: 'rgb(var(--bg) / <alpha-value>)',
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
        'gradient-card': 'linear-gradient(160deg, rgb(var(--overlay) / 0.06) 0%, rgb(var(--overlay) / 0.02) 100%)',
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
