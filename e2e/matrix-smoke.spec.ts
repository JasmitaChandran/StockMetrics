import { expect, test } from '@playwright/test';

test.describe('Cross-browser/device matrix smoke', () => {
  test('loads dashboard and opens core workspace tabs', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    const navTabs = page.locator('nav').first();
    const paths = ['/screener', '/watchlist', '/dashboard'];

    for (const path of paths) {
      const label = path === '/alerts' ? 'Alert' : path === '/qa' ? 'Chat with AI' : path === '/dashboard' ? 'Dashboard' : path.slice(1).replace(/^\w/, (c) => c.toUpperCase());
      const link = navTabs.getByRole('link', { name: label }).first();
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 15_000 });
    }
  });
});
