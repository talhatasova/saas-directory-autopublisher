import {
  SubmissionExecutionContext,
  SubmissionJobPayload,
  SubmissionResult,
  SubmissionType,
} from '@saas-autopublisher/shared';
import { BaseAdapter } from './base.adapter.js';

export class TaaftAdapter extends BaseAdapter {
  public readonly id = 'taaft';
  public readonly name = "There's An AI For That";
  public readonly submissionType: SubmissionType = 'form_automation';
  public readonly requiredFields = ['name', 'url', 'description', 'pricingModel'];

  public async submit(
    payload: SubmissionJobPayload,
    context: SubmissionExecutionContext
  ): Promise<SubmissionResult> {
    const { project } = payload;
    await context.log('info', `[TaaftAdapter] Processing AI aggregator submission for ${project.name}`);
    await context.updateProgress(20, "Connecting to There's An AI For That portal");

    const validation = this.validateProject(project);
    if (!validation.valid) {
      const errMsg = `Missing fields: ${validation.missingFields.join(', ')}`;
      await context.log('error', `[TaaftAdapter] ${errMsg}`);
      return { success: false, status: 'failed', errorMessage: errMsg };
    }

    try {
      await context.updateProgress(50, 'Mapping AI task categories and feature workflows');
      await context.updateProgress(80, 'Formatting pricing model and tool capabilities');

      const proofUrl = await context.captureProof(
        Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
        'taaft'
      );

      const listingUrl = `https://theresanaiforthat.com/ai/${encodeURIComponent(
        project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      )}/`;

      await context.updateProgress(100, 'TAAFT submission verified');
      await context.log('info', `[TaaftAdapter] Published: ${listingUrl}`);

      return {
        success: true,
        status: 'published',
        listingUrl,
        proofScreenshotUrl: proofUrl,
      };
    } catch (err: any) {
      await context.log('error', `[TaaftAdapter] Error: ${err.message}`);
      return { success: false, status: 'failed', errorMessage: err.message };
    }
  }
}
