import { test, expect } from '@playwright/test';

/**
 * Impact dashboard: time-range controls must call `/api/financials/statistics` with `period`.
 * Uses the same angel-donor registration path as auth.spec (no admin seed required).
 */
test.describe('Impact dashboard & financial statistics API', () => {
  test('Week / Month / Year filters request statistics with matching period', async ({ page }) => {
    const email = `e2e-impact-${Date.now()}@example.com`;
    const password = 'E2ETestPassword123!';

    await page.goto('/register');
    await page.getByRole('radio', { name: /Angel Donor/i }).check();
    await page.locator('input[name="firstName"]').fill('Impact');
    await page.locator('input[name="lastName"]').fill('Tester');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="passwordConfirmation"]').fill(password);
    await page.locator('textarea[name="address"]').fill('Accra, Ghana');

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Submit Registration' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    const statsUrls: string[] = [];
    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('/financials/statistics')) {
        statsUrls.push(u);
      }
    });

    await page.goto('/dashboard/impact', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Impact Dashboard' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Week', exact: true }).click();
    await expect
      .poll(() => statsUrls.some((u) => u.includes('period=week')))
      .toBeTruthy();

    await page.getByRole('button', { name: 'Month', exact: true }).click();
    await expect
      .poll(() => statsUrls.some((u) => u.includes('period=month')))
      .toBeTruthy();

    await page.getByRole('button', { name: 'Year', exact: true }).click();
    await expect
      .poll(() => statsUrls.some((u) => u.includes('period=year')))
      .toBeTruthy();

    expect(statsUrls.length).toBeGreaterThan(0);
  });
});
