export const colors = {
  bg: '#FAFAF9',
  bgWarm: '#FCF7F4',
  surface: '#FFFFFF',
  border: '#E7E5E4',
  borderSoft: '#F0EDEB',
  divider: '#EFECEA',

  text: '#1C1917',
  textSec: '#57534E',
  textMuted: '#78716C',
  textFaint: '#A8A29E',

  primary: '#6B2D0E',
  primaryHover: '#8B3A12',
  primary50: '#FCF7F4',
  primary100: '#F5E6DC',
  primary200: '#E8C9B0',

  accent: '#E8620A',
  accent100: '#FDE8D0',
  accent600: '#C44E07',
  accent800: '#742E04',

  warn: '#FDE8D0',
  warnText: '#742E04',

  ok: '#16A34A',
  ok100: '#DCFCE7',

  err: '#DC2626',
  err100: '#FEE2E2',

  info: '#2563EB',
  info100: '#DBEAFE',

  event: '#7C3AED',
  event100: '#EDE9FE',
  eventBorder: '#C4B5FD',
  eventText: '#5B21B6',
} as const;

export type ColorToken = keyof typeof colors;
