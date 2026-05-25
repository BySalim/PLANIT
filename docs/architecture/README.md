# Architecture PLANIT

Ce dossier contient la documentation d'architecture et les ADR (Architecture Decision Records).

## ADR — Architecture Decision Records

Les ADR tracent les décisions d'architecture structurantes. Format : `NNNN-slug.md`.

| ADR                                                        | Titre                                              | Statut  |
| ---------------------------------------------------------- | -------------------------------------------------- | ------- |
| [0001](adr/0001-monolithe-modulaire-turborepo.md)          | Monolithe modulaire avec Turborepo                 | VALIDE  |
| [0002](adr/0002-tsconfig-base-self-contained.md)           | tsconfig.base.json auto-contenu                    | VALIDE  |
| [0003](adr/0003-shared-packages-built-for-node-runtime.md) | Packages partagés buildés pour Node runtime        | VALIDE  |
| [0004](adr/0004-websocket-realtime-strategy.md)            | Stratégie WebSocket temps réel (Socket.IO + rooms) | ACCEPTÉ |
| [0005](adr/0005-authentication-strategy.md)                | Stratégie d'authentification (JWT + refresh)       | ACCEPTÉ |
| [0006](adr/0006-acces-multi-plateforme-par-acteur.md)      | Accès multi-plateforme par acteur                  | ACCEPTÉ |

## Liens

- [Stack technique](../../PLANIT-Strategie-VibeCode/doxcs/stack-technique-PLANIT.md)
- [Stratégie monorepo](../../PLANIT-Strategie-VibeCode/strategies/03-STRUCTURE-MONOREPO.md)
