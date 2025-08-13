import { test, expect } from '@playwright/test';

test.describe('Assist Move Assist', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/assist-move-assist/i);
  });
});

