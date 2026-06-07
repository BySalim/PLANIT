#!/usr/bin/env bash
# V04 LOT 5.4/5.10 — Restauration Postgres depuis un dump backup.sh.
# ⚠️ DESTRUCTIF : écrase les données actuelles de la base. Usage :
#   ./restore.sh /opt/planit/backups/planit-YYYYmmdd-HHMMSS.sql.gz
set -euo pipefail

DUMP="${1:?Usage: restore.sh <fichier .sql.gz>}"
[ -f "${DUMP}" ] || { echo "Fichier introuvable: ${DUMP}" >&2; exit 1; }

APP_DIR="${PLANIT_APP_DIR:-/opt/planit}"
[ -f "${APP_DIR}/cd.env" ] && . "${APP_DIR}/cd.env"
COMPOSE_FILE="${PLANIT_COMPOSE_DIR:-${APP_DIR}/src/infra}/docker-compose.prod.yml"
ENV_FILE="${PLANIT_ENV_FILE:-${APP_DIR}/.env.prod}"
# shellcheck disable=SC1090
. "${ENV_FILE}"

dc() { docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"; }

echo "⚠️  Restauration de ${DUMP} dans ${POSTGRES_DB} — données actuelles écrasées."
read -r -p "Confirmer ? (tape 'oui') " ans
[ "${ans}" = "oui" ] || { echo "Abandon."; exit 1; }

# Stop l'app pour éviter les écritures concurrentes pendant la restauration.
dc stop backend web || true
# Recrée un schéma propre puis réinjecte le dump.
dc exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c "${DUMP}" | dc exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

dc up -d backend web
echo "[restore] OK — vérifie https://${PLANIT_DOMAIN:-planit.local}/api/health/ready"
