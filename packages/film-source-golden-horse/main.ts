// Import necessary modules
import { parse } from "https://deno.land/std@0.117.0/flags/mod.ts";
import { exists, readJson, writeJson } from "https://deno.land/std@0.66.0/fs/mod.ts";
import { DOMParser, Element } from "jsr:@b-fuze/deno-dom";

// Define API URL and headers
const url = 'https://www.goldenhorse.org.tw/api/film/search';

const headers = new Headers({
  'Accept': 'application/json',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
});

const cacheFilePath = './film_list_cache.json';
const detailsCacheFilePath = './film_details_cache.json';

// Function to fetch and parse data
async function stepOneDownloadFilmList(ghffId: string, results: Record<string, { name: string, imageUrl: string }> = {}) {
  // Define payload for the POST request
  const payload = new URLSearchParams({
    'action': 'get_class_list',
    'search_year': '2024',
    'search_category': 'FF',
    'parent_id': '638',
    'ghff_id': ghffId
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: payload
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`Raw JSON Response for ghff_id: ${ghffId}`);
      console.log(JSON.stringify(data, null, 2));

      // Parsing ghff_list from the initial response for iteration
      if (ghffId === '0') {
        const ghffListMatches = data.ghff_list.match(/<option value="(\d+)">(.*?)<\/option>/g) || [];

        const ghffIds = ghffListMatches.map((match: string) => {
          const [, id] = match.match(/<option value="(\d+)">(.*?)<\/option>/) || [];
          return id;
        }).filter(Boolean).filter(id => id !== '0');

        // Iterate through each ghff_id to get the film list
        for (const gid of ghffIds) {
          await stepOneDownloadFilmList(gid, results);
        }
      }

      // Parsing film_list and image_list to construct output
      const filmListMatches = data.film_list.match(/<option value="(\d+)">(.*?)<\/option>/g) || [];
      const imageListMatches = data.image_list.match(/<span id="movie_alt_(\d+)"[\s\S]*?<img class="col-12" src="(https:[^\s]+\.jpeg)"/g) || [];

      filmListMatches.forEach((match: string) => {
        const [, id, name] = match.match(/<option value="(\d+)">(.*?)<\/option>/) || [];
        if (id && name && id !== '0') {
          const imageUrlMatch = imageListMatches.find((imgMatch: string) => imgMatch.includes(`movie_alt_${id}`));
          const [, , imageUrlParsed] = imageUrlMatch ? imageUrlMatch.match(/<span id="movie_alt_(\d+)"[\s\S]*?<img class="col-12" src="(https:[^\s]+\.jpeg)"/) || [] : [];
          results[id] = { name, imageUrl: imageUrlParsed || '' };
        }
      });
    } else {
      console.error(`Failed to fetch data for ghff_id: ${ghffId}. Status Code: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error fetching data for ghff_id: ${ghffId}:`, error);
  }
}

// Function to parse film details
async function parseFilmDetails(filmId: string, detailsCache: Record<string, any>) {
  if (detailsCache[filmId]) {
    console.log(`Loaded film details for filmId: ${filmId} from cache.`);
    console.log(detailsCache[filmId]);
    return;
  }

  const url = `https://www.goldenhorse.org.tw/film/programme/films/detail/${filmId}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const html = await response.text();
      console.log(`HTML Response for filmId: ${filmId}`);

      // Parse HTML using deno-dom
      const document = new DOMParser().parseFromString(html, "text/html");
      if (!document) {
        console.error(`Failed to parse HTML for filmId: ${filmId}`);
        return;
      }

      // Extract film details
      const titleElement = document.querySelector("div.h1.first");
      const filmTitle = titleElement?.childNodes[0].textContent.trim() || "Unknown Title";
      const filmOriginalTitle = titleElement?.querySelector("span.h6")?.textContent.trim() || "";

      const directorElement = document.querySelector("div.h4");
      const directorName = directorElement?.childNodes[0].textContent.trim() || "Unknown Director";
      const directorOriginalName = directorElement?.querySelector("span.small b")?.textContent.trim() || "";

      const synopsisElements = document.querySelectorAll("div.margin-top.zero p");
      const synopsis = Array.from(synopsisElements).map(p => p.textContent.replace(/<br\s*\/?>/g, '\n').trim()).join('\n\n') || "No synopsis available.";

      const infoTable = Array.from(document.querySelectorAll('.films-detail .col-xs-3 table.none.format'))[1]
      let duration
      for (let tr of Array.from(infoTable.querySelectorAll('tr'))) {
        const rowTexts = Array.from(tr.childNodes).map(n => n.textContent?.trim())
        if (rowTexts.includes('片長')) {
          duration = tr.querySelectorAll('td')[2].textContent
        }
      }

      // Extract schedule
      const scheduleRows = document.querySelectorAll("table#scheduleList tr");
      const schedule = Array.from(scheduleRows).map(row => {
        const dateElement = row.querySelector("td.time b");
        const locationElement = row.querySelector("td:nth-child(3) b");
        if (dateElement && locationElement) {
          const dateText = dateElement.textContent.trim();
          const [date, time] = dateText.split(/\s+〈.*〉\s+/);
          return {
            date: date.trim(),
            time: time?.trim() || "",
            location: locationElement.textContent.trim()
          };
        }
        return null;
      }).filter(Boolean);

      const filmDetails = {
        filmTitle,
        filmOriginalTitle,
        directorName,
        directorOriginalName,
        synopsis,
        schedule,
        duration,
      };

      detailsCache[filmId] = filmDetails;
      await writeJson(detailsCacheFilePath, detailsCache, { spaces: 2 });
      console.log(`Parsed and saved Details for filmId: ${filmId}`);
      console.log(filmDetails);
    } else {
      console.error(`Failed to fetch film details for filmId: ${filmId}. Status Code: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error fetching film details for filmId: ${filmId}:`, error);
  }
}

// Start with fetching ghff_list using ghff_id: 0 and aggregate results to a plain JS object
async function main() {
  let results: Record<string, { name: string, imageUrl: string }> = {};
  let detailsCache: Record<string, any> = {};

  if (await exists(cacheFilePath)) {
    results = await readJson(cacheFilePath) as Record<string, { name: string, imageUrl: string }>;
    console.log("Loaded film list from cache.");
  } else {
    await stepOneDownloadFilmList('0', results);
    await writeJson(cacheFilePath, results, { spaces: 2 });
    console.log("Saved film list to cache.");
  }

  if (await exists(detailsCacheFilePath)) {
    detailsCache = await readJson(detailsCacheFilePath) as Record<string, any>;
    console.log("Loaded film details from cache.");
  }

  console.log("\nFinal Film List:\n");
  console.log(JSON.stringify(results, null, 2));

  // Parse all films
  const filmIds = Object.keys(results);
  for (const filmId of filmIds) {
    await parseFilmDetails(filmId, detailsCache);
    await new Promise(resolve => setTimeout(resolve, 700)); // Adding wait time of 700ms
  }
}

main();
