'use client';

import { useEffect } from 'react';

interface ShortcutModifiers {
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

/**
 * Hook raccourci clavier global. Ignore les events quand le focus est dans
 * un `<input>`, `<textarea>` ou `[contenteditable]` (typer dans un champ ne
 * doit jamais déclencher Ctrl+Z planning).
 *
 * Cible window au capture phase pour s'exécuter avant le default browser undo.
 */
export function useGlobalShortcut(
  key: string,
  modifiers: ShortcutModifiers,
  handler: () => void,
): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (target.isContentEditable) return;
      }
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      // metaKey couvre Cmd sur macOS, ctrlKey couvre Ctrl sur Windows/Linux.
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      if (Boolean(modifiers.ctrl) !== ctrlOrCmd) return;
      if (Boolean(modifiers.shift) !== event.shiftKey) return;
      if (modifiers.alt !== undefined && Boolean(modifiers.alt) !== event.altKey) return;
      event.preventDefault();
      handler();
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [key, modifiers.ctrl, modifiers.shift, modifiers.alt, handler]);
}
