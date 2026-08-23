import { MockDirectoryServer } from './mock-directory-server.ts';
import { getSampleProjectData } from '../fixtures/fixtures.ts';

describe('Tier 2: Directory Submitter Adapter Sandbox & Mock Server', () => {
  let server: MockDirectoryServer;
  let baseUrl: string;
  const sampleProject = getSampleProjectData();

  beforeAll(async () => {
    // Start mock server on random high port to avoid conflict
    const testPort = 4040 + Math.floor(Math.random() * 500);
    server = new MockDirectoryServer({ port: testPort, silent: true });
    baseUrl = await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  test('Mock Server /health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });

  test('Static fixture serving: loads clean-saas-complete.html correctly', async () => {
    const res = await fetch(`${baseUrl}/fixtures/clean-saas-complete.html`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('PulseMetrics');
    expect(text).toContain('SoftwareApplication');
  });

  describe('1. Uneed Directory Sandbox Form', () => {
    test('GET /mock/uneed/submit renders submission form fields', async () => {
      const res = await fetch(`${baseUrl}/mock/uneed/submit`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('id="name"');
      expect(html).toContain('id="url"');
      expect(html).toContain('id="tagline"');
      expect(html).toContain('id="description"');
      expect(html).toContain('id="pricing"');
      expect(html).toContain('id="category"');
    });

    test('GET /mock/uneed/submit?captcha=1 renders Turnstile challenge widget', async () => {
      const res = await fetch(`${baseUrl}/mock/uneed/submit?captcha=1`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('cf-turnstile');
      expect(html).toContain('/mock/captcha/turnstile');
    });

    test('POST /mock/uneed/submit processes form and returns confirmation with listing URL', async () => {
      const params = new URLSearchParams({
        name: sampleProject.name,
        url: sampleProject.url,
        tagline: sampleProject.tagline,
        description: sampleProject.description,
        pricing: 'Freemium',
        category: 'Developer Tools'
      });

      const res = await fetch(`${baseUrl}/mock/uneed/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('id="confirmation-banner"');
      expect(html).toContain('https://www.uneed.best/tool/pulsemetrics');
    });
  });

  describe('2. SaaSHub Sandbox Multi-Step Form', () => {
    test('GET /mock/saashub/submit renders Step 1 form fields', async () => {
      const res = await fetch(`${baseUrl}/mock/saashub/submit`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('name="service[name]"');
      expect(html).toContain('name="service[website_url]"');
      expect(html).toContain('name="service[short_description]"');
      expect(html).toContain('name="service[description]"');
    });

    test('GET /mock/saashub/submit?captcha=1 renders reCAPTCHA challenge', async () => {
      const res = await fetch(`${baseUrl}/mock/saashub/submit?captcha=1`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('g-recaptcha');
      expect(html).toContain('/mock/captcha/recaptcha');
    });

    test('POST /mock/saashub/submit processes submission and returns moderation review status', async () => {
      const params = new URLSearchParams({
        'service[name]': sampleProject.name,
        'service[website_url]': sampleProject.url,
        'service[short_description]': sampleProject.tagline,
        'service[description]': sampleProject.reviewText,
        'service[category]': 'Developer Tools'
      });

      const res = await fetch(`${baseUrl}/mock/saashub/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Your submission is under review');
      expect(html).toContain('https://www.saashub.com/products/pulsemetrics');
    });
  });

  describe('3. AlternativeTo Sandbox Form', () => {
    test('GET /mock/alternativeto/software/create renders form', async () => {
      const res = await fetch(`${baseUrl}/mock/alternativeto/software/create`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('name="Name"');
      expect(html).toContain('name="Url"');
      expect(html).toContain('name="License"');
      expect(html).toContain('name="Description"');
    });

    test('POST /mock/alternativeto/software/create creates submission receipt', async () => {
      const params = new URLSearchParams({
        Name: sampleProject.name,
        Url: sampleProject.url,
        License: 'Freemium',
        Description: sampleProject.description
      });

      const res = await fetch(`${baseUrl}/mock/alternativeto/software/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Submission Created Successfully');
      expect(html).toContain('https://alternativeto.net/software/pulsemetrics/about/');
    });
  });

  describe('4. There\'s An AI For That (TAAFT) Sandbox Form', () => {
    test('GET /mock/taaft/submit renders AI tool form fields', async () => {
      const res = await fetch(`${baseUrl}/mock/taaft/submit`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('name="tool_name"');
      expect(html).toContain('name="tool_url"');
      expect(html).toContain('name="pricing"');
    });

    test('POST /mock/taaft/submit returns confirmed listing URL', async () => {
      const params = new URLSearchParams({
        tool_name: sampleProject.name,
        tool_url: sampleProject.url,
        description: sampleProject.tagline,
        pricing: 'Freemium'
      });

      const res = await fetch(`${baseUrl}/mock/taaft/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('AI Tool Submitted Successfully');
      expect(html).toContain('https://theresanaiforthat.com/ai/pulsemetrics/');
    });
  });

  describe('5. Toolify.ai Direct REST API Endpoint', () => {
    test('POST /api/mock/toolify/submit successfully publishes valid JSON payload', async () => {
      const payload = {
        app_name: sampleProject.name,
        website_url: sampleProject.url,
        tagline: sampleProject.tagline,
        description: sampleProject.description,
        category: 'Analytics',
        pricing_type: 'freemium'
      };

      const res = await fetch(`${baseUrl}/api/mock/toolify/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-toolify-key-123'
        },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('published');
      expect(data.listing_url).toContain('toolify.ai/tool/pulsemetrics');
      expect(data.listing_id).toBeDefined();
    });

    test('POST /api/mock/toolify/submit rejects invalid payload with 400', async () => {
      const payload = {
        tagline: 'Missing name and url'
      };

      const res = await fetch(`${baseUrl}/api/mock/toolify/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });
  });
});
