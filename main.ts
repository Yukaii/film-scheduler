// Import necessary modules
import { parse } from "https://deno.land/std@0.117.0/flags/mod.ts";

// Define API URL and headers
const url = 'https://www.goldenhorse.org.tw/api/film/search';

const headers = new Headers({
  'Accept': 'application/json',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
});

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

// Start with fetching ghff_list using ghff_id: 0 and aggregate results to a plain JS object
async function main() {
  const results: Record<string, { name: string, imageUrl: string }> = {};
  await stepOneDownloadFilmList('0', results);
  console.log("\nFinal Film List:\n");
  console.log(JSON.stringify(results, null, 2));
}

main();
