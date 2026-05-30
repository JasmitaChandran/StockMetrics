import { expect, test } from '@playwright/test';

test.describe('Workspace Flows', () => {
  test('creates and deletes a watchlist', async ({ page }) => {
    await page.goto('/watchlist');

    await expect(page.getByRole('heading', { name: 'Watchlists' }).first()).toBeVisible();
    await expect(page.getByText('No watchlists yet. Create one to start tracking stocks.')).toBeVisible();

    const watchlistName = `E2E Watchlist ${Date.now()}`;
    await page.getByPlaceholder('Watchlist name').fill(watchlistName);
    await page.getByRole('button', { name: 'New' }).click();

    await expect(
      page.getByRole('button', { name: new RegExp(`^${watchlistName}`) }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: watchlistName })).toBeVisible();

    await page.getByRole('button', { name: `Delete ${watchlistName}` }).click();
    await expect(page.getByRole('button', { name: watchlistName })).toHaveCount(0);
    await expect(page.getByText('No watchlists yet. Create one to start tracking stocks.')).toBeVisible();
  });

  test('validates portfolio transaction form required fields', async ({ page }) => {
    await page.goto('/portfolio');

    await expect(page.getByRole('heading', { name: 'Portfolio' }).first()).toBeVisible();
    await page.getByRole('button', { name: /^Add$/ }).click();

    await expect(page.getByText('Symbol is required.')).toBeVisible();
    await expect(page.getByText('Quantity must be greater than 0.')).toBeVisible();
    await expect(page.getByText('Price must be greater than 0.')).toBeVisible();
    await expect(page.getByText('No holdings yet.')).toBeVisible();
  });

  test('shows required message for empty QA prompt', async ({ page }) => {
    await page.goto('/qa');

    await expect(page.getByRole('heading', { name: 'Chat with AI' })).toBeVisible();

    const input = page.getByPlaceholder('Ask me');
    await input.click();
    await input.press('Enter');

    await expect(page.getByText('Question is required.')).toBeVisible();
  });
});
