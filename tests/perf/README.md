# Tests de performance V04

> Racine reservee aux scripts k6 de la Vague 04.

## Structure cible

```text
tests/perf/
  README.md
  scenarios/
  lib/
  results/
```

## Conventions

- `BASE_URL` pilote la cible, avec fallback `http://localhost:3000`.
- Aucun secret ni mot de passe reel dans les scripts.
- Profils attendus : `smoke` et `load-leger`.
- Les resultats locaux vont dans `tests/perf/results/` et ne sont pas commites.

Les scripts k6 seront ajoutes au LOT 3.
