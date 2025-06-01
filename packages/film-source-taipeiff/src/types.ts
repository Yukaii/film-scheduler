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

// Schedule API types
export interface TaipeiffScheduleSession {
  id: string;
  film: string; // film ID
  title: string;
  start: string; // time like "13:30"
  end: string; // time like "15:06"
  grade: string;
  gradetext: string;
  placeId: string;
  detailurl: string;
  addCalendar: string;
  isFav: boolean;
  isConflict: string;
  platerJoin: string;
  detailList: TaipeiffScheduleSessionDetail[];
}

export interface TaipeiffScheduleSessionDetail {
  detailurl: string;
  title: string;
  duration: string;
  grade: string;
  gradetext: string;
  platerJoin: string;
}

export interface TaipeiffScheduleApiResponse {
  status: string;
  msg: TaipeiffScheduleSession[];
}

export interface TaipeiffScheduleApiRequest {
  date: string; // format: "2025-06-23"
  jobType: string; // "getMyFilm_2"
  [key: string]: string; // encrypted token
}

export interface TaipeiffIdRegisterResponse {
  // The structure of this response needs to be determined from actual API calls
  // For now, we'll assume it contains the token we need
  [key: string]: any;
}
