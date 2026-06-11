'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SessionDto } from '@planit/contracts';
import { paletteForSession } from '@/lib/module-palette';

export interface PlanningUpdateModalProps {
  readonly open: boolean;
  readonly sessions: readonly SessionDto[];
  readonly onClose: () => void;
}

const MAX_VISIBLE = 4;

export function PlanningUpdateModal({ open, sessions, onClose }: PlanningUpdateModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const visible = sessions.slice(0, MAX_VISIBLE);
  const hidden = Math.max(0, sessions.length - MAX_VISIBLE);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="planning-update-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-800"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="planning-update-title" className="font-display text-lg font-semibold text-text">
              Planning mis à jour
            </h2>
            <p className="mt-1 text-sm text-text-sec">
              Le responsable de programme a publié de nouvelles modifications de votre planning.
            </p>
          </div>
        </div>

        {visible.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {visible.map((session) => {
              const palette = paletteForSession(session.module.id, session.type);
              const start = new Date(session.startAt);
              const end = new Date(session.endAt);
              return (
                <li
                  key={session.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                  style={{ borderColor: palette.border, background: palette.bg }}
                >
                  <span
                    aria-hidden
                    className="h-10 w-1 flex-shrink-0 rounded-full"
                    style={{ background: palette.bar }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: palette.text }}>
                      {session.module.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-sec">
                      {format(start, 'EEE d MMM', { locale: fr })} ·{' '}
                      {format(start, 'HH:mm', { locale: fr })} –{' '}
                      {format(end, 'HH:mm', { locale: fr })} · {session.salle?.name ?? '—'}
                    </p>
                  </div>
                </li>
              );
            })}
            {hidden > 0 ? (
              <li className="px-3 text-xs text-text-faint">
                + {hidden} autre{hidden > 1 ? 's' : ''} séance{hidden > 1 ? 's' : ''} mise
                {hidden > 1 ? 's' : ''} à jour
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="rounded-lg border border-border-soft bg-bg px-3 py-2 text-xs text-text-sec">
            Votre planning vient d&apos;être actualisé. Consultez la liste pour voir les
            changements.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          OK, j&apos;ai vu
        </button>
      </div>
    </div>
  );
}
