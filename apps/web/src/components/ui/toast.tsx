import type { ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-ok bg-ok-100 text-ok',
  error: 'border-err bg-err-100 text-err',
  info: 'border-info bg-info-100 text-info',
};

export interface ToastProps {
  readonly variant?: ToastVariant;
  readonly children: ReactNode;
}

export function Toast({ variant = 'info', children }: ToastProps) {
  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-md backdrop-blur ${variantClasses[variant]}`}
    >
      {children}
    </div>
  );
}
