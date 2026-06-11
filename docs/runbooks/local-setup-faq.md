# Runbook — Setup local PLANIT, FAQ

> Version étendue de la FAQ du README : setup local pas-à-pas + solutions
> validées aux problèmes rencontrés par l'équipe (Vagues 01 → 04).

---

## 1. Pré-requis logiciels

| Outil          | Version min   | Vérifier                 |
| -------------- | ------------- | ------------------------ |
| Node.js        | 22.x (CI: 24) | `node -v`                |
| pnpm           | 10.x          | `pnpm -v`                |
| Docker         | 24.x          | `docker -v`              |
| Docker Compose | v2 (plugin)   | `docker compose version` |
| Git            | 2.40+         | `git --version`          |

**Windows** : Docker Desktop avec backend WSL2, ou Docker dans une distro
WSL native. Voir section dédiée plus bas.

---

## 2. Installation initiale

```bash
git clone <repo-url> PLANIT && cd PLANIT
pnpm install                           # `postinstall` build @planit/contracts + utils
cp .env.example .env
docker compose -f infra/docker-compose.dev.yml up -d
pnpm db:migrate                        # applique les migrations Prisma
pnpm db:seed                           # comptes des 4 rôles + données démo
pnpm dev                               # web + backend en parallèle
```

> 💡 **`db:migrate` + `db:seed`** au premier run (base vierge), pas `db:reset` :
> `db:reset` **drop** la base avant de rejouer migrations + seed — pratique pour
> repartir de zéro (cf. §4) mais destructeur. Sur une base neuve, `migrate` suffit.

Si tout passe, l'app est sur :

- Frontend : http://localhost:3000
- Backend : http://localhost:3001 (préfixe `/api`, ex. `/api/health`)
- Swagger : http://localhost:3001/docs
- MinIO console : http://localhost:9001 (`planit_minio` / `planit_minio_dev`)

### Comptes de connexion (après `db:seed`)

Tous au mot de passe **`Test1234!`** (argon2id). Source de vérité :
[`apps/backend/prisma/seed-data.ts`](../../apps/backend/prisma/seed-data.ts).

| Rôle (UI)  | Email                        |
| ---------- | ---------------------------- |
| RP         | `aminata.diallo@planit.test` |
| AC         | `awa.toure@planit.test`      |
| Enseignant | `oumar.ndiaye@planit.test`   |
| Étudiant   | `ibrahima.sow@planit.test`   |

> Après login, le front redirige chaque rôle vers sa home (`ROLE_HOME`). En dev,
> le **DevToolsFloater** (bouton ⚙️ flottant, `NODE_ENV=development` uniquement)
> affiche la session courante et un bouton _Déconnexion_ — pratique pour
> enchaîner les connexions sous différents rôles.

---

## 3. Problèmes courants

### 3.1 `pnpm install` qui timeout

**Symptôme** : `ERR_PNPM_FETCH_TIMEOUT` ou téléchargement qui s'arrête au
bout de quelques minutes.

**Cause** : latence elevée du registry npm depuis Dakar, en particulier
les jours de mauvaise bande passante internationale.

**Solution** :

```bash
pnpm install --fetch-timeout=180000 --fetch-retries=5
```

Pour persister ces valeurs dans `~/.npmrc` :

```
fetch-timeout=180000
fetch-retries=5
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000
```

Si vraiment trop lent, utiliser un mirror plus proche
(`pnpm config set registry https://registry.npmmirror.com`) — à
**détailler dans la PR** si on commit la modif.

### 3.2 Docker non démarré

**Symptôme** : `Cannot connect to the Docker daemon` ou `connection
refused` quand `pnpm db:reset` essaie d'atteindre Postgres.

**Solution** :

```bash
# Démarrer le démon Docker (Linux/macOS)
sudo systemctl start docker            # systemd
# ou ouvrir Docker Desktop sur Windows/macOS

# Puis démarrer les services PLANIT
docker compose -f infra/docker-compose.dev.yml up -d postgres redis
```

Vérifier qu'ils tournent :

```bash
docker compose -f infra/docker-compose.dev.yml ps
```

Postgres doit être `Up` et `healthy`.

### 3.3 `pg_isready` timeout

**Symptôme** : un script attend Postgres mais n'obtient jamais `accepting
connections`.

**Causes possibles** :

1. **Postgres pas encore prêt** — la première migration sur volume vide
   peut prendre 30-60s. Attendre.
2. **Port 5432 déjà pris** par un autre Postgres local (Homebrew,
   service système). Lister :

   ```bash
   lsof -i :5432           # macOS/Linux
   netstat -ano | findstr :5432   # Windows
   ```

   Tuer l'autre Postgres ou changer le port dans
   `infra/docker-compose.dev.yml`.

3. **Healthcheck mal calibré** — vérifier `docker logs <postgres-container>`,
   chercher `database system is ready to accept connections`.

### 3.4 Windows : glob qui timeout via UNC

**Symptôme** : sous Windows + WSL, certains scripts (`tsc`, `vitest`,
`prisma generate`) prennent un temps anormal ou échouent avec un timeout
sur des glob `**/*.ts`.

**Cause** : le projet est ouvert via un chemin **UNC**
(`\\wsl.localhost\Ubuntu\home\...`) qui passe par le pont SMB. Chaque
`stat` syscall est ~10× plus lent qu'en natif.

**Solution** : **travailler depuis le filesystem ext4 natif** WSL.

```bash
# Ouvrir une session WSL et faire :
cd /home/<user>/projects/PLANIT
code .                 # ouvre VS Code en mode WSL Remote
```

Plus d'UNC, plus de timeout. Si VS Code propose « Reopen in WSL »,
accepter.

### 3.5 Pre-commit qui échoue (perms read-only)

**Symptôme** : `pre-commit` échoue sur `EACCES: permission denied,
open '<fichier>'`.

**Cause** : un fichier généré (build, lint --fix) est resté en
read-only après un `chmod` malheureux.

**Solution** :

```bash
chmod u+w <fichier-en-faute>
git add <fichier-en-faute>
git commit ...                # retenter
```

Pour une réparation massive (rare) :

```bash
chmod -R u+w .
```

### 3.6 Windows : `EPERM` sur Prisma

**Symptôme** : `EPERM: operation not permitted` lors de `pnpm db:generate`
ou `prisma migrate dev`.

**Cause** : un process Node ou un watcher (souvent `tsc --watch` ou
`nest start --watch`) tient ouvert `node_modules/.prisma/client/`.

**Solution** :

```bash
# Tuer tous les watchers
Ctrl+C dans le terminal `pnpm dev`

# Si ça ne suffit pas, killer node :
taskkill /F /IM node.exe     # PowerShell admin

# Puis relancer
pnpm db:generate
```

### 3.7 `planit_test` n'existe pas (tests intégration)

**Symptôme** : `pnpm test` côté backend échoue avec
`database "planit_test" does not exist`.

**Cause** : le script `infra/postgres/initdb/` crée `planit_test` au
premier démarrage du volume Postgres. Si le volume existait déjà, il n'a
pas été rejoué.

**Solution** :

```bash
docker compose -f infra/docker-compose.dev.yml exec postgres \
  psql -U planit -c 'CREATE DATABASE planit_test;'
```

Ou, plus radical (perd toutes les données dev) :

```bash
docker compose -f infra/docker-compose.dev.yml down -v
docker compose -f infra/docker-compose.dev.yml up -d
pnpm db:reset
```

### 3.8 Ports déjà pris

| Port | Service       | Symptôme                                    |
| ---- | ------------- | ------------------------------------------- |
| 3000 | Frontend Next | `EADDRINUSE` au lancement de `pnpm dev`     |
| 3001 | Backend Nest  | Idem                                        |
| 5432 | Postgres      | Compose remonte un autre conteneur ou crash |
| 6379 | Redis         | Idem                                        |
| 9000 | MinIO API     | MinIO refuse de démarrer                    |
| 9001 | MinIO Console | Console inaccessible                        |

Trouver le coupable :

```bash
lsof -i :3000              # macOS/Linux
netstat -ano | findstr :3000   # Windows PowerShell
```

Soit tuer le process, soit changer le port dans `.env` (web/backend) ou
dans `infra/docker-compose.dev.yml` (Postgres/Redis/MinIO).

### 3.9 `pnpm dev` mais le backend ne reçoit pas de requêtes

**Symptôme** : le frontend tourne mais les fetch vers `/api/...` retournent
404 ou ne joignent pas le backend.

**Causes possibles** :

1. Le backend a planté au boot — vérifier les logs (terminal qui affiche
   `[Nest]`).
2. Le proxy same-origin ne joint pas le backend — depuis l'auth V02, le front
   appelle `/api` en **relatif** (`apps/web/src/lib/api.ts`, `API_BASE='/api'`)
   et `next.config.ts` réécrit `/api/:path*` vers `BACKEND_ORIGIN` (défaut
   `http://localhost:3001`). Pas de `NEXT_PUBLIC_API_URL` : le relatif garde les
   cookies d'auth _first-party_. Vérifier que le backend tourne bien sur `:3001`.
3. CORS bloqué — `FRONTEND_URL` dans `.env` (backend) doit matcher l'origine
   réelle du frontend (`http://localhost:3000` par défaut).

### 3.10 WebSocket ne reçoit pas les events

**Symptôme** : le RP publie, mais l'onglet enseignant ne reçoit pas le toast.

**Étapes de debug** :

1. **Onglet DevTools → Network → WS** : vérifier qu'une connexion
   `socket.io/?EIO=4&transport=websocket` est établie (statut `101`).
2. **Onglet Network → WS → Messages** : voir si l'event `session:published`
   arrive bien.
3. Vérifier dans la console serveur le log `[WS] client connected: <id>
(user <userId>)`.
4. Vérifier que le `userId` envoyé au handshake correspond bien à
   l'enseignant concerné (cf. `useCurrentTeacher()` hardcodé V1).

Voir aussi `docs/runbooks/ws-events.md` pour la liste exhaustive des
events.

---

## 4. Reset complet (« nuke and re-pave »)

Quand on veut repartir de zéro :

```bash
# 1. Stopper tout
# Ctrl+C sur le terminal `pnpm dev` (arrête web + backend lancés en parallèle)
docker compose -f infra/docker-compose.dev.yml down -v   # -v efface les volumes !

# 2. Nettoyer Node
rm -rf node_modules
find . -name "node_modules" -type d -prune -exec rm -rf {} +
find . -name "dist" -type d -prune -exec rm -rf {} +
find . -name ".next" -type d -prune -exec rm -rf {} +

# 3. Réinstaller
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d
pnpm db:reset
pnpm dev
```

Compter ~10-15 min selon la bande passante.

---

## 5. Liens

- README racine : [`/README.md`](../../README.md)
- Tech debt : [`/docs/tech-debt.md`](../tech-debt.md)
- Runbook déploiement : [`/docs/runbooks/deploy.md`](deploy.md)
- Runbook migrations : [`/docs/runbooks/migrations.md`](migrations.md)
- Runbook WS events : [`/docs/runbooks/ws-events.md`](ws-events.md)
