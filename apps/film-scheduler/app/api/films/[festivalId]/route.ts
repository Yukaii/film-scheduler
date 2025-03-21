import { NextRequest, NextResponse } from 'next/server';
import { festivalData } from '@film-scheduler/film-source-golden-horse/data';
import { RawFilm } from '@/components/types';
import { generateSessionId } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { festivalId: string } }
) {
  try {
    const { festivalId } = params;
    
    // Check if festival exists
    if (!festivalData[festivalId]) {
      return NextResponse.json(
        { error: `Festival ${festivalId} not found` },
        { status: 404 }
      );
    }
    
    // Get film data for the festival
    const festivalFilms = festivalData[festivalId];
    
    // Transform raw film data to the format expected by the frontend
    const films = Object.entries(festivalFilms.filmDetailsCache).map(([id, rawFilm]) => {
      const { schedule, duration, ...rest } = rawFilm as unknown as RawFilm;
      
      return {
        ...rest,
        id,
        schedule: schedule.map((sch) => {
          const partialSession = {
            filmId: id,
            time: new Date(
              `${festivalId.split('-')[0]}-${sch.date.replace(".", "-")} ${sch.time} +8`,
            ).valueOf(),
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
      sections: festivalFilms.sectionsCache
    });
  } catch (error) {
    console.error('Error fetching films:', error);
    return NextResponse.json(
      { error: 'Failed to fetch films' },
      { status: 500 }
    );
  }
}
