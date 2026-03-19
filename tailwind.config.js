/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary neon blue from logo
        neon: {
          DEFAULT: '#0EA5E9',
          light: '#38BDF8',
          glow: '#7DD3FC',
        },
        // Navy dark from logo
        navy: {
          DEFAULT: '#0F2B5B',
          dark: '#0A1F42',
          light: '#1E3A8A',
        },
        // Background colors
        sky: {
          soft: '#F0F6FF',
          muted: '#E8F1FD',
        },
        // Text colors
        slate: {
          muted: '#64748B',
        }
      },
    },
  },
  plugins: [],
};
