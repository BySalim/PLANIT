// PLANIT — icon set ported from PLANIT-IA/shared/icons.jsx
// Lucide-style stroke icons (24x24 viewBox) as named React components.
// Usage: import { CalendarIcon } from '@planit/ui';

// ── PLANIT brand colors (source: Illustrator) ──────────────────────────────
// Must stay in sync with packages/design-tokens/src/colors.ts (primary/accent)
// and apps/web/src/app/globals.css (--color-primary / --color-accent).
const BRAND_MARRON = '#593114'; // colors.primary
const BRAND_ORANGE = '#EE7023'; // colors.accent
// Derived shades used inside PlanitLogo only
const BRAND_MARRON_DARK = '#3A1D09'; // very dark, for cap shadow
const BRAND_MARRON_MID = '#6F3E1E'; // colors.primaryHover, body mid-tone
const BRAND_ORANGE_LIGHT = '#F0892B'; // gradient highlight on tassel ball
const BRAND_ORANGE_DARK = '#C85A16'; // colors.accent600
// ──────────────────────────────────────────────────────────────────────────

import { useId } from 'react';
import type { ReactNode } from 'react';

export interface IconProps {
  /** Square pixel size. Defaults to the icon's original prototype size. */
  size?: number;
  /** Stroke color. Defaults to `currentColor` so it inherits text color. */
  color?: string;
}

interface StrokeIconProps extends IconProps {
  defaultSize: number;
  strokeWidth?: string;
  children: ReactNode;
}

function StrokeIcon({
  size,
  defaultSize,
  color = 'currentColor',
  strokeWidth = '2',
  children,
}: StrokeIconProps) {
  return (
    <svg
      width={size ?? defaultSize}
      height={size ?? defaultSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={22}>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M22 8l-6 4 6 4z" />
    </StrokeIcon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={22}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
    </StrokeIcon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={22}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </StrokeIcon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={22}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </StrokeIcon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={22}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </StrokeIcon>
  );
}

export function UserSmallIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={14}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </StrokeIcon>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={14}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </StrokeIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={16} strokeWidth="2.5">
      <polyline points="9 6 15 12 9 18" />
    </StrokeIcon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={16} strokeWidth="2.5">
      <polyline points="15 6 9 12 15 18" />
    </StrokeIcon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </StrokeIcon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </StrokeIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </StrokeIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </StrokeIcon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </StrokeIcon>
  );
}

export function BookOpenIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={18}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </StrokeIcon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={18}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </StrokeIcon>
  );
}

export function BarChartIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={22}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </StrokeIcon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </StrokeIcon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </StrokeIcon>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={20}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z" />
    </StrokeIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <StrokeIcon {...props} defaultSize={18}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </StrokeIcon>
  );
}

export interface PlanitLogoProps {
  /** Square pixel size of the logo. */
  size?: number;
}

/** PLANIT brand logo (calendar + graduation cap), ported from the prototype. */
export function PlanitLogo({ size = 34 }: PlanitLogoProps) {
  const id = useId();
  const og = `${id}-og`;
  const cap = `${id}-cap`;
  const brd = `${id}-brd`;
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Orange gradient — tassel ball + accent cells */}
        <linearGradient id={og} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={BRAND_ORANGE_LIGHT} />
          <stop offset="100%" stopColor={BRAND_ORANGE_DARK} />
        </linearGradient>
        {/* Cap gradient — graduation cap body */}
        <linearGradient id={cap} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={BRAND_MARRON_MID} />
          <stop offset="100%" stopColor={BRAND_MARRON_DARK} />
        </linearGradient>
        {/* Brim gradient — cap brim */}
        <linearGradient id={brd} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={BRAND_MARRON_MID} />
          <stop offset="100%" stopColor={BRAND_MARRON} />
        </linearGradient>
      </defs>
      {/* Calendar body */}
      <rect x="4" y="24" width="70" height="78" rx="14" fill={BRAND_MARRON} />
      {/* Calendar pegs */}
      <rect x="18" y="12" width="13" height="26" rx="6.5" fill={BRAND_MARRON} />
      <rect x="46" y="12" width="13" height="22" rx="6.5" fill={BRAND_MARRON} />
      {/* Calendar white area */}
      <rect x="11" y="48" width="56" height="47" rx="9" fill="white" />
      {/* Calendar cells — row 1 */}
      <rect x="15" y="53" width="15" height="15" rx="3.5" fill={BRAND_MARRON} />
      <rect x="34" y="53" width="15" height="15" rx="3.5" fill={BRAND_MARRON} />
      <rect x="53" y="53" width="11" height="15" rx="3.5" fill={`url(#${og})`} />
      {/* Calendar cells — row 2 */}
      <rect x="15" y="72" width="15" height="14" rx="3.5" fill={BRAND_MARRON} />
      <rect x="34" y="72" width="15" height="14" rx="3.5" fill={BRAND_MARRON} />
      <rect x="53" y="72" width="11" height="14" rx="3.5" fill={BRAND_MARRON} />
      {/* Graduation cap */}
      <rect x="50" y="33" width="53" height="20" rx="5" fill={`url(#${cap})`} />
      <polygon points="44,26 98,12 102,24 48,38" fill={`url(#${brd})`} />
      <polygon points="44,22 98,8 98,12 44,26" fill={BRAND_ORANGE_DARK} />
      {/* Tassel */}
      <circle cx="85" cy="17" r="5.5" fill={`url(#${og})`} />
      <path
        d="M90.5 17 Q100 34 98 62"
        stroke={BRAND_ORANGE}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="98" cy="66" rx="6" ry="9" fill={`url(#${og})`} />
      <rect x="94" y="64" width="8" height="4" rx="2" fill={BRAND_ORANGE_LIGHT} />
    </svg>
  );
}
