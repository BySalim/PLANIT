---
id: ADR-0006
titre: Accès multi-plateforme par acteur (web pivot back-office, mobile canal vivant)
statut: ACCEPTÉ
date: 2026-05-24
auteur: salim
---

# ADR-0006 — Accès multi-plateforme par acteur

## Contexte

La Vague 01 (V1-D1) a livré **le web pour tous les acteurs** : `/rp`,
`/enseignant`, `/etudiant`. C'était un choix de réduction de scope MVP :
un seul runtime à développer, démontrable de bout en bout.

Avant la Vague 02 (auth + AC + conflits salles), il faut acter la **cible
long terme** : qui utilise quoi, et quelle plateforme reçoit en priorité
chaque nouvelle feature.

Sans cette décision, on risque deux dérives :

- Continuer à empiler du code web pour les enseignants/étudiants alors
  que leur canal naturel sera le mobile (Vague 04).
- Au contraire, abandonner trop tôt l'existant web côté étudiant et
  perdre un fallback utile (consultation depuis le poste universitaire,
  partage de planning en cours).

## Décision

Chaque acteur a une plateforme **principale** (où les features nouvelles
arrivent en priorité) et éventuellement une plateforme **secondaire** ou
**lecture seule** (fallback ou usage ponctuel).

| Acteur                         | Web           | Mobile    | Justification                                                                                                        |
| ------------------------------ | ------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| RP                             | Principal     | Non       | Formulaires lourds (modal création, drawer édition, drag/resize sur grille 7j), gros écran indispensable             |
| AC (Attaché de Classe)         | Principal     | Non       | Idem RP — usage bureau, vues massives, exports                                                                       |
| Admin / Direction / Partenaire | Principal     | Non       | Configuration système, rapports, supervision : besoin écran large + clavier                                          |
| Délégué                        | Secondaire    | Principal | Cible à calibrer V03 : voir si délégué travaille plus depuis téléphone ou portable                                   |
| Enseignant                     | Lecture seule | Principal | Mobile = canal vivant (push, planning du jour, salle, étudiants présents). Web = consultation/backup depuis le poste |
| Étudiant                       | Lecture seule | Principal | Idem enseignant : mobile pour la vie quotidienne, web en consultation ponctuelle                                     |

### Implications opérationnelles

- Le **web RP/AC/Admin** reste l'app la plus complète, tous les modules
  back-office y vivent.
- Le **web enseignant/étudiant** existant en V1 **n'évolue pas après V01** :
  il continue de fonctionner (pages `/enseignant`, `/etudiant`,
  `/enseignant/seance/[id]`, `/etudiant/seance/[id]`) mais ne reçoit pas
  de nouvelles features. Il est figé en mode **« reflet de l'API en
  lecture »**.
- Les **canaux critiques** (notifications push, WhatsApp, SMS) sont
  livrés sur mobile **uniquement** (Vague 04). Aucune notif push
  navigateur n'est prévue.
- Les **nouvelles features mobile** (V04+) ne sont **pas systématiquement**
  portées sur web. Chaque feature est arbitrée individuellement :
  est-ce qu'un enseignant a besoin de cette feature depuis son
  navigateur ? Si non, on ne la porte pas.

### Conséquence sur l'architecture frontend

- `apps/web` reste la base la plus mature, structurée autour des
  modules back-office (planning, conflits, demandes, AC, admin).
- `apps/mobile` (Expo, gelé en V01) prend le relais pour
  enseignants/étudiants/délégués dès la Vague 04.
- Le shell mobile expérimental utilisé en V1 (`<MobileShell>` rendu en
  `max-w-md` sur desktop, cf. `TD-027`) est explicitement **temporaire**.
  Il disparaît dès qu'Expo prend le relai. **Ne pas** investir dessus.

## Conséquences

### Positives

- **Pas de double maintenance** sur les vues enseignant/étudiant à partir
  de V04 : une fois Expo livré, le web devient un backup figé.
- **Priorisation claire** des features par plateforme — réduit les
  arbitrages permanents en review.
- **Investissement focalisé** : le budget design (Libasse) bascule sur
  mobile à partir de la Vague 04, sans tirer le web en parallèle.
- **Notifications cohérentes** : un seul canal critique (mobile) =
  moins de risque de désaccord entre canaux (push web ≠ push mobile).

### Négatives

- **Le web enseignant/étudiant V1 finit en backup figé**, ce qui peut
  laisser une UX de moins en moins polie au fil des vagues si le design
  back-office évolue. Acceptable : c'est documenté, et un enseignant
  qui veut une expérience riche doit utiliser le mobile.
- **Onboarding double** pour l'équipe nouveau venu (web back-office +
  mobile canal vivant). Compensé par la doc et par la similarité des
  conventions (mêmes contracts Zod, même TanStack Query côté hooks).
- **Pas de PWA prévue** : un étudiant qui veut « installer » l'app
  passe par l'app Expo. Acceptable, on ne cible pas le mobile web.

### Risques

- Si la Vague 04 (mobile) prend du retard, le web enseignant/étudiant
  reste de facto la seule porte d'entrée pour ces acteurs et peut
  s'avérer sous-dimensionné. **Mitigation** : pas de feature critique
  enseignant/étudiant entre V02 et V04 — on ne les pousse pas vers le
  web pendant cette fenêtre.

## Alternatives rejetées

| Alternative                                   | Raison du rejet                                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Tout mobile-only** pour Étudiant/Enseignant | Perd le travail web déjà livré en V01, plus de fallback consultation depuis un poste fixe                            |
| **Web et mobile à parité fonctionnelle**      | Coût maintenance double pour valeur marginale — un étudiant n'a pas besoin de gérer ses notifs depuis son navigateur |
| **PWA enseignant/étudiant** au lieu d'Expo    | Moins bonne intégration push iOS, pas de Keychain natif → impose `localStorage` (rejeté par ADR-0005)                |
| **Cibler 1 seule plateforme** (web ou mobile) | Web seul exclut les notifications push fiables ; mobile seul exclut les RP/AC/Admin (besoin écran + clavier)         |

## Liens

- Vague 01 (livrée) : `../../../PLANIT-Strategie-VibeCode/vagues/vague-01-index.md`
- Vague 04 (cible mobile + WhatsApp) : `../../../PLANIT-Strategie-VibeCode/vagues/README.md`
- ADR-0005 (auth) : stockage des tokens diffère selon plateforme
- Tech-debt `FACTOR-PAGES` : factorisation des pages enseignant/étudiant
  web en attendant que le mobile prenne le relais
- Tech-debt `TD-027` : `<MobileShell>` desktop = simulation V1 temporaire
