import { useId, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  children: (props: { id: string; 'aria-describedby': string | undefined }) => ReactElement;
}

export function FormField({ label, error, hint, required, children }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const message: ReactNode = error ? (
    <p id={messageId} role="alert" className="text-xs font-medium text-err">
      {error}
    </p>
  ) : hint ? (
    <p id={messageId} className="text-xs text-text-muted">
      {hint}
    </p>
  ) : null;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn('text-xs font-semibold uppercase tracking-wide text-text-sec')}
      >
        {label}
        {required ? <span className="ml-1 text-err">*</span> : null}
      </label>
      {children({ id, 'aria-describedby': message ? messageId : undefined })}
      {message}
    </div>
  );
}
