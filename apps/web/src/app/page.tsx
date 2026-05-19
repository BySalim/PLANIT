// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg">
      <div className="rounded-2xl border border-border bg-surface p-12 shadow-sm">
        <h1 className="font-display text-4xl font-bold text-primary">PLANIT</h1>
        <p className="mt-3 text-text-sec">Plateforme de gestion des emplois du temps — ISM Dakar</p>
        <div className="mt-8 flex items-center gap-3">
          <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary">
            Vague 00 — Bootstrap
          </span>
          <span className="text-sm text-text-muted">feat/salim</span>
        </div>
      </div>
    </main>
  );
}
