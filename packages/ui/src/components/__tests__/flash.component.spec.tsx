import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlashProvider, type FlashVariant, useFlash } from '../flash';

// Exercises the React layer of Flash (provider, hook, visual stack, auto-dismiss
// timers). The pure reducer is covered separately by flash.spec.ts.

// A tiny consumer that pushes one message and exposes the dismiss/clear API
// via buttons so the test can drive the provider.
function Harness({ variant, message }: { variant: FlashVariant; message: string }): ReactElement {
  const { push, clear } = useFlash();
  return (
    <div>
      <button type="button" onClick={() => push(variant, message)}>
        push
      </button>
      <button type="button" onClick={() => clear()}>
        clear
      </button>
    </div>
  );
}

describe('FlashProvider + useFlash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it('throws when useFlash is used outside a provider', () => {
    expect(() => renderHook(() => useFlash())).toThrow(/FlashProvider/);
  });

  it('renders a pushed success message and auto-dismisses it after 4s', () => {
    render(
      <FlashProvider>
        <Harness variant="success" message="2 séances créées" />
      </FlashProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText('push'));
    });
    expect(screen.queryByText('2 séances créées')).not.toBeNull();
    // status role for non-error variants.
    expect(screen.getByRole('status')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('2 séances créées')).toBeNull();
  });

  it('keeps error messages sticky and dismisses them on click', () => {
    render(
      <FlashProvider>
        <Harness variant="error" message="boom" />
      </FlashProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText('push'));
    });
    // alert role for errors; still present after the success/warning windows.
    expect(screen.getByRole('alert')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText('boom')).not.toBeNull();

    // Clicking the flash dismisses it.
    act(() => {
      fireEvent.click(screen.getByText('boom'));
    });
    expect(screen.queryByText('boom')).toBeNull();
  });

  it('clear() removes all messages', () => {
    render(
      <FlashProvider>
        <Harness variant="warning" message="careful" />
      </FlashProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByText('push'));
    });
    expect(screen.queryByText('careful')).not.toBeNull();
    act(() => {
      fireEvent.click(screen.getByText('clear'));
    });
    expect(screen.queryByText('careful')).toBeNull();
  });
});
