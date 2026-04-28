/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'Zpix', '"Noto Sans SC"', 'monospace'],
      },
      colors: {
        work: '#DC2626',
        'short-break': '#059669',
        'long-break': '#2563EB',
        dark: '#1a1a2e',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulse_glow: { '0%,100%': { textShadow: '0 0 8px rgba(255,255,255,0.6)' }, '50%': { textShadow: '0 0 24px rgba(255,255,255,1), 0 0 48px rgba(255,255,255,0.4)' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease forwards',
        pulse_glow: 'pulse_glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
