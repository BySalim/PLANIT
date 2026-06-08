#!/usr/bin/env bash
# V04 LOT 5.4/5.10 — Restauration Postgres depuis un dump backup.sh (durci 2026-06-08).
# Gère les dumps chiffrés (.sql.gz.age) et clairs (.sql.gz), vérifie l'intégrité
# (SHA-256 sidecar) avant d'écraser quoi que ce soit.
# ⚠️ DESTRUCTIF : écrase les données actuelles de la base.
#
#   ./restore.sh /opt/planit/backups/planit-YYYYmmdd-HHMMSS.sql.gz.age
#
# Déchiffrement (.age) : exige la clé privée age, fournie HORS box au moment du
# restore (jamais stockée sur la VM) via PLANIT_BACKUP_AGE_IDENTITY=<fichier-clé>.
# Drill automatisé (non-interactif) : PLANIT_RESTORE_ASSUME_YES=1 ./restore.sh <dump>
set -euo pipefail

DUMP="${1:?Usage: restore.sh <fichier .sql.gz[.age]>}"
[ -f "${DUMP}" ] || { echo "Fichier introuvable: ${DUMP}" >&2; exit 1; }

APP_DIR="${PLANIT_APP_DIR:-/opt/planit}"
[ -f "${APP_DIR}/cd.env" ] && . "${APP_DIR}/cd.env"
COMPOSE_FILE="${PLANIT_COMPOSE_DIR:-${APP_DIR}/src/infra}/docker-compose.prod.yml"
ENV_FILE="${PLANIT_ENV_FILE:-${APP_DIR}/.env.prod}"
# shellcheck disable=SC1090
. "${ENV_FILE}"

dc() { docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"; }

# ── Vérification d'intégrité (si sidecar présent) ────────────────────────────
if [ -f "${DUMP}.sha256" ]; then
  expected="$(cat "${DUMP}.sha256")"
  actual="$(sha256sum "${DUMP}" | awk '{print $1}')"
  if [ "${expected}" != "${actual}" ]; then
    echo "[restore] ÉCHEC INTÉGRITÉ : ${DUMP}" >&2
    echo "[restore]   attendu=${expected}" >&2
    echo "[restore]   obtenu =${actual}" >&2
    exit 1
  fi
  echo "[restore] intégrité OK (sha256 ${actual})"
else
  echo "[restore] ⚠️  pas de sidecar .sha256 — intégrité non vérifiée." >&2
fi

# ── Pipeline de décompression (+ déchiffrement si .age) ──────────────────────
# `decode` écrit le SQL clair sur stdout, qu'on pipe vers psql.
decode() {
  if [[ "${DUMP}" == *.age ]]; then
    command -v age >/dev/null 2>&1 || { echo "[restore] ERREUR : binaire 'age' absent." >&2; exit 1; }
    local ident="${PLANIT_BACKUP_AGE_IDENTITY:?dump chiffré : définir PLANIT_BACKUP_AGE_IDENTITY=<fichier clé privée age>}"
    [ -f "${ident}" ] || { echo "[restore] ERREUR : clé privée introuvable: ${ident}" >&2; exit 1; }
    age -d -i "${ident}" "${DUMP}" | gunzip -c
  else
    gunzip -c "${DUMP}"
  fi
}

# ── Confirmation (sautée en mode drill) ──────────────────────────────────────
echo "⚠️  Restauration de ${DUMP} dans ${POSTGRES_DB} — données actuelles écrasées."
if [ "${PLANIT_RESTORE_ASSUME_YES:-0}" != "1" ]; then
  read -r -p "Confirmer ? (tape 'oui') " ans
  [ "${ans}" = "oui" ] || { echo "Abandon."; exit 1; }
fi

# Stop l'app pour éviter les écritures concurrentes pendant la restauration.
dc stop backend web || true
# Recrée un schéma propre puis réinjecte le dump.
dc exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
decode | dc exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

dc up -d backend web
echo "[restore] OK — vérifie https://${PLANIT_DOMAIN:-planit.local}/api/health/ready"
