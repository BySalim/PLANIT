# Runbook — Migrations Prisma

> Convention de nommage, création, rollback dev, procédure prod.
> Le seed canonical reste `apps/backend/prisma/seed.ts` (idempotent).

---

## 1. Convention de nommage

Prisma horodate automatiquement chaque migration avec un préfixe
`YYYYMMDDHHMMSS`. **Ne pas le réécrire à la main.** Le suffixe est libre
mais doit être en **kebab-case** et descriptif :

```
apps/backend/prisma/migrations/
  20260521020624_vague01_planning_models/
  20260524142203_add_published_classe_index/
```

Format imposé :

- Préfixe `vague<NN>_` pour les migrations structurantes d'une vague
  (création/refonte de modèles).
- Préfixe `add_` / `remove_` / `rename_` / `index_` pour les petites
  évolutions ciblées.
- Pas d'accents, pas de majuscules, pas de date dans le suffixe.

Exemples valides :

```
vague02_auth_models
add_refresh_token_family_index
rename_user_email_unique_constraint
remove_legacy_seance_status_enum
```

---

## 2. Créer une migration

### En cours de session feature

```bash
# 1. Modifier prisma/schema.prisma (soft-lock recommandé)
# 2. Générer + appliquer la migration en dev
pnpm --filter @planit/backend exec prisma migrate dev --name <slug-kebab>

# 3. Régénérer le client (souvent fait automatiquement par migrate dev)
pnpm --filter @planit/backend exec prisma generate

# 4. Re-seeder si besoin (idempotent)
pnpm db:seed
```

`prisma migrate dev` :

1. Crée le dossier `migrations/YYYYMMDDHHMMSS_<slug>/` avec un
   `migration.sql` calculé depuis le diff `schema.prisma` actuel.
2. Applique la migration sur la base de dev.
3. Regénère le client Prisma.
4. Tente de rejouer le seed (`prisma.seed` dans `package.json`).

**Commit obligatoirement** :

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/<nouveau-dossier>/`
- `apps/backend/prisma/migrations/migration_lock.toml` (si modifié)

Pas de `--create-only` sans bonne raison : ça produit une migration vide
qu'il faut éditer à la main — source d'erreurs.

### Si tu n'as fait que tester un schéma sans le commit

```bash
# Réinitialiser proprement sans laisser de migration parasite
pnpm --filter @planit/backend exec prisma migrate reset --force
```

---

## 3. Rollback en dev (destructif)

**En dev uniquement** — réinitialise la base et rejoue toutes les
migrations + le seed depuis zéro :

```bash
pnpm db:reset
# = prisma migrate reset --force
# = drop + recreate + rejoue toutes les migrations + rejoue seed.ts
```

Quand l'utiliser :

- Conflit de migration entre branches après un rebase.
- Migration créée par erreur qu'on veut effacer (avant de la supprimer
  du filesystem).
- Base corrompue après tests destructifs.

**Ne jamais lancer en production.** Aucune sauvegarde, aucun confirm.

---

## 4. Gérer un conflit de migration entre branches

Scénario : `feat/oumar` et `feat/salim` ont chacun créé une migration
le même jour. Après merge, le `migration_lock.toml` peut diverger.

Procédure :

```bash
# 1. Rebase la branche en retard sur develop à jour
git fetch origin
git rebase origin/develop

# 2. Si conflit sur migration_lock.toml → garder la version develop
git checkout --theirs apps/backend/prisma/migrations/migration_lock.toml

# 3. Supprimer la migration locale obsolète
rm -rf apps/backend/prisma/migrations/YYYYMMDDHHMMSS_<ton-slug>/

# 4. Re-créer la migration par-dessus le nouveau head
pnpm --filter @planit/backend exec prisma migrate dev --name <slug>

# 5. Recommit
git add apps/backend/prisma/
git commit -m "fix(prisma): rebase migration on top of develop"
```

Voir aussi : `docs/shared-resources-lock.md` pour éviter en amont.

---

## 5. Procédure prod (à venir Vague 02)

À documenter quand le déploiement Hetzner sera branché. Esquisse :

1. Pull du commit cible sur le serveur prod.
2. Backup Postgres (`pg_dump`) **avant** toute migration.
3. `pnpm --filter @planit/backend exec prisma migrate deploy`
   (n'applique que les migrations déjà commitées, ne génère rien).
4. Validation des healthchecks puis bascule du trafic.
5. Garder le backup 7 jours.

**Interdit en prod** :

- `prisma migrate dev` (modifie le schéma à la volée)
- `prisma migrate reset` (destructif total)
- `prisma db push` (drift silencieux)

Voir aussi : [`deploy.md`](deploy.md).

---

## 6. Cas particuliers

### Renommer une colonne / table

Prisma ne sait pas inférer un rename (il voit DROP + CREATE). Deux
stratégies :

1. **Rename en place** (préserve les données) — éditer la migration
   `migration.sql` à la main pour utiliser `ALTER TABLE … RENAME COLUMN`.
2. **Migration en deux temps** : ajouter le nouveau champ, copier les
   données, supprimer l'ancien dans une seconde migration.

À documenter par ADR si le rename touche un modèle exposé via
`@planit/contracts`.

### Ajouter un index sans bloquer (prod)

Postgres `CREATE INDEX CONCURRENTLY` est non bloquant mais ne fonctionne
**pas dans une transaction**. Prisma enveloppe par défaut chaque
migration dans `BEGIN`/`COMMIT`. Solution :

1. Créer une migration vide :
   ```bash
   pnpm --filter @planit/backend exec prisma migrate dev \
     --create-only --name add_seance_classe_idx_concurrent
   ```
2. Éditer le `migration.sql` produit pour mettre `-- prisma migrate
ignore-transaction` en tête et utiliser `CREATE INDEX CONCURRENTLY`.

---

## 7. Vérifications post-migration

Avant de pousser :

```bash
# 1. Le schéma compile-t-il ?
pnpm --filter @planit/backend exec prisma validate

# 2. Le client Prisma typescheck-t-il ?
pnpm --filter @planit/backend typecheck

# 3. Le seed passe-t-il ?
pnpm db:reset

# 4. Les tests backend tournent-ils ?
pnpm --filter @planit/backend test
```

Les 4 doivent être verts. Sinon, la migration est cassée.

---

## 8. Liens

- Schéma : `apps/backend/prisma/schema.prisma`
- Seed : `apps/backend/prisma/seed.ts`
- Migrations : `apps/backend/prisma/migrations/`
- Soft-locks : [`/docs/shared-resources-lock.md`](../shared-resources-lock.md)
- Runbook setup : [`local-setup-faq.md`](local-setup-faq.md)
- Runbook déploiement : [`deploy.md`](deploy.md)
