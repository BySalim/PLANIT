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

  // ── Brand colors (source: Illustrator) ───────────────────
  // These two are the definitive PLANIT brand values.
  // PlanitLogo, globals.css @theme and every UI token that
  // derives from them must stay in sync with these constants.
  primary: '#593114', // PLANIT marron
  primaryHover: '#6F3E1E',
  primary50: '#FBF5F1',
  primary100: '#F0DDD0',
  primary200: '#D8B79A',

  accent: '#EE7023', // PLANIT orange
  accent100: '#FDE9D5',
  accent600: '#C85A16',
  accent800: '#743108',

  warn: '#FDE9D5',
  warnText: '#743108',

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
