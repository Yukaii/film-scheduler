export interface Category {
  value: string;
  label: string;
}

export const CATEGORIES: Category[] = [
  { value: 'FFF', label: '金馬奇幻影展' },
  { value: 'CFF', label: '金馬經典影展' },
  { value: 'FF', label: '台北金馬影展' },
  { value: 'TAIPEIFF', label: '台北國際電影節' }
];

// Festival IDs (`<YEAR>-<CATEGORY>`) served by the API. Data for each lives in a
// scraper package under `src/data/<ID>/` on GitHub main.
export const FESTIVALS = ['2025-TAIPEIFF', '2025-FFF', '2024-FF'] as const;

export function isKnownFestival(id: string): boolean {
  return (FESTIVALS as readonly string[]).includes(id);
}
