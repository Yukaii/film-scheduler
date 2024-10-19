import { Film } from '@/components/types';
import filmsData from '../data/filmsData.json';

interface RawFilm {
  filmTitle: string;
  filmOriginalTitle: string;
  directorName: string;
  directorOriginalName: string;
  synopsis: string;
  schedule: ScheduleItem[];
  duration: string;
}
interface ScheduleItem {
  date: string;
  time: string;
  location: string;
}

function transformFilm([id, rawFilm]: [string, RawFilm]): Film {
  const { schedule, duration, ...rest } = rawFilm
  return {
    ...rest,
    id,
    schedule: schedule.map(sch => ({
      time: new Date(`2024-${sch.date.replace('.', '-')} ${sch.time} +8`),
      location: sch.location,
    })),
    duration: parseInt(duration.replace(/[^\d]/, ''), 10)
  }
}

export const films = (Object.entries(filmsData) as unknown as [string, RawFilm][]).map(transformFilm)
export const filmsMap = films.reduce((acc, film) => {
  acc.set(film.id, film)
  return acc
}, new Map<string, Film>())
