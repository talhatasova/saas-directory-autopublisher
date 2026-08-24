import { Injectable, signal, computed } from '@angular/core';

export interface DisplayDirectory {
  id: string;
  name: string;
  url: string;
  category: string;
  domainRating: number;
  traffic: string;
  linkType: 'Dofollow' | 'Nofollow';
  pricingType: 'Free' | 'Paid' | 'Free + Paid';
  description: string;
  drUpdated: string;
  submitUrl: string;
  brandColor: string;
  iconText: string;
  isBookmarked: boolean;
  selected: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DirectoryStore {
  public directories = signal<DisplayDirectory[]>([
    {
      id: 'reddit',
      name: 'Reddit',
      url: 'https://www.reddit.com/r/SideProject/submit',
      category: 'Community',
      domainRating: 95,
      traffic: '52.0M',
      linkType: 'Nofollow',
      pricingType: 'Free',
      description: 'The front page of the internet - diverse communities (r/SideProject, r/SaaS) for indie founder launches.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://www.reddit.com/r/SideProject/submit',
      brandColor: '#FF4500',
      iconText: '🔴',
      isBookmarked: true,
      selected: true,
    },
    {
      id: 'techcrunch',
      name: 'TechCrunch',
      url: 'https://techcrunch.com/pages/contact-us/',
      category: 'Media',
      domainRating: 92,
      traffic: '12.0M',
      linkType: 'Nofollow',
      pricingType: 'Paid',
      description: 'Leading technology media property, dedicated to profiling groundbreaking startups and breaking tech news.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://techcrunch.com/pages/contact-us/',
      brandColor: '#00A562',
      iconText: '🟢',
      isBookmarked: false,
      selected: true,
    },
    {
      id: 'producthunt',
      name: 'Product Hunt',
      url: 'https://www.producthunt.com/posts/new',
      category: 'Launch Platform',
      domainRating: 91,
      traffic: '8.5M',
      linkType: 'Dofollow',
      pricingType: 'Free',
      description: 'The premier platform for discovering and launching next-gen digital products and SaaS apps.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://www.producthunt.com/posts/new',
      brandColor: '#DA552F',
      iconText: '🐱',
      isBookmarked: true,
      selected: true,
    },
    {
      id: 'angellist',
      name: 'AngelList / Wellfound',
      url: 'https://wellfound.com/startups',
      category: 'Investors',
      domainRating: 90,
      traffic: '2.8M',
      linkType: 'Dofollow',
      pricingType: 'Free + Paid',
      description: "The world's largest startup community for investments, discovery, and high-growth hiring.",
      drUpdated: 'Aug 2026',
      submitUrl: 'https://wellfound.com/startups',
      brandColor: '#000000',
      iconText: '✌️',
      isBookmarked: false,
      selected: true,
    },
    {
      id: 'aboutme',
      name: 'About.me',
      url: 'https://about.me',
      category: 'Portfolio',
      domainRating: 90,
      traffic: '500K',
      linkType: 'Nofollow',
      pricingType: 'Free',
      description: 'Personal branding, splash pages, and product portfolio directory for founders.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://about.me',
      brandColor: '#2B2B2B',
      iconText: '👤',
      isBookmarked: false,
      selected: true,
    },
    {
      id: 'hackernews',
      name: 'Hacker News (Show HN)',
      url: 'https://news.ycombinator.com/submit',
      category: 'Community',
      domainRating: 90,
      traffic: '4.2M',
      linkType: 'Nofollow',
      pricingType: 'Free',
      description: "Y Combinator's community-driven tech news and Show HN launching hub for engineers.",
      drUpdated: 'Aug 2026',
      submitUrl: 'https://news.ycombinator.com/submit',
      brandColor: '#FF6600',
      iconText: '🟠',
      isBookmarked: true,
      selected: true,
    },
    {
      id: 'indiehackers',
      name: 'Indie Hackers',
      url: 'https://www.indiehackers.com/products/new',
      category: 'Community',
      domainRating: 80,
      traffic: '1.2M',
      linkType: 'Dofollow',
      pricingType: 'Free',
      description: 'Community of developers sharing milestones, MRR growth, and SaaS products.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://www.indiehackers.com/products/new',
      brandColor: '#0E2439',
      iconText: '⚙️',
      isBookmarked: true,
      selected: true,
    },
    {
      id: 'alternativeto',
      name: 'AlternativeTo',
      url: 'https://alternativeto.net/software/add/',
      category: 'Software Catalog',
      domainRating: 80,
      traffic: '2.5M',
      linkType: 'Nofollow',
      pricingType: 'Free',
      description: 'Crowdsourced software recommendations and SaaS alternative suggestions.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://alternativeto.net/software/add/',
      brandColor: '#2C87F0',
      iconText: '🔄',
      isBookmarked: false,
      selected: true,
    },
    {
      id: 'taaft',
      name: "There's An AI For That",
      url: 'https://theresanaiforthat.com/submit/',
      category: 'AI Tools',
      domainRating: 75,
      traffic: '120K',
      linkType: 'Dofollow',
      pricingType: 'Free',
      description: 'Comprehensive database of AI tools, agents, and automation workflows.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://theresanaiforthat.com/submit/',
      brandColor: '#7C3AED',
      iconText: '🤖',
      isBookmarked: true,
      selected: true,
    },
    {
      id: 'saashub',
      name: 'SaaSHub',
      url: 'https://www.saashub.com/submit',
      category: 'Software Catalog',
      domainRating: 78,
      traffic: '1.2M',
      linkType: 'Dofollow',
      pricingType: 'Free',
      description: 'Software discovery platform helping businesses compare and find SaaS tools.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://www.saashub.com/submit',
      brandColor: '#4F46E5',
      iconText: '🌐',
      isBookmarked: false,
      selected: true,
    },
    {
      id: 'toolify',
      name: 'Toolify.ai',
      url: 'https://www.toolify.ai/submit',
      category: 'AI Tools',
      domainRating: 71,
      traffic: '950K',
      linkType: 'Dofollow',
      pricingType: 'Free',
      description: 'Leading AI tools directory, GPT prompts, and autonomous agent discovery.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://www.toolify.ai/submit',
      brandColor: '#2563EB',
      iconText: '⚡',
      isBookmarked: false,
      selected: true,
    },
    {
      id: 'uneed',
      name: 'Uneed.best',
      url: 'https://www.uneed.best/submit',
      category: 'Curated SaaS',
      domainRating: 68,
      traffic: '250K',
      linkType: 'Dofollow',
      pricingType: 'Free',
      description: 'Hand-curated collection of the best tools on the web, updated daily.',
      drUpdated: 'Aug 2026',
      submitUrl: 'https://www.uneed.best/submit',
      brandColor: '#9333EA',
      iconText: '💎',
      isBookmarked: false,
      selected: true,
    },
  ]);

  public selectedCategory = signal<string>('All');
  public searchQuery = signal<string>('');
  public selectedLinkType = signal<string>('All');

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
    const linkType = this.selectedLinkType();

    return this.directories().filter((d) => {
      const matchCat = cat === 'All' || d.category === cat || d.pricingType === cat;
      const matchQuery = !query || d.name.toLowerCase().includes(query) || d.description.toLowerCase().includes(query);
      const matchLink = linkType === 'All' || d.linkType === linkType;
      return matchCat && matchQuery && matchLink;
    });
  });

  public toggleSelection(id: string): void {
    this.directories.update((list) =>
      list.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  }

  public toggleBookmark(id: string): void {
    this.directories.update((list) =>
      list.map((d) => (d.id === id ? { ...d, isBookmarked: !d.isBookmarked } : d))
    );
  }

  public selectAll(selected: boolean = true): void {
    this.directories.update((list) => list.map((d) => ({ ...d, selected })));
  }
}
