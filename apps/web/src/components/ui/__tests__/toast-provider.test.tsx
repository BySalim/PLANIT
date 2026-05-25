import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../toast-provider';

/**
 * Tests for ToastProvider + useToast — vérifie le contrat du contexte,
 * l'ajout d'un toast dans le DOM et la disparition après timeout.
 */

// React 19 + fakeTimers émet un warning act() bénin sur le useEffect cleanup
// interne du ToastProvider (clearTimeout sur unmount). On le silence pour
// garder une sortie de test propre — la couverture comportementale reste
// assurée par les expects sur le DOM.
const originalError = console.error;
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? '');
    if (message.includes('not wrapped in act')) return;
    originalError(...(args as []));
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useToast', () => {
  it('throw une erreur claire quand utilisé hors <ToastProvider>', () => {
    // console.error est déjà spy via beforeEach — pas besoin de restore ici.
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
  });

  it('ajoute un toast au DOM via show()', () => {
    render(
      <ToastProvider>
        <ToastConsumerButton message="Bonjour Dakar" />
      </ToastProvider>,
    );

    // fireEvent + act bracketé — wrapper externe pour drainer le setState
    // synchronisé par React 19 (warning act sinon).
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'show' }));
    });
    // Drain l'effet `useMemo({ show })` qui change suite au setState.
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Bonjour Dakar');
  });

  it('retire le toast du DOM après TOAST_DURATION_MS (~4s)', () => {
    render(
      <ToastProvider>
        <ToastConsumerButton message="éphémère" />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'show' }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('éphémère');

    act(() => {
      vi.advanceTimersByTime(4001);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});

/** Bouton consumer piloté par useToast — déclenche show au click. */
function ToastConsumerButton({ message }: { message: string }) {
  const { show } = useToast();
  return (
    <button type="button" onClick={() => show(message, { variant: 'success' })}>
      show
    </button>
  );
}
