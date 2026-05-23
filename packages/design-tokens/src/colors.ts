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

  // ── Brand colors (source: PLANIT-IA/shared/tokens.js) ────
  // These two are the definitive PLANIT brand values.
  // PlanitLogo, globals.css @theme and every UI token that
  // derives from them must stay in sync with these constants.
  primary: '#6B2D0E', // PLANIT marron
  primaryHover: '#8B3A12',
  primary50: '#FCF7F4',
  primary100: '#F5E6DC',
  primary200: '#E8C9B0',

  accent: '#E8620A', // PLANIT orange
  accent100: '#FDE8D0',
  accent600: '#C44E07',
  accent800: '#742E04',

  warn: '#FDE8D0',
  warnText: '#742E04',

  // ── Sidebar dark theme (source: PLANIT-IA/rp/shared/tokens-ext.js) ──
  sbDark: '#2A1C12',
  sbDark2: '#3A2A1E',
  sbDarkText: '#F5E6DC',
  sbDarkMuted: 'rgba(245, 230, 220, 0.55)',

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
