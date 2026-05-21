# Tech Debt PLANIT

| ID     | Description                                                | Impact                                                      | Priorité | Vague cible |
| ------ | ---------------------------------------------------------- | ----------------------------------------------------------- | -------- | ----------- |
| TD-001 | `apps/mobile` squelette — Expo non configuré               | Aucun dev mobile possible                                   | Haute    | Vague 04    |
| TD-002 | `apps/whatsapp-bot` squelette — Baileys non intégré        | Pas de diffusion WhatsApp                                   | Haute    | Vague 04    |
| TD-003 | `MailService` stub — pas de provider email réel            | Pas d'emails transactionnels                                | Moyenne  | Vague 02    |
| TD-004 | Pas de tests unitaires écrits — vitest configuré seulement | Couverture 0%                                               | Haute    | Vague 01    |
| TD-005 | ESLint flat config pas encore branché sur les apps         | Lint non enforced automatiquement                           | Moyenne  | Vague 01    |
| TD-006 | `prisma.seed` défini dans `package.json#prisma` (déprécié) | Warning Prisma 7, migration requise vers `prisma.config.ts` | Faible   | Vague 02    |
| TD-007 | `playwright install chromium` non exécuté localement       | Tests e2e non lançables (hors CI)                           | Moyenne  | Vague 01    |
