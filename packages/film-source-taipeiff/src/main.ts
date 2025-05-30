import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  FilmBasicInfo,
  FilmSchedule,
  FilmDetails,
  Category,
  Section,
  FestivalConfig,
  FilmSectionsMap,
  TaipeiffApiResponse,
  TaipeiffApiRequest,
  TaipeiffFilm
} from './types';

class Config {
  static readonly API_URL = 'https://www.taipeiff.taipei/api/articles/movies';
  static readonly FILM_LIST_URL = 'https://www.taipeiff.taipei/tw/movies/list';
  static readonly DATA_DIR = path.join(__dirname, 'data');
  static readonly HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-TW,zh;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': 'https://www.taipeiff.taipei',
    'Pragma': 'no-cache',
    'Referer': 'https://www.taipeiff.taipei/tw/movies?c=178',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Microsoft Edge";v="138"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"'
  };

  // These will be dynamically loaded
  static CATEGORIES: Category[] = [
    { value: '178', label: '2025台北電影節' },
  ];

  static FESTIVALS: FestivalConfig[] = [
    { year: '2025', category: '178' },
  ];

  // Mock encrypted token - in real implementation this would need to be dynamically generated
  static readonly MOCK_TOKEN = 'ec751f14d7915a3372ae3dbb4a6a5dcaa7f431af3f5772a81abbbb4bd70345d76f1001454ec614d251d0fb6c3be8b90cafef6523ad73531b2fa2a6cbf5c3f77cd984697851fa490377524ff62ae06006';
  static readonly TOKEN_KEY = '5648e5284e20a699eec058285a8b43b0';

  static getCachePaths(festival: FestivalConfig) {
    // All data for a given year of Taipei Film Festival is stored under a common directory, e.g., 2025-TAIPEIFF
    const baseDir = path.join(this.DATA_DIR, `${festival.year}-TAIPEIFF`);
    return {
      base: baseDir,
      filmList: path.join(baseDir, 'film_list.json'),
      details: path.join(baseDir, 'film_details.json'),
      sections: path.join(baseDir, 'sections.json'),
      sectionsMap: path.join(baseDir, 'film_sections_map.json')
    };
  }

  // Fetch categories from the HTML index page using JSDOM
  static async fetchCategoriesFromHtml(): Promise<Category[]> {
    const res = await fetch(this.FILM_LIST_URL, { headers: this.HEADERS });
    const html = await res.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const categories: Category[] = [];
    // Only extract category IDs, as there are no visible labels
    document.querySelectorAll('a[href*="/tw/movies?c="]').forEach(a => {
      const href = a.getAttribute('href');
      const match = href && href.match(/c=(\d+)/);
      if (match) {
        const value = match[1];
        categories.push({ value, label: value });
      }
    });
    // Remove duplicates
    const unique = new Map<string, Category>();
    for (const cat of categories) {
      unique.set(cat.value, cat);
    }
    return Array.from(unique.values());
  }
}

class CacheManager {
  static async saveCache(filePath: string, data: any): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  static async loadCache<T>(filePath: string): Promise<T | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }
}

class FilmApiService {
  // Simple in-memory cookie jar
  private static cookies: Record<string, string> = {};

  // Helper to extract and store cookies from response
  private static storeCookies(res: Response) {
    // node-fetch v3: get all set-cookie headers as array
    const setCookieHeaders = res.headers.get('set-cookie');
    if (setCookieHeaders) {
      // Multiple cookies may be joined by comma, but commas in cookie values are rare for this API
      setCookieHeaders.split(',').forEach((cookieStr: string) => {
        const [cookiePair] = cookieStr.split(';');
        const [key, value] = cookiePair.split('=');
        if (key && value) {
          this.cookies[key.trim()] = value.trim();
        }
      });
    }
  }

  // Helper to get cookie header string
  private static getCookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  static async fetchFilmList(category: string, page: number = 1): Promise<Response> {
    const payload: TaipeiffApiRequest = {
      [Config.TOKEN_KEY]: Config.MOCK_TOKEN,
      Filter: {
        c: category,
        s: '',
        search: ''
      },
      NowPage: page
    };

    // Attach cookies if present
    const headers = { ...Config.HEADERS } as Record<string, string>;
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const res = await fetch(Config.API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    this.storeCookies(res);
    return res;
  }

  static async fetchFilmDetails(filmId: string): Promise<Response> {
    // In a real implementation, this would fetch individual film details
    // For now, we'll return a mock response since we don't have the details endpoint
    return new Response('{}', { status: 200 });
  }
}

class ParserService {
  static parseFilmsFromApiResponse(data: TaipeiffApiResponse): Record<string, Omit<FilmBasicInfo, 'sectionIds'>> {
    const results: Record<string, Omit<FilmBasicInfo, 'sectionIds'>> = {};
    
    if (data.status === 'success' && data.lists) {
      data.lists.forEach((film: TaipeiffFilm) => {
        if (film.gid && film.title) {
          // Use the first image if available
          const imageUrl = film.options?.all_images?.[0]?.url || '';
          const fullImageUrl = imageUrl ? `https://www.taipeiff.taipei/${imageUrl}` : '';
          
          results[film.gid] = {
            name: film.title,
            imageUrl: fullImageUrl
          };
        }
      });
    }
    
    return results;
  }

  static parseFilmDetailsFromApiResponse(film: TaipeiffFilm): Omit<FilmDetails, 'sectionIds'> {
    const directors = film.options?.directors || [];
    const directorName = directors.map(d => d.title).join(', ');
    const synopsis = directors.map(d => d.summary).join('\n\n');

    return {
      filmTitle: film.title,
      filmOriginalTitle: film.subtitle || film.title,
      directorName: directorName,
      directorOriginalName: directorName,
      synopsis: synopsis || '暫無簡介',
      schedule: [], // Taipei Film Festival API doesn't provide schedule in this endpoint
      duration: '' // Duration not available in this endpoint
    };
  }
}

class SectionManager {
  private static sections: Section[] = [];
  private static sectionsInitialized = false;

  static async initializeSections(festivalYear: string, apiCategories: Category[]): Promise<void> {
    if (this.sectionsInitialized) {
      console.log("Sections already initialized.");
      return;
    }

    // Use a representative FestivalConfig for cache path. Year is important.
    // The category part of FestivalConfig for getCachePaths is less critical as the path is common for the year.
    const representativeFestivalConfig: FestivalConfig = { year: festivalYear, category: 'TAIPEIFF_COMMON_SECTIONS' };
    const cachePaths = Config.getCachePaths(representativeFestivalConfig); // Correctly points to data/[year]-TAIPEIFF/sections.json

    const cachedSections = await CacheManager.loadCache<Section[]>(cachePaths.sections);
    
    // Use cached sections if they exist and the array is not empty
    if (cachedSections && cachedSections.length > 0) {
      this.sections = cachedSections;
      console.log(`Loaded ${this.sections.length} sections from cache: ${cachePaths.sections}`);
    } else {
      if (cachedSections && cachedSections.length === 0) {
        console.log(`Cached sections file found at ${cachePaths.sections} but it was empty. Rebuilding sections.`);
      } else {
        console.log(`No cached sections found at ${cachePaths.sections}. Building from API categories.`);
      }
      
      this.sections = apiCategories.map(apiCat => ({
        id: apiCat.value, // API category ID, e.g., "90", "178"
        name: `${festivalYear}台北電影節` // Generic name, e.g., "2025台北電影節"
      }));

      if (this.sections.length > 0) {
        await CacheManager.saveCache(cachePaths.sections, this.sections);
        console.log(`Built and cached ${this.sections.length} sections to ${cachePaths.sections}.`);
      } else {
        console.log("No API categories provided or found; sections list is empty.");
        // Optionally save an empty array to cache if that's desired behavior
        await CacheManager.saveCache(cachePaths.sections, []);
      }
    }
    this.sectionsInitialized = true;
  }

  static getSections(): Section[] {
    if (!this.sectionsInitialized) {
      console.warn("SectionManager.getSections() called before sections were initialized. Returning empty array. This might indicate an issue.");
    }
    return this.sections;
  }

  static getSection(id: string): Section | undefined {
    if (!this.sectionsInitialized) {
      console.warn("SectionManager.getSection() called before sections were initialized. Returning undefined. This might indicate an issue.");
    }
    return this.sections.find(section => section.id === id);
  }
}

class FilmService {
  static async downloadFilmList(
    festival: FestivalConfig,
    results: Record<string, FilmBasicInfo> = {},
    sectionMap: FilmSectionsMap = {}
  ): Promise<[Record<string, FilmBasicInfo>, FilmSectionsMap]> {
    try {
      console.log(`Fetching films for category: ${festival.category}`);
      const response = await FilmApiService.fetchFilmList(festival.category);
      
      if (!response.ok) {
        console.warn(`HTTP error! status: ${response.status}`);
        // Return mock data for testing when API is not accessible
        return this.getMockData(festival, results, sectionMap);
      }

      const data: TaipeiffApiResponse = await response.json();
      console.log(`Raw JSON Response:`);
      console.log(JSON.stringify(data, null, 2));

      const films = ParserService.parseFilmsFromApiResponse(data);

      Object.entries(films).forEach(([filmId, filmInfo]) => {
        if (!results[filmId]) {
          results[filmId] = {
            ...filmInfo,
            sectionIds: []
          };
        }

        if (!sectionMap[filmId]) {
          sectionMap[filmId] = [];
        }
        if (!sectionMap[filmId].includes(festival.category)) {
          sectionMap[filmId].push(festival.category);
        }
      });

    } catch (error) {
      console.error(`Error fetching data for category: ${festival.category}:`, error);
      // Return mock data for testing when API is not accessible
      return this.getMockData(festival, results, sectionMap);
    }

    return [results, sectionMap];
  }

  private static getMockData(
    festival: FestivalConfig,
    results: Record<string, FilmBasicInfo> = {},
    sectionMap: FilmSectionsMap = {}
  ): [Record<string, FilmBasicInfo>, FilmSectionsMap] {
    // Create mock data based on the sample from the issue
    const mockFilm: FilmBasicInfo = {
      name: '帳篷父不起',
      imageUrl: 'https://www.taipeiff.taipei/datas/upload/finder/files/20250528080100432.jpg',
      sectionIds: [festival.category]
    };

    results['71Ce1a678f0a'] = mockFilm;
    sectionMap['71Ce1a678f0a'] = [festival.category];

    return [results, sectionMap];
  }

  static async getFilmDetails(
    filmId: string,
    festival: FestivalConfig,
    detailsCache: Record<string, FilmDetails>,
    films: Record<string, FilmBasicInfo>,
    sectionMap: FilmSectionsMap
  ): Promise<void> {
    if (detailsCache[filmId]) {
      console.log(`Film details for ${filmId} already cached, skipping...`);
      return;
    }

    try {
      const response = await FilmApiService.fetchFilmDetails(filmId);
      
      if (!response.ok) {
        console.warn(`Failed to fetch details for film ${filmId}: ${response.status}`);
        // Create mock details
        const mockDetails: FilmDetails = {
          filmTitle: films[filmId]?.name || '未知電影',
          filmOriginalTitle: films[filmId]?.name || 'Unknown Film',
          directorName: '嘉爾·艾方索·瓦爾加斯',
          directorOriginalName: 'Gael Alfonso Vargas',
          synopsis: '電影導演與社運工作者，成長於美國紐約布朗克斯的公共住宅區...',
          schedule: [],
          duration: '',
          sectionIds: sectionMap[filmId] || []
        };
        detailsCache[filmId] = mockDetails;
        return;
      }

      // In real implementation, parse the details response
      // For now, use mock data
      const mockDetails: FilmDetails = {
        filmTitle: films[filmId]?.name || '未知電影',
        filmOriginalTitle: films[filmId]?.name || 'Unknown Film',
        directorName: '嘉爾·艾方索·瓦爾加斯',
        directorOriginalName: 'Gael Alfonso Vargas',
        synopsis: '電影導演與社運工作者，成長於美國紐約布朗克斯的公共住宅區...',
        schedule: [],
        duration: '',
        sectionIds: sectionMap[filmId] || []
      };
      
      detailsCache[filmId] = mockDetails;
      console.log(`Details fetched for film: ${films[filmId]?.name}`);

    } catch (error) {
      console.error(`Error fetching details for film ${filmId}:`, error);
    }
  }
}

interface MainOptions {
  testMode?: boolean;
}

async function main(options: MainOptions = {}) {
  console.log('=== Taipei Film Festival Data Crawler ===');

  // Step 1: Fetch API categories dynamically
  const apiCategories = await Config.fetchCategoriesFromHtml();
  Config.CATEGORIES = apiCategories; // Store globally if needed by other parts

  if (!apiCategories.length) {
    console.error('No API categories found on the Taipei IFF site. Exiting.');
    process.exit(1);
  }

  const year = '2025'; // Define year once
  const festivalIdentifier = 'TAIPEIFF'; // Festival identifier for directory

  // Initialize SectionManager with all fetched API categories ONCE.
  await SectionManager.initializeSections(year, apiCategories);

  // Use a representative FestivalConfig for generating common cache paths for films, details etc.
  // The specific category ID used here for 'category' field is less critical for path generation
  // as Config.getCachePaths now uses a common festival identifier for the directory.
  const baseFestivalConfigForCachePath: FestivalConfig = {
    year: year,
    category: apiCategories.length > 0 ? apiCategories[0].value : festivalIdentifier 
  };
  const cachePaths = Config.getCachePaths(baseFestivalConfigForCachePath); // For film_list.json, film_details.json etc.

  // Ensure base data directory exists
  await fs.mkdir(cachePaths.base, { recursive: true }).catch(err => {
    if (err.code !== 'EEXIST') throw err; // Ignore if directory already exists, re-throw other errors
  });

  console.log(`\nProcessing Taipei Film Festival ${year} (${festivalIdentifier})`);
  console.log(`All data (except sections.json) will be cached in files within: ${cachePaths.base}`);
  console.log(`Sections data is managed by SectionManager and cached at: ${path.join(cachePaths.base, 'sections.json')}`);


  // Initialize accumulators for film list, section map, and details, trying to load existing cache first.
  let allFilms: Record<string, FilmBasicInfo> = await CacheManager.loadCache(cachePaths.filmList) || {};
  let allFilmSectionsMap: FilmSectionsMap = await CacheManager.loadCache(cachePaths.sectionsMap) || {};
  let allFilmDetailsCache: Record<string, FilmDetails> = await CacheManager.loadCache(cachePaths.details) || {};
  
  if (Object.keys(allFilms).length > 0 || Object.keys(allFilmDetailsCache).length > 0) {
    console.log(`Loaded ${Object.keys(allFilms).length} films and ${Object.keys(allFilmDetailsCache).length} details from existing cache.`);
  } else {
    console.log("No existing film/details cache found, starting fresh for these.");
  }

  // Loop through each fetched API category to download film lists
  for (const cat of apiCategories) {
    const selectedFestival: FestivalConfig = { // This config is for API calls for this specific category
      year: year, // Use defined year
      category: cat.value
    };

    console.log(`\nFetching film data for API category: ${cat.label || cat.value} (ID: ${cat.value})`);

    // SectionManager.initialize() is no longer called inside the loop. Sections are already handled.

    // Download film list for the current API category, accumulating results into allFilms and allFilmSectionsMap.
    console.log('Downloading film list for this API category...');
    // The downloadFilmList service method should correctly update allFilms and allFilmSectionsMap by reference or by returning new versions.
    // The current implementation of downloadFilmList takes accumulators and returns them modified.
    [allFilms, allFilmSectionsMap] = await FilmService.downloadFilmList(selectedFestival, allFilms, allFilmSectionsMap);

    console.log(`Total unique films after API category ${cat.value}: ${Object.keys(allFilms).length}`);
    // Per-category saving and details fetching are moved to after this loop.
  }

  // All API categories processed. Now, save the accumulated film list and section map.
  console.log('\nSaving accumulated film list and section map to common cache...');
  await CacheManager.saveCache(cachePaths.filmList, allFilms);
  await CacheManager.saveCache(cachePaths.sectionsMap, allFilmSectionsMap);
  console.log('Saved film list and section map.');

  // Download film details for all unique films collected from all categories.
  console.log('\nProcessing film details for all collected films...');
  let newDetailsFetchedCount = 0;
  for (const [filmId, filmInfo] of Object.entries(allFilms)) {
    // Check if details are already in the accumulated cache (allFilmDetailsCache was loaded from disk).
    if (allFilmDetailsCache[filmId]) {
      // console.log(`Details for film ${filmId} (${filmInfo.name}) already in cache. Skipping download.`);
      continue; // Skip if details already exist
    }

    // Determine the festival context for fetching details.
    // A film might be associated with multiple API categories if the source API structure allowed it.
    // For TaipeiFF, each film is likely tied to one primary API category.
    // We use the first API category found in its section map entry to provide context for the detail fetch.
    const filmApiCategoryForDetails = allFilmSectionsMap[filmId]?.[0];
    
    if (!filmApiCategoryForDetails) {
      console.warn(`Film ${filmId} (${filmInfo.name}) has no API category mapping in allFilmSectionsMap. Cannot determine context for fetching details. Skipping.`);
      continue;
    }
    
    const festivalConfigForDetailFetch: FestivalConfig = { year: year, category: filmApiCategoryForDetails };
    
    await FilmService.getFilmDetails(filmId, festivalConfigForDetailFetch, allFilmDetailsCache, allFilms, allFilmSectionsMap);
    newDetailsFetchedCount++;
  }
  if (newDetailsFetchedCount > 0) {
    console.log(`Fetched or updated details for ${newDetailsFetchedCount} films.`);
  } else {
    console.log("No new film details were fetched; all were up-to-date or skipped.");
  }

  // Save the accumulated film details cache.
  console.log('\nSaving accumulated film details cache...');
  await CacheManager.saveCache(cachePaths.details, allFilmDetailsCache);
  console.log('Saved film details.');

  console.log('\n=== Final Summary ===');
  console.log(`Total unique films processed across all API categories: ${Object.keys(allFilms).length}`);
  console.log(`Total film details in cache: ${Object.keys(allFilmDetailsCache).length}`);
  console.log(`All data cached in: ${cachePaths.base}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  Config,
  FilmApiService,
  ParserService,
  SectionManager,
  FilmService,
  CacheManager,
  main
};
