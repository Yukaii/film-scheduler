import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataByFestival } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFestivalData(): DataByFestival {
  const dataDir = __dirname;
  const festivals = fs.readdirSync(dataDir)
    .filter(name => {
      const fullPath = path.join(dataDir, name);
      return fs.statSync(fullPath).isDirectory() && /^\d{4}-[A-Z]+$/.test(name);
    })
    .map(name => {
      const [year, category] = name.split('-');
      return { year, category };
    });

  const data: DataByFestival = {};

  festivals.forEach(({ year, category }) => {
    const festivalDir = path.join(dataDir, `${year}-${category}`);
    try {
      data[`${year}-${category}`] = {
        filmDetailsCache: JSON.parse(fs.readFileSync(path.join(festivalDir, 'film_details.json'), 'utf-8')),
        filmListCache: JSON.parse(fs.readFileSync(path.join(festivalDir, 'film_list.json'), 'utf-8')),
        sectionsCache: JSON.parse(fs.readFileSync(path.join(festivalDir, 'sections.json'), 'utf-8')),
        filmSectionsMap: JSON.parse(fs.readFileSync(path.join(festivalDir, 'film_sections_map.json'), 'utf-8'))
      };
    } catch (error) {
      console.warn(`Failed to load data for festival ${year}-${category}:`, error);
    }
  });

  return data;
}

const festivalData = loadFestivalData();

export { festivalData };
export default festivalData;
