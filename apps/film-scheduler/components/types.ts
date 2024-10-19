export interface Film {
  id: string;
  filmTitle: string;
  filmOriginalTitle: string;
  directorName: string;
  directorOriginalName: string;
  schedule: Session[];
  synopsis: string;

  // in minutes
  duration: number
}

export type FilmsMap = Map<string, Film>;

export interface Session {
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
}
interface RawScheduleItem {
  date: string;
  time: string;
  location: string;
}
