'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Undo/Redo basé sur des actions (V2-D11).
 *
 * Chaque action push une `UndoEntry` avec `undo()` (annule l'effet) et `redo()`
 * (réapplique). Ctrl+Z pop la dernière entrée du stack `past` et la pousse
 * dans `future` (après avoir joué son `undo`). Ctrl+Shift+Z fait l'inverse.
 *
 * Pile vidée au publish (V2-D11). Pas d'undo cross-session.
 *
 * On n'utilise pas `useUndoRedo` de `@planit/ui` parce que ce dernier est
 * snapshot-based (T = state) alors qu'ici on veut action-based (T = effet).
 */

export interface UndoEntry {
  readonly label: string;
  readonly undo: () => Promise<void> | void;
  readonly redo: () => Promise<void> | void;
}

interface UndoStackApi {
  push: (entry: UndoEntry) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pastSize: number;
  futureSize: number;
}

const STACK_LIMIT = 50;

export function usePlanningUndoStack(): UndoStackApi {
  const [past, setPast] = useState<readonly UndoEntry[]>([]);
  const [future, setFuture] = useState<readonly UndoEntry[]>([]);
  // Verrou pour éviter les Ctrl+Z répétés tant que le précédent undo
  // n'est pas terminé (la mutation backend prend ~100 ms).
  const busyRef = useRef(false);

  const push = useCallback((entry: UndoEntry) => {
    setPast((prev) => {
      const next = [...prev, entry];
      return next.length > STACK_LIMIT ? next.slice(-STACK_LIMIT) : next;
    });
    // Toute nouvelle action invalide la branche future (V2-D11).
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    if (busyRef.current) return;
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      busyRef.current = true;
      Promise.resolve(last.undo()).finally(() => {
        busyRef.current = false;
      });
      setFuture((f) => [...f, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    if (busyRef.current) return;
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      busyRef.current = true;
      Promise.resolve(last.redo()).finally(() => {
        busyRef.current = false;
      });
      setPast((p) => [...p, last]);
      return prev.slice(0, -1);
    });
  }, []);

  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    push,
    undo,
    redo,
    clear,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    pastSize: past.length,
    futureSize: future.length,
  };
}
