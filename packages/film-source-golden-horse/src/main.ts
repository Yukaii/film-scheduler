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
  FilmSectionsMap
} from './types';

class Config {
  static readonly API_URL = 'https://www.goldenhorse.org.tw/api/film/search';
  static readonly FILM_DETAILS_BASE_URL = 'https://www.goldenhorse.org.tw/film/programme/films/detail';
  static readonly DATA_DIR = path.join(__dirname, 'data');
  static readonly HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
  };

  static readonly CATEGORIES: Category[] = [
    { value: 'FFF', label: '金馬奇幻影展' },
    { value: 'CFF', label: '金馬經典影展' },
    { value: 'FF', label: '台北金馬影展' }
  ];

  static readonly FESTIVALS: FestivalConfig[] = [
    { year: '2025', parentId: '674', category: 'FFF' },
    { year: '2024', parentId: '638', category: 'FF' },
    { year: '2023', parentId: '637', category: 'FF' },
  ];

  static getCachePaths(festival: FestivalConfig) {
    const baseDir = path.join(this.DATA_DIR, `${festival.year}-${festival.category}`);
    return {
      base: baseDir,
      filmList: path.join(baseDir, 'film_list.json'),
      details: path.join(baseDir, 'film_details.json'),
      sections: path.join(baseDir, 'sections.json'),
      sectionsMap: path.join(baseDir, 'film_sections_map.json')
    };
  }

  static async selectFestival(): Promise<FestivalConfig> {
    const choices = this.FESTIVALS.map(festival => {
      const category = this.CATEGORIES.find(c => c.value === festival.category);
      return {
        name: `${festival.year} - ${category?.label || festival.category}`,
        value: festival
      };
    });

    const { festival } = await inquirer.prompt([{
      type: 'list',
      name: 'festival',
      message: 'Select festival:',
      choices
    }]);

    return festival;
  }
}

class CacheManager {
  static async loadCache<T>(filePath: string, createDir = true): Promise<T | null> {
    try {
      if (createDir) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
      }
      const exists = await fs.stat(filePath).catch(() => null);
      if (exists) {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data) as T;
      }
      return null;
    } catch (error) {
      console.error(`Error loading cache from ${filePath}:`, error);
      return null;
    }
  }

  static async saveCache(filePath: string, data: unknown): Promise<void> {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Error saving cache to ${filePath}:`, error);
    }
  }
}

class SectionManager {
  private static sections: Section[] = [];

  static async initialize(festival: FestivalConfig): Promise<void> {
    const cachePaths = Config.getCachePaths(festival);
    const cachedSections = await CacheManager.loadCache<Section[]>(cachePaths.sections);
    if (cachedSections) {
      this.sections = cachedSections;
      return;
    }

    await this.fetchSectionsFromApi(festival);
  }

  private static async fetchSectionsFromApi(festival: FestivalConfig): Promise<void> {
    const cachePaths = Config.getCachePaths(festival);
    const payload = new URLSearchParams({
      'action': 'get_class_list',
      'search_year': festival.year,
      'search_category': festival.category,
      'parent_id': festival.parentId,
      'ghff_id': '0'
    });

    try {
      const response = await FilmApiService.fetchFilmList(payload);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      this.sections = this.parseSectionsFromResponse(data.ghff_list);

      await CacheManager.saveCache(cachePaths.sections, this.sections);
    } catch (error) {
      console.error('Error fetching sections:', error);
      throw error;
    }
  }

  private static parseSectionsFromResponse(ghffList: string): Section[] {
    const matches = ghffList.match(/<option value="(\d+)">(.*?)<\/option>/g) || [];
    return matches
      .map(match => {
        const [, id, name] = match.match(/<option value="(\d+)">(.*?)<\/option>/) || [];
        return id && name ? { id, name } : null;
      })
      .filter((section): section is Section => section !== null);
  }

  static getSections(): Section[] {
    return this.sections;
  }

  static getSection(id: string): Section | undefined {
    return this.sections.find(section => section.id === id);
  }
}

class FilmApiService {
  static async fetchFilmList(payload: URLSearchParams): Promise<Response> {
    return await fetch(Config.API_URL, {
      method: 'POST',
      headers: Config.HEADERS,
      body: payload.toString()
    });
  }

  static async fetchFilmDetails(filmId: string): Promise<Response> {
    return await fetch(`${Config.FILM_DETAILS_BASE_URL}/${filmId}`);
  }
}

class ParserService {
  static parseFilmListAndImages(filmList: string, imageList: string): Record<string, Omit<FilmBasicInfo, 'sectionIds'>> {
    const results: Record<string, Omit<FilmBasicInfo, 'sectionIds'>> = {};
    const filmListMatches = filmList.match(/<option value="(\d+)">(.*?)<\/option>/g) || [];
    const imageListMatches = imageList.match(/<span id="movie_alt_(\d+)"[\s\S]*?<img class="col-12" src="(https:[^\s]+\.jpeg)"/g) || [];

    filmListMatches.forEach(match => {
      const [, id, name] = match.match(/<option value="(\d+)">(.*?)<\/option>/) || [];
      if (id && name && id !== '0') {
        const imageUrlMatch = imageListMatches.find(imgMatch => imgMatch.includes(`movie_alt_${id}`));
        const [, , imageUrlParsed] = imageUrlMatch ? imageUrlMatch.match(/<span id="movie_alt_(\d+)"[\s\S]*?<img class="col-12" src="(https:[^\s]+\.jpeg)"/) || [] : [];
        results[id] = { name, imageUrl: imageUrlParsed || '' };
      }
    });
    return results;
  }

  static parseFilmDetailsFromHtml(document: Document): Omit<FilmDetails, 'sectionIds'> {
    const titleElement = document.querySelector("div.h1.first");
    const directorElement = document.querySelector("div.h4");
    const synopsisElements = document.querySelectorAll("div.margin-top.zero p");
    const scheduleRows = document.querySelectorAll("table#scheduleList tr");
    const infoTable = Array.from(document.querySelectorAll('.films-detail .col-xs-3 table.none.format'))[1];

    let duration = '';
    if (infoTable) {
      for (const tr of Array.from(infoTable.querySelectorAll('tr'))) {
        const rowTexts = Array.from(tr.childNodes).map(n => n.textContent?.trim());
        if (rowTexts.includes('片長')) {
          duration = tr.querySelectorAll('td')[2].textContent || '';
        }
      }
    }

    const schedule = Array.from(scheduleRows)
      .map(row => {
        const dateElement = row.querySelector("td.time b");
        const locationElement = row.querySelector("td:nth-child(3) b");
        if (dateElement && locationElement) {
          const dateText = dateElement.textContent?.trim() || '';
          const [date, time] = dateText.split(/\s+〈.*〉\s+/);
          return {
            date: date.trim(),
            time: time?.trim() || "",
            location: locationElement.textContent?.trim() || ""
          };
        }
        return null;
      })
      .filter((s): s is FilmSchedule => s !== null);

    return {
      filmTitle: titleElement?.childNodes?.[0]?.textContent?.trim() || "Unknown Title",
      filmOriginalTitle: titleElement?.querySelector("span.h6")?.textContent?.trim() || "",
      directorName: directorElement?.childNodes[0].textContent?.trim() || "Unknown Director",
      directorOriginalName: directorElement?.querySelector("span.small b")?.textContent?.trim() || "",
      synopsis: Array.from(synopsisElements)
        .map(p => p.textContent?.replace(/<br\s*\/?>/g, '\n').trim())
        .join('\n\n') || "No synopsis available.",
      schedule,
      duration
    };
  }
}

class FilmService {
  static async downloadFilmList(
    ghffId: string,
    festival: FestivalConfig,
    results: Record<string, FilmBasicInfo> = {},
    sectionMap: FilmSectionsMap = {}
  ): Promise<[Record<string, FilmBasicInfo>, FilmSectionsMap]> {
    const payload = new URLSearchParams({
      'action': 'get_class_list',
      'search_year': festival.year,
      'search_category': festival.category,
      'parent_id': festival.parentId,
      'ghff_id': ghffId
    });

    try {
      const response = await FilmApiService.fetchFilmList(payload);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log(`Raw JSON Response for ghff_id: ${ghffId}`);
      console.log(JSON.stringify(data, null, 2));

      if (ghffId === '0') {
        const sections = SectionManager.getSections();
        for (const section of sections) {
          if (section.id !== '0') {
            await this.downloadFilmList(section.id, festival, results, sectionMap);
          }
        }
      } else {
        const sectionFilms = ParserService.parseFilmListAndImages(data.film_list, data.image_list);

        Object.entries(sectionFilms).forEach(([filmId, filmInfo]) => {
          if (!results[filmId]) {
            results[filmId] = {
              ...filmInfo,
              sectionIds: []
            };
          }

          if (!sectionMap[filmId]) {
            sectionMap[filmId] = [];
          }
          if (!sectionMap[filmId].includes(ghffId)) {
            sectionMap[filmId].push(ghffId);
          }
        });
      }

    } catch (error) {
      console.error(`Error fetching data for ghff_id: ${ghffId}:`, error);
    }

    return [results, sectionMap];
  }

  static async getFilmDetails(
    filmId: string,
    festival: FestivalConfig,
    detailsCache: Record<string, FilmDetails>,
    films: Record<string, FilmBasicInfo>,
    sectionMap: FilmSectionsMap
  ): Promise<void> {
    const cachePaths = Config.getCachePaths(festival);
    if (detailsCache[filmId]) {
      console.log(`Loaded film details for filmId: ${filmId} from cache.`);
      console.log(detailsCache[filmId]);
      return;
    }

    try {
      const response = await FilmApiService.fetchFilmDetails(filmId);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;
      if (!document) throw new Error(`Failed to parse HTML for filmId: ${filmId}`);

      const filmDetails = {
        ...ParserService.parseFilmDetailsFromHtml(document),
        sectionIds: sectionMap[filmId] || []
      };

      detailsCache[filmId] = filmDetails;
      await CacheManager.saveCache(cachePaths.details, detailsCache);

      console.log(`Parsed and saved Details for filmId: ${filmId}`);
      console.log(filmDetails);
    } catch (error) {
      console.error(`Error fetching film details for filmId: ${filmId}:`, error);
    }
  }
}

interface MainOptions {
  testMode?: boolean;
}

async function main(options: MainOptions = {}) {
  const festival = await Config.selectFestival();
  const cachePaths = Config.getCachePaths(festival);
  
  await SectionManager.initialize(festival);

  let results = await CacheManager.loadCache<Record<string, FilmBasicInfo>>(cachePaths.filmList) || {};
  let detailsCache = await CacheManager.loadCache<Record<string, FilmDetails>>(cachePaths.details) || {};
  let sectionMap = await CacheManager.loadCache<FilmSectionsMap>(cachePaths.sectionsMap) || {};

  if (Object.keys(results).length === 0) {
    [results, sectionMap] = await FilmService.downloadFilmList('0', festival, {}, {});
    await CacheManager.saveCache(cachePaths.filmList, results);
    await CacheManager.saveCache(cachePaths.sectionsMap, sectionMap);
    console.log("Saved film list and section map to cache.");
  }

  console.log("\nFinal Film List:\n");
  console.log(JSON.stringify(results, null, 2));
  console.log("\nSection Mapping:\n");
  console.log(JSON.stringify(sectionMap, null, 2));

  const filmIds = Object.keys(results).filter(filmId => filmId !== '0');
  // In test mode, only process first 10 films
  const filmsToProcess = options.testMode ? filmIds.slice(0, 10) : filmIds;
  
  for (const filmId of filmsToProcess) {
    await FilmService.getFilmDetails(filmId, festival, detailsCache, results, sectionMap);
    await new Promise(resolve => setTimeout(resolve, 700));
  }
}

main({ testMode: process.env.NODE_ENV !== 'production' }).catch(console.error);
