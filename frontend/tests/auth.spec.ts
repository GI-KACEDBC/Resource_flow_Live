import { test, expect } from '@playwright/test';

/**
 * Full-stack E2E (requires Vite on 5173 + Laravel API; Vite proxies /api).
 * Run: npm run dev (frontend) and php artisan serve (backend), then: npm run test:e2e
 *
 * Backend `.env` must set APP_ENV=local and REGISTRATION_E2E_OTP=999999 so the signup flow
 * can complete without reading email (see backend/.env.example).
 */
test.describe('Authentication (Sanctum session)', () => {
  test('register angel donor, session persists, logout, login again', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'E2ETestPassword123!';
    const e2eOtp = process.env.REGISTRATION_E2E_OTP ?? '999999';

    await page.goto('/register');

    await page.getByRole('radio', { name: /Angel Donor/i }).check();

    await page.locator('input[name="firstName"]').fill('E2E');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="passwordConfirmation"]').fill(password);
    await page.locator('textarea[name="address"]').fill('Accra, Ghana');

    await Promise.all([
      page.waitForEvent('dialog').then((d) => d.accept()),
      page.getByRole('button', { name: 'Send verification code' }).click(),
    ]);

    await page.locator('input[name="signupOtp"]').fill(e2eOtp);

    await Promise.all([
      page.waitForEvent('dialog').then((d) => d.accept()),
      page.getByRole('button', { name: 'Submit Registration' }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: 'Logout' }).first().click();
    await page.locator('.fixed.inset-0').getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/home/);

    await page.goto('/login');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  });
});
