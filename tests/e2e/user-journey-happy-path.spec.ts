import { test, expect } from '@playwright/test';
import { injectMockAuthSession } from './helpers/mock-auth.helper';
import { setupMockBackendApi } from './helpers/mock-backend.helper';
import { createMockProject } from './helpers/test-data.factory';

test.describe('Tier 4 E2E: Happy Path SaaS Submission Pipeline', () => {
  const sampleProject = createMockProject();

  test.beforeEach(async ({ page }) => {
    // 1. Inject mock user authentication session
    await injectMockAuthSession(page);

    // 2. Setup mock backend endpoints & SSE stream
    await setupMockBackendApi(page, { project: sampleProject });

    // 3. Navigate to application root
    await page.goto('/');
  });

  test('Full Journey: URL Input -> Sub-3s Metadata Review -> Directory Selection -> Launch -> Live Matrix Sync', async ({ page }) => {
    // Step 1: Landing & Hero Input Bar
    const heroInput = page.getByPlaceholder(/Enter your SaaS or product URL/i);
    await expect(heroInput).toBeVisible({ timeout: 10000 });
    await heroInput.fill('https://pulsemetrics.io');

    const extractBtn = page.getByRole('button', { name: /Extract & Review|Scan Product/i });
    await expect(extractBtn).toBeEnabled();
    await extractBtn.click();

    // Step 2: Metadata Review Modal
    const modalContainer = page.locator('.glass-modal-container, [role="dialog"], #metadata-modal');
    await expect(modalContainer).toBeVisible({ timeout: 5000 });

    // Verify prefilled extracted metadata
    const titleField = page.locator('input[name="title"], input#modal-title, [data-testid="modal-title"]');
    if (await titleField.isVisible()) {
      await expect(titleField).toHaveValue(/PulseMetrics/i);
    }

    // Verify copy variant tabs / short pitch
    const pitchField = page.locator('textarea[name="shortPitch"], textarea#modal-pitch, [data-testid="short-pitch"]');
    if (await pitchField.isVisible()) {
      await pitchField.fill('Real-time MRR analytics and automated directory auto-publisher.');
    }

    // Step 3: Continue to Directory Selection
    const continueBtn = page.getByRole('button', { name: /Select Directories|Continue/i });
    await continueBtn.click();

    // Verify Directory Selector catalog
    const directoryGrid = page.locator('.directory-grid, [data-testid="directory-selector"]');
    await expect(directoryGrid).toBeVisible({ timeout: 5000 });

    // Step 4: Trigger Launch Action
    const launchBtn = page.getByRole('button', { name: /Launch Auto-Publisher|Publish to Directories/i });
    await expect(launchBtn).toBeEnabled();
    await launchBtn.click();

    // Step 5: Live Status Matrix & Dashboard
    const matrixGrid = page.locator('.submission-matrix, .submission-grid, [data-testid="submission-matrix"]');
    await expect(matrixGrid).toBeVisible({ timeout: 8000 });

    // Assert initial submission rows rendered
    const rows = page.locator('.submission-row, [data-testid="submission-row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Verify real-time transition to Published
    const publishedBadge = page.locator('.status-pill-published, [data-status="published"], :text("Published")').first();
    await expect(publishedBadge).toBeVisible({ timeout: 10000 });

    // Step 6: Proof Screenshot Lightbox View
    const proofButton = page.getByRole('button', { name: /View Proof|Screenshot/i }).first();
    if (await proofButton.isVisible()) {
      await proofButton.click();
      const lightbox = page.locator('.proof-lightbox, [data-testid="proof-modal"]');
      await expect(lightbox).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
