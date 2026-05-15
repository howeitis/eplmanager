import { useEffect, useCallback, type RefObject, type MouseEvent } from 'react';

/**
 * Modal accessibility plumbing: Escape closes, Tab cycles focus inside the
 * dialog, body scroll is locked while open, and focus returns to its previous
 * holder on close. Each modal owns its dialog ref + dismiss handler; this hook
 * supplies the shared wiring.
 *
 * Pass `enabled: false` to suspend the trap (e.g. when a child overlay has
 * its own handlers and should swallow Escape first).
 */
export function useModalDismiss(
  dialogRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => {
      const btn = dialogRef.current?.querySelector<HTMLElement>('button');
      btn?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, [enabled, dialogRef, onDismiss]);

  const handleBackdropClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;
      if (e.target === e.currentTarget) {
        onDismiss();
      }
    },
    [enabled, onDismiss],
  );

  return { handleBackdropClick };
}
