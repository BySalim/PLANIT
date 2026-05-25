'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_HOME } from '@/contexts/auth-context';

// À aligner avec le seed Oumar (Vague 02) dès que le backend est disponible
const SEED_ACCOUNTS = [
  { label: 'RP', email: 'rp@ism.sn', password: 'password123' },
  { label: 'Enseignant', email: 'enseignant@ism.sn', password: 'password123' },
  { label: 'Étudiant', email: 'etudiant@ism.sn', password: 'password123' },
] as const;

function DevAuthBadgeInner() {
  const { state, login, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    setBusy(true);
    try {
      const user = await login(email, password);
      router.push(ROLE_HOME[user.role] ?? '/rp');
    } catch {
      // Silently ignore — backend pas encore disponible
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      {open && (
        <div className="mb-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {state.status === 'authenticated' && (
            <>
              <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Connecté
              </div>
              <div className="px-3 pb-2 text-xs text-text">{state.user.nomComplet}</div>
              <div className="border-t border-border" />
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="w-full px-3 py-2 text-left text-xs text-err hover:bg-err-100"
              >
                Se déconnecter
              </button>
              <div className="border-t border-border" />
            </>
          )}

          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Se connecter en tant que
          </div>
          {SEED_ACCOUNTS.map((account) => (
            <button
              key={account.label}
              type="button"
              disabled={busy}
              onClick={() => {
                void handleLogin(account.email, account.password);
              }}
              className="w-full px-3 py-2 text-left text-xs text-text hover:bg-bg disabled:opacity-50"
            >
              {account.label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-2 rounded-full border border-primary bg-surface px-3 text-[11px] font-semibold text-primary shadow-md"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-ok" />
        {state.status === 'authenticated'
          ? `${state.user.role} · ${state.user.email}`
          : 'Non connecté'}
      </button>
    </div>
  );
}

// Le check NODE_ENV est dans le wrapper (aucun hook) — tree-shaken en prod build
export function DevAuthBadge() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <DevAuthBadgeInner />;
}
