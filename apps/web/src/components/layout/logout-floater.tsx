'use client';

import { useEffect, useRef, useState } from 'react';
import { LogoutIcon } from '@planit/ui';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

// Bouton flottant de déconnexion — **disponible en prod** (contrairement au
// <DevToolsFloater> qui est dev-only). Toujours accessible quand l'utilisateur
// est connecté, quel que soit l'écran : utile en beta (rideau Cloudflare Access)
// où un testeur veut couper sa session sans chercher le menu profil.
//
// Bouton rond déplaçable (drag), position persistée dans localStorage. Un clic
// (sans drag) ouvre un mini-confirm ; la confirmation appelle `logout()` (POST
// /auth/logout + redirect /login, cf. auth-context). Discret au repos.

const STORAGE_KEY = 'planit:logout-floater:position';
const BUTTON_SIZE = 44; // px ; cohérent avec le rail heures du planning + DevToolsFloater
const PANEL_WIDTH = 188; // px
const PANEL_OFFSET = 8; // gap entre bouton et panneau
const DRAG_THRESHOLD = 4; // px : seuil mouseDown→drag (en dessous = clic)
const EDGE_PADDING = 16; // px : marge minimale entre bouton et bord viewport

interface Position {
  readonly x: number;
  readonly y: number;
}

function clampToViewport(x: number, y: number): Position {
  if (typeof window === 'undefined') return { x, y };
  const maxX = window.innerWidth - BUTTON_SIZE - EDGE_PADDING;
  const maxY = window.innerHeight - BUTTON_SIZE - EDGE_PADDING;
  return {
    x: Math.max(EDGE_PADDING, Math.min(maxX, x)),
    y: Math.max(EDGE_PADDING, Math.min(maxY, y)),
  };
}

// Par défaut en bas-DROITE (le <DevToolsFloater> occupe le bas-gauche en dev).
function defaultPosition(): Position {
  if (typeof window === 'undefined') return { x: EDGE_PADDING, y: EDGE_PADDING };
  return clampToViewport(
    window.innerWidth - BUTTON_SIZE - EDGE_PADDING,
    window.innerHeight - BUTTON_SIZE - EDGE_PADDING,
  );
}

function loadPosition(): Position | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { x?: unknown }).x === 'number' &&
      typeof (parsed as { y?: unknown }).y === 'number'
    ) {
      const p = parsed as Position;
      return clampToViewport(p.x, p.y);
    }
  } catch {
    /* localStorage inaccessible ou JSON corrompu — ignore */
  }
  return null;
}

function savePosition(p: Position): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* mode privé ou quota plein — silent */
  }
}

export function LogoutFloater() {
  const { state, logout } = useAuth();
  const [open, setOpen] = useState(false);
  // `mounted` : évite le mismatch d'hydratation (position dépend de window +
  // localStorage, indisponibles côté serveur). Rend null pendant le SSR.
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position>({ x: EDGE_PADDING, y: EDGE_PADDING });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Ref synchrone à `position` : utilisée par le mouseUp global pour sauvegarder
  // sans dépendre du closure React.
  const positionRef = useRef(position);
  positionRef.current = position;

  // ── Mount + position initiale + resync sur resize ──────────────────
  useEffect(() => {
    setMounted(true);
    setPosition(loadPosition() ?? defaultPosition());
  }, []);

  useEffect(() => {
    function onResize() {
      setPosition((p) => clampToViewport(p.x, p.y));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Drag ───────────────────────────────────────────────────────────
  // Armé au mouseDown ; tant que DRAG_THRESHOLD n'est pas dépassé, c'est un clic.
  // `justDraggedRef` empêche le onClick (émis après tout mouseUp) de toggle le
  // panneau juste après un drag.
  const dragRef = useRef<{
    readonly startX: number;
    readonly startY: number;
    readonly origX: number;
    readonly origY: number;
    moved: boolean;
  } | null>(null);
  const justDraggedRef = useRef(false);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      setPosition(clampToViewport(drag.origX + dx, drag.origY + dy));
    }
    function onUp() {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (drag.moved) {
        justDraggedRef.current = true;
        savePosition(positionRef.current);
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function handleMouseDown(event: React.MouseEvent) {
    if (event.button !== 0) return; // bouton gauche uniquement
    event.preventDefault(); // empêche la sélection texte pendant le drag
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origX: positionRef.current.x,
      origY: positionRef.current.y,
      moved: false,
    };
  }

  function handleButtonClick() {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setOpen((o) => !o);
  }

  // ── Close on outside click ou Escape ───────────────────────────────
  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target === null || wrapperRef.current === null) return;
      if (!wrapperRef.current.contains(target)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleConfirmLogout() {
    setOpen(false);
    void logout();
  }

  // Gate : rien tant que non authentifié (ou en cours de boot) — pas de bouton
  // sur /login ni pendant le loading. Aussi : pas de rendu SSR (hydratation).
  if (!mounted || state.status !== 'authenticated') return null;

  // ── Panneau : positionnement adaptatif selon la moitié de viewport ─
  const openLeft = position.x > window.innerWidth / 2;
  const openUp = position.y > window.innerHeight / 2;
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    width: PANEL_WIDTH,
  };
  if (openLeft) panelStyle.right = BUTTON_SIZE + PANEL_OFFSET;
  else panelStyle.left = BUTTON_SIZE + PANEL_OFFSET;
  if (openUp) panelStyle.bottom = 0;
  else panelStyle.top = 0;

  const isDragging = dragRef.current?.moved === true;

  return (
    <div ref={wrapperRef} className="fixed z-[9998]" style={{ top: position.y, left: position.x }}>
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onClick={handleButtonClick}
        aria-label="Se déconnecter"
        aria-expanded={open}
        title="Se déconnecter — glisser pour déplacer"
        className={cn(
          'flex items-center justify-center rounded-full border border-border bg-surface text-text-sec shadow-md transition-all',
          'hover:border-err hover:text-err',
          open ? 'opacity-100' : 'opacity-70 hover:opacity-100',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
      >
        <LogoutIcon size={20} color="currentColor" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Confirmer la déconnexion"
          style={panelStyle}
          className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          <div className="px-3 pb-1 pt-3">
            <div className="truncate text-xs font-medium text-text">{state.user.fullName}</div>
            <div className="truncate text-[11px] text-text-muted">{state.user.email}</div>
          </div>
          <div className="flex gap-2 px-3 pb-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-text-sec hover:bg-bg"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-err px-2 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              <LogoutIcon size={13} color="currentColor" />
              Déconnexion
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
