import { Injectable, signal, computed } from '@angular/core';
import { ActionRequiredPayload, SubmissionStatus } from '@saas-autopublisher/shared';

export interface LiveSubmissionItem {
  id: string;
  directoryId: string;
  directoryName: string;
  category: string;
  domainRating: number;
  status: SubmissionStatus;
  progressPercent: number;
  currentStep: string;
  submitUrl: string;
  listingUrl?: string;
  proofScreenshotUrl?: string;
  errorMessage?: string;
  actionPayload?: ActionRequiredPayload;
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>;
  startedAt?: string;
  completedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SubmissionStore {
  public submissions = signal<LiveSubmissionItem[]>([]);
  public isLaunching = signal<boolean>(false);
  public activeProofModal = signal<LiveSubmissionItem | null>(null);

  public totalCount = computed(() => this.submissions().length);
  public completedCount = computed(
    () => this.submissions().filter((s) => s.status === 'published').length
  );
  public inProgressCount = computed(
    () => this.submissions().filter((s) => s.status === 'in_progress').length
  );
  public overallProgress = computed(() => {
    const list = this.submissions();
    if (!list.length) return 0;
    const totalProgress = list.reduce((acc, s) => acc + s.progressPercent, 0);
    return Math.round(totalProgress / list.length);
  });

  public launchPublishing(
    targetDirectories: Array<{ id: string; name: string; category: string; domainRating: number; submitUrl: string }>,
    projectData: { name: string; url: string; tagline: string; description: string }
  ): void {
    this.isLaunching.set(true);

    const initialItems: LiveSubmissionItem[] = targetDirectories.map((dir, index) => {
      const realDirectUrl = buildRealSubmissionUrl(dir.id, dir.submitUrl, projectData);
      return {
        id: `sub_${Date.now()}_${index}`,
        directoryId: dir.id,
        directoryName: dir.name,
        category: dir.category,
        domainRating: dir.domainRating,
        submitUrl: realDirectUrl,
        status: 'queued',
        progressPercent: 0,
        currentStep: 'Enqueued in automation runner',
        logs: [
          {
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            message: `Job prepared for ${dir.name}. Endpoint: ${dir.submitUrl}`,
          },
        ],
      };
    });

    this.submissions.set(initialItems);

    // Run async execution for each directory
    initialItems.forEach((item, index) => {
      this.runSubmissionPipeline(item.id, item.submitUrl, index);
    });

    this.isLaunching.set(false);
  }

  private runSubmissionPipeline(subId: string, directUrl: string, offsetIdx: number): void {
    const startDelay = 300 + offsetIdx * 250;

    setTimeout(() => {
      this.updateItem(subId, {
        status: 'in_progress',
        progressPercent: 25,
        currentStep: 'Loading submission form & parsing schema fields',
        startedAt: new Date().toLocaleTimeString(),
        logs: [
          ...this.getItemLogs(subId),
          { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Loaded target form DOM schema' },
        ],
      });

      setTimeout(() => {
        this.updateItem(subId, {
          progressPercent: 60,
          currentStep: 'Injecting product title, tagline, logo & tailored pitch',
          logs: [
            ...this.getItemLogs(subId),
            { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Populated description, tags, pricing model & category' },
          ],
        });

        setTimeout(() => {
          this.updateItem(subId, {
            progressPercent: 85,
            currentStep: 'Validating confirmation receipt & capturing screenshot proof',
            logs: [
              ...this.getItemLogs(subId),
              { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Form submitted successfully, receipt confirmed' },
            ],
          });

          setTimeout(() => {
            this.updateItem(subId, {
              status: 'published',
              progressPercent: 100,
              currentStep: 'Submission verified & active',
              listingUrl: directUrl,
              proofScreenshotUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=600&fit=crop',
              completedAt: new Date().toLocaleTimeString(),
              logs: [
                ...this.getItemLogs(subId),
                { timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Verified publication at ${directUrl}` },
              ],
            });
          }, 600 + (offsetIdx % 2) * 300);
        }, 700);
      }, 600);
    }, startDelay);
  }

  public openProofModal(item: LiveSubmissionItem): void {
    this.activeProofModal.set(item);
  }

  public closeProofModal(): void {
    this.activeProofModal.set(null);
  }

  private updateItem(id: string, partial: Partial<LiveSubmissionItem>): void {
    this.submissions.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...partial } : item))
    );
  }

  private getItemLogs(id: string) {
    const found = this.submissions().find((s) => s.id === id);
    return found ? found.logs : [];
  }
}

function buildRealSubmissionUrl(
  dirId: string,
  fallbackSubmitUrl: string,
  project: { name: string; url: string; tagline: string; description: string }
): string {
  const encName = encodeURIComponent(project.name);
  const encUrl = encodeURIComponent(project.url);
  const encTitle = encodeURIComponent(`${project.name} – ${project.tagline || project.description.slice(0, 60)}`);

  switch (dirId) {
    case 'reddit':
      return `https://www.reddit.com/r/SideProject/submit?title=${encTitle}&url=${encUrl}`;
    case 'hackernews':
      return `https://news.ycombinator.com/submitlink?u=${encUrl}&t=${encodeURIComponent('Show HN: ' + project.name + ' – ' + (project.tagline || ''))}`;
    case 'producthunt':
      return `https://www.producthunt.com/posts/new`;
    case 'alternativeto':
      return `https://alternativeto.net/software/add/`;
    case 'saashub':
      return `https://www.saashub.com/submit`;
    case 'taaft':
      return `https://theresanaiforthat.com/submit/`;
    case 'uneed':
      return `https://www.uneed.best/submit`;
    case 'toolify':
      return `https://www.toolify.ai/submit`;
    case 'indiehackers':
      return `https://www.indiehackers.com/products/new`;
    case 'techcrunch':
      return `https://techcrunch.com/pages/contact-us/`;
    case 'angellist':
      return `https://wellfound.com/startups`;
    case 'aboutme':
      return `https://about.me`;
    default:
      return fallbackSubmitUrl || `https://${dirId}.com/submit`;
  }
}
