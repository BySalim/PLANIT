'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_HOME, type UserRole } from '@/contexts/auth-context';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );
}

interface RequireAuthProps {
  readonly roles: readonly UserRole[];
  readonly children: ReactNode;
}

export function RequireAuth({ roles, children }: RequireAuthProps) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (state.status === 'authenticated' && roles.length > 0 && !roles.includes(state.user.role)) {
      router.replace(ROLE_HOME[state.user.role] ?? '/login');
    }
  }, [state, roles, router]);

  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'unauthenticated') return null;
  if (roles.length > 0 && !roles.includes(state.user.role)) return null;

  return <>{children}</>;
}
