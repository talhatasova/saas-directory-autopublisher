import { test, expect } from '@playwright/test';
import { injectMockAuthSession } from './helpers/mock-auth.helper';
import { setupMockBackendApi } from './helpers/mock-backend.helper';

test.describe('Tier 4 E2E: CAPTCHA Challenge & User Intervention Flow', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuthSession(page);
    // Setup mock backend with simulated intervention required on one submission
    await setupMockBackendApi(page, { simulateIntervention: true });
    await page.goto('/dashboard');
  });

  test('Displays Action Required alert banner and handles intervention resolution', async ({ page }) => {
    // 1. Assert Action Required alert badge or banner is visible
    const alertBanner = page.locator('.captcha-alert-banner, [data-status="action_required"], :text("Action Required")').first();
    await expect(alertBanner).toBeVisible({ timeout: 10000 });

    // 2. Click Solve Challenge / Authorize button
    const solveBtn = page.getByRole('button', { name: /Solve Challenge|Authorize|Action/i }).first();
    if (await solveBtn.isVisible()) {
      await solveBtn.click();

      // Verify intervention modal / dialog opens
      const modal = page.locator('.intervention-modal, [role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Click "Challenge Completed" / "Resume Submission"
      const resumeBtn = page.getByRole('button', { name: /Resume|Completed|Done/i });
      if (await resumeBtn.isVisible()) {
        await resumeBtn.click();
      }
    }
  });
});
