import { EventEmitter } from 'node:events';

export interface StressJobPayload {
  jobId: string;
  projectId: string;
  projectName: string;
  directoryId: string;
  directoryName: string;
  simulateTransientError?: boolean;
}

export interface StressJobResult {
  jobId: string;
  projectId: string;
  directoryId: string;
  status: 'published' | 'failed';
  attempts: number;
  durationMs: number;
  error?: string;
}

export interface ConcurrencyBenchmarkOptions {
  totalProjects?: number;
  directoriesPerProject?: number;
  workerConcurrency?: number;
  failureRate?: number; // 0.0 to 1.0 (simulated 503 transient error needing retry)
  silent?: boolean;
}

export interface BenchmarkMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  retriedJobs: number;
  totalDurationMs: number;
  jobsPerSecond: number;
  avgJobDurationMs: number;
  maxActiveConcurrencyObserved: number;
}

/**
 * High-performance In-Memory Queue Runner with rate-limiting & exponential backoff.
 */
export class StressQueueEngine extends EventEmitter {
  private queue: StressJobPayload[] = [];
  private activeJobsCount = 0;
  private maxConcurrency: number;
  private maxActiveObserved = 0;
  private results: StressJobResult[] = [];
  private isProcessing = false;

  constructor(maxConcurrency = 10) {
    super();
    this.maxConcurrency = maxConcurrency;
  }

  public enqueue(job: StressJobPayload): void {
    this.queue.push(job);
    this.emit('job:enqueued', job);
    this.processNext();
  }

  public enqueueBatch(jobs: StressJobPayload[]): void {
    for (const j of jobs) {
      this.enqueue(j);
    }
  }

  public async waitForCompletion(timeoutMs = 30000): Promise<StressJobResult[]> {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.queue.length === 0 && this.activeJobsCount === 0) {
          clearInterval(checkInterval);
          resolve(this.results);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error(`StressQueueEngine timed out after ${timeoutMs}ms with ${this.queue.length} pending and ${this.activeJobsCount} active jobs.`));
        }
      }, 20);
    });
  }

  private async processNext(): Promise<void> {
    if (this.activeJobsCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeJobsCount++;
    if (this.activeJobsCount > this.maxActiveObserved) {
      this.maxActiveObserved = this.activeJobsCount;
    }

    this.emit('job:started', { jobId: job.jobId, activeJobs: this.activeJobsCount });

    // Execute job asynchronously
    this.executeJobWithRetry(job, 1)
      .then((res) => {
        this.results.push(res);
        this.emit('job:completed', res);
      })
      .catch((err) => {
        const failedResult: StressJobResult = {
          jobId: job.jobId,
          projectId: job.projectId,
          directoryId: job.directoryId,
          status: 'failed',
          attempts: 3,
          durationMs: 0,
          error: err.message
        };
        this.results.push(failedResult);
        this.emit('job:failed', failedResult);
      })
      .finally(() => {
        this.activeJobsCount--;
        this.emit('job:finished', { jobId: job.jobId, remaining: this.queue.length, activeJobs: this.activeJobsCount });
        this.processNext();
      });

    // Attempt to launch more concurrent jobs if capacity allows
    if (this.activeJobsCount < this.maxConcurrency && this.queue.length > 0) {
      setImmediate(() => this.processNext());
    }
  }

  private async executeJobWithRetry(job: StressJobPayload, attempt: number): Promise<StressJobResult> {
    const jobStartTime = performance.now();
    const maxAttempts = 3;

    try {
      // Simulate network request duration (20ms - 80ms)
      const simulatedDuration = 20 + Math.floor(Math.random() * 60);
      await new Promise((r) => setTimeout(r, simulatedDuration));

      // Simulate transient error on first attempt if requested
      if (job.simulateTransientError && attempt === 1) {
        throw new Error('Simulated HTTP 503 Transient Service Unavailable');
      }

      const elapsed = performance.now() - jobStartTime;
      return {
        jobId: job.jobId,
        projectId: job.projectId,
        directoryId: job.directoryId,
        status: 'published',
        attempts: attempt,
        durationMs: elapsed
      };
    } catch (err: any) {
      if (attempt < maxAttempts) {
        // Exponential backoff delay: 50ms * 2^attempt
        const backoffDelay = 50 * Math.pow(2, attempt);
        this.emit('job:retry', { jobId: job.jobId, attempt, nextDelayMs: backoffDelay, error: err.message });
        await new Promise((r) => setTimeout(r, backoffDelay));
        return this.executeJobWithRetry(job, attempt + 1);
      }
      throw err;
    }
  }

  public getPeakConcurrency(): number {
    return this.maxActiveObserved;
  }
}

/**
 * Runs the benchmark suite simulating N concurrent projects across M directories.
 */
export async function runConcurrencyBenchmark(options: ConcurrencyBenchmarkOptions = {}): Promise<BenchmarkMetrics> {
  const totalProjects = options.totalProjects ?? 10;
  const directoriesPerProject = options.directoriesPerProject ?? 5;
  const workerConcurrency = options.workerConcurrency ?? 10;
  const failureRate = options.failureRate ?? 0.15; // 15% transient error rate to test retries
  const silent = options.silent ?? true;

  const targetDirectories = ['uneed', 'saashub', 'alternativeto', 'taaft', 'toolify', 'indiehackers', 'producthunt', 'fazier'];
  const selectedDirs = targetDirectories.slice(0, directoriesPerProject);

  const totalJobs = totalProjects * selectedDirs.length;
  if (!silent) {
    console.log(`[StressTest] Launching benchmark: ${totalProjects} projects x ${selectedDirs.length} directories = ${totalJobs} jobs (Concurrency Limit: ${workerConcurrency})`);
  }

  const engine = new StressQueueEngine(workerConcurrency);
  const jobs: StressJobPayload[] = [];

  for (let p = 1; p <= totalProjects; p++) {
    const projectId = `proj-${p.toString().padStart(3, '0')}`;
    const projectName = `SaaS Project ${p}`;

    for (const dirId of selectedDirs) {
      const isTransient = Math.random() < failureRate;
      jobs.push({
        jobId: `job-${projectId}-${dirId}`,
        projectId,
        projectName,
        directoryId: dirId,
        directoryName: dirId.toUpperCase(),
        simulateTransientError: isTransient
      });
    }
  }

  const startTime = performance.now();
  engine.enqueueBatch(jobs);

  const results = await engine.waitForCompletion(45000);
  const totalDurationMs = performance.now() - startTime;

  const successful = results.filter((r) => r.status === 'published').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const retried = results.filter((r) => r.attempts > 1).length;
  const totalJobDurationSum = results.reduce((acc, curr) => acc + curr.durationMs, 0);

  const metrics: BenchmarkMetrics = {
    totalJobs: results.length,
    successfulJobs: successful,
    failedJobs: failed,
    retriedJobs: retried,
    totalDurationMs,
    jobsPerSecond: Number(((results.length / totalDurationMs) * 1000).toFixed(2)),
    avgJobDurationMs: Number((totalJobDurationSum / results.length).toFixed(2)),
    maxActiveConcurrencyObserved: engine.getPeakConcurrency()
  };

  if (!silent) {
    console.log(`[StressTest] Completed: ${metrics.totalJobs} jobs in ${(totalDurationMs / 1000).toFixed(2)}s (${metrics.jobsPerSecond} jobs/sec). Peak Concurrency: ${metrics.maxActiveConcurrencyObserved}`);
  }

  return metrics;
}

// Standalone CLI execution
if (require.main === module) {
  runConcurrencyBenchmark({ silent: false, totalProjects: 10, directoriesPerProject: 5, workerConcurrency: 10 })
    .then((metrics) => {
      console.log('Stress Benchmark Results:', JSON.stringify(metrics, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Stress Benchmark Error:', err);
      process.exit(1);
    });
}
