import { NextResponse } from 'next/server';
import { githubDataFetcher } from '@/lib/githubDataFetcher';
import { CATEGORIES } from '@/lib/config';

interface Category {
  value: string;
  label: string;
}

// Known festival IDs
const FESTIVALS = ['2024-FF'];

export async function GET() {
  try {
    // Ensure data is loaded for all known festivals
    await Promise.all(FESTIVALS.map(id => githubDataFetcher.getFestivalData(id)));

    // Map festival IDs to more detailed information
    const festivals = FESTIVALS.map(id => {
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
