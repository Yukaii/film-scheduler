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
  detailUrl?: string;
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
  parentId?: string;
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
