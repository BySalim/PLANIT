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
    Write-Error "deploy-beta sera implemente au LOT 5 (Railway beta)."

deploy-vm:
    Write-Error "deploy-vm sera implemente au LOT 5 (VM pull-based)."

backup:
    Write-Error "backup prod sera implemente au LOT 5 avec TrueNAS."

restore:
    Write-Error "restore prod sera implemente au LOT 5 avec test de restauration."
