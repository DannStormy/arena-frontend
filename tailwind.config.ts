import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          bg:      '#0A0A0F',
          surface: '#14121C',
          elev:    '#1C1928',
          border:             '#1E1E24',
          'border-emphasis':  'rgba(255,255,255,0.14)',
          'border-focus':     'rgba(124,92,255,0.55)',

          // brand — purple, used with discipline
          purple:         '#7C5CFF',
          'purple-bright':  '#8E72FF',
          'purple-pressed': '#6A4DE0',

          // outcome — fixed, never purple
          win:   '#2DD4A7',
          loss:  '#FF4D5E',

          // aliases
          green: '#2DD4A7',
          red:   '#FF4D5E',

          gold: '#F5A623',

          // text scale
          'text-primary':   '#E8E8EE',
          'text-secondary': '#9A9AA6',
          'text-tertiary':  '#76767F',

          // neutral opponent identity
          'neutral-fill': '#26262F',
          'neutral-fg':   '#9A9AA6',

          // mode categorical — chips only
          mode: {
            trivia: '#4F9CF0',
            blitz:  '#F5B73D',
            sudden: '#FF7043',
            streak: '#E254A8',
            steal:  '#3FB6C9',
          },
        },
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'result-reveal': {
          '0%':   { transform: 'scale(0.88)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'ping-slow': {
          '0%':       { transform: 'scale(1)', opacity: '0.6' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'your-turn-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0px rgba(124,92,255,0.55)' },
          '50%':       { boxShadow: '0 0 0 6px rgba(124,92,255,0)'   },
        },
      },
      animation: {
        'slide-up':      'slide-up 0.25s ease-out',
        'result-reveal': 'result-reveal 0.18s ease-out',
        shimmer:         'shimmer 1.5s linear infinite',
        'ping-slow':     'ping-slow 2s cubic-bezier(0,0,0.2,1) infinite',
        'your-turn':     'your-turn-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
