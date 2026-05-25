import { describe, expect, it } from 'vitest';
import { type UndoRedoState, undoRedoReducer } from '../use-undo-redo';

// Reducer-level unit tests — no React required. The hook itself is a thin
// useReducer wrapper, tested indirectly here.

function makeState<T>(present: T, limit = 50): UndoRedoState<T> {
  return { past: [], present, future: [], limit };
}

describe('undoRedoReducer', () => {
  it('push moves the previous present into the past and seeds future as empty', () => {
    const next = undoRedoReducer(makeState(1), { kind: 'push', payload: 2 });
    expect(next.past).toEqual([1]);
    expect(next.present).toBe(2);
    expect(next.future).toEqual([]);
  });

  it('undo restores the last past state and stashes the current present into future', () => {
    const after2 = undoRedoReducer(makeState(1), { kind: 'push', payload: 2 });
    const after3 = undoRedoReducer(after2, { kind: 'push', payload: 3 });
    const undone = undoRedoReducer(after3, { kind: 'undo' });
    expect(undone.past).toEqual([1]);
    expect(undone.present).toBe(2);
    expect(undone.future).toEqual([3]);
  });

  it('redo replays the next future state', () => {
    const after2 = undoRedoReducer(makeState(1), { kind: 'push', payload: 2 });
    const undone = undoRedoReducer(after2, { kind: 'undo' });
    const redone = undoRedoReducer(undone, { kind: 'redo' });
    expect(redone.past).toEqual([1]);
    expect(redone.present).toBe(2);
    expect(redone.future).toEqual([]);
  });

  it('push after undo clears the redo stack (V2-D11 — divergent branch wipes future)', () => {
    const after2 = undoRedoReducer(makeState(1), { kind: 'push', payload: 2 });
    const undone = undoRedoReducer(after2, { kind: 'undo' });
    expect(undone.future).toEqual([2]);
    const branched = undoRedoReducer(undone, { kind: 'push', payload: 99 });
    expect(branched.future).toEqual([]);
  });

  it('enforces the limit by dropping the oldest entries from past', () => {
    let state = makeState(0, 3);
    state = undoRedoReducer(state, { kind: 'push', payload: 1 });
    state = undoRedoReducer(state, { kind: 'push', payload: 2 });
    state = undoRedoReducer(state, { kind: 'push', payload: 3 });
    state = undoRedoReducer(state, { kind: 'push', payload: 4 });
    expect(state.past).toEqual([1, 2, 3]);
    expect(state.present).toBe(4);
  });

  it('undo is a no-op when past is empty', () => {
    const state = makeState('a');
    const undone = undoRedoReducer(state, { kind: 'undo' });
    expect(undone).toBe(state);
  });

  it('redo is a no-op when future is empty', () => {
    const state = makeState('a');
    const redone = undoRedoReducer(state, { kind: 'redo' });
    expect(redone).toBe(state);
  });

  it('reset wipes past and future and seeds the present with the payload', () => {
    const after2 = undoRedoReducer(makeState(1), { kind: 'push', payload: 2 });
    const after3 = undoRedoReducer(after2, { kind: 'push', payload: 3 });
    const reset = undoRedoReducer(after3, { kind: 'reset', payload: 99 });
    expect(reset).toEqual({ past: [], present: 99, future: [], limit: 50 });
  });
});
