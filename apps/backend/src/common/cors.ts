/**
 * Source unique de vérité pour la configuration CORS — HTTP et WebSocket.
 *
 * Politique : whitelist explicite (plus de regex `^http://localhost:\d+$`
 * qui acceptait n'importe quel port local et exposait l'API à n'importe
 * quel service tournant en local, légitime ou non).
 *
 * Règles :
 * - Si `FRONTEND_URL` est défini → source de vérité exclusive (prod, staging,
 *   dev avec override). Quel que soit l'env.
 * - Sinon, en `development` → whitelist explicite des ports utilisés par
 *   l'équipe : 3000 (apps/web Next.js) et 5500 (prototype PLANIT-IA).
 * - Sinon (prod / test / autre sans `FRONTEND_URL`) → on **refuse tout**
 *   (tableau vide) et on log une erreur. Aucune origine autorisée par défaut.
 *
 * Utilisé par `main.ts` (`app.enableCors`) et `ws.gateway.ts`
 * (`@WebSocketGateway`) pour éviter qu'un fix HTTP n'oublie le WS et
 * inversement.
 */
export type CorsOrigin = string | string[];

/** Ports dev autorisés en l'absence de `FRONTEND_URL`. */
const DEV_ALLOWED_ORIGINS = [
  'http://localhost:3000', // apps/web (Next.js)
  'http://localhost:5500', // PLANIT-IA prototype
];

/**
 * Garde-fou : un seul log d'erreur par process si la config CORS prod est
 * incomplète. Évite de polluer la sortie pour chaque connexion entrante.
 */
let prodMisconfigReported = false;

export function corsOrigin(): CorsOrigin {
  const frontendUrl = process.env['FRONTEND_URL'];
  if (frontendUrl !== undefined && frontendUrl.length > 0) return frontendUrl;

  const isDev = process.env['NODE_ENV'] === 'development';
  if (isDev) return DEV_ALLOWED_ORIGINS;

  if (!prodMisconfigReported) {
    prodMisconfigReported = true;
    // Pas d'injection pino possible ici (fonction utilitaire pure) — on émet
    // sur stderr une seule fois pour signaler une configuration cassée.
    process.stderr.write(
      '[CORS] FRONTEND_URL non défini hors développement : toutes les origines sont refusées.\n',
    );
  }
  return [];
}
