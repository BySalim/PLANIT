import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGlobalShortcut } from '../keyboard';

afterEach(() => {
  document.body.innerHTML = '';
});

function dispatchKey(target: EventTarget, init: KeyboardEventInit): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
}

describe('useGlobalShortcut', () => {
  it('fires the handler on the matching key + modifier', () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcut('z', { ctrl: true }, handler));
    act(() => dispatchKey(window, { key: 'z', ctrlKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores the shortcut when modifiers do not match', () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcut('z', { ctrl: true }, handler));
    act(() => dispatchKey(window, { key: 'z' })); // no ctrl
    act(() => dispatchKey(window, { key: 'a', ctrlKey: true })); // wrong key
    expect(handler).not.toHaveBeenCalled();
  });

  it('honours the shift modifier', () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcut('z', { ctrl: true, shift: true }, handler));
    act(() => dispatchKey(window, { key: 'z', ctrlKey: true })); // missing shift
    expect(handler).not.toHaveBeenCalled();
    act(() => dispatchKey(window, { key: 'z', ctrlKey: true, shiftKey: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores keystrokes originating from a text field', () => {
    const handler = vi.fn();
    renderHook(() => useGlobalShortcut('z', { ctrl: true }, handler));
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => dispatchKey(input, { key: 'z', ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});
