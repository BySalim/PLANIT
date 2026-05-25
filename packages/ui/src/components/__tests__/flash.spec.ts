import { describe, expect, it } from 'vitest';
import { type FlashMessage, flashReducer } from '../flash';

// Reducer-level unit tests — the DOM rendering layer is exercised by web app
// integration tests (LOT 3 I.7).

const SUCCESS: FlashMessage = { id: 'a', variant: 'success', message: 'ok' };
const ERROR: FlashMessage = { id: 'b', variant: 'error', message: 'boom' };
const WARNING: FlashMessage = { id: 'c', variant: 'warning', message: 'careful' };

describe('flashReducer', () => {
  it('push appends to the stack', () => {
    const after = flashReducer([], { kind: 'push', payload: SUCCESS });
    expect(after).toEqual([SUCCESS]);
  });

  it('preserves insertion order', () => {
    let state = flashReducer([], { kind: 'push', payload: SUCCESS });
    state = flashReducer(state, { kind: 'push', payload: ERROR });
    state = flashReducer(state, { kind: 'push', payload: WARNING });
    expect(state.map((flash) => flash.id)).toEqual(['a', 'b', 'c']);
  });

  it('dismiss removes the matching id only', () => {
    const initial = [SUCCESS, ERROR, WARNING];
    const after = flashReducer(initial, { kind: 'dismiss', id: 'b' });
    expect(after.map((flash) => flash.id)).toEqual(['a', 'c']);
  });

  it('dismiss is a no-op when the id is unknown', () => {
    const initial = [SUCCESS];
    const after = flashReducer(initial, { kind: 'dismiss', id: 'nope' });
    expect(after).toEqual(initial);
  });

  it('clear empties the stack', () => {
    const initial = [SUCCESS, ERROR];
    const after = flashReducer(initial, { kind: 'clear' });
    expect(after).toEqual([]);
  });
});
