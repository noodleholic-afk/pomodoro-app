/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', '"Noto Sans SC"', 'monospace'],
      },
      colors: {
        bg:    '#111320',
        card:  '#14172e',
        work:  '#cc4444',
        'work-lo':  '#3a1010',
        green: '#44ff88',
        blue:  '#88aaff',
        'short-break': '#44ff88',
        'long-break':  '#88aaff',
      },
    },
  },
  plugins: [],
}
