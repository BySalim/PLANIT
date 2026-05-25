import { useCallback, useReducer } from 'react';

// ─────────────────────────────────────────────────────────────────────
// useUndoRedo<T> — bounded undo/redo stack (V2-D11)
// ─────────────────────────────────────────────────────────────────────
// Stores immutable snapshots of `T` in a past / present / future buffer.
// Used by LOT 4 (planning interactions) — each create / update / delete /
// move pushes a new snapshot. CTRL+Z replays an inverse, CTRL+SHIFT+Z
// re-applies a forward action. The buffer is wiped after a "publish"
// (V2-D11 — no undo across publishes).
//
// Implementation is a thin wrapper around a reducer, so the reducer can be
// unit-tested in isolation without rendering React (cf. use-undo-redo.spec.ts).

const DEFAULT_LIMIT = 50;

export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
  /** Hard cap on `past` length. Pushes beyond this drop the oldest. */
  limit: number;
}

export type UndoRedoAction<T> =
  | { kind: 'push'; payload: T }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'reset'; payload: T };

export interface UndoRedoActions<T> {
  push: (next: T) => void;
  undo: () => void;
  redo: () => void;
  /** Clear the entire stack and seed the present with `next`. Used after publish. */
  clear: (next: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

/** Pure reducer — exported for tests. */
export function undoRedoReducer<T>(
  state: UndoRedoState<T>,
  action: UndoRedoAction<T>,
): UndoRedoState<T> {
  switch (action.kind) {
    case 'push': {
      const past = [...state.past, state.present];
      // Bound the buffer: drop the oldest if we exceed the limit.
      const bounded = past.length > state.limit ? past.slice(past.length - state.limit) : past;
      return { ...state, past: bounded, present: action.payload, future: [] };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      if (previous === undefined) return state;
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      if (next === undefined) return state;
      return {
        ...state,
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
    case 'reset':
      return { ...state, past: [], present: action.payload, future: [] };
    default:
      return state;
  }
}

export interface UseUndoRedoOptions {
  /** Maximum number of past states retained (default: 50, cf. V2-D11). */
  limit?: number;
}

/**
 * React hook exposing an undo / redo stack of immutable `T` snapshots.
 *
 * @example
 *   const [seances, { push, undo, redo, clear, canUndo, canRedo }] = useUndoRedo(initial);
 *   // user moves a séance:
 *   push(nextSeances);
 *   // CTRL+Z:
 *   if (canUndo) undo();
 *   // after publish (V2-D11):
 *   clear(currentSeances);
 */
export function useUndoRedo<T>(
  initial: T,
  options: UseUndoRedoOptions = {},
): [T, UndoRedoActions<T>] {
  const [state, dispatch] = useReducer(undoRedoReducer<T>, {
    past: [],
    present: initial,
    future: [],
    limit: options.limit ?? DEFAULT_LIMIT,
  });

  const push = useCallback((next: T) => dispatch({ kind: 'push', payload: next }), []);
  const undo = useCallback(() => dispatch({ kind: 'undo' }), []);
  const redo = useCallback(() => dispatch({ kind: 'redo' }), []);
  const clear = useCallback((next: T) => dispatch({ kind: 'reset', payload: next }), []);

  return [
    state.present,
    {
      push,
      undo,
      redo,
      clear,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    },
  ];
}
