'use client';

import { useEffect, useRef, useState } from 'react';
import { LogoutIcon, SettingsIcon } from '@planit/ui';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

// Composant flottant dev-only (tree-shaken en prod via le gate NODE_ENV
// dans le wrapper exporté en bas du fichier). Remplace l'ancien
// <DevAuthBadge> : un bouton rond avec icône engrenage, déplaçable par
// drag, qui ouvre un panneau d'outils de développement.
//
// Pour l'instant, le panneau expose uniquement la déconnexion. Les futurs
// outils (vues, comportements, scénarios de test) viendront s'ajouter ici
// au fur et à mesure des besoins.
//
// Position persistée dans localStorage entre les sessions. Le panneau
// s'ouvre du côté libre (gauche/droite, haut/bas) selon la position du
// bouton dans la viewport pour ne pas sortir de l'écran.

const STORAGE_KEY = 'planit:dev-tools-floater:position';
const BUTTON_SIZE = 44; // px ; cohérent avec le rail heures du planning (44px)
const PANEL_WIDTH = 240; // px
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

// Largeur approximative du badge « N » dev tools de Next.js en bas-gauche.
// On positionne le gear juste à sa droite pour les avoir alignés sur la
// même ligne — pratique car ce sont tous deux des outils de dev.
const NEXT_DEV_BADGE_WIDTH = 40;
const NEXT_DEV_BADGE_GAP = 8;

function defaultPosition(): Position {
  if (typeof window === 'undefined') return { x: EDGE_PADDING, y: EDGE_PADDING };
  // Bas-gauche, à droite immédiate du badge « N » Next.js dev (visible en
  // dev uniquement, en bas à gauche de la viewport). Garde une cohérence
  // visuelle « rangée d'outils dev » en bas de l'écran.
  return clampToViewport(
    EDGE_PADDING + NEXT_DEV_BADGE_WIDTH + NEXT_DEV_BADGE_GAP,
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

function DevToolsFloaterInner() {
  const { state, logout } = useAuth();
  const [open, setOpen] = useState(false);
  // `mounted` : évite le mismatch d'hydratation (la position dépend de
  // window.innerWidth/Height + localStorage, indisponibles côté serveur).
  // On rend null pendant le SSR puis on hydrate avec la vraie position.
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position>({ x: EDGE_PADDING, y: EDGE_PADDING });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Ref synchrone à `position` : utilisée par le mouseUp global pour
  // sauvegarder la dernière position sans dépendre du closure React.
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
  // Le drag est armé au mouseDown sur le bouton. Tant qu'on n'a pas
  // dépassé DRAG_THRESHOLD, on considère le geste comme un clic ; au-delà,
  // on suit la souris et `justDraggedRef` empêche le onClick (émis par
  // React après tout mouseUp) de toggle le panneau juste après un drag.
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

  // ── Auth helpers ───────────────────────────────────────────────────
  const handleLogout = () => {
    setOpen(false);
    void logout();
  };

  if (!mounted) return null;

  // ── Panneau : positionnement adaptatif selon la moitié de viewport ─
  // Si le bouton est à droite de l'écran, le panneau s'ouvre à gauche
  // (et inversement) pour rester visible. Idem haut/bas.
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

  const isAuthenticated = state.status === 'authenticated';
  const isDragging = dragRef.current?.moved === true;

  return (
    <div ref={wrapperRef} className="fixed z-[9999]" style={{ top: position.y, left: position.x }}>
      {/* Bouton gear : drag pour déplacer, clic pour toggle le panneau */}
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onClick={handleButtonClick}
        aria-label="Outils de développement"
        title="Outils de dev — glisser pour déplacer, cliquer pour ouvrir"
        className={cn(
          'relative flex items-center justify-center rounded-full bg-black text-white shadow-md transition-colors hover:bg-neutral-800',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
      >
        <SettingsIcon size={20} color="currentColor" />
      </button>

      {/* Panneau d'outils — visible quand open */}
      {open ? (
        <div
          style={panelStyle}
          className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          {/* En-tête : identité utilisateur + bouton déconnexion */}
          {isAuthenticated ? (
            <>
              <div className="px-3 pb-2 pt-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Connecté en tant que
                </div>
                <div className="mt-1 truncate text-xs font-medium text-text">
                  {state.user.fullName}
                </div>
                <div className="truncate text-[11px] text-text-muted">{state.user.email}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {state.user.role}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-xs font-medium text-err hover:bg-err-100"
              >
                <LogoutIcon size={14} color="currentColor" />
                Se déconnecter
              </button>
            </>
          ) : (
            <div className="px-3 py-3 text-xs text-text-muted">Non connecté</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// Wrapper gate-en-prod : aucun hook hors du gate → tree-shake en prod build
export function DevToolsFloater() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <DevToolsFloaterInner />;
}
