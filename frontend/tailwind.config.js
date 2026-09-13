/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0E1116',
        surface: '#171B22',
        surface2: '#1D222B',
        border: '#262B34',
        trust: '#2DD4BF',
        risk: '#F5A623',
        connection: '#8B5CF6',
        danger: '#F87171',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
      keyframes: {
        fadeSlideUp: {
          '0%': { opacity: 0, transform: 'translateY(14px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        driftSlow: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(30px, -20px) scale(1.08)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 0.35 },
          '50%': { opacity: 0.7 },
        },
      },
      animation: {
        fadeSlideUp: 'fadeSlideUp 0.6s ease forwards',
        driftSlow: 'driftSlow 10s ease-in-out infinite',
        driftSlower: 'driftSlow 14s ease-in-out infinite',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}