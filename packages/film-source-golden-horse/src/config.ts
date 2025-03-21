import { Category, FestivalConfig } from './types';

export class Config {
  static readonly API_URL = 'https://www.goldenhorse.org.tw/api/film/search';
  static readonly FILM_DETAILS_BASE_URL = 'https://www.goldenhorse.org.tw/film/programme/films/detail';
  
  static readonly CATEGORIES: Category[] = [
    { value: 'FFF', label: '金馬奇幻影展' },
    { value: 'CFF', label: '金馬經典影展' },
    { value: 'FF', label: '台北金馬影展' }
  ];

  static readonly FESTIVALS: FestivalConfig[] = [
    { year: '2025', parentId: '674', category: 'FFF' },
    { year: '2024', parentId: '638', category: 'FF' },
    { year: '2023', parentId: '637', category: 'FF' },
  ];
}
