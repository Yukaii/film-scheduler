import { NextResponse } from 'next/server';
import { githubDataFetcher } from '@/lib/githubDataFetcher';
import { CATEGORIES, FESTIVALS, type Category } from '@/lib/config';

// Next 15+ made GET handlers dynamic by default; keep the Next 14 behavior of
// prerendering the festival list at build time.
export const dynamic = 'force-static';

export async function GET() {
  try {
    // Try to ensure data is loaded for all known festivals
    const festivalData = await Promise.allSettled(
      FESTIVALS.map(id => githubDataFetcher.getFestivalData(id))
    );

    // Only include festivals that loaded successfully
    const successfulFestivals = FESTIVALS.filter((id, index) => {
      const result = festivalData[index];
      if (result.status === 'rejected') {
        console.warn(`Failed to load festival ${id}:`, result.reason);
        return false;
      }
      return true;
    });

    // Map festival IDs to more detailed information
    const festivals = successfulFestivals.map(id => {
      const [year, category] = id.split('-');
      const categoryInfo = CATEGORIES.find((c: Category) => c.value === category);

      return {
        id,
        year,
        category,
        label: categoryInfo?.label || category
      };
    });

    // Sort by year (descending) and then by category
    festivals.sort((a, b) => {
      if (a.year !== b.year) {
        return parseInt(b.year) - parseInt(a.year);
      }
      return a.category.localeCompare(b.category);
    });

    return NextResponse.json({ festivals });
  } catch (error) {
    console.error('Error fetching festivals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch festivals' },
      { status: 500 }
    );
  }
}
