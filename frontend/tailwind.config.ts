import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        arabic: ['Noto Sans Arabic', 'Tahoma', 'Arial'],
      },
      colors: {
        brand: {
          navy: '#0B1537', blue: '#2563EB', indigo: '#4F46E5', purple: '#7C3AED', cyan: '#06B6D4',
        },
      },
      boxShadow: {
        soft: '0 20px 55px rgba(42,62,114,.10)',
        card: '0 8px 24px rgba(42,62,114,.08)',
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
    },
  },
  plugins: [],
} satisfies Config;
