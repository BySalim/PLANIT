# Changelog

## [0.4.0](https://github.com/BySalim/PLANIT/compare/v0.3.0...v0.4.0) (2026-06-13)


### Features

* **auth:** déconnexion globale admin (revoke-all-sessions) ([bf742d4](https://github.com/BySalim/PLANIT/commit/bf742d4422c0e5882f465aca100016ee59b30769))
* **backend:** scripts ops prod bootstrap + reset-password (LOT 8.5) ([96ead18](https://github.com/BySalim/PLANIT/commit/96ead18f00d416df12378e336fa5501afaeca96e))
* correctifs config V04 + déco flottante/globale + stratégie git staging ([a11d70e](https://github.com/BySalim/PLANIT/commit/a11d70e5a1c4fc386766f4794a974b7c5b413166))
* **infra:** backup off-box TrueNAS (NFS) - V4-D12 ([a06f22b](https://github.com/BySalim/PLANIT/commit/a06f22b7960be06feaff028a37f96f83b555982c))
* **infra:** backup off-site cloud + artefacts prod Hetzner (LOT 8.9) ([2df0616](https://github.com/BySalim/PLANIT/commit/2df061672b8e15b6eb398cb60aba482fc14aadbb))
* **infra:** beta = cloudflare tunnel sur la vm (adr-0015) ([113a00b](https://github.com/BySalim/PLANIT/commit/113a00b2e3e36178484b135f742568c5cdd61f52))
* **infra:** beta cloud neon+koyeb+vercel (adr-0015) ([c6dae5f](https://github.com/BySalim/PLANIT/commit/c6dae5fdf0fef0941f34f996e045fb1da777ea15))
* **infra:** conteneurisation prod V04 LOT 1 (Docker, compose, Caddy) ([9d9248e](https://github.com/BySalim/PLANIT/commit/9d9248ee89f999bcc5def1d45b45f0bd19b80c18))
* **infra:** deploiement VM self-host (ansible + agent CD pull-based) ([d0d1854](https://github.com/BySalim/PLANIT/commit/d0d1854fef3d5ad3bc1b22bd7ccae3b2aef4aff9))
* **infra:** pivot serveur — VM de référence + sauvegarde durcie ([b863efa](https://github.com/BySalim/PLANIT/commit/b863efa28058a5c71854e5ac38ad943a3ea9e449))
* **infra:** V04 LOT 1 — conteneurisation prod (Docker, compose, Caddy) ([74c1e68](https://github.com/BySalim/PLANIT/commit/74c1e6871409df9fa4d2bc20fc9450abd6a4469f))
* **infra:** V04 LOT 5 — CD & VM self-host (GHCR, Ansible, pull-based) ([52fdae4](https://github.com/BySalim/PLANIT/commit/52fdae4567117b6503a4fdfe9603b1125d437e2d))
* **infra:** V04 LOT 5 finalisation (TrueNAS + beta cloud + release-please) ([4676f1c](https://github.com/BySalim/PLANIT/commit/4676f1c2da5abccc0dab4cf3db9e740d506247fc))
* **infra:** V04+ durcissement serveur — pivot VM de référence + sauvegarde + observabilité (beta tunnel) ([7848367](https://github.com/BySalim/PLANIT/commit/784836746b4c7b553c701eb691ca53e5766cdeca))
* **obs:** câble Sentry prod + corrige profils opt-in compose ([665878b](https://github.com/BySalim/PLANIT/commit/665878bcc82c7b9bfaa534b12f4342c0c3fe2a7d))
* **obs:** métriques RED (Prometheus/Grafana) + Sentry dormant ([858b2ec](https://github.com/BySalim/PLANIT/commit/858b2ec0021304577d389b8b191ec01648991a72))
* **obs:** requestId + profil compose observability ([27f2db5](https://github.com/BySalim/PLANIT/commit/27f2db5be8604e77ee06d2e322a0b3473dd0c571))
* **perf:** suite k6 endpoints chauds, profils et seuils (lot 3) ([2e75865](https://github.com/BySalim/PLANIT/commit/2e758655e0551b083b4bf5cce322e0dfbd3c322c))
* **security:** scans CI, SHA-pinning, Dependabot (V04 LOT 4) ([4d6381a](https://github.com/BySalim/PLANIT/commit/4d6381abf98b3b7d0fd89abbccc7acfc087cae81))
* **security:** scans CI, SHA-pinning, Dependabot (V04 LOT 4) ([371c179](https://github.com/BySalim/PLANIT/commit/371c1798d982c9cc83414c8fdd3af59f18e28f8a))
* **v04:** LOT 2 — pyramide de tests (coverage gate + e2e 4 rôles + CI) ([3c9e75a](https://github.com/BySalim/PLANIT/commit/3c9e75a6a5d79ba3414a0b6e55ac301b5d111521))
* **v04:** LOT 3 — tests de performance k6 (perf-smoke) ([c039eb9](https://github.com/BySalim/PLANIT/commit/c039eb907e28f2d363ffc5ac9d18e2bbe9f214e9))
* **v04:** LOT 8 — déploiement réel prod ISM (V4-D17 / ADR-0017) ([3649cc5](https://github.com/BySalim/PLANIT/commit/3649cc5986ee5aaaae25abfedfebca8432131ede))
* **web:** bouton flottant de déconnexion (prod) ([387ffa9](https://github.com/BySalim/PLANIT/commit/387ffa99eb2e06da0c49226d6f47abe3ad91dfa3))
* **web:** pages legales publiques + allowlist middleware (LOT 8.8) ([c98ae49](https://github.com/BySalim/PLANIT/commit/c98ae49c9299691a1f3f42db9046db46f9085ae9))


### Corrections

* **api:** salle nullable dans SessionDto — fin du 500 V1 ([7a8fc07](https://github.com/BySalim/PLANIT/commit/7a8fc074b5ca01d40ddd34b5f5b071b2baadc55e))
* **ci:** autorise la branche release-please vers main ([6247c6c](https://github.com/BySalim/PLANIT/commit/6247c6cc5564345e41919056dd696bcf564be347))
* **ci:** autorise la branche release-please vers main ([9a3e4dc](https://github.com/BySalim/PLANIT/commit/9a3e4dc0d90b57bf5220e8451da826957fc42bbe))
* **ci:** passe github.head_ref par env dans les guards de source ([a534b86](https://github.com/BySalim/PLANIT/commit/a534b8653f659ad6fcb6f5e9cfd0068e32288624))
* **ci:** restaurer le nom du check requis Lint - Typecheck - Test ([3c89309](https://github.com/BySalim/PLANIT/commit/3c893096e2e7a46de7a76069eb96976c1b06a363))
* **infra:** borne la croissance disque de la VM ([a81f10a](https://github.com/BySalim/PLANIT/commit/a81f10a01a0a97dd239992a80d075e94d4e52206))
* **infra:** passe CADDY_TLS au conteneur Caddy + redirect www (prod) ([3c0b35b](https://github.com/BySalim/PLANIT/commit/3c0b35bceae294aa9a260e73012d6e79d660e863))
* **perf:** seuil k6 p(95)&lt;800 au lieu de p95&lt;800 ([a14d6bf](https://github.com/BySalim/PLANIT/commit/a14d6bf56698262a9de49506d64129f7dbc5b80c))
* **perf:** seuil k6 p(95)&lt;800 au lieu de p95&lt;800 ([3595a97](https://github.com/BySalim/PLANIT/commit/3595a9743f8869623d57bff8052a36908d4d9d2f))
* realtime WS (caddy + namespace) et 500 V1 (salle nullable) ([0f1984d](https://github.com/BySalim/PLANIT/commit/0f1984d2ece3172780a8f5f16bb8ef79c04c1089))
* **realtime:** route /socket.io via caddy + namespace WS client ([34a5145](https://github.com/BySalim/PLANIT/commit/34a514580ff3700f136b23f269c8454421120369))
* **security:** corrige les regex de l'allowlist gitleaks (RE2) ([8627f5b](https://github.com/BySalim/PLANIT/commit/8627f5b948a6cfeb5642415d1b1950b77df1be38))
* **web:** reword csp comment to clear semgrep websocket alert ([e7eca7f](https://github.com/BySalim/PLANIT/commit/e7eca7f6972cb6b1f9ac708ac4f20b31611bcd60))


### Documentation

* adr-0017 prod reelle + runbook go-live + patterns LOT 8 ([9766aff](https://github.com/BySalim/PLANIT/commit/9766affa10c958a477c327084db7efd57c81e7ce))
* cadrer le socle qualite v04 ([827f077](https://github.com/BySalim/PLANIT/commit/827f077db30c9efd4d2a91330e59ded0a90cec27))
* cloture V03 LOT 8 + socle qualite V04 LOT 0 (ADR-0013/0014) ([c2571bd](https://github.com/BySalim/PLANIT/commit/c2571bd4f56eeb6270e7aed0645af33d958408a1))
* **infra:** correctifs runbook VM + bit exec scripts prod ([36f5cc9](https://github.com/BySalim/PLANIT/commit/36f5cc986242c817af14cf41ef2bd08691b326b7))
* **infra:** images GHCR privees + auth VM (runbook + cd-pull guard) ([f8ed188](https://github.com/BySalim/PLANIT/commit/f8ed18836b9d2fb31e265b3cecbbaaf69697b0dc))
* **infra:** images GHCR privees + auth VM self-host ([6dc6f06](https://github.com/BySalim/PLANIT/commit/6dc6f06a5945a3cd499440b4e05ac2166e0d8241))
* **journal:** config fixes + déco flottante/globale + stratégie staging ([cbc9d04](https://github.com/BySalim/PLANIT/commit/cbc9d047dbcea5c61fa9769e471a0ba2447e33f6))
* **journal:** finalisation deploiement v04 (4 prs + adr-0015) ([e4558fd](https://github.com/BySalim/PLANIT/commit/e4558fde9c1d5e5c44a93e75bf4834efd809be07))
* **journal:** lot 2 pyramide de tests (Salim 2026-06-07) ([4b02fb1](https://github.com/BySalim/PLANIT/commit/4b02fb1df385aec3865769737eb8207d9d37b79e))
* **journal:** retrait litteral ws du journal (semgrep oss) ([8eff2b6](https://github.com/BySalim/PLANIT/commit/8eff2b67c8eda4b55e56b45133d93f7692637c5f))
* **journal:** tracer le gel de dependabot (decision TL) ([4b8e6f0](https://github.com/BySalim/PLANIT/commit/4b8e6f0dac2df0c05bf04eaa40e8664614b51917))
* **obs:** aligner §3/§4 du runbook sur l'état livré ([fc0d8d6](https://github.com/BySalim/PLANIT/commit/fc0d8d6d82cfb58ce2dfbde9a2843a1dc161c331))
* **perf:** runbook k6 + journal lot 3 ([4d559b0](https://github.com/BySalim/PLANIT/commit/4d559b04dec35d0d13701d0a3d0d312a5b1f99db))
* **readme:** mobile/whatsapp vers vague 06 (renumerotation V04) ([ffd5c1e](https://github.com/BySalim/PLANIT/commit/ffd5c1e2e29d7ee03f44106d4a13c84c516080a4))
* **spec:** perf k6 endpoints chauds (lot 3) ([9e877de](https://github.com/BySalim/PLANIT/commit/9e877dea0bebe7ae594e866767d26b084b57ae3d))


### CI

* **perf:** job perf-smoke informationnel k6 (lot 3) ([b1a3f20](https://github.com/BySalim/PLANIT/commit/b1a3f204d29c17268a3c134fde7a9e122857e421))
* **release:** cible main + workflow_dispatch (release-please) ([9c24eac](https://github.com/BySalim/PLANIT/commit/9c24eac9ac9fd49862cfc30d659c75ef3ead1781))
* **v04:** gate coverage dans quality + job e2e bloquant (LOT 2.5) ([f91553e](https://github.com/BySalim/PLANIT/commit/f91553e75143bd4cf63be9ee90c281965ca0d9c3))
