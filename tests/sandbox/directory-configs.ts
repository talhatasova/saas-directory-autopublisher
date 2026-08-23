export interface MockDirectoryDefinition {
  id: string;
  name: string;
  domain: string;
  submissionType: 'playwright' | 'http_api' | 'assisted';
  domainRating: number;
  category: string;
  submitUrl: string;
  apiEndpoint?: string;
  requiresAuth: boolean;
  requiredFields: string[];
}

export const MOCK_DIRECTORIES: Record<string, MockDirectoryDefinition> = {
  uneed: {
    id: 'uneed',
    name: 'Uneed Best Tools',
    domain: 'uneed.best',
    submissionType: 'playwright',
    domainRating: 62,
    category: 'Curated SaaS',
    submitUrl: '/mock/uneed/submit',
    requiresAuth: false,
    requiredFields: ['name', 'url', 'tagline', 'description', 'pricing', 'category']
  },
  saashub: {
    id: 'saashub',
    name: 'SaaSHub',
    domain: 'saashub.com',
    submissionType: 'playwright',
    domainRating: 78,
    category: 'Software Alternatives',
    submitUrl: '/mock/saashub/submit',
    requiresAuth: false,
    requiredFields: ['name', 'url', 'tagline', 'description', 'category']
  },
  alternativeto: {
    id: 'alternativeto',
    name: 'AlternativeTo',
    domain: 'alternativeto.net',
    submissionType: 'playwright',
    domainRating: 84,
    category: 'Crowdsourced Software',
    submitUrl: '/mock/alternativeto/software/create',
    requiresAuth: false,
    requiredFields: ['name', 'url', 'description', 'license']
  },
  taaft: {
    id: 'taaft',
    name: "There's An AI For That",
    domain: 'theresanaiforthat.com',
    submissionType: 'playwright',
    domainRating: 74,
    category: 'AI Aggregator',
    submitUrl: '/mock/taaft/submit',
    requiresAuth: false,
    requiredFields: ['tool_name', 'tool_url', 'description', 'pricing']
  },
  toolify: {
    id: 'toolify',
    name: 'Toolify.ai',
    domain: 'toolify.ai',
    submissionType: 'http_api',
    domainRating: 71,
    category: 'AI Directory API',
    submitUrl: '/api/mock/toolify/submit',
    apiEndpoint: '/api/mock/toolify/submit',
    requiresAuth: true,
    requiredFields: ['app_name', 'website_url', 'tagline', 'description', 'category', 'pricing_type']
  }
};
