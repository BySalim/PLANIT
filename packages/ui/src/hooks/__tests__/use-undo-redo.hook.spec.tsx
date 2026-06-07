import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useUndoRedo } from '../use-undo-redo';

// Exercises the React hook wrapper around undoRedoReducer (the reducer itself
// is covered by use-undo-redo.spec.ts). Drives the dispatch callbacks through
// renderHook so the useReducer/useCallback bodies execute.

describe('useUndoRedo (hook)', () => {
  it('starts with the initial present and no undo/redo available', () => {
    const { result } = renderHook(() => useUndoRedo(1));
    const [present, actions] = result.current;
    expect(present).toBe(1);
    expect(actions.canUndo).toBe(false);
    expect(actions.canRedo).toBe(false);
  });

  it('push then undo then redo walks the stack', () => {
    const { result } = renderHook(() => useUndoRedo(1));

    act(() => result.current[1].push(2));
    expect(result.current[0]).toBe(2);
    expect(result.current[1].canUndo).toBe(true);

    act(() => result.current[1].undo());
    expect(result.current[0]).toBe(1);
    expect(result.current[1].canRedo).toBe(true);

    act(() => result.current[1].redo());
    expect(result.current[0]).toBe(2);
    expect(result.current[1].canRedo).toBe(false);
  });

  it('clear resets the present and wipes the stack', () => {
    const { result } = renderHook(() => useUndoRedo('a'));
    act(() => result.current[1].push('b'));
    act(() => result.current[1].clear('z'));
    expect(result.current[0]).toBe('z');
    expect(result.current[1].canUndo).toBe(false);
    expect(result.current[1].canRedo).toBe(false);
  });

  it('honours a custom limit option', () => {
    const { result } = renderHook(() => useUndoRedo(0, { limit: 2 }));
    act(() => result.current[1].push(1));
    act(() => result.current[1].push(2));
    act(() => result.current[1].push(3));
    // limit=2 keeps only the 2 most recent past entries, present is latest.
    expect(result.current[0]).toBe(3);
    act(() => result.current[1].undo());
    act(() => result.current[1].undo());
    expect(result.current[1].canUndo).toBe(false);
    expect(result.current[0]).toBe(1);
  });
});
