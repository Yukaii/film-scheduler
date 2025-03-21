import { NextResponse } from 'next/server';
import { festivalData } from '@film-scheduler/film-source-golden-horse/data';
import { Category } from '@film-scheduler/film-source-golden-horse/types';
import { Config } from '@film-scheduler/film-source-golden-horse/config';

export async function GET() {
  try {
    // Get available festivals from the data
    const availableFestivals = Object.keys(festivalData);
    
    // Map festival IDs to more detailed information
    const festivals = availableFestivals.map(id => {
      const [year, category] = id.split('-');
      const categoryInfo = Config.CATEGORIES.find((c: Category) => c.value === category);
      
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
        return parseInt(b.year) - parseInt(a.year); // Descending year
      }
      return a.category.localeCompare(b.category); // Ascending category
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
