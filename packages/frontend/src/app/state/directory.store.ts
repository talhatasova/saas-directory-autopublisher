import { Injectable, signal, computed } from '@angular/core';
import { Directory } from '@saas-autopublisher/shared';
import { ApiService } from '../core/api.service.js';

export interface DisplayDirectory extends Directory {
  selected: boolean;
  trafficEst?: string;
  linkType?: 'Dofollow' | 'Nofollow';
  pricingType?: 'Free' | 'Paid' | 'Free + Paid';
}

@Injectable({
  providedIn: 'root',
})
export class DirectoryStore {
  public directories = signal<DisplayDirectory[]>([
    {
      id: 'reddit',
      name: 'Reddit',
      url: 'https://reddit.com/r/SideProject',
      category: 'Community',
      domainRating: 95,
      submissionType: 'form_automation',
      status: 'active',
      requiresAuth: true,
      estimatedTimeSec: 60,
      config: {},
      selected: true,
      trafficEst: '52.0M',
      linkType: 'Nofollow',
      pricingType: 'Free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'producthunt',
      name: 'Product Hunt',
      url: 'https://producthunt.com',
      category: 'Launch Platform',
      domainRating: 91,
      submissionType: 'form_automation',
      status: 'active',
      requiresAuth: true,
      estimatedTimeSec: 90,
      config: {},
      selected: true,
      trafficEst: '8.5M',
      linkType: 'Dofollow',
      pricingType: 'Free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'alternativeto',
      name: 'AlternativeTo',
      url: 'https://alternativeto.net',
      category: 'Software Catalog',
      domainRating: 84,
      submissionType: 'form_automation',
      status: 'active',
      requiresAuth: false,
      estimatedTimeSec: 45,
      config: {},
      selected: true,
      trafficEst: '2.5M',
      linkType: 'Nofollow',
      pricingType: 'Free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'saashub',
      name: 'SaaSHub',
      url: 'https://saashub.com',
      category: 'Software Alternatives',
      domainRating: 78,
      submissionType: 'form_automation',
      status: 'active',
      requiresAuth: false,
      estimatedTimeSec: 40,
      config: {},
      selected: true,
      trafficEst: '1.2M',
      linkType: 'Dofollow',
      pricingType: 'Free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'taaft',
      name: "There's An AI For That",
      url: 'https://theresanaiforthat.com',
      category: 'AI Directory',
      domainRating: 74,
      submissionType: 'form_automation',
      status: 'active',
      requiresAuth: false,
      estimatedTimeSec: 30,
      config: {},
      selected: true,
      trafficEst: '1.8M',
      linkType: 'Dofollow',
      pricingType: 'Free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'toolify',
      name: 'Toolify.ai',
      url: 'https://toolify.ai',
      category: 'AI Aggregator',
      domainRating: 71,
      submissionType: 'direct_api',
      status: 'active',
      requiresAuth: false,
      estimatedTimeSec: 15,
      config: {},
      selected: true,
      trafficEst: '950K',
      linkType: 'Dofollow',
      pricingType: 'Free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'uneed',
      name: 'Uneed Best Tools',
      url: 'https://uneed.best',
      category: 'Curated SaaS',
      domainRating: 62,
      submissionType: 'form_automation',
      status: 'active',
      requiresAuth: false,
      estimatedTimeSec: 35,
      config: {},
      selected: true,
      trafficEst: '250K',
      linkType: 'Dofollow',
      pricingType: 'Free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  public selectedCategory = signal<string>('All');
  public searchQuery = signal<string>('');

  public selectedCount = computed(
    () => this.directories().filter((d) => d.selected).length
  );

  public avgDomainRating = computed(() => {
    const list = this.directories().filter((d) => d.selected);
    if (!list.length) return 0;
    const total = list.reduce((acc, d) => acc + d.domainRating, 0);
    return Math.round(total / list.length);
  });

  public filteredDirectories = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase();
    return this.directories().filter((d) => {
      const matchCat = cat === 'All' || d.category.toLowerCase().includes(cat.toLowerCase());
      const matchQuery = !query || d.name.toLowerCase().includes(query) || d.category.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  });

  constructor(private api: ApiService) {
    this.loadCatalog();
  }

  public async loadCatalog(): Promise<void> {
    try {
      const remote = await this.api.getDirectories();
      if (remote && remote.length) {
        this.directories.update((current) => {
          const currentMap = new Map(current.map((c) => [c.id, c]));
          return remote.map((r) => {
            const existing = currentMap.get(r.id);
            return {
              ...r,
              selected: existing ? existing.selected : true,
              trafficEst: existing?.trafficEst || '500K',
              linkType: existing?.linkType || 'Dofollow',
              pricingType: existing?.pricingType || 'Free',
            };
          });
        });
      }
    } catch {
      // Keep rich default catalogue
    }
  }

  public toggleSelection(id: string): void {
    this.directories.update((list) =>
      list.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  }

  public selectAll(selected: boolean = true): void {
    this.directories.update((list) => list.map((d) => ({ ...d, selected })));
  }
}
