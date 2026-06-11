#!/usr/bin/env bash
# V04 LOT 5.4 — Backup Postgres planifié de la stack prod (ADR-0013 §7, V4-D11c/D12).
# Durci 2026-06-08 (posture « VM = serveur de référence rejouable ») :
#   1. dump local gzip dans /opt/planit/backups,
#   2. CHIFFREMENT au repos via `age` (clé publique sur la box ; clé privée gardée
#      HORS box → une compromission de la VM ne déchiffre pas les sauvegardes),
#   3. SHA-256 sidecar (intégrité vérifiable au restore),
#   4. rotation GFS (quotidien/hebdo/mensuel) au lieu d'un KEEP plat,
#   5. copie OFF-BOX (mount NFS TrueNAS) + même GFS — protège du cas « VM détruite »,
#   5bis. copie OFF-SITE CLOUD (objet S3-compatible B2/R2 via rclone) — protège du
#         cas « site on-prem (box + TrueNAS) indisponible » (V04 LOT 8.9 / ADR-0017),
#   6. ALERTE (Uptime Kuma push / webhook) si le backup échoue, heartbeat si OK.
# Restauration : voir restore.sh + docs/runbooks/incident-dr.md + truenas-backup.md.
set -euo pipefail

APP_DIR="${PLANIT_APP_DIR:-/opt/planit}"
[ -f "${APP_DIR}/cd.env" ] && . "${APP_DIR}/cd.env"
COMPOSE_FILE="${PLANIT_COMPOSE_DIR:-${APP_DIR}/src/infra}/docker-compose.prod.yml"
ENV_FILE="${PLANIT_ENV_FILE:-${APP_DIR}/.env.prod}"
BACKUP_DIR="${PLANIT_BACKUP_DIR:-${APP_DIR}/backups}"

# ── Rétention GFS (nombre de points à conserver par granularité) ─────────────
KEEP_DAILY="${PLANIT_BACKUP_KEEP_DAILY:-7}"
KEEP_WEEKLY="${PLANIT_BACKUP_KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${PLANIT_BACKUP_KEEP_MONTHLY:-6}"

# ── Chiffrement (recommandé) ─────────────────────────────────────────────────
# Clé publique age (commence par `age1…`). PUBLIQUE → peut vivre dans cd.env.
# La clé privée correspondante ne doit JAMAIS être sur la VM (cf. truenas-backup.md).
AGE_RECIPIENT="${PLANIT_BACKUP_AGE_RECIPIENT:-}"

# ── Off-box (mount NFS TrueNAS) ──────────────────────────────────────────────
OFFBOX_DIR="${PLANIT_BACKUP_OFFBOX_DIR:-}"

# ── Alerting (Uptime Kuma push monitor ou webhook générique ; optionnel) ─────
PUSH_URL="${PLANIT_BACKUP_PUSH_URL:-}"

# shellcheck disable=SC1090
. "${ENV_FILE}"
mkdir -p "${BACKUP_DIR}"
ts="$(date +%Y%m%d-%H%M%S)"

# ── Notification : prévient un moniteur externe en cas d'échec (trap ERR) ────
notify() { # $1 = up|down ; $2 = message
  [ -n "${PUSH_URL}" ] || return 0
  local sep='?'; [[ "${PUSH_URL}" == *\?* ]] && sep='&'
  curl -fsS -m 10 --retry 2 "${PUSH_URL}${sep}status=$1&msg=$2" >/dev/null 2>&1 || true
}
trap 'notify down backup-failed' ERR

# ── 1. Dump local ────────────────────────────────────────────────────────────
raw="${BACKUP_DIR}/planit-${ts}.sql.gz"
echo "[backup] dump ${POSTGRES_DB} → ${raw}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${raw}"

# ── 2. Chiffrement au repos (age) ────────────────────────────────────────────
if [ -n "${AGE_RECIPIENT}" ]; then
  if ! command -v age >/dev/null 2>&1; then
    echo "[backup] ERREUR : PLANIT_BACKUP_AGE_RECIPIENT défini mais binaire 'age' absent (apt-get install -y age)." >&2
    exit 1
  fi
  out="${raw}.age"
  age -r "${AGE_RECIPIENT}" -o "${out}" "${raw}"
  rm -f "${raw}"
  echo "[backup] chiffré (age) → ${out}"
else
  echo "[backup] ⚠️  PLANIT_BACKUP_AGE_RECIPIENT non défini → dump NON chiffré (acceptable en local seulement)." >&2
  out="${raw}"
fi

# ── 3. Intégrité : SHA-256 sidecar ───────────────────────────────────────────
sha256sum "${out}" | awk '{print $1}' > "${out}.sha256"

echo "[backup] local OK ($(du -h "${out}" | cut -f1)). Empreinte : $(cat "${out}.sha256")"

# ── Rotation GFS (grandfather-father-son) ────────────────────────────────────
# Conserve : les KEEP_DAILY derniers jours, 1 point/semaine sur KEEP_WEEKLY
# semaines, 1 point/mois sur KEEP_MONTHLY mois. Le reste est supprimé (+ sidecar).
prune_gfs() {
  local dir="$1"
  [ -d "${dir}" ] || return 0
  local files=()
  while IFS= read -r f; do files+=("$f"); done < <(
    ls -1t "${dir}"/planit-*.sql.gz "${dir}"/planit-*.sql.gz.age 2>/dev/null
  )
  [ "${#files[@]}" -gt 0 ] || return 0
  declare -A keep day_seen week_seen month_seen
  local f base datestr d iso wk mo
  local nd=0 nw=0 nm=0   # compteurs (évite ${#assoc[@]} sur tableau vide sous set -u)
  for f in "${files[@]}"; do
    base="$(basename "${f}")"
    datestr="${base#planit-}"; datestr="${datestr%%.*}"   # YYYYmmdd-HHMMSS
    d="${datestr%%-*}"                                     # YYYYmmdd
    if [[ ! "${d}" =~ ^[0-9]{8}$ ]]; then keep["${f}"]=1; continue; fi  # illisible → on garde
    iso="${d:0:4}-${d:4:2}-${d:6:2}"
    wk="$(date -d "${iso}" +%G-%V 2>/dev/null || echo "${d}")"
    mo="${d:0:6}"
    if [ -z "${day_seen[$d]:-}" ]    && [ "${nd}" -lt "${KEEP_DAILY}" ];   then day_seen[$d]=1;   nd=$((nd + 1)); keep["${f}"]=1; fi
    if [ -z "${week_seen[$wk]:-}" ]  && [ "${nw}" -lt "${KEEP_WEEKLY}" ];  then week_seen[$wk]=1; nw=$((nw + 1)); keep["${f}"]=1; fi
    if [ -z "${month_seen[$mo]:-}" ] && [ "${nm}" -lt "${KEEP_MONTHLY}" ]; then month_seen[$mo]=1; nm=$((nm + 1)); keep["${f}"]=1; fi
  done
  for f in "${files[@]}"; do
    if [ -z "${keep[$f]:-}" ]; then rm -f "${f}" "${f}.sha256"; fi
  done
  return 0
}
prune_gfs "${BACKUP_DIR}"
echo "[backup] rotation GFS locale OK (D=${KEEP_DAILY}/W=${KEEP_WEEKLY}/M=${KEEP_MONTHLY}). Dumps locaux : $(ls -1 "${BACKUP_DIR}"/planit-*.sql.gz "${BACKUP_DIR}"/planit-*.sql.gz.age 2>/dev/null | wc -l)"

# ── 5. Copie off-box (optionnelle mais recommandée) ──────────────────────────
# Si PLANIT_BACKUP_OFFBOX_DIR est défini (mount NFS TrueNAS), on y recopie le dump
# + son sidecar puis on y applique la même rotation GFS. Un échec ici est **fatal**
# (exit 1) : le dump local est OK, mais l'off-box est la seule protection « VM
# détruite » → on veut l'alerte (le trap ERR enverra `status=down`).
if [ -n "${OFFBOX_DIR}" ]; then
  if [ ! -d "${OFFBOX_DIR}" ] || [ ! -w "${OFFBOX_DIR}" ]; then
    echo "[backup] ERREUR off-box : '${OFFBOX_DIR}' absent, non-monté ou non inscriptible." >&2
    echo "[backup]   (le dump local '${out}' est OK — vérifier le mount NFS TrueNAS)" >&2
    exit 1
  fi
  echo "[backup] copie off-box → ${OFFBOX_DIR}/"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a "${out}" "${out}.sha256" "${OFFBOX_DIR}/"
  else
    cp -p "${out}" "${out}.sha256" "${OFFBOX_DIR}/"
  fi
  prune_gfs "${OFFBOX_DIR}"
  echo "[backup] off-box OK. Dumps off-box : $(ls -1 "${OFFBOX_DIR}"/planit-*.sql.gz "${OFFBOX_DIR}"/planit-*.sql.gz.age 2>/dev/null | wc -l)"
fi

# ── 5bis. Copie off-site CLOUD (objet S3-compatible via rclone — recommandé prod) ─
# V04 LOT 8.9 / ADR-0017 : 2ᵉ cible off-site en plus du TrueNAS. CLOUD_REMOTE = un
# remote rclone (ex. `r2:planit-backups/prod` ou `b2:planit-backups/prod`, configuré
# via `rclone config` sur la box). Échec = FATAL (trap ERR → alerte) car c'est la
# protection « site on-prem KO ». Rétention : privilégier une lifecycle rule du
# bucket (B2/R2) ; un purge d'âge simple s'applique aussi si CLOUD_KEEP_DAYS est posé.
CLOUD_REMOTE="${PLANIT_BACKUP_CLOUD_REMOTE:-}"
CLOUD_KEEP_DAYS="${PLANIT_BACKUP_CLOUD_KEEP_DAYS:-}"
if [ -n "${CLOUD_REMOTE}" ]; then
  if ! command -v rclone >/dev/null 2>&1; then
    echo "[backup] ERREUR cloud : PLANIT_BACKUP_CLOUD_REMOTE défini mais 'rclone' absent (apt-get install -y rclone)." >&2
    exit 1
  fi
  echo "[backup] copie off-site cloud → ${CLOUD_REMOTE}/"
  rclone copyto "${out}" "${CLOUD_REMOTE}/$(basename "${out}")"
  rclone copyto "${out}.sha256" "${CLOUD_REMOTE}/$(basename "${out}").sha256"
  if [ -n "${CLOUD_KEEP_DAYS}" ]; then
    # Purge best-effort des objets plus vieux que N jours (non fatal : l'upload est fait).
    rclone delete --min-age "${CLOUD_KEEP_DAYS}d" --include 'planit-*' "${CLOUD_REMOTE}" || true
  fi
  echo "[backup] cloud OK (${CLOUD_REMOTE})."
fi

# ── 6. Heartbeat de succès ───────────────────────────────────────────────────
trap - ERR
notify up backup-ok
echo "[backup] terminé."
