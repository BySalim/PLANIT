import { expect, test } from '@playwright/test';

test('home redirects to /rp and shows the PLANIT topbar', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/rp$/);
  await expect(page.getByText('PLANIT')).toBeVisible();
});
