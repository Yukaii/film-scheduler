export interface Film {
  id: string;
  filmTitle: string;
  filmOriginalTitle: string;
  directorName: string;
  directorOriginalName: string;
  schedule: FilmSchedule[];
  synopsis: string;

  // in minutes
  duration: number
}

export type FilmsMap = Map<string, Film>;

export interface FilmSchedule {
  time: Date;
  location: string
}

export interface Session {
  filmId: string;
  time: Date;
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
