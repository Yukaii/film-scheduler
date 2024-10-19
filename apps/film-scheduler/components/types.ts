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
  time: string;
  location: string;
}
