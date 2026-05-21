import { redirect } from 'next/navigation';

// Vague 01 has no authentication: the app opens directly on the RP planning.
// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function RootPage() {
  redirect('/rp');
}
