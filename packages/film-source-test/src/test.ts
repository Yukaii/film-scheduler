import { festivalData } from '@film-scheduler/film-source-golden-horse/data';
import {
  DataByFestival,
  Section,
  FilmSchedule,
} from '@film-scheduler/film-source-golden-horse/types';

function printFestivalSummary(festivalId: string, data: DataByFestival) {
  const festival = data[festivalId];
  if (!festival) {
    console.log(`No data found for festival: ${festivalId}`);
    return;
  }

  console.log(`\n=== Festival: ${festivalId} ===`);
  
  // Print sections summary
  console.log('\nSections:');
  festival.sectionsCache.forEach((section: Section) => {
    console.log(`- ${section.name} (ID: ${section.id})`);
  });

  // Print films summary
  const filmCount = Object.keys(festival.filmListCache).length;
  const filmsWithDetails = Object.keys(festival.filmDetailsCache).length;
  console.log(`\nFilms Summary:`);
  console.log(`Total Films: ${filmCount}`);
  console.log(`Films with Details: ${filmsWithDetails}`);

  // Print sample film details
  const sampleFilmId = Object.keys(festival.filmDetailsCache)[0];
  if (sampleFilmId) {
    const film = festival.filmDetailsCache[sampleFilmId];
    console.log('\nSample Film:');
    console.log(`Title: ${film.filmTitle}`);
    console.log(`Original Title: ${film.filmOriginalTitle}`);
    console.log(`Director: ${film.directorName}`);
    console.log(`Section IDs: ${film.sectionIds.join(', ')}`);
    
    if (film.schedule.length > 0) {
      console.log('\nSchedule:');
      film.schedule.forEach((schedule: FilmSchedule) => {
        console.log(`- ${schedule.date} ${schedule.time} @ ${schedule.location}`);
      });
    }
  }
}

// Test different festival data access
function main() {
  console.log('Available Festivals:', Object.keys(festivalData));

  // Process each festival
  Object.keys(festivalData).forEach(festivalId => {
    printFestivalSummary(festivalId, festivalData);
  });

  // Example: Find films showing in multiple sections
  Object.keys(festivalData).forEach(festivalId => {
    const festival = festivalData[festivalId];
    if (!festival) return;

    console.log(`\n=== Multi-section Films in ${festivalId} ===`);
    
    (Object.entries(festival.filmSectionsMap) as [string, string[]][])
      .filter(([_, sectionIds]) => sectionIds.length > 1)
      .forEach(([filmId, sectionIds]) => {
        const film = festival.filmListCache[filmId];
        const sectionNames = sectionIds
          .map(sid => festival.sectionsCache.find(section => section.id === sid)?.name)
          .filter(Boolean);
        
        console.log(`\n${film.name}`);
        console.log(`Sections: ${sectionNames.join(', ')}`);
      });
  });
}

main();
