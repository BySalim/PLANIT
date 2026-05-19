---
id: ADR-0001
titre: Monolithe modulaire avec Turborepo
statut: VALIDE
date: 2026-05-19
auteur: salim
---

# ADR-0001 — Monolithe modulaire avec Turborepo

## Contexte

PLANIT est une plateforme multi-acteurs (Web, Mobile, WhatsApp Bot, Backend) développée par une équipe de 5 étudiants en vibe-coding autonome. Il faut choisir une stratégie de repo et de build.

## Décision

Monorepo unique géré par **Turborepo** + **pnpm workspaces**, avec la structure suivante :

```
apps/     — web · backend · mobile · whatsapp-bot
packages/ — contracts · ui · design-tokens · config · utils
```

Les packages partagés (`contracts`, `design-tokens`) évitent la duplication de types et de tokens entre le frontend et le backend.

## Alternatives considérées

| Option                       | Raison d'écart                                                         |
| ---------------------------- | ---------------------------------------------------------------------- |
| Multi-repo (4 repos séparés) | Synchronisation des types contracts impossible sans registry npm privé |
| Nx                           | Overhead de configuration trop important pour 5 étudiants en bootstrap |
| Lerna (legacy)               | Déprécié, remplacé par Turborepo                                       |

## Conséquences

- **Positif** : Refactoring cross-package simple, un seul `pnpm install`, CI unifié.
- **Positif** : `@planit/contracts` garantit que le frontend et le backend partagent les mêmes types Zod sans copier-coller.
- **Négatif** : Le repo grossit plus vite (toutes les dépendances npm en un `node_modules` avec hoisting pnpm).
- **Négatif** : Un bug de build dans un package bloque potentiellement toutes les apps.

## Réversibilité

Réversible : chaque `apps/*` peut être extrait en repo séparé si l'équipe grossit (publish les packages sur npm).
