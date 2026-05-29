'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginDto } from '@planit/contracts';
import { useAuth, ROLE_HOME } from '@/contexts/auth-context';

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function LoginPage() {
  const { state, login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  // Redirige si déjà authentifié
  useEffect(() => {
    if (state.status === 'authenticated') {
      router.replace(ROLE_HOME[state.user.role] ?? '/rp');
    }
  }, [state, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginDto) => {
    setServerError(null);
    try {
      const user = await login(data.email, data.password);
      router.replace(ROLE_HOME[user.role] ?? '/rp');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  };

  return (
    <div className="w-full max-w-sm px-4">
      <div className="mb-8 text-center">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-wordmark-color.svg"
            alt="PLANIT"
            className="mx-auto block h-10 w-auto"
          />
        </h1>
        <p className="mt-1 text-sm text-text-muted">ISM Dakar — Gestion des emplois du temps</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h2 className="mb-6 font-display text-xl font-semibold text-text">Connexion</h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-text">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              {...register('email')}
              className="h-10 rounded-lg border border-border bg-bg px-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="prenom.nom@ism.sn"
            />
            {errors.email && <p className="text-xs text-err">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-text">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="h-10 rounded-lg border border-border bg-bg px-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-xs text-err">{errors.password.message}</p>}
          </div>

          {serverError !== null && (
            <div
              role="alert"
              className="rounded-lg border border-err bg-err-100 px-3 py-2.5 text-sm text-err"
            >
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
