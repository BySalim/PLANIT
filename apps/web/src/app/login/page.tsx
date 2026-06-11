'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginSchema, type LoginDto } from '@planit/contracts';
import { useAuth, ROLE_HOME } from '@/contexts/auth-context';
import { safeReturnUrl } from '@/lib/return-url';

// Next 15 : useSearchParams() exige un boundary <Suspense> pour le prerender.
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const { state, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  // Destination post-login : la page demandée avant la redirection vers /login
  // (returnUrl, validée anti open-redirect), sinon la home du rôle.
  const returnUrl = safeReturnUrl(searchParams.get('returnUrl'));

  // Redirige si déjà authentifié (ex. retour sur /login avec un cookie valide).
  useEffect(() => {
    if (state.status === 'authenticated') {
      router.replace(returnUrl ?? ROLE_HOME[state.user.role] ?? '/');
    }
  }, [state, router, returnUrl]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginDto) => {
    setServerError(null);
    try {
      const user = await login(data.email, data.password);
      router.replace(returnUrl ?? ROLE_HOME[user.role] ?? '/');
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
            // width/height explicites pour `unsized-images` LH (CLS).
            // Valeurs = ratio natif du viewBox SVG (407x88) ; le CSS h-10 w-auto
            // ré-impose la taille finale, ces attributs ne servent qu'à
            // réserver le slot avant chargement.
            width={407}
            height={88}
            fetchPriority="high"
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

      <nav className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-text-muted">
        <Link href="/mentions-legales" className="hover:text-text hover:underline">
          Mentions légales
        </Link>
        <Link href="/politique-confidentialite" className="hover:text-text hover:underline">
          Politique de confidentialité
        </Link>
      </nav>
    </div>
  );
}
