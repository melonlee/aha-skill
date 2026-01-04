/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0d0d0d',
          card: '#1a1a1a',
          border: '#2a2a2a',
        },
        accent: {
          orange: '#f97316',
          'orange-light': '#fb923c',
          green: '#22c55e',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
