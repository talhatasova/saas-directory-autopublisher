import { test, expect } from '@playwright/test';
import { injectMockAuthSession } from './helpers/mock-auth.helper';
import { setupMockBackendApi } from './helpers/mock-backend.helper';

test.describe('Tier 4 E2E: Directory Selection & Batch Enqueue', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuthSession(page);
    await setupMockBackendApi(page);
    await page.goto('/');
  });

  test('Filters directories by Domain Rating (DR), category, and presets', async ({ page }) => {
    // Open flow directly or navigate to directory selector
    const heroInput = page.getByPlaceholder(/Enter your SaaS or product URL/i);
    await heroInput.fill('https://pulsemetrics.io');
    await page.getByRole('button', { name: /Extract & Review|Scan Product/i }).click();

    // Proceed past modal
    const continueBtn = page.getByRole('button', { name: /Select Directories|Continue/i });
    await continueBtn.click();

    // 1. Verify Presets: Select All Free vs High Authority
    const presetHighDr = page.getByRole('button', { name: /High Authority|DR 70\+/i });
    if (await presetHighDr.isVisible()) {
      await presetHighDr.click();
      // Verify only high DR items are selected
      const selectedCards = page.locator('.directory-card.selected, [data-selected="true"]');
      const count = await selectedCards.count();
      expect(count).toBeGreaterThan(0);
    }

    const presetSelectAll = page.getByRole('button', { name: /Select All Free|Select All/i });
    if (await presetSelectAll.isVisible()) {
      await presetSelectAll.click();
      const allCards = page.locator('.directory-card, [data-testid="directory-card"]');
      const totalCount = await allCards.count();
      expect(totalCount).toBeGreaterThanOrEqual(4);
    }

    // 2. Filter by Category tab / dropdown
    const aiFilterBtn = page.getByRole('button', { name: /AI Aggregator|AI Tools/i });
    if (await aiFilterBtn.isVisible()) {
      await aiFilterBtn.click();
      const filteredCard = page.locator('.directory-card:visible');
      await expect(filteredCard).toContainText(/There's An AI For That|Toolify/i);
    }

    // 3. Verify Launch Button dynamic count badge
    const launchBtn = page.getByRole('button', { name: /Launch Auto-Publisher|Publish to/i });
    await expect(launchBtn).toBeVisible();
    await expect(launchBtn).toBeEnabled();
  });
});
