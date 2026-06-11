import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — PLANIT',
  description: 'Politique de confidentialité et protection des données de la plateforme PLANIT.',
};

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function PolitiqueConfidentialitePage() {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-text">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-text-muted">Dernière mise à jour : juin 2026</p>
      </header>

      <p className="text-sm leading-relaxed text-text-muted">
        La présente politique décrit la manière dont la plateforme PLANIT collecte et traite les
        données personnelles de ses utilisateurs, dans le respect de la loi sénégalaise n° 2008-12
        du 25 janvier 2008 sur la protection des données à caractère personnel, et dans l’esprit du
        Règlement général sur la protection des données (RGPD).
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Données collectées</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-text-muted">
          <li>Identité : nom complet, adresse e-mail, matricule (pour les étudiants).</li>
          <li>
            Compte : rôle (responsable, assistant, enseignant, étudiant) et mot de passe (stocké
            uniquement sous forme chiffrée, jamais en clair).
          </li>
          <li>
            Données académiques : classes, inscriptions, modules, séances et emplois du temps.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Finalités</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Les données sont traitées pour assurer la planification et la consultation des emplois du
          temps, la gestion des inscriptions et le suivi pédagogique. Elles ne font l’objet d’aucune
          exploitation commerciale ni d’aucune cession à des tiers à des fins de prospection.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Destinataires</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Les données sont accessibles aux seuls personnels habilités (selon leur rôle) intervenant
          dans l’organisation de la scolarité, ainsi qu’à l’équipe technique chargée de
          l’exploitation de la plateforme.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">
          Hébergement et conservation
        </h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Les données sont hébergées sur une infrastructure située dans l’Union européenne et
          conservées pendant la durée nécessaire à la scolarité de l’étudiant, puis archivées ou
          supprimées conformément aux obligations applicables.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Sécurité</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Les mots de passe sont protégés par un algorithme de hachage robuste (argon2id), les
          sauvegardes sont chiffrées, et l’accès aux données est restreint selon le rôle de chaque
          utilisateur et contrôlé côté serveur.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Cookies</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          La plateforme utilise uniquement un cookie strictement nécessaire à l’authentification
          (cookie de session sécurisé, HttpOnly). Aucun cookie publicitaire ni traceur d’audience
          n’est déposé.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Vos droits</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Vous disposez d’un droit d’accès, de rectification, d’effacement et d’opposition au
          traitement de vos données. Pour exercer ces droits, écrivez à{' '}
          <a href="mailto:contact@planit.sn" className="text-primary hover:underline">
            contact@planit.sn
          </a>
          . Une réclamation peut, le cas échéant, être adressée à la Commission de protection des
          données personnelles (CDP) du Sénégal.
        </p>
      </section>
    </article>
  );
}
