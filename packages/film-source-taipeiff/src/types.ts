export interface FilmBasicInfo {
  name: string;
  imageUrl: string;
  sectionIds: string[];
}

export interface FilmSchedule {
  date: string;
  time: string;
  location: string;
}

export interface FilmDetails {
  filmTitle: string;
  filmOriginalTitle: string;
  directorName: string;
  directorOriginalName: string;
  synopsis: string;
  schedule: FilmSchedule[];
  duration: string;
  sectionIds: string[];
}

export interface Category {
  value: string;
  label: string;
}

export interface Section {
  id: string;
  name: string;
}

export interface FestivalConfig {
  year: string;
  category: string;
}

export interface FilmSectionsMap {
  [filmId: string]: string[];
}

export interface FestivalData {
  filmDetailsCache: Record<string, FilmDetails>;
  filmListCache: Record<string, FilmBasicInfo>;
  sectionsCache: Section[];
  filmSectionsMap: FilmSectionsMap;
}

export interface DataByFestival {
  [key: string]: FestivalData;
}

// Taipei Film Festival specific API types
export interface TaipeiffFilmImage {
  alt: string;
  name: string;
  original: string;
  type: string;
  url: string;
}

export interface TaipeiffDirector {
  title: string;
  summary: string;
}

export interface TaipeiffFilmOptions {
  link: string;
  tag: string;
  all_images: TaipeiffFilmImage[];
  directors: TaipeiffDirector[];
}

export interface TaipeiffFilm {
  gid: string;
  nav: string;
  title: string;
  subtitle: string;
  options: TaipeiffFilmOptions;
}

export interface TaipeiffApiResponse {
  status: string;
  lists: TaipeiffFilm[];
}

export interface TaipeiffApiRequest {
  [key: string]: string | { c: string; s: string; search: string; } | number; // encrypted token key
  Filter: {
    c: string; // category
    s: string; // section
    search: string;
  };
  NowPage: number;
}