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
    await page.goto('/dashboard');

    const navTabs = page.locator('nav').first();

    const expectations = [
      { navLabel: 'Screener', pathname: '/screener', heading: 'Stock Screener' },
      { navLabel: 'Watchlist', pathname: '/watchlist', heading: 'Watchlists' },
      { navLabel: 'Portfolio', pathname: '/portfolio', heading: 'Portfolio' },
      { navLabel: 'Alert', pathname: '/alerts', heading: 'Alert' },
      { navLabel: 'Personalized Agent', pathname: '/agentic', heading: 'Personalized Investment Workbench' },
      { navLabel: 'Chat with AI', pathname: '/qa', heading: 'Chat with AI' },
      { navLabel: 'Learning', pathname: '/learning', heading: 'Learning' },
      { navLabel: 'Dashboard', pathname: '/dashboard', heading: /Stock Metrics & Investment Dashboard/i },
    ] as const;

    for (const item of expectations) {
      const tabLink = navTabs.getByRole('link', { name: item.navLabel }).first();
      await tabLink.scrollIntoViewIfNeeded();
      await tabLink.click();
      await expect(page).toHaveURL(new RegExp(`${item.pathname}$`), { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: item.heading }).first()).toBeVisible();
    }
  });
});
