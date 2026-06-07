#!/usr/bin/env bash
# V04 LOT 5.4 — Backup Postgres planifié de la stack prod (ADR-0013 §7).
# TrueNAS absent chez le TL → dump local dans /opt/planit/backups (+ option :
# dossier partagé VirtualBox vers l'hôte = copie off-box du pauvre). Rotation.
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

echo "[backup] OK ($(du -h "${out}" | cut -f1)). Dumps conservés : $(ls -1 "${BACKUP_DIR}"/planit-*.sql.gz | wc -l)"
