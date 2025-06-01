import { NextRequest, NextResponse } from 'next/server';
import { githubDataFetcher } from '@/lib/githubDataFetcher';
import { RawFilm } from '@/components/types';
import { generateSessionId } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { festivalId: string } }
) {
  try {
    const { festivalId } = params;
    
    // Get festival data from GitHub
    const festivalData = await githubDataFetcher.getFestivalData(festivalId);
    if (!festivalData) {
      return NextResponse.json(
        { error: `Festival ${festivalId} not found` },
        { status: 404 }
      );
    }
    
    // Transform raw film data to the format expected by the frontend
    const films = Object.entries(festivalData.filmDetailsCache as Record<string, RawFilm>).map(([id, rawFilm]) => {
      const { schedule = [], duration = "0", ...rest } = rawFilm;

      return {
        ...rest,
        id,
        schedule: schedule.map((sch: { date: string; time: string; location: string }) => {
          // Both festivals now use standardized format: date: "YYYY-MM-DD", time: "HH:MM"
          const parsedTime = new Date(`${sch.date} ${sch.time} +8`).valueOf();
          
          const partialSession = {
            filmId: id,
            time: parsedTime,
            location: sch.location,
          };

          return {
            id: generateSessionId(partialSession),
            ...partialSession,
          };
        }),
        duration: parseInt(duration?.replace(/[^\d]/, "") || "0", 10),
      };
    });
    
    return NextResponse.json({ 
      films,
      festivalId,
      sections: festivalData.sectionsCache
    });
  } catch (error) {
    console.error('Error fetching films:', error);
    return NextResponse.json(
      { error: 'Failed to fetch films' },
      { status: 500 }
    );
  }
}
