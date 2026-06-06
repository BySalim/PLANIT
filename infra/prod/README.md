# Infra prod V04

> Racine de support pour les fichiers prod-like de la Vague 04.

## Role

Ce dossier regroupe les conventions et futurs scripts autour de la cible VM self-host prod-like :

- smoke de deploiement,
- backup/restore,
- agent pull-based GHCR,
- exemples d'env sans secrets,
- notes d'exploitation locales.

Les fichiers principaux attendus par les LOTs suivants restent a la racine `infra/` quand ils sont consommes directement :

- `infra/docker-compose.prod.yml`
- `infra/caddy/Caddyfile.prod`

## Regles

- Aucun secret reel.
- Aucun inventaire machine reel.
- Les placeholders doivent etre explicites.
- La prod applique les migrations mais ne lance pas de seed automatique.
