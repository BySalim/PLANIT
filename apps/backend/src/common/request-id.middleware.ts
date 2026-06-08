import { randomUUID } from 'node:crypto';
import { requestContext } from './request-context';

/**
 * Middleware Express (branché via `app.use` dans main.ts, avant tout le reste).
 * Établit le `requestId` de la requête : reprend un `X-Request-Id` entrant
 * (continuité de trace derrière un proxy) s'il est sain, sinon en génère un.
 * Le renvoie au client en en-tête et ouvre le contexte `AsyncLocalStorage` dans
 * lequel s'exécute toute la suite de la requête → chaque log porte le `requestId`.
 *
 * Écrit en fonction plutôt qu'en `NestMiddleware` pour couvrir **toutes** les
 * requêtes via `app.use` (évite aussi le piège du wildcard `forRoutes('*')`
 * sous Express 5).
 */
interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}
interface ResponseLike {
  setHeader(name: string, value: string): void;
}

const HEADER = 'x-request-id';
const MAX_LEN = 128;

export function requestIdMiddleware(req: RequestLike, res: ResponseLike, next: () => void): void {
  const incoming = req.headers[HEADER];
  const raw = Array.isArray(incoming) ? incoming[0] : incoming;
  const requestId =
    typeof raw === 'string' && raw.length > 0 && raw.length <= MAX_LEN ? raw : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  requestContext.run({ requestId }, next);
}
