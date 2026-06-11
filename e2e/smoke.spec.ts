import { expect, test } from '@playwright/test';

// Smoke public : depuis l'auth V02, toute route applicative redirige en 307 →
// /login tant qu'il n'y a pas de session. `/login` est le shell public commun.
// Le parcours authentifié des 4 rôles vit dans auth-roles.spec.ts.

test('la page /login publique rend le formulaire de connexion', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});
