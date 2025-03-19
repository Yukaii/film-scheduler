import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Read JSON files directly
const filmDetailsCache = JSON.parse(
  readFileSync(join(__dirname, '../../film_details_cache.json'), 'utf-8')
);
const filmListCache = JSON.parse(
  readFileSync(join(__dirname, '../../film_list_cache.json'), 'utf-8')
);
const filmSectionsMap = JSON.parse(
  readFileSync(join(__dirname, '../../film_sections_map.json'), 'utf-8')
);
const sectionsCache = JSON.parse(
  readFileSync(join(__dirname, '../../sections_cache.json'), 'utf-8')
);

export {
  filmDetailsCache,
  filmListCache,
  filmSectionsMap,
  sectionsCache
};

export default {
  filmDetailsCache,
  filmListCache,
  filmSectionsMap,
  sectionsCache
};