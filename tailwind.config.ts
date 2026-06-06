import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: '#0A0A0F',
          surface: '#111118',
          border: '#222230',
          gold: '#F5A623',
          green: '#7ED321',
          purple: '#BD10E0',
          blue: '#4A90E2',
          red: '#E74C3C',
          teal: '#50E3C2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
