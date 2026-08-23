/**
 * URL Normalizer and Sanitizer Implementation & Verification Specs
 */

export interface NormalizedUrlResult {
  isValid: boolean;
  normalizedUrl: string;
  hostname: string;
  protocol: string;
  domain: string;
  error?: string;
}

export function normalizeTargetUrl(inputUrl: string): NormalizedUrlResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return {
      isValid: false,
      normalizedUrl: '',
      hostname: '',
      protocol: '',
      domain: '',
      error: 'URL cannot be empty'
    };
  }

  let cleaned = inputUrl.trim();

  // If input starts with localhost or 127.0.0.1 without protocol, prepend http://
  if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  } else if (!/^https?:\/\//i.test(cleaned)) {
    // If input contains an explicit non-http protocol (e.g. mailto:, ftp://, javascript:, data:, file:), reject it
    if (/^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/|mailto:|javascript:|data:)/i.test(cleaned)) {
      return {
        isValid: false,
        normalizedUrl: '',
        hostname: '',
        protocol: '',
        domain: '',
        error: 'Only http and https protocols are supported'
      };
    }
    // Default to https:// for naked domains
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);

    // Require valid hostname (not starting/ending with dot, must have a dot or be localhost)
    if (
      parsed.hostname.startsWith('.') ||
      parsed.hostname.endsWith('.') ||
      (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')
    ) {
      return {
        isValid: false,
        normalizedUrl: '',
        hostname: '',
        protocol: '',
        domain: '',
        error: 'Invalid hostname or missing TLD'
      };
    }
        error: 'Invalid hostname or missing TLD'
      };
    }

    // Strip tracking parameters
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'ref_src',
      'fbclid',
      'gclid',
      'msclkid',
      'mc_cid',
      'mc_eid'
    ];

    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    // Normalize trailing slash for root paths
    let finalUrl = parsed.toString();
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      finalUrl = `${parsed.protocol}//${parsed.host}`;
    }

    const hostParts = parsed.hostname.split('.');
    const domain = hostParts.length >= 2 ? hostParts.slice(-2).join('.') : parsed.hostname;

    return {
      isValid: true,
      normalizedUrl: finalUrl,
      hostname: parsed.hostname,
      protocol: parsed.protocol.replace(':', ''),
      domain
    };
  } catch (err: any) {
    return {
      isValid: false,
      normalizedUrl: '',
      hostname: '',
      protocol: '',
      domain: '',
      error: `Invalid URL format: ${err.message}`
    };
  }
}

describe('Tier 1 Unit: URL Normalizer & Sanitizer', () => {
  test('Prepends https:// to naked domains', () => {
    const res = normalizeTargetUrl('pulsemetrics.io');
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe('https://pulsemetrics.io');
    expect(res.hostname).toBe('pulsemetrics.io');
    expect(res.domain).toBe('pulsemetrics.io');
  });

  test('Preserves existing http:// and https:// protocols', () => {
    const resHttps = normalizeTargetUrl('https://app.pulsemetrics.io/dashboard');
    expect(resHttps.isValid).toBe(true);
    expect(resHttps.normalizedUrl).toBe('https://app.pulsemetrics.io/dashboard');

    const resHttp = normalizeTargetUrl('http://localhost:3000');
    expect(resHttp.isValid).toBe(true);
    expect(resHttp.normalizedUrl).toBe('http://localhost:3000');
  });

  test('Strips marketing tracking query parameters (utm_*, ref, fbclid)', () => {
    const raw = 'https://mysaas.com/product?utm_source=twitter&utm_medium=social&utm_campaign=launch&ref=producthunt&fbclid=xyz123&keep=1';
    const res = normalizeTargetUrl(raw);
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe('https://mysaas.com/product?keep=1');
    expect(res.normalizedUrl).not.toContain('utm_source');
    expect(res.normalizedUrl).not.toContain('fbclid');
    expect(res.normalizedUrl).not.toContain('ref=');
  });

  test('Trims surrounding whitespace and handles root trailing slash', () => {
    const res = normalizeTargetUrl('   https://mysaas.io/   ');
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe('https://mysaas.io');
  });

  test('Rejects invalid URLs and missing TLDs', () => {
    const resEmpty = normalizeTargetUrl('');
    expect(resEmpty.isValid).toBe(false);
    expect(resEmpty.error).toContain('URL cannot be empty');

    const resInvalid = normalizeTargetUrl('just-a-random-word');
    expect(resInvalid.isValid).toBe(false);
    expect(resInvalid.error).toContain('missing TLD');
  });
});
