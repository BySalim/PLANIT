/**
 * Source unique de vérité pour la configuration CORS — HTTP et WebSocket.
 *
 * - Production : `FRONTEND_URL` strict (fallback `http://localhost:3000`).
 * - Développement : regex `^http://localhost:\d+$` pour accepter tous les ports
 *   locaux (preview MCP, Turbopack auto-port, etc.) si `FRONTEND_URL` n'est
 *   pas défini ; sinon `FRONTEND_URL` strict.
 *
 * Utilisé par `main.ts` (`app.enableCors`) et `ws.gateway.ts` (`@WebSocketGateway`)
 * pour éviter qu'un fix HTTP n'oublie le WS et inversement.
 */
export type CorsOrigin = string | RegExp;

export function corsOrigin(): CorsOrigin {
  const isProd = process.env['NODE_ENV'] === 'production';
  const frontendUrl = process.env['FRONTEND_URL'];
  if (isProd) return frontendUrl ?? 'http://localhost:3000';
  return frontendUrl ?? /^http:\/\/localhost:\d+$/;
}
