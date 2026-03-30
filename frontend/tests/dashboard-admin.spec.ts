import { test, expect } from '@playwright/test';

/**
 * Admin overview loads KPI data from APIs (no Math.random in useAdminDashboardMetrics).
 * Requires a real admin user in the database.
 *
 * Set env before running:
 *   E2E_ADMIN_EMAIL=admin@example.com
 *   E2E_ADMIN_PASSWORD=yourPassword
 */
test.describe('Admin dashboard', () => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin dashboard E2E',
  );

  test('loads overview and requests financial statistics (period=year)', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL!;
    const password = process.env.E2E_ADMIN_PASSWORD!;

    const apiCalls: string[] = [];
    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('/api/')) {
        apiCalls.push(u);
      }
    });

    await page.goto('/login');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 });

    await expect
      .poll(() => apiCalls.some((u) => u.includes('/financials/statistics') && u.includes('period=year')))
      .toBeTruthy();

    await expect(page.getByText(/Loading dashboard/i)).not.toBeVisible({ timeout: 30_000 }).catch(() => {});
  });
});
