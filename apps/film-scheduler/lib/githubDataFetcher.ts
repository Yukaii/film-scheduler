interface GithubConfig {
  owner: string;
  repo: string;
  branch: string;
  fallbackCommit?: string;
  basePath: string;
}

interface FestivalData {
  filmDetailsCache: Record<string, unknown>;
  sectionsCache: Array<{ id: string; name: string }>;
  filmSectionsMap: Record<string, string[]>;
}

class GithubDataFetcher {
  private static instance: GithubDataFetcher;
  private data: Record<string, FestivalData> = {};
  private config: GithubConfig;

  private constructor() {
    this.config = {
      owner: 'Yukaii',
      repo: 'film-scheduler',
      branch: 'main',
      fallbackCommit: process.env.FALLBACK_COMMIT,
      basePath: 'packages/film-source-golden-horse/src/data'
    };
  }

  public static getInstance(): GithubDataFetcher {
    if (!GithubDataFetcher.instance) {
      GithubDataFetcher.instance = new GithubDataFetcher();
    }
    return GithubDataFetcher.instance;
  }

  private getGithubRawUrl(path: string, useMain = true): string {
    const { owner, repo, branch, fallbackCommit } = this.config;
    const ref = useMain ? branch : fallbackCommit;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  }

  private async fetchJsonWithFallback<T>(path: string, defaultValue?: T): Promise<T> {
    try {
      // Try main branch first
      const mainUrl = this.getGithubRawUrl(path, true);
      const mainResponse = await fetch(mainUrl);
      if (mainResponse.ok) {
        return await mainResponse.json();
      }

      // Fallback to specific commit if available
      if (this.config.fallbackCommit) {
        const fallbackUrl = this.getGithubRawUrl(path, false);
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          return await fallbackResponse.json();
        }
      }

      // Return default value if provided
      if (defaultValue !== undefined) {
        return defaultValue;
      }

      throw new Error(`Failed to fetch data from both main and fallback: ${path}`);
    } catch (error) {
      if (defaultValue !== undefined) {
        console.warn(`Using default value for ${path} due to error:`, error);
        return defaultValue;
      }
      throw error;
    }
  }

  public async getFestivalData(festivalId: string): Promise<FestivalData> {
    if (this.data[festivalId]) {
      return this.data[festivalId];
    }

    const basePath = `${this.config.basePath}/${festivalId}`;
    try {
      const [filmDetails, sections, filmSectionsMap] = await Promise.all([
        this.fetchJsonWithFallback<Record<string, unknown>>(`${basePath}/film_details.json`),
        this.fetchJsonWithFallback<Array<{ id: string; name: string }>>(`${basePath}/sections.json`, []),
        this.fetchJsonWithFallback<Record<string, string[]>>(`${basePath}/film_sections_map.json`, {})
      ]);

      this.data[festivalId] = {
        filmDetailsCache: filmDetails,
        sectionsCache: sections,
        filmSectionsMap: filmSectionsMap
      };

      return this.data[festivalId];
    } catch (error) {
      console.error(`Failed to fetch festival data for ${festivalId}:`, error);
      throw error;
    }
  }

  public clearCache(): void {
    this.data = {};
  }
}

export const githubDataFetcher = GithubDataFetcher.getInstance();
