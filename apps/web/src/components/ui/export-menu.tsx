'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, DownloadIcon } from '@planit/ui';
import { cn } from '@/lib/utils';

export type ExportFormat = 'png' | 'pdf';

interface ExportMenuProps {
  readonly onExport: (format: ExportFormat) => void;
  readonly isExporting?: boolean | undefined;
  readonly align?: 'left' | 'right';
}

interface MenuCoords {
  readonly top: number;
  readonly left?: number;
  readonly right?: number;
}

// Menu déroulant d'export (PNG / PDF) rendu dans un portail `document.body` et
// positionné en `fixed` à partir du rect du trigger. Le portail échappe à tout
// conteneur `overflow`/stacking ancêtre — sans lui, une toolbar avec
// `overflow-x-auto` clippe un menu en position absolue (cf. planning).
// Réutilisé par la toolbar planning et le panneau maquette.
export function ExportMenu({ onExport, isExporting = false, align = 'right' }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (el === null) return;
    const r = el.getBoundingClientRect();
    setCoords(
      align === 'right'
        ? { top: r.bottom + 4, right: window.innerWidth - r.right }
        : { top: r.bottom + 4, left: r.left },
    );
  }, [align]);

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (next) place();
      return next;
    });
  }, [place]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) === true) return;
      if (triggerRef.current?.contains(t) === true) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    // Le menu est en `fixed` : un scroll/resize rendrait la position obsolète.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div className="flex-shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={isExporting}
        onClick={toggle}
        aria-label="Exporter"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors',
          isExporting
            ? 'cursor-wait border-border-soft bg-surface text-text-muted'
            : 'border-border bg-surface text-text hover:border-primary hover:text-primary',
        )}
      >
        <DownloadIcon size={13} color="currentColor" />
        <span>{isExporting ? 'Génération…' : 'Exporter'}</span>
        <ChevronDownIcon size={11} color="currentColor" />
      </button>

      {open &&
        !isExporting &&
        coords !== null &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: coords.top, left: coords.left, right: coords.right }}
            className="z-[60] min-w-[152px] overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
          >
            {(['png', 'pdf'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onExport(fmt);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-text transition-colors hover:bg-bg-warm"
              >
                <DownloadIcon size={13} color="currentColor" />
                {fmt === 'png' ? 'Image PNG' : 'Document PDF'}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
