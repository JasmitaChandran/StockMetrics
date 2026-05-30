import { expect, test } from '@playwright/test';

test.describe('Primary Navigation', () => {
  test('redirects root to dashboard', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', {
        name: /Stock Metrics & Investment Dashboard/i,
      }),
    ).toBeVisible();
  });

  test('opens key workspaces from navbar tabs', async ({ page }) => {
    await page.goto('/dashboard');

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
      await page.getByRole('link', { name: item.navLabel }).click();
      await expect(page).toHaveURL(new RegExp(`${item.pathname}$`));
      await expect(page.getByRole('heading', { name: item.heading })).toBeVisible();
    }
  });
});
