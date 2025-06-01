export interface Film {
  id: string;
  filmTitle: string;
  filmOriginalTitle: string;
  directorName: string;
  directorOriginalName: string;
  synopsis: string;
  schedule: Session[];
  duration: number;
  sectionIds: string[];
  detailUrl?: string;
}

export type FilmsMap = Map<string, Film>;

export interface Session {
  id: string;
  filmId: string;
  time: number;
  location: string;
}

export interface RawFilm {
  filmTitle: string;
  filmOriginalTitle: string;
  directorName: string;
  directorOriginalName: string;
  synopsis: string;
  schedule: RawScheduleItem[];
  duration: string;
  detailUrl?: string;
}
interface RawScheduleItem {
  date: string;
  time: string;
  location: string;
}
