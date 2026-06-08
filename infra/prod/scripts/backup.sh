#!/usr/bin/env bash
# V04 LOT 5.4 — Backup Postgres planifié de la stack prod (ADR-0013 §7).
# Deux niveaux : (1) dump local gzip dans /opt/planit/backups (avec rotation),
# puis (2) copie **off-box** optionnelle vers PLANIT_BACKUP_OFFBOX_DIR —
# typiquement un partage NFS TrueNAS monté sur la VM (V4-D12). C'est l'off-box
# qui protège du cas « VM détruite ». Cf. docs/runbooks/truenas-backup.md.
# Restauration : voir restore.sh + docs/runbooks/incident-dr.md.
set -euo pipefail

APP_DIR="${PLANIT_APP_DIR:-/opt/planit}"
[ -f "${APP_DIR}/cd.env" ] && . "${APP_DIR}/cd.env"
COMPOSE_FILE="${PLANIT_COMPOSE_DIR:-${APP_DIR}/src/infra}/docker-compose.prod.yml"
ENV_FILE="${PLANIT_ENV_FILE:-${APP_DIR}/.env.prod}"
BACKUP_DIR="${PLANIT_BACKUP_DIR:-${APP_DIR}/backups}"
KEEP="${PLANIT_BACKUP_KEEP:-14}"   # nombre de dumps conservés

# shellcheck disable=SC1090
. "${ENV_FILE}"
mkdir -p "${BACKUP_DIR}"
ts="$(date +%Y%m%d-%H%M%S)"
out="${BACKUP_DIR}/planit-${ts}.sql.gz"

echo "[backup] dump ${POSTGRES_DB} → ${out}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${out}"

# Rotation : ne garder que les ${KEEP} plus récents.
ls -1t "${BACKUP_DIR}"/planit-*.sql.gz 2>/dev/null | tail -n "+$((KEEP + 1))" | xargs -r rm -f

echo "[backup] local OK ($(du -h "${out}" | cut -f1)). Dumps locaux : $(ls -1 "${BACKUP_DIR}"/planit-*.sql.gz | wc -l)"

# ── Copie off-box (optionnelle) ─────────────────────────────────────────────
# Si PLANIT_BACKUP_OFFBOX_DIR est défini (mount NFS TrueNAS), on y recopie le
# dump puis on y applique la même rotation. Un échec ici est **fatal** (exit 1) :
# le dump local est déjà en sécurité, mais l'off-box est la seule protection
# « VM détruite » → on veut être alerté si le mount est tombé.
OFFBOX_DIR="${PLANIT_BACKUP_OFFBOX_DIR:-}"
if [ -n "${OFFBOX_DIR}" ]; then
  if [ ! -d "${OFFBOX_DIR}" ] || [ ! -w "${OFFBOX_DIR}" ]; then
    echo "[backup] ERREUR off-box : '${OFFBOX_DIR}' absent, non-monté ou non inscriptible." >&2
    echo "[backup]   (le dump local '${out}' est OK — vérifier le mount NFS TrueNAS)" >&2
    exit 1
  fi
  echo "[backup] copie off-box → ${OFFBOX_DIR}/"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a "${out}" "${OFFBOX_DIR}/"
  else
    cp -p "${out}" "${OFFBOX_DIR}/"
  fi
  # Rotation off-box (même politique ${KEEP} que le local).
  ls -1t "${OFFBOX_DIR}"/planit-*.sql.gz 2>/dev/null | tail -n "+$((KEEP + 1))" | xargs -r rm -f
  echo "[backup] off-box OK. Dumps off-box : $(ls -1 "${OFFBOX_DIR}"/planit-*.sql.gz 2>/dev/null | wc -l)"
fi
