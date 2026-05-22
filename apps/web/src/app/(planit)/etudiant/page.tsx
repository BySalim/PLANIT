import { Shell } from '@/components/layout/shell';

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function EtudiantPage() {
  return (
    <Shell
      title="Espace Étudiant"
      breadcrumb={[{ label: 'Espace Étudiant' }]}
      activeNavId="planning"
    >
      <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center">
        <h2 className="font-display text-xl font-semibold text-primary">Bientôt disponible</h2>
        <p className="mt-2 text-sm text-text-sec">
          L&apos;accueil et le planning étudiant arrivent avec le LOT 4 de la Vague 01.
        </p>
      </div>
    </Shell>
  );
}
