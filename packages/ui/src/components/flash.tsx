'use client';

import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { colors, spacing } from '@planit/design-tokens';

// ─────────────────────────────────────────────────────────────────────
// <Flash> — global feedback messages (V2-D12)
// ─────────────────────────────────────────────────────────────────────
// Stack at the bottom-right. Three variants:
//   - success → auto-dismiss after 4 s
//   - warning → auto-dismiss after 6 s
//   - error   → sticky (click to dismiss)
//
// Usage:
//   <FlashProvider>
//     <App />
//   </FlashProvider>
//
//   function MyComponent() {
//     const { push } = useFlash();
//     push('success', '2 séances créées');
//   }
//
// Replaces / extends <ToastUpdate> (V01). The migration from ToastUpdate to
// Flash happens in LOT 3 I.7 ; both coexist until then.

export type FlashVariant = 'success' | 'error' | 'warning';

export interface FlashMessage {
  id: string;
  variant: FlashVariant;
  message: string;
}

const AUTO_DISMISS_MS: Record<FlashVariant, number | null> = {
  success: 4_000,
  warning: 6_000,
  error: null, // sticky
};

// ── Reducer (pure, exported for tests) ───────────────────────────────

type FlashAction =
  | { kind: 'push'; payload: FlashMessage }
  | { kind: 'dismiss'; id: string }
  | { kind: 'clear' };

export function flashReducer(state: FlashMessage[], action: FlashAction): FlashMessage[] {
  switch (action.kind) {
    case 'push':
      return [...state, action.payload];
    case 'dismiss':
      return state.filter((flash) => flash.id !== action.id);
    case 'clear':
      return [];
    default:
      return state;
  }
}

// ── Context + hook ───────────────────────────────────────────────────

interface FlashApi {
  push: (variant: FlashVariant, message: string) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const FlashContext = createContext<FlashApi | null>(null);

export function useFlash(): FlashApi {
  const ctx = useContext(FlashContext);
  if (!ctx) {
    throw new Error('useFlash must be used inside a <FlashProvider>');
  }
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────

export function FlashProvider({ children }: { children: ReactNode }): ReactElement {
  const [stack, dispatch] = useReducer(flashReducer, []);

  const push = useCallback((variant: FlashVariant, message: string) => {
    const id = `flash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    dispatch({ kind: 'push', payload: { id, variant, message } });
  }, []);

  const dismiss = useCallback((id: string) => {
    dispatch({ kind: 'dismiss', id });
  }, []);

  const clear = useCallback(() => {
    dispatch({ kind: 'clear' });
  }, []);

  return (
    <FlashContext.Provider value={{ push, dismiss, clear }}>
      {children}
      <FlashStack flashes={stack} onDismiss={dismiss} />
    </FlashContext.Provider>
  );
}

// ── Visual layer ─────────────────────────────────────────────────────

function FlashStack({
  flashes,
  onDismiss,
}: {
  flashes: FlashMessage[];
  onDismiss: (id: string) => void;
}): ReactElement {
  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: spacing[6] ?? '24px',
        right: spacing[6] ?? '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[2] ?? '8px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {flashes.map((flash) => (
        <FlashItem key={flash.id} flash={flash} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function FlashItem({
  flash,
  onDismiss,
}: {
  flash: FlashMessage;
  onDismiss: (id: string) => void;
}): ReactElement {
  useEffect(() => {
    const ms = AUTO_DISMISS_MS[flash.variant];
    if (ms === null) return undefined;
    const timer = setTimeout(() => onDismiss(flash.id), ms);
    return () => clearTimeout(timer);
  }, [flash.id, flash.variant, onDismiss]);

  const palette = palettes[flash.variant];

  return (
    <div
      role={flash.variant === 'error' ? 'alert' : 'status'}
      onClick={() => onDismiss(flash.id)}
      style={{
        pointerEvents: 'auto',
        minWidth: 240,
        maxWidth: 360,
        padding: `${spacing[3] ?? '12px'} ${spacing[4] ?? '16px'}`,
        borderRadius: 8,
        backgroundColor: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
        cursor: 'pointer',
        font: '14px/1.4 system-ui, sans-serif',
      }}
    >
      {flash.message}
    </div>
  );
}

interface FlashPalette {
  bg: string;
  fg: string;
  border: string;
}

const palettes: Record<FlashVariant, FlashPalette> = {
  success: { bg: colors.ok100, fg: colors.ok, border: colors.ok },
  warning: { bg: colors.warn, fg: colors.warnText, border: colors.accent },
  error: { bg: colors.err100, fg: colors.err, border: colors.err },
};
