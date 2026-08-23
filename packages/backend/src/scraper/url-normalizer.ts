/**
 * URL Normalizer & Sanitizer
 * Standardizes URLs, ensures valid protocols, and strips tracking query params.
 */

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'ref',
  'source',
  'fbclid',
  'gclid',
  'ttclid',
  'twclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
]);

export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  let trimmed = rawUrl.trim();

  // Prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (err: any) {
    throw new Error(`Invalid URL format: "${rawUrl}" - ${err.message}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol: "${parsed.protocol}"`);
  }

  // Validate hostname has a valid TLD or is localhost / ip
  const hostname = parsed.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  if (!isLocal && !hostname.includes('.')) {
    throw new Error(`Invalid hostname without TLD: "${hostname}"`);
  }

  // Strip tracking parameters
  const keysToDelete: string[] = [];
  parsed.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
      keysToDelete.push(key);
    }
  });
  for (const key of keysToDelete) {
    parsed.searchParams.delete(key);
  }

  let normalized = parsed.toString();

  // Strip trailing slash if pathname is empty or just '/' and no search / hash
  if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
    normalized = normalized.replace(/\/$/, '');
  }

  return normalized;
}

export function resolveAbsoluteUrl(relativeOrAbsolute: string | undefined | null, baseUrl: string): string | undefined {
  if (!relativeOrAbsolute || typeof relativeOrAbsolute !== 'string') {
    return undefined;
  }
  const clean = relativeOrAbsolute.trim();
  if (!clean) return undefined;

  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  if (clean.startsWith('//')) {
    try {
      const base = new URL(baseUrl);
      return `${base.protocol}${clean}`;
    } catch {
      return `https:${clean}`;
    }
  }

  try {
    const base = new URL(baseUrl);
    return new URL(clean, base).toString();
  } catch {
    return clean;
  }
}
