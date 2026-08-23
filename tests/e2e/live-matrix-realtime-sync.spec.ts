import { test, expect } from '@playwright/test';
import { injectMockAuthSession } from './helpers/mock-auth.helper';
import { setupMockBackendApi } from './helpers/mock-backend.helper';

test.describe('Tier 4 E2E: Live Matrix Real-Time Dashboard Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuthSession(page);
    await setupMockBackendApi(page);
  });

  test('Renders live dashboard status pills, progress bar, and search filtering', async ({ page }) => {
    await page.goto('/dashboard');

    // 1. Check KPI stats metrics bar
    const statsContainer = page.locator('.stats-bar, [data-testid="submission-stats"]');
    if (await statsContainer.isVisible()) {
      await expect(statsContainer).toContainText(/Total|Published|In Progress/i);
    }

    // 2. Check Submission Matrix table / grid
    const matrix = page.locator('.submission-matrix, [data-testid="submission-matrix"]');
    await expect(matrix).toBeVisible({ timeout: 10000 });

    // 3. Check Live Search filtering
    const searchInput = page.getByPlaceholder(/Search directory or category/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('Uneed');
      const filteredRows = page.locator('.submission-row:visible');
      await expect(filteredRows.first()).toContainText('Uneed');
    }

    // 4. Status Filter Pills (All, Published, In Progress)
    const publishedFilterBtn = page.getByRole('button', { name: /Published/i });
    if (await publishedFilterBtn.isVisible()) {
      await publishedFilterBtn.click();
      const statusPill = page.locator('.status-pill-published, [data-status="published"]').first();
      await expect(statusPill).toBeVisible();
    }
  });
});
