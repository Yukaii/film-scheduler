import dayjs from "dayjs";

// Interfaces for parsed search filters
export interface DateFilter {
  operator: 'eq' | 'gt' | 'lt';
  date: string; // YYYY-MM-DD format
}

export interface TimeFilter {
  operator: 'eq' | 'gt' | 'lt';
  time: string; // HH:mm format
}

export interface ParsedSearchFilters {
  dateFilter?: DateFilter;
  timeFilter?: TimeFilter;
  category?: string;
  title?: string;
  director?: string;
  generalSearch?: string; // Remaining text after extracting specific filters
}

// Regular expressions for parsing search syntax
const DATE_REGEX = /date(:|>|<)(\d{4}-\d{2}-\d{2})/g;
const TIME_REGEX = /time(:|>|<)(\d{1,2}:\d{2})/g;
const CATEGORY_REGEX = /category:(\S+)/g;
const TITLE_QUOTED_REGEX = /title:"([^"]+)"/g;
const TITLE_UNQUOTED_REGEX = /title:(\S+)/g;
const DIRECTOR_QUOTED_REGEX = /director:"([^"]+)"/g;
const DIRECTOR_UNQUOTED_REGEX = /director:(\S+)/g;

/**
 * Parse search query string into structured filters
 */
export function parseSearchQuery(query: string): ParsedSearchFilters {
  if (!query || !query.trim()) {
    return {};
  }

  const filters: ParsedSearchFilters = {};
  let remainingQuery = query.trim();

  // Reset all regex lastIndex to prevent issues with global regexes
  DATE_REGEX.lastIndex = 0;
  TIME_REGEX.lastIndex = 0;
  CATEGORY_REGEX.lastIndex = 0;
  TITLE_QUOTED_REGEX.lastIndex = 0;
  TITLE_UNQUOTED_REGEX.lastIndex = 0;
  DIRECTOR_QUOTED_REGEX.lastIndex = 0;
  DIRECTOR_UNQUOTED_REGEX.lastIndex = 0;

  // Parse date filters
  let match;
  while ((match = DATE_REGEX.exec(query)) !== null) {
    const operator = match[1] === ':' ? 'eq' : match[1] === '>' ? 'gt' : 'lt';
    const date = match[2];
    
    // Validate date format
    if (dayjs(date, 'YYYY-MM-DD', true).isValid()) {
      filters.dateFilter = { operator, date };
      remainingQuery = remainingQuery.replace(match[0], '').trim();
    }
  }

  // Parse time filters
  while ((match = TIME_REGEX.exec(query)) !== null) {
    const operator = match[1] === ':' ? 'eq' : match[1] === '>' ? 'gt' : 'lt';
    const time = match[2];
    
    // Validate time format
    if (dayjs(`2000-01-01 ${time}`, 'YYYY-MM-DD HH:mm', true).isValid()) {
      filters.timeFilter = { operator, time };
      remainingQuery = remainingQuery.replace(match[0], '').trim();
    }
  }

  // Parse category filter
  if ((match = CATEGORY_REGEX.exec(query)) !== null) {
    filters.category = match[1];
    remainingQuery = remainingQuery.replace(match[0], '').trim();
  }

  // Parse title filter (quoted first, then unquoted)
  if ((match = TITLE_QUOTED_REGEX.exec(query)) !== null) {
    filters.title = match[1];
    remainingQuery = remainingQuery.replace(match[0], '').trim();
  } else {
    if ((match = TITLE_UNQUOTED_REGEX.exec(query)) !== null) {
      filters.title = match[1];
      remainingQuery = remainingQuery.replace(match[0], '').trim();
    }
  }

  // Parse director filter (quoted first, then unquoted)
  if ((match = DIRECTOR_QUOTED_REGEX.exec(query)) !== null) {
    filters.director = match[1];
    remainingQuery = remainingQuery.replace(match[0], '').trim();
  } else {
    if ((match = DIRECTOR_UNQUOTED_REGEX.exec(query)) !== null) {
      filters.director = match[1];
      remainingQuery = remainingQuery.replace(match[0], '').trim();
    }
  }

  // Store remaining text as general search
  if (remainingQuery) {
    filters.generalSearch = remainingQuery;
  }

  return filters;
}

/**
 * Check if a date matches the date filter
 */
export function matchesDateFilter(sessionTime: number, dateFilter: DateFilter): boolean {
  const sessionDate = dayjs(sessionTime);
  const filterDate = dayjs(dateFilter.date, 'YYYY-MM-DD');

  switch (dateFilter.operator) {
    case 'eq':
      return sessionDate.isSame(filterDate, 'day');
    case 'gt':
      return sessionDate.isAfter(filterDate, 'day');
    case 'lt':
      return sessionDate.isBefore(filterDate, 'day');
    default:
      return false;
  }
}

/**
 * Check if a time matches the time filter
 */
export function matchesTimeFilter(sessionTime: number, timeFilter: TimeFilter): boolean {
  const sessionDateTime = dayjs(sessionTime);
  const sessionTimeStr = sessionDateTime.format('HH:mm');
  
  // Parse filter time for comparison
  const filterTimeMinutes = parseTimeToMinutes(timeFilter.time);
  const sessionTimeMinutes = parseTimeToMinutes(sessionTimeStr);

  switch (timeFilter.operator) {
    case 'eq':
      return sessionTimeMinutes === filterTimeMinutes;
    case 'gt':
      return sessionTimeMinutes > filterTimeMinutes;
    case 'lt':
      return sessionTimeMinutes < filterTimeMinutes;
    default:
      return false;
  }
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if a film title matches the title filter
 */
export function matchesTitleFilter(film: { filmTitle: string; filmOriginalTitle: string }, titleFilter: string): boolean {
  const normalizedFilter = titleFilter.toLowerCase();
  return (
    film.filmTitle.toLowerCase().includes(normalizedFilter) ||
    film.filmOriginalTitle.toLowerCase().includes(normalizedFilter)
  );
}

/**
 * Check if a film director matches the director filter
 */
export function matchesDirectorFilter(film: { directorName: string; directorOriginalName: string }, directorFilter: string): boolean {
  const normalizedFilter = directorFilter.toLowerCase();
  return (
    film.directorName.toLowerCase().includes(normalizedFilter) ||
    film.directorOriginalName.toLowerCase().includes(normalizedFilter)
  );
}

/**
 * Check if a film matches category filter by name or ID
 */
export function matchesCategoryFilter(film: { sectionIds: string[] }, categoryFilter: string, sections: Array<{ id: string; name: string }>): boolean {
  if (!film.sectionIds || film.sectionIds.length === 0) return false;
  
  // Check if filter matches section ID directly
  if (film.sectionIds.includes(categoryFilter)) return true;
  
  // Check if filter matches section name (case-insensitive)
  const normalizedFilter = categoryFilter.toLowerCase();
  return sections.some(section => 
    film.sectionIds.includes(section.id) && 
    section.name.toLowerCase().includes(normalizedFilter)
  );
}

/**
 * Check if a film matches general search (legacy behavior)
 */
export function matchesGeneralSearch(film: { filmTitle: string; filmOriginalTitle: string; directorName: string; directorOriginalName: string }, searchTerm: string): boolean {
  const normalizedTerm = searchTerm.toLowerCase();
  return (
    film.filmTitle.toLowerCase().includes(normalizedTerm) ||
    film.filmOriginalTitle.toLowerCase().includes(normalizedTerm) ||
    film.directorName.toLowerCase().includes(normalizedTerm) ||
    film.directorOriginalName.toLowerCase().includes(normalizedTerm)
  );
}