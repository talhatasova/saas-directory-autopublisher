import { Page, Route } from '@playwright/test';
import { createMockProject, createMockDirectories, createMockSubmissions, E2EProject, E2ESubmission } from './test-data.factory';

export interface SetupMockBackendOptions {
  project?: E2EProject;
  submissions?: E2ESubmission[];
  simulateIntervention?: boolean;
}

/**
 * Intercepts frontend API calls and provides realistic mock responses.
 */
export async function setupMockBackendApi(page: Page, options: SetupMockBackendOptions = {}): Promise<void> {
  const project = options.project || createMockProject();
  const directories = createMockDirectories();
  let submissions = options.submissions || createMockSubmissions(project.id);

  if (options.simulateIntervention && submissions.length > 1) {
    submissions[1].status = 'action_required';
    submissions[1].action_required_payload = {
      type: 'captcha',
      prompt: 'Cloudflare Turnstile verification challenge detected on Uneed.',
      captcha_type: 'turnstile'
    };
  }

  // 1. Scraper / Metadata Extraction Endpoint
  await page.route('**/api/v1/extract**', async (route: Route) => {
    const postData = route.request().postDataJSON() || {};
    const url = postData.url || 'https://pulsemetrics.io';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url,
        title: project.name,
        tagline: project.tagline,
        descriptionShort: project.description_short,
        descriptionMedium: project.description_medium,
        descriptionLong: project.description_long,
        category: project.category,
        tags: project.tags,
        pricingModel: project.pricing_model,
        logoUrl: project.logo_url,
        screenshotUrls: project.screenshot_urls,
        extractedAt: new Date().toISOString()
      })
    });
  });

  // 2. Directories Catalog
  await page.route('**/api/v1/directories**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(directories)
    });
  });

  // 3. Projects CRUD
  await page.route('**/api/v1/projects**', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() || {};
      const newProj = { ...project, ...payload, id: `proj-${Date.now()}` };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newProj)
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([project])
    });
  });

  // 4. Batch Submissions Launch
  await page.route('**/api/v1/submissions/batch**', async (route: Route) => {
    const payload = route.request().postDataJSON() || {};
    const selectedDirIds: string[] = payload.directoryIds || directories.map((d) => d.id);

    submissions = selectedDirIds.map((dirId, idx) => {
      const dir = directories.find((d) => d.id === dirId) || directories[0];
      return {
        id: `sub-${project.id}-${dirId}`,
        project_id: project.id,
        directory_id: dir.id,
        directory_name: dir.name,
        directory_category: dir.category,
        domain_rating: dir.domain_rating,
        submission_type: dir.submission_type,
        status: idx === 0 ? 'in_progress' : 'queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(submissions)
    });
  });

  // 5. Get Submissions
  await page.route('**/api/v1/submissions/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(submissions)
    });
  });

  // 6. Real-time Events Stream (SSE)
  await page.route('**/api/v1/events/**', async (route: Route) => {
    const sseBody = [
      `event: initial\ndata: ${JSON.stringify(submissions)}\n\n`,
      `event: update\ndata: ${JSON.stringify({ ...submissions[0], status: 'published', result_url: 'https://www.uneed.best/tool/pulsemetrics', proof_screenshot_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800' })}\n\n`
    ].join('');

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      body: sseBody
    });
  });
}
