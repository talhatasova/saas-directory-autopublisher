export interface E2EProject {
  id: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  description_short: string;
  description_medium: string;
  description_long: string;
  category: string;
  tags: string[];
  pricing_model: string;
  logo_url: string;
  screenshot_urls: string[];
  created_at: string;
}

export interface E2EDirectory {
  id: string;
  name: string;
  domain: string;
  submission_type: 'form_automation' | 'direct_api' | 'assisted';
  domain_rating: number;
  category: string;
  is_active: boolean;
  requires_auth: boolean;
}

export interface E2ESubmission {
  id: string;
  project_id: string;
  directory_id: string;
  directory_name: string;
  directory_category: string;
  domain_rating: number;
  submission_type: string;
  status: 'queued' | 'in_progress' | 'published' | 'action_required' | 'failed';
  result_url?: string;
  proof_screenshot_url?: string;
  error_message?: string;
  action_required_payload?: {
    type: 'captcha' | '2fa_code' | 'email_verification';
    prompt?: string;
    captcha_type?: 'turnstile' | 'recaptcha' | 'hcaptcha';
  };
  created_at: string;
  updated_at: string;
}

export function createMockProject(overrides: Partial<E2EProject> = {}): E2EProject {
  return {
    id: 'proj-e2e-101',
    name: 'PulseMetrics',
    url: 'https://pulsemetrics.io',
    tagline: 'Real-time SaaS revenue analytics & directory publisher',
    description: 'PulseMetrics tracks live MRR from Stripe and publishes listings across 50+ SaaS directories with 1-click.',
    description_short: 'Monitor real-time MRR and launch across 50+ SaaS directories with 1-click.',
    description_medium: 'PulseMetrics is the all-in-one analytics dashboard and automated directory submission suite for indie hackers and modern SaaS founders.',
    description_long: 'PulseMetrics empowers SaaS creators to track vital financial metrics and automatically publish listings to over 50 directories seamlessly. Includes Stripe live MRR sync, backlink monitoring, and automated screenshot proof capture.',
    category: 'Developer Tools',
    tags: ['saas', 'analytics', 'directory-publisher', 'indie-hackers', 'stripe'],
    pricing_model: 'freemium',
    logo_url: 'https://pulsemetrics.io/favicon.svg',
    screenshot_urls: ['https://pulsemetrics.io/assets/hero-dashboard.png'],
    created_at: new Date().toISOString(),
    ...overrides
  };
}

export function createMockDirectories(): E2EDirectory[] {
  return [
    {
      id: 'uneed',
      name: 'Uneed',
      domain: 'uneed.best',
      submission_type: 'form_automation',
      domain_rating: 62,
      category: 'Curated SaaS',
      is_active: true,
      requires_auth: false
    },
    {
      id: 'saashub',
      name: 'SaaSHub',
      domain: 'saashub.com',
      submission_type: 'form_automation',
      domain_rating: 78,
      category: 'Software Alternatives',
      is_active: true,
      requires_auth: false
    },
    {
      id: 'alternativeto',
      name: 'AlternativeTo',
      domain: 'alternativeto.net',
      submission_type: 'form_automation',
      domain_rating: 84,
      category: 'Crowdsourced Software',
      is_active: true,
      requires_auth: false
    },
    {
      id: 'taaft',
      name: "There's An AI For That",
      domain: 'theresanaiforthat.com',
      submission_type: 'form_automation',
      domain_rating: 74,
      category: 'AI Aggregator',
      is_active: true,
      requires_auth: false
    },
    {
      id: 'toolify',
      name: 'Toolify.ai',
      domain: 'toolify.ai',
      submission_type: 'direct_api',
      domain_rating: 71,
      category: 'AI Directory API',
      is_active: true,
      requires_auth: false
    }
  ];
}

export function createMockSubmissions(projectId = 'proj-e2e-101'): E2ESubmission[] {
  const dirs = createMockDirectories();
  return dirs.map((d, index) => ({
    id: `sub-${projectId}-${d.id}`,
    project_id: projectId,
    directory_id: d.id,
    directory_name: d.name,
    directory_category: d.category,
    domain_rating: d.domain_rating,
    submission_type: d.submission_type,
    status: index === 0 ? 'in_progress' : 'queued',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
}
