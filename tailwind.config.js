/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        work: '#DC2626',
        'short-break': '#059669',
        'long-break': '#2563EB',
      },
    },
  },
  plugins: [],
}
