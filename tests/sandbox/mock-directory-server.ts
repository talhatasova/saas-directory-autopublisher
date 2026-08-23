import * as http from 'node:http';
import * as url from 'node:url';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MOCK_DIRECTORIES } from './directory-configs.ts';

export interface MockServerOptions {
  port?: number;
  host?: string;
  silent?: boolean;
}

export class MockDirectoryServer {
  private server: http.Server | null = null;
  private port: number;
  private host: string;
  private silent: boolean;
  public submissionsReceived: Array<{ path: string; method: string; body: any; headers: any; timestamp: string }> = [];

  constructor(options: MockServerOptions = {}) {
    this.port = options.port || 4040;
    this.host = options.host || '127.0.0.1';
    this.silent = options.silent ?? true;
  }

  public getBaseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  public async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (err: any) {
          if (!this.silent) console.error('[MockDirectoryServer Error]', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Mock Server Error', message: err.message }));
        }
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        const address = `http://${this.host}:${this.port}`;
        if (!this.silent) {
          console.log(`[MockDirectoryServer] Running on ${address}`);
        }
        resolve(address);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        return resolve();
      }
      this.server.close((err) => {
        if (err) return reject(err);
        this.server = null;
        resolve();
      });
    });
  }

  private async parseRequestBody(req: http.IncomingMessage): Promise<{ raw: string; json?: any; form?: Record<string, string> }> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        let parsedJson: any = undefined;
        const parsedForm: Record<string, string> = {};

        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            parsedJson = JSON.parse(body);
          } catch {
            // ignore JSON parse failure
          }
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(body);
          params.forEach((val, key) => {
            parsedForm[key] = val;
          });
        }
        resolve({ raw: body, json: parsedJson, form: parsedForm });
      });
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '/';
    const method = (req.method || 'GET').toUpperCase();
    const query = parsedUrl.query;

    // Enable CORS for all mock routes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Directory-Key, Idempotency-Key');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const { raw, json, form } = await this.parseRequestBody(req);
    const bodyPayload = json || (Object.keys(form).length > 0 ? form : raw);

    this.submissionsReceived.push({
      path: pathname,
      method,
      body: bodyPayload,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });

    // Health check endpoint
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() }));
      return;
    }

    // Static fixture server
    if (pathname.startsWith('/fixtures/')) {
      const filename = pathname.replace('/fixtures/', '');
      const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
      const fixturePath = path.resolve(currentDir, '../fixtures', filename);
      if (fs.existsSync(fixturePath)) {
        const ext = path.extname(fixturePath).toLowerCase();
        const contentTypes: Record<string, string> = {
          '.html': 'text/html; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.json': 'application/json'
        };
        const ct = contentTypes[ext] || 'text/plain';
        const content = fs.readFileSync(fixturePath);
        res.writeHead(200, { 'Content-Type': ct });
        res.end(content);
        return;
      }
    }

    // Uneed Mock Form
    if (pathname === '/mock/uneed/submit') {
      if (method === 'GET') {
        const showCaptcha = query.captcha === '1';
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Submit Product - Uneed</title>
            <style>
              body { font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; }
              .form-card { max-width: 600px; margin: 0 auto; background: #1e293b; padding: 30px; border-radius: 8px; }
              .form-group { margin-bottom: 16px; }
              label { display: block; margin-bottom: 6px; font-weight: bold; }
              input, textarea, select { width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #475569; background: #0f172a; color: #fff; box-sizing: border-box; }
              button { background: #6366f1; color: #fff; padding: 12px 24px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
              .cf-turnstile { margin: 16px 0; padding: 16px; border: 1px solid #f59e0b; border-radius: 4px; background: rgba(245, 158, 11, 0.1); }
            </style>
          </head>
          <body>
            <div class="form-card">
              <h1>Submit to Uneed</h1>
              <form method="POST" action="/mock/uneed/submit" enctype="application/x-www-form-urlencoded">
                <div class="form-group">
                  <label for="name">Product Name *</label>
                  <input id="name" name="name" type="text" required placeholder="e.g. PulseMetrics" />
                </div>
                <div class="form-group">
                  <label for="url">Website URL *</label>
                  <input id="url" name="url" type="url" required placeholder="https://..." />
                </div>
                <div class="form-group">
                  <label for="tagline">Tagline (max 80 chars) *</label>
                  <input id="tagline" name="tagline" maxlength="80" required placeholder="Short punchy tagline" />
                </div>
                <div class="form-group">
                  <label for="description">Description (max 250 chars) *</label>
                  <textarea id="description" name="description" maxlength="250" required placeholder="Product summary..."></textarea>
                </div>
                <div class="form-group">
                  <label for="pricing">Pricing Model *</label>
                  <select id="pricing" name="pricing" required>
                    <option value="Free">Free</option>
                    <option value="Freemium" selected>Freemium</option>
                    <option value="Paid">Paid</option>
                    <option value="Open Source">Open Source</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="category">Category *</label>
                  <select id="category" name="category" required>
                    <option value="Developer Tools">Developer Tools</option>
                    <option value="AI Tools">AI Tools</option>
                    <option value="Analytics">Analytics</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="tags">Tags (comma separated)</label>
                  <input id="tags" name="tags" placeholder="saas, analytics, tools" />
                </div>
                <div class="form-group">
                  <label for="logo">Logo Asset</label>
                  <input id="logo" name="logo" type="file" accept="image/*" />
                </div>
                ${
                  showCaptcha
                    ? `<div class="cf-turnstile" data-sitekey="mock-turnstile-key">
                        <iframe src="/mock/captcha/turnstile" width="300" height="65"></iframe>
                       </div>`
                    : ''
                }
                <button type="submit" id="submit-btn">Submit Product</button>
              </form>
            </div>
          </body>
          </html>
        `);
        return;
      }

      if (method === 'POST') {
        const name = form.name || 'product';
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Submission Success - Uneed</title></head>
          <body style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; text-align: center;">
            <div id="confirmation-banner" style="background: #10b981; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
              <h2>Submission Received Successfully!</h2>
              <p>Your product <strong>${name}</strong> has been listed.</p>
              <p>Listing URL: <a id="listing-url" href="https://www.uneed.best/tool/${slug}" style="color: #fff;">https://www.uneed.best/tool/${slug}</a></p>
            </div>
          </body>
          </html>
        `);
        return;
      }
    }

    // SaaSHub Mock Multi-Step Form
    if (pathname === '/mock/saashub/submit') {
      if (method === 'GET') {
        const showCaptcha = query.captcha === '1';
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Submit a Service - SaaSHub</title>
            <style>
              body { font-family: sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; }
              .card { max-width: 650px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .form-control { margin-bottom: 16px; }
              label { display: block; margin-bottom: 6px; font-weight: 600; }
              input, textarea, select { width: 100%; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; }
              .btn-primary { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
              .g-recaptcha { margin: 16px 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Submit New SaaS Product</h1>
              <p>Step 1 of 2: Basic Information</p>
              <form method="POST" action="/mock/saashub/submit" enctype="application/x-www-form-urlencoded">
                <div class="form-control">
                  <label for="service_name">Service Name</label>
                  <input id="service_name" name="service[name]" type="text" required placeholder="PulseMetrics" />
                </div>
                <div class="form-control">
                  <label for="service_url">Website URL</label>
                  <input id="service_url" name="service[website_url]" type="url" required placeholder="https://..." />
                </div>
                <div class="form-control">
                  <label for="service_tagline">Short Description</label>
                  <input id="service_tagline" name="service[short_description]" type="text" required placeholder="Tagline..." />
                </div>
                <div class="form-control">
                  <label for="service_desc">Detailed Overview (500+ chars)</label>
                  <textarea id="service_desc" name="service[description]" rows="5" required placeholder="Comprehensive review..."></textarea>
                </div>
                <div class="form-control">
                  <label for="service_category">Primary Category</label>
                  <select id="service_category" name="service[category]">
                    <option value="Analytics">Analytics</option>
                    <option value="Developer Tools">Developer Tools</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div class="form-control">
                  <label for="service_alternatives">Competitors / Alternatives</label>
                  <input id="service_alternatives" name="service[alternatives]" placeholder="Mixpanel, Baremetrics, Google Analytics" />
                </div>
                <div class="form-control">
                  <label for="service_logo">Upload High-Res Logo</label>
                  <input id="service_logo" name="service[logo]" type="file" accept="image/*" />
                </div>
                ${
                  showCaptcha
                    ? `<div class="g-recaptcha">
                        <iframe src="/mock/captcha/recaptcha" width="304" height="78"></iframe>
                       </div>`
                    : ''
                }
                <button type="submit" class="btn-primary" id="saashub-submit-btn">Submit for Moderation</button>
              </form>
            </div>
          </body>
          </html>
        `);
        return;
      }

      if (method === 'POST') {
        const name = (form['service[name]'] || 'service').trim();
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Submission Received - SaaSHub</title></head>
          <body style="font-family: sans-serif; background: #f8fafc; padding: 40px; text-align: center;">
            <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #10b981;">Your submission is under review</h2>
              <p>Thank you for submitting <strong>${name}</strong> to SaaSHub.</p>
              <p>Pending Listing URL: <a id="saashub-listing-url" href="https://www.saashub.com/products/${slug}">https://www.saashub.com/products/${slug}</a></p>
            </div>
          </body>
          </html>
        `);
        return;
      }
    }

    // AlternativeTo Mock Form
    if (pathname === '/mock/alternativeto/software/create') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Add Software - AlternativeTo</title></head>
          <body style="font-family: sans-serif; background: #18181b; color: #f4f4f5; padding: 40px;">
            <div style="max-width: 650px; margin: 0 auto; background: #27272a; padding: 30px; border-radius: 8px;">
              <h1>Add New Software to AlternativeTo</h1>
              <form method="POST" action="/mock/alternativeto/software/create">
                <p><label>Name: <input name="Name" id="at-name" required style="width:100%;" /></label></p>
                <p><label>Homepage URL: <input name="Url" id="at-url" type="url" required style="width:100%;" /></label></p>
                <p><label>License: 
                  <select name="License" id="at-license" style="width:100%;">
                    <option value="Free">Free</option>
                    <option value="Freemium" selected>Freemium</option>
                    <option value="Commercial">Commercial / Paid</option>
                    <option value="Open Source">Open Source</option>
                  </select>
                </label></p>
                <p><label>Description (Markdown supported): <textarea name="Description" id="at-desc" rows="6" style="width:100%;"></textarea></label></p>
                <p><label>Icon / Logo: <input type="file" id="at-icon" name="Icon" /></label></p>
                <p><label>Screenshots: <input type="file" id="at-screenshot" name="Screenshots" multiple /></label></p>
                <button type="submit" id="at-submit-btn" style="background:#0ea5e9; color:white; padding:10px 20px; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Preview & Submit</button>
              </form>
            </div>
          </body>
          </html>
        `);
        return;
      }

      if (method === 'POST') {
        const name = (form.Name || 'software').trim();
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>AlternativeTo - Item Created</title></head>
          <body style="font-family: sans-serif; background: #18181b; color: white; padding: 40px; text-align: center;">
            <div style="background: #27272a; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #38bdf8;">Submission Created Successfully</h2>
              <p>Your submission for <strong>${name}</strong> has been queued for moderation.</p>
              <p>Item URL: <a id="alternativeto-url" href="https://alternativeto.net/software/${slug}/about/" style="color: #38bdf8;">https://alternativeto.net/software/${slug}/about/</a></p>
            </div>
          </body>
          </html>
        `);
        return;
      }
    }

    // TAAFT Mock Form
    if (pathname === '/mock/taaft/submit') {
      if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Submit AI Tool - There's An AI For That</title></head>
          <body style="font-family: sans-serif; background: #09090b; color: #fafafa; padding: 40px;">
            <div style="max-width: 600px; margin: 0 auto; background: #18181b; padding: 30px; border-radius: 8px;">
              <h1>Submit AI Tool to TAAFT</h1>
              <form method="POST" action="/mock/taaft/submit">
                <p><label>Tool Name: <input name="tool_name" id="taaft-name" required style="width:100%;" /></label></p>
                <p><label>Tool URL: <input name="tool_url" id="taaft-url" type="url" required style="width:100%;" /></label></p>
                <p><label>Tasks & Description: <textarea name="description" id="taaft-desc" rows="4" style="width:100%;"></textarea></label></p>
                <p><label>Pricing: 
                  <select name="pricing" id="taaft-pricing" style="width:100%;">
                    <option value="Free">Free</option>
                    <option value="Freemium" selected>Freemium</option>
                    <option value="Paid">Paid</option>
                  </select>
                </label></p>
                <p><label>Logo: <input type="file" name="tool_logo" id="taaft-logo" /></label></p>
                <button type="submit" id="taaft-submit-btn" style="background:#a855f7; color:white; padding:10px 20px; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Submit AI Tool</button>
              </form>
            </div>
          </body>
          </html>
        `);
        return;
      }

      if (method === 'POST') {
        const name = (form.tool_name || 'ai-tool').trim();
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>TAAFT - AI Tool Submitted</title></head>
          <body style="font-family: sans-serif; background: #09090b; color: white; padding: 40px; text-align: center;">
            <div style="background: #18181b; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #c084fc;">AI Tool Submitted Successfully</h2>
              <p>Your AI tool <strong>${name}</strong> is now registered.</p>
              <p>Listing URL: <a id="taaft-listing-url" href="https://theresanaiforthat.com/ai/${slug}/" style="color: #c084fc;">https://theresanaiforthat.com/ai/${slug}/</a></p>
            </div>
          </body>
          </html>
        `);
        return;
      }
    }

    // Toolify Direct REST API Mock Endpoint
    if (pathname === '/api/mock/toolify/submit') {
      if (method === 'POST') {
        const payload = json || {};
        const appName = payload.app_name || payload.name;
        const websiteUrl = payload.website_url || payload.url;
        const tagline = payload.tagline;

        if (!appName || !websiteUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: 'Missing required fields: app_name and website_url are required.',
              received: payload
            })
          );
          return;
        }

        const slug = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const listingId = `tool_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        const listingUrl = `https://www.toolify.ai/tool/${slug}`;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            status: 'published',
            listing_id: listingId,
            listing_url: listingUrl,
            app_name: appName,
            category: payload.category || 'AI Tools',
            created_at: new Date().toISOString()
          })
        );
        return;
      }
    }

    // Mock CAPTCHA Challenge Frame: Turnstile
    if (pathname === '/mock/captcha/turnstile') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <body style="margin:0; background:transparent; font-family:sans-serif;">
          <div class="cf-turnstile-widget" style="border:1px solid #d1d5db; padding:8px; border-radius:4px; display:inline-block; background:#fff;">
            <label style="font-size:12px; display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="cf-challenge-checkbox" />
              <span>Verify you are human (Cloudflare Turnstile)</span>
            </label>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Mock CAPTCHA Challenge Frame: reCAPTCHA
    if (pathname === '/mock/captcha/recaptcha') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <body style="margin:0; background:transparent; font-family:sans-serif;">
          <div class="recaptcha-widget" style="border:1px solid #d1d5db; padding:8px; border-radius:4px; display:inline-block; background:#f9fafb;">
            <label style="font-size:12px; display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="recaptcha-anchor" />
              <span>I'm not a robot (reCAPTCHA)</span>
            </label>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Catch-all 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
  }
}

// Standalone execution support
const isMainModule = typeof process !== 'undefined' && process.argv[1] && (
  process.argv[1].endsWith('mock-directory-server.ts') ||
  process.argv[1].endsWith('mock-directory-server.js') ||
  process.argv[1].endsWith('mock-directory-server')
);

if (isMainModule) {
  const port = parseInt(process.env.PORT || '4040', 10);
  const server = new MockDirectoryServer({ port, silent: false });
  server.start().then((url) => {
    console.log(`Mock Directory Server started on ${url}`);
  }).catch((err) => {
    console.error('Failed to start Mock Directory Server:', err);
    process.exit(1);
  });
}
