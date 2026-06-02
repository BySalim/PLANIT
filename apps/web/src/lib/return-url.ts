/**
 * Validation d'une `returnUrl` (alias `callbackUrl`) avant redirection.
 *
 * Anti open-redirect : on n'autorise QU'un chemin interne absolu. Tout ce qui
 * pourrait sortir de l'origine (URL absolue `http(s)://`, `//host`, schéma
 * `javascript:`, etc.) est rejeté → l'appelant retombe sur sa cible par défaut.
 *
 * Partagé entre le middleware (gating) et la page /login (post-login).
 */
export function safeReturnUrl(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined || raw.length === 0) return null;
  // Doit commencer par un seul `/` (chemin interne). `//` = URL protocol-relative
  // (ouvre vers un host externe) → rejeté.
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  // Refus défensif des backslashes (certains navigateurs traitent `/\` comme `//`).
  if (raw.includes('\\')) return null;
  return raw;
}
