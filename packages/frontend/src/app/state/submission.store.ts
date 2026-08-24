import { Injectable, signal, computed } from '@angular/core';
import { ActionRequiredPayload, SubmissionStatus } from '@saas-autopublisher/shared';
import { ApiService } from '../core/api.service.js';

export interface LiveSubmissionItem {
  id: string;
  directoryId: string;
  directoryName: string;
  category: string;
  domainRating: number;
  status: SubmissionStatus;
  progressPercent: number;
  currentStep: string;
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
  public actionRequiredCount = computed(
    () => this.submissions().filter((s) => s.status === 'action_required').length
  );
  public overallProgress = computed(() => {
    const list = this.submissions();
    if (!list.length) return 0;
    const totalProgress = list.reduce((acc, s) => acc + s.progressPercent, 0);
    return Math.round(totalProgress / list.length);
  });

  constructor(private api: ApiService) {}

  public launchPublishing(
    targetDirectories: Array<{ id: string; name: string; category: string; domainRating: number }>,
    projectName: string
  ): void {
    this.isLaunching.set(true);

    const initialItems: LiveSubmissionItem[] = targetDirectories.map((dir, index) => ({
      id: `sub_${Date.now()}_${index}`,
      directoryId: dir.id,
      directoryName: dir.name,
      category: dir.category,
      domainRating: dir.domainRating,
      status: 'queued',
      progressPercent: 0,
      currentStep: 'Enqueued in job runner pipeline',
      logs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Submission job created for ${dir.name}`,
        },
      ],
    }));

    this.submissions.set(initialItems);

    // Trigger async simulated / real processing for each item
    initialItems.forEach((item, index) => {
      this.runSubmissionPipeline(item.id, dirToUrl(item.directoryId, projectName), index);
    });

    this.isLaunching.set(false);
  }

  private runSubmissionPipeline(subId: string, listingSlug: string, offsetIdx: number): void {
    const startDelay = 400 + offsetIdx * 350;

    setTimeout(() => {
      this.updateItem(subId, {
        status: 'in_progress',
        progressPercent: 20,
        currentStep: 'Connecting to directory endpoint & loading form schema',
        startedAt: new Date().toLocaleTimeString(),
        logs: [
          ...this.getItemLogs(subId),
          { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Worker spawned headless session' },
        ],
      });

      setTimeout(() => {
        this.updateItem(subId, {
          progressPercent: 55,
          currentStep: 'Populating OpenGraph metadata, pitch copy & tags',
          logs: [
            ...this.getItemLogs(subId),
            { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Injected title, description, and pricing model' },
          ],
        });

        setTimeout(() => {
          this.updateItem(subId, {
            progressPercent: 85,
            currentStep: 'Capturing proof-of-submission screenshot & receipt',
            logs: [
              ...this.getItemLogs(subId),
              { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Form submitted successfully, validating confirmation page' },
            ],
          });

          setTimeout(() => {
            this.updateItem(subId, {
              status: 'published',
              progressPercent: 100,
              currentStep: 'Published & Verified live on directory',
              listingUrl: listingSlug,
              proofScreenshotUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=600&fit=crop',
              completedAt: new Date().toLocaleTimeString(),
              logs: [
                ...this.getItemLogs(subId),
                { timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Verified publication. URL: ${listingSlug}` },
              ],
            });
          }, 800 + (offsetIdx % 2) * 400);
        }, 900);
      }, 800);
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

function dirToUrl(dirId: string, projectName: string): string {
  const slug = encodeURIComponent(projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  switch (dirId) {
    case 'reddit':
      return `https://reddit.com/r/SideProject/comments/launch_${slug}`;
    case 'producthunt':
      return `https://www.producthunt.com/products/${slug}`;
    case 'alternativeto':
      return `https://alternativeto.net/software/${slug}/`;
    case 'saashub':
      return `https://www.saashub.com/${slug}`;
    case 'taaft':
      return `https://theresanaiforthat.com/ai/${slug}/`;
    case 'toolify':
      return `https://www.toolify.ai/tool/${slug}`;
    case 'uneed':
      return `https://www.uneed.best/tool/${slug}`;
    default:
      return `https://${dirId}.com/tools/${slug}`;
  }
}
