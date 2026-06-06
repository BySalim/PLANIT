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
