import { expect, test } from '@playwright/test';

test.describe('Primary Navigation', () => {
  test('redirects root to dashboard', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', {
        name: /Stock Metrics & Investment Dashboard/i,
      }),
    ).toBeVisible();
  });

  test('opens key workspaces from navbar tabs', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/dashboard');

    const navTabs = page.locator('nav').first();

    const expectations = [
      { navLabel: 'Screener', pathname: '/screener' },
      { navLabel: 'Watchlist', pathname: '/watchlist' },
      { navLabel: 'Portfolio', pathname: '/portfolio' },
      { navLabel: 'Alert', pathname: '/alerts' },
      { navLabel: 'Personalized Agent', pathname: '/agentic' },
      { navLabel: 'Chat with AI', pathname: '/qa' },
      { navLabel: 'Learning', pathname: '/learning' },
      { navLabel: 'Dashboard', pathname: '/dashboard' },
    ] as const;

    for (const item of expectations) {
      const tabLink = navTabs.locator(`a[href="${item.pathname}"]`).first();
      await tabLink.scrollIntoViewIfNeeded();
      await tabLink.click();
      if (!new RegExp(`${item.pathname}$`).test(page.url())) {
        await tabLink.click({ force: true });
      }
      await expect(page).toHaveURL(new RegExp(`${item.pathname}$`), { timeout: 15_000 });
    }
  });
});
