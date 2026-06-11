import { type Page, expect, test } from '@playwright/test';

// E2E — parcours d'authentification des 4 rôles (ADR-0014 §4). Le stack complet
// (backend + web + Postgres seedé) doit tourner. Les comptes viennent du seed
// (prisma/seed-data.ts) ; tous partagent le mot de passe `Test1234!`.
//
// Couvre : redirect anonyme, login invalide, login + home role-aware pour
// RP / AC / Enseignant / Étudiant, et le gating de la nav RP (un acteur scopé
// ou non-RP ne voit pas les entrées RP-only).

const PASSWORD = 'Test1234!';

const USERS = {
  rp: 'aminata.diallo@planit.test', // RESPONSABLE_PROGRAMME
  ac: 'awa.toure@planit.test', // ASSISTANT_PROGRAMME (scoped)
  enseignant: 'oumar.ndiaye@planit.test', // ENSEIGNANT
  etudiant: 'ibrahima.sow@planit.test', // ETUDIANT
} as const;

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

test.describe('Authentification — 4 rôles', () => {
  test('un visiteur anonyme est redirigé vers /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('des identifiants invalides affichent une erreur et restent sur /login', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('#email', USERS.rp);
    await page.fill('#password', 'mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('RP : login → grille planning + nav RP (Filières visible)', async ({ page }) => {
    await login(page, USERS.rp);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('link', { name: 'Filières' })).toBeVisible();
  });

  test('AC : login → planning scoped, nav RP-only masquée (pas de Filières)', async ({ page }) => {
    await login(page, USERS.ac);
    await expect(page).not.toHaveURL(/\/login/);
    // La nav AC garde « Planning » mais pas les entrées RP-only (Filières).
    await expect(page.getByRole('link', { name: 'Planning' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Filières' })).toHaveCount(0);
  });

  test('Enseignant : login → dashboard consultation', async ({ page }) => {
    await login(page, USERS.enseignant);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/Bonjour,/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Filières' })).toHaveCount(0);
  });

  test('Étudiant : login → dashboard consultation', async ({ page }) => {
    await login(page, USERS.etudiant);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/Bonjour,/)).toBeVisible();
  });
});
