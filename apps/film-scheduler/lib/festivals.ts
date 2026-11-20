import { githubDataFetcher } from '@/lib/githubDataFetcher';
import { CATEGORIES, FESTIVALS } from '@/lib/config';
import type { Festival } from '@/lib/filmData';

/**
 * Festivals whose data loads from GitHub, newest year first. Festivals that fail
 * to load are skipped so one broken data folder never takes the app down.
 */
export async function getFestivals(): Promise<Festival[]> {
  const results = await Promise.allSettled(
    FESTIVALS.map((id) => githubDataFetcher.getFestivalData(id)),
  );

  const festivals = FESTIVALS.flatMap((id, index) => {
    const result = results[index];
    if (result.status === 'rejected') {
      console.warn(`Failed to load festival ${id}:`, result.reason);
      return [];
    }
    const [year, category] = id.split('-');
    const label = CATEGORIES.find((c) => c.value === category)?.label ?? category;
    return [{ id, year, category, label }];
  });

  return festivals.sort((a, b) =>
    a.year !== b.year ? Number(b.year) - Number(a.year) : a.category.localeCompare(b.category),
  );
}
