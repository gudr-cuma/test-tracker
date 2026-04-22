/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'fv-blue': { DEFAULT: '#B1DCE2', light: '#E3F2F5' },
        'fv-green': { DEFAULT: '#31B700', dark: '#268E00', light: '#E8F5E0' },
        'fv-orange': { DEFAULT: '#FF8200', dark: '#E57300', light: '#FFF3E0' },
        'fv-lime': { DEFAULT: '#93C90E', light: '#F0F7D4' },
        'fv-forest': '#00965E',
        'fv-red': '#E53935',
        'fv-text': { DEFAULT: '#1A202C', secondary: '#718096' },
        'fv-bg': { DEFAULT: '#FFFFFF', secondary: '#F8FAFB' },
        'fv-border': '#E2E8F0',
        status: {
          todo: '#718096',
          running: '#FF8200',
          done: '#31B700',
          bug: '#E53935',
          paused: '#B1DCE2',
          closed: '#00965E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
