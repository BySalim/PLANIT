import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexte de requête propagé via `AsyncLocalStorage` (V04+, ADR-0009 Phase 1).
 * Permet d'attacher un `requestId` à **chaque ligne de log** sans le passer en
 * paramètre à travers toute la pile d'appels — le logger pino lit ce store via
 * son `mixin` (cf. logger.module.ts).
 */
export interface RequestStore {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

/** Retourne le requestId de la requête courante, ou `undefined` hors requête. */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
