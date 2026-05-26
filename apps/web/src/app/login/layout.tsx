import type { ReactNode } from 'react';

// Next.js App Router requires default export for layout
// eslint-disable-next-line no-restricted-syntax
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-bg">{children}</div>;
}
