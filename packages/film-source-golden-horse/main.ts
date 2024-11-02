// Import necessary modules
import { exists, readJson, writeJson } from "https://deno.land/std@0.66.0/fs/mod.ts";
import { DOMParser } from "jsr:@b-fuze/deno-dom";

// Types
interface FilmBasicInfo {
  name: string;
  imageUrl: string;
}

interface FilmSchedule {
  date: string;
  time: string;
  location: string;
}

interface FilmDetails {
  filmTitle: string;
  filmOriginalTitle: string;
  directorName: string;
  directorOriginalName: string;
  synopsis: string;
  schedule: FilmSchedule[];
  duration: string;
}

// Configuration
class Config {
  static readonly API_URL = 'https://www.goldenhorse.org.tw/api/film/search';
  static readonly FILM_DETAILS_BASE_URL = 'https://www.goldenhorse.org.tw/film/programme/films/detail';
  static readonly CACHE_FILE_PATH = './film_list_cache.json';
  static readonly DETAILS_CACHE_FILE_PATH = './film_details_cache.json';
  static readonly HEADERS = new Headers({
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
  });
}

// Cache Manager
class CacheManager {
  static async loadCache<T>(filePath: string): Promise<T | null> {
    if (await exists(filePath)) {
      return await readJson(filePath) as T;
    }
    return null;
  }

  static async saveCache(filePath: string, data: unknown): Promise<void> {
    await writeJson(filePath, data, { spaces: 2 });
  }
}

// API Service
class FilmApiService {
  static async fetchFilmList(ghffId: string, payload: URLSearchParams): Promise<Response> {
    return await fetch(Config.API_URL, {
      method: 'POST',
      headers: Config.HEADERS,
      body: payload
    });
  }

  static async fetchFilmDetails(filmId: string): Promise<Response> {
    return await fetch(`${Config.FILM_DETAILS_BASE_URL}/${filmId}`);
  }
}

// Parser Service
class ParserService {
  static parseGhffIds(ghffList: string): string[] {
    const matches = ghffList.match(/<option value="(\d+)">(.*?)<\/option>/g) || [];
    return matches
      .map(match => {
        const [, id] = match.match(/<option value="(\d+)">(.*?)<\/option>/) || [];
        return id;
      })
      .filter(Boolean)
      .filter(id => id !== '0');
  }

  static parseFilmListAndImages(filmList: string, imageList: string): Record<string, FilmBasicInfo> {
    const results: Record<string, FilmBasicInfo> = {};
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

  static parseFilmDetailsFromHtml(document: Document): FilmDetails {
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

// Film Service
class FilmService {
  static async downloadFilmList(ghffId: string, results: Record<string, FilmBasicInfo> = {}): Promise<Record<string, FilmBasicInfo>> {
    const payload = new URLSearchParams({
      'action': 'get_class_list',
      'search_year': '2024',
      'search_category': 'FF',
      'parent_id': '638',
      'ghff_id': ghffId
    });

    try {
      const response = await FilmApiService.fetchFilmList(ghffId, payload);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log(`Raw JSON Response for ghff_id: ${ghffId}`);
      console.log(JSON.stringify(data, null, 2));

      if (ghffId === '0') {
        const ghffIds = ParserService.parseGhffIds(data.ghff_list);
        for (const gid of ghffIds) {
          await this.downloadFilmList(gid, results);
        }
      }

      Object.assign(results, ParserService.parseFilmListAndImages(data.film_list, data.image_list));
    } catch (error) {
      console.error(`Error fetching data for ghff_id: ${ghffId}:`, error);
    }

    return results;
  }

  static async getFilmDetails(filmId: string, detailsCache: Record<string, FilmDetails>): Promise<void> {
    if (detailsCache[filmId]) {
      console.log(`Loaded film details for filmId: ${filmId} from cache.`);
      console.log(detailsCache[filmId]);
      return;
    }

    try {
      const response = await FilmApiService.fetchFilmDetails(filmId);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const html = await response.text();
      const document = new DOMParser().parseFromString(html, "text/html");
      if (!document) throw new Error(`Failed to parse HTML for filmId: ${filmId}`);

      const filmDetails = ParserService.parseFilmDetailsFromHtml(document);
      detailsCache[filmId] = filmDetails;
      await CacheManager.saveCache(Config.DETAILS_CACHE_FILE_PATH, detailsCache);

      console.log(`Parsed and saved Details for filmId: ${filmId}`);
      console.log(filmDetails);
    } catch (error) {
      console.error(`Error fetching film details for filmId: ${filmId}:`, error);
    }
  }
}

// Main execution
async function main() {
  let results = await CacheManager.loadCache<Record<string, FilmBasicInfo>>(Config.CACHE_FILE_PATH) || {};
  let detailsCache = await CacheManager.loadCache<Record<string, FilmDetails>>(Config.DETAILS_CACHE_FILE_PATH) || {};

  if (Object.keys(results).length === 0) {
    results = await FilmService.downloadFilmList('0');
    await CacheManager.saveCache(Config.CACHE_FILE_PATH, results);
    console.log("Saved film list to cache.");
  }

  console.log("\nFinal Film List:\n");
  console.log(JSON.stringify(results, null, 2));

  // Parse all films
  const filmIds = Object.keys(results).filter(filmId => filmId !== '0');
  for (const filmId of filmIds) {
    await FilmService.getFilmDetails(filmId, detailsCache);
    await new Promise(resolve => setTimeout(resolve, 700));
  }
}

main();
