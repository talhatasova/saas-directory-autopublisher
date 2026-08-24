import {
  AdapterValidationResult,
  DirectorySubmitter,
  Project,
  SubmissionExecutionContext,
  SubmissionJobPayload,
  SubmissionResult,
  SubmissionType,
} from '@saas-autopublisher/shared';

export abstract class BaseAdapter implements DirectorySubmitter {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly submissionType: SubmissionType;
  public abstract readonly requiredFields: Array<keyof Project | string>;

  public validateProject(project: Project): AdapterValidationResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    for (const field of this.requiredFields) {
      const val = (project as any)[field];
      if (val === undefined || val === null || val === '') {
        missingFields.push(String(field));
      }
    }

    if (!project.logoUrl) {
      warnings.push('Missing logo URL; some directories may assign a default placeholder.');
    }
    if (!project.screenshotUrls || project.screenshotUrls.length === 0) {
      warnings.push('No screenshots provided; directory visibility might be lower.');
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
      warnings,
    };
  }

  public abstract submit(
    payload: SubmissionJobPayload,
    context: SubmissionExecutionContext
  ): Promise<SubmissionResult>;
}
