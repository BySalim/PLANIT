#!/usr/bin/env bash
# V04 LOT 5.8 — Agent de déploiement continu PULL-BASED pour la VM self-host.
# (ADR-0013 §6, V4-D13/D16). Connexion SORTANTE seule : la VM interroge GHCR,
# déploie si une nouvelle image est dispo, smoke, et ROLLBACK au digest précédent
# en cas d'échec. Aucun runner self-hosted (repo public → V4-D16).
#
# Idempotent : si aucune nouvelle image, ne fait rien. Conçu pour tourner via
# systemd timer (planit-cd.timer). Verrou flock = pas de run concurrent.
set -euo pipefail

# ── Config (surchargée par /opt/planit/cd.env si présent) ────────────────────
APP_DIR="${PLANIT_APP_DIR:-/opt/planit}"
[ -f "${APP_DIR}/cd.env" ] && . "${APP_DIR}/cd.env"

COMPOSE_DIR="${PLANIT_COMPOSE_DIR:-${APP_DIR}/src/infra}"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.prod.yml"
ENV_FILE="${PLANIT_ENV_FILE:-${APP_DIR}/.env.prod}"
IMAGE_TAG="${IMAGE_TAG:-main}"          # tag mouvant suivi par la VM
DOMAIN="${PLANIT_DOMAIN:-planit.local}"
LOG_FILE="${PLANIT_CD_LOG:-${APP_DIR}/cd.log}"
API_IMG="ghcr.io/bysalim/planit-api:${IMAGE_TAG}"
WEB_IMG="ghcr.io/bysalim/planit-web:${IMAGE_TAG}"

log() { echo "$(date -Is) [cd] $*" | tee -a "${LOG_FILE}"; }
dc() { IMAGE_TAG="${IMAGE_TAG}" docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"; }
img_id() { docker image inspect --format '{{.Id}}' "$1" 2>/dev/null || echo "none"; }

# Verrou : un seul agent à la fois.
exec 9>"${APP_DIR}/.cd.lock"
flock -n 9 || { log "déjà en cours, abandon"; exit 0; }

log "poll ${IMAGE_TAG} (backend/web/migrate)…"
PREV_API="$(img_id "${API_IMG}")"
PREV_WEB="$(img_id "${WEB_IMG}")"

# Pull des services dont l'image vient de GHCR (noms de SERVICES compose).
# Garde-fou : distingue un échec d'AUTH (token read:packages expiré/absent sur
# images privées) d'un échec réseau, et loggue l'action corrective.
pull_out="$(mktemp)"
if ! dc pull backend web migrate >"${pull_out}" 2>&1; then
  cat "${pull_out}" >>"${LOG_FILE}"
  if grep -qiE "denied|unauthorized|authentication required|403|forbidden" "${pull_out}"; then
    log "ÉCHEC AUTH GHCR (images privées) — token read:packages expiré/absent ?"
    log "  → corrige : echo <PAT> | sudo -u deploy docker login ghcr.io -u BySalim --password-stdin"
  else
    log "pull GHCR échoué (réseau ?) — détails dans ${LOG_FILE}"
  fi
  rm -f "${pull_out}"
  exit 1
fi
rm -f "${pull_out}"

NEW_API="$(img_id "${API_IMG}")"
NEW_WEB="$(img_id "${WEB_IMG}")"

if [ "${PREV_API}" = "${NEW_API}" ] && [ "${PREV_WEB}" = "${NEW_WEB}" ]; then
  log "aucune nouvelle image — rien à faire."
  exit 0
fi

log "nouvelle image détectée (api ${PREV_API:0:19}→${NEW_API:0:19}) — déploiement…"
# `up -d` exécute migrate (one-shot) puis (re)démarre backend/web/caddy.
dc up -d >>"${LOG_FILE}" 2>&1

# ── Smoke : attendre le backend healthy (max ~90s) ───────────────────────────
smoke_ok=false
for _ in $(seq 1 18); do
  status="$(docker inspect -f '{{.State.Health.Status}}' planit-prod-backend-1 2>/dev/null || echo starting)"
  if [ "${status}" = "healthy" ] && \
     curl -fsS -k --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/api/health" >/dev/null 2>&1; then
    smoke_ok=true; break
  fi
  sleep 5
done

if [ "${smoke_ok}" = true ]; then
  log "smoke OK — déploiement validé."
  exit 0
fi

# ── Rollback : re-taguer les images précédentes et redéployer ────────────────
log "SMOKE ÉCHOUÉ — rollback au digest précédent."
[ "${PREV_API}" != "none" ] && docker tag "${PREV_API}" "${API_IMG}"
[ "${PREV_WEB}" != "none" ] && docker tag "${PREV_WEB}" "${WEB_IMG}"
dc up -d >>"${LOG_FILE}" 2>&1
log "rollback appliqué (api=${PREV_API:0:19})."
exit 1
