import { redirect } from 'next/navigation';

// Next.js App Router requires default export for page
// eslint-disable-next-line no-restricted-syntax
export default function RootPage() {
  redirect('/login');
}
