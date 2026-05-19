import type { Config } from 'tailwindcss';

export const planитPreset = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6B2D0E',
          hover: '#8B3A12',
          50: '#FCF7F4',
          100: '#F5E6DC',
          200: '#E8C9B0',
        },
        accent: {
          DEFAULT: '#E8620A',
          100: '#FDE8D0',
          600: '#C44E07',
          800: '#742E04',
        },
        surface: '#FFFFFF',
        bg: '#FAFAF9',
        'bg-warm': '#FCF7F4',
        border: '#E7E5E4',
        'border-soft': '#F0EDEB',
        divider: '#EFECEA',
        text: {
          DEFAULT: '#1C1917',
          sec: '#57534E',
          muted: '#78716C',
          faint: '#A8A29E',
        },
        ok: { DEFAULT: '#16A34A', 100: '#DCFCE7' },
        err: { DEFAULT: '#DC2626', 100: '#FEE2E2' },
        info: { DEFAULT: '#2563EB', 100: '#DBEAFE' },
        warn: { DEFAULT: '#FDE8D0', text: '#742E04' },
        event: {
          DEFAULT: '#7C3AED',
          100: '#EDE9FE',
          border: '#C4B5FD',
          text: '#5B21B6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
} satisfies Partial<Config>;
