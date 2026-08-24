import { DirectorySubmitter } from '@saas-autopublisher/shared';
import { BaseAdapter } from './base.adapter.js';
import { UneedAdapter } from './uneed.adapter.js';
import { SaaSHubAdapter } from './saashub.adapter.js';
import { AlternativeToAdapter } from './alternativeto.adapter.js';
import { TaaftAdapter } from './taaft.adapter.js';
import { ToolifyHttpAdapter } from './toolify-http.adapter.js';

export {
  BaseAdapter,
  UneedAdapter,
  SaaSHubAdapter,
  AlternativeToAdapter,
  TaaftAdapter,
  ToolifyHttpAdapter,
};

export class AdapterRegistry {
  private static adapters: Map<string, DirectorySubmitter> = new Map<string, DirectorySubmitter>([
    ['uneed', new UneedAdapter()],
    ['saashub', new SaaSHubAdapter()],
    ['alternativeto', new AlternativeToAdapter()],
    ['taaft', new TaaftAdapter()],
    ['toolify', new ToolifyHttpAdapter()],
  ]);

  public static getAdapter(directoryId: string): DirectorySubmitter | undefined {
    return this.adapters.get(directoryId.toLowerCase());
  }

  public static registerAdapter(adapter: DirectorySubmitter): void {
    this.adapters.set(adapter.id.toLowerCase(), adapter);
  }

  public static getAllAdapters(): DirectorySubmitter[] {
    return Array.from(this.adapters.values());
  }
}
