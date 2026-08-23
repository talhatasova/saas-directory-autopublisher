import {
  Directory,
  DIRECTORY_CATALOG,
  GetDirectoriesQuery,
} from '@saas-autopublisher/shared';

export class DirectoryRegistryService {
  private directories: Map<string, Directory> = new Map();

  constructor(initialCatalog: readonly Directory[] = DIRECTORY_CATALOG) {
    for (const dir of initialCatalog) {
      this.directories.set(dir.id, { ...dir });
    }
  }

  /**
   * Retrieves directories matching optional filters.
   */
  public getDirectories(query?: GetDirectoriesQuery): Directory[] {
    let result = Array.from(this.directories.values());

    if (!query) {
      return result;
    }

    if (query.category && query.category.toLowerCase() !== 'all') {
      const catLower = query.category.toLowerCase();
      result = result.filter((d) => d.category.toLowerCase().includes(catLower));
    }

    if (query.submissionType) {
      const typeLower = query.submissionType.toLowerCase();
      result = result.filter((d) => d.submissionType.toLowerCase() === typeLower);
    }

    if (query.minDr !== undefined && !isNaN(Number(query.minDr))) {
      const minDr = Number(query.minDr);
      result = result.filter((d) => d.domainRating >= minDr);
    }

    if (query.status && query.status.toLowerCase() !== 'all') {
      const statusLower = query.status.toLowerCase();
      result = result.filter((d) => d.status.toLowerCase() === statusLower);
    }

    return result;
  }

  /**
   * Retrieves a single directory by its unique ID.
   */
  public getDirectoryById(id: string): Directory | undefined {
    return this.directories.get(id);
  }

  /**
   * Returns a list of distinct directory categories.
   */
  public getCategories(): string[] {
    const categories = new Set<string>();
    for (const dir of this.directories.values()) {
      categories.add(dir.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Registers or updates a directory in the catalog.
   */
  public registerDirectory(dir: Directory): void {
    this.directories.set(dir.id, { ...dir });
  }

  /**
   * Returns the total count of active directories.
   */
  public get count(): number {
    return this.directories.size;
  }
}

export const directoryRegistry = new DirectoryRegistryService();
