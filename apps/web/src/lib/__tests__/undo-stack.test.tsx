import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type UndoEntry, usePlanningUndoStack } from '../undo-stack';

function entry(
  label: string,
): UndoEntry & { undo: ReturnType<typeof vi.fn>; redo: ReturnType<typeof vi.fn> } {
  return { label, undo: vi.fn(), redo: vi.fn() };
}

describe('usePlanningUndoStack', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => usePlanningUndoStack());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.pastSize).toBe(0);
  });

  it('push then undo then redo moves entries between past and future', async () => {
    const { result } = renderHook(() => usePlanningUndoStack());
    const e = entry('move');

    act(() => result.current.push(e));
    expect(result.current.canUndo).toBe(true);
    expect(result.current.pastSize).toBe(1);

    await act(async () => {
      result.current.undo();
    });
    expect(e.undo).toHaveBeenCalledTimes(1);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.futureSize).toBe(1);

    await act(async () => {
      result.current.redo();
    });
    expect(e.redo).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.futureSize).toBe(0);
  });

  it('push wipes the redo branch', async () => {
    const { result } = renderHook(() => usePlanningUndoStack());
    act(() => result.current.push(entry('a')));
    await act(async () => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.push(entry('b')));
    expect(result.current.canRedo).toBe(false);
  });

  it('clear empties both stacks', () => {
    const { result } = renderHook(() => usePlanningUndoStack());
    act(() => result.current.push(entry('a')));
    act(() => result.current.clear());
    expect(result.current.pastSize).toBe(0);
    expect(result.current.futureSize).toBe(0);
  });
});
