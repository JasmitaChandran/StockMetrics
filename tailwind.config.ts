import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(var(--bg))',
        fg: 'hsl(var(--fg))',
        muted: 'hsl(var(--muted))',
        card: 'hsl(var(--card))',
        border: 'hsl(var(--border))',
        accent: 'hsl(var(--accent))',
        positive: 'hsl(var(--positive))',
        negative: 'hsl(var(--negative))',
        warning: 'hsl(var(--warning))',
      },
      boxShadow: {
        glow: '0 20px 40px -20px rgba(14, 165, 233, 0.45)',
        violet: '0 18px 48px -24px rgba(99, 102, 241, 0.5)',
        panel: '0 18px 60px -32px rgba(2, 6, 23, 0.7)',
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        float: 'float 6s ease-in-out infinite',
        pulseSoft: 'pulseSoft 4s ease-in-out infinite',
        driftSlow: 'driftSlow 16s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.04)' },
        },
        driftSlow: {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '33%': { transform: 'translate3d(10px,-6px,0)' },
          '66%': { transform: 'translate3d(-8px,8px,0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
