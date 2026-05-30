import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectNoCriticalA11yViolations(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();

  expect(results.violations).toEqual([]);
}

test.describe('Accessibility', () => {
  test('watchlist page has no axe violations (excluding color contrast)', async ({ page }) => {
    await expectNoCriticalA11yViolations(page, '/watchlist', 'Watchlists');
  });

  test('portfolio page has no axe violations (excluding color contrast)', async ({ page }) => {
    await expectNoCriticalA11yViolations(page, '/portfolio', 'Portfolio');
  });

  test('learning page has no axe violations (excluding color contrast)', async ({ page }) => {
    await expectNoCriticalA11yViolations(page, '/learning', 'Learning');
  });
});
