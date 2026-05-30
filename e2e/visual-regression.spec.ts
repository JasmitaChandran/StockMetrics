import { expect, test, type Page } from '@playwright/test';

async function prepareStableVisualSnapshot(page: Page, path: string, heading: string | RegExp) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible();
}

test.describe('Visual Regression', () => {
  test('watchlist page matches baseline', async ({ page }) => {
    await prepareStableVisualSnapshot(page, '/watchlist', 'Watchlists');

    await expect(page.locator('main')).toHaveScreenshot('watchlist-main.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('learning page matches baseline', async ({ page }) => {
    await prepareStableVisualSnapshot(page, '/learning', 'Learning');

    await expect(page.locator('main')).toHaveScreenshot('learning-main.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    });
  });
});
