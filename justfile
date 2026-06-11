# PLANIT ops task runner.
#
# Install just if needed: https://just.systems
# These recipes intentionally wrap existing pnpm/docker commands.

set shell := ["powershell.exe", "-NoLogo", "-Command"]

default:
    just --list

dev:
    pnpm dev

test:
    pnpm test

build:
    pnpm build

lint:
    pnpm lint

typecheck:
    pnpm typecheck

e2e:
    pnpm test:e2e

# Perf smoke k6 (endpoints chauds, profil court). Requiert k6 + la stack lancée
# (backend en NODE_ENV=test). BASE_URL surchargeable (défaut backend direct).
perf-smoke base_url="http://localhost:3001":
    $env:BASE_URL="{{base_url}}"; $env:PROFILE="smoke"; k6 run tests/perf/scenarios/smoke.js

# Perf charge légère k6 (baseline, manuel/nocturne).
perf-load base_url="http://localhost:3001":
    $env:BASE_URL="{{base_url}}"; $env:PROFILE="load-leger"; k6 run tests/perf/scenarios/smoke.js

dev-infra-up:
    docker compose -f infra/docker-compose.dev.yml up -d

dev-infra-down:
    docker compose -f infra/docker-compose.dev.yml down

logs service="backend":
    docker compose -f infra/docker-compose.prod.yml logs -f {{service}}

deploy-beta:
    Write-Output "Beta = Cloudflare Tunnel sur la VM (ADR-0015). Voir docs/runbooks/beta-tunnel.md."

# Les recettes suivantes s'executent SUR LA VM (Linux). Depuis le host Windows,
# elles pointent vers la procedure ; sur la VM, lancer les scripts directement.
deploy-vm:
    Write-Output "Sur la VM: voir docs/runbooks/vm-self-host.md (CD pull-based via planit-cd.timer)."

backup:
    Write-Output "Sur la VM: /opt/planit/src/infra/prod/scripts/backup.sh"

restore:
    Write-Output "Sur la VM: /opt/planit/src/infra/prod/scripts/restore.sh <dump.sql.gz>"

# Production reelle (box Hetzner, planit.sn) — CD pull-based sur :main (ADR-0017, LOT 8).
deploy-prod:
    Write-Output "Prod = box Hetzner (planit.sn), CD pull-based :main. Voir docs/runbooks/go-live-prod.md."

# Bootstrap one-off des 4 comptes coeur sur une prod VIDE (RP/AC/enseignant/etudiant).
bootstrap-prod:
    Write-Output "Sur la box: docker compose --env-file /opt/planit/.env.prod -f infra/docker-compose.prod.yml run --rm --env-file /opt/planit/bootstrap.env backend node dist/scripts/bootstrap-prod.js"

# Reset du mot de passe d'UN compte (faute d'email transactionnel, TD-003).
reset-password:
    Write-Output "Sur la box: docker compose --env-file /opt/planit/.env.prod -f infra/docker-compose.prod.yml run --rm -e RESET_EMAIL=... -e RESET_PASSWORD=... backend node dist/scripts/reset-password.js"
