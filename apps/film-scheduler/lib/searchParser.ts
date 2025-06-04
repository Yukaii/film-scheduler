import dayjs from "dayjs";

// Import types from the types file
interface Film {
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

interface Session {
  id: string;
  filmId: string;
  time: number;
  location: string;
}

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

// New interfaces for logical search expressions
export type LogicalOperator = 'AND' | 'OR' | 'NOT';

export interface SearchCondition {
  type: 'condition';
  field: 'date' | 'time' | 'category' | 'title' | 'director' | 'general';
  value: string;
  operator?: 'eq' | 'gt' | 'lt'; // For date/time conditions
}

export interface LogicalExpression {
  type: 'logical';
  operator: LogicalOperator;
  left?: SearchExpression;
  right?: SearchExpression;
  operand?: SearchExpression; // For NOT operator
}

export type SearchExpression = SearchCondition | LogicalExpression;

export interface ParsedSearchExpression {
  expression?: SearchExpression;
  fallbackFilters?: ParsedSearchFilters; // Fallback to old behavior for invalid syntax
}

// Regular expressions for parsing search syntax
const DATE_REGEX = /date(:|>|<)(\d{4}-\d{2}-\d{2})/g;
const TIME_REGEX = /time(:|>|<)(\d{1,2}:\d{2})/g;
const CATEGORY_REGEX = /category:(\S+)/g;
const TITLE_QUOTED_REGEX = /title:"([^"]+)"/g;
const TITLE_UNQUOTED_REGEX = /title:(\S+)/g;
const DIRECTOR_QUOTED_REGEX = /director:"([^"]+)"/g;
const DIRECTOR_UNQUOTED_REGEX = /director:(\S+)/g;

// New tokenizer for logical expressions
interface Token {
  type: 'FIELD' | 'LOGICAL' | 'PAREN_OPEN' | 'PAREN_CLOSE' | 'TEXT';
  value: string;
  field?: string;
  operator?: string;
  position: number;
}

/**
 * Tokenize search query into logical components
 */
function tokenizeQuery(query: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  
  // Reset all regex lastIndex
  const regexes = [DATE_REGEX, TIME_REGEX, CATEGORY_REGEX, TITLE_QUOTED_REGEX, TITLE_UNQUOTED_REGEX, DIRECTOR_QUOTED_REGEX, DIRECTOR_UNQUOTED_REGEX];
  regexes.forEach(regex => regex.lastIndex = 0);
  
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();
  let remaining = normalizedQuery;
  
  while (remaining.length > 0) {
    remaining = remaining.trimLeft();
    if (remaining.length === 0) break;
    
    // Check for parentheses
    if (remaining.startsWith('(')) {
      tokens.push({ type: 'PAREN_OPEN', value: '(', position });
      remaining = remaining.slice(1);
      position += 1;
      continue;
    }
    
    if (remaining.startsWith(')')) {
      tokens.push({ type: 'PAREN_CLOSE', value: ')', position });
      remaining = remaining.slice(1);
      position += 1;
      continue;
    }
    
    // Check for logical operators (case-insensitive)
    const logicalMatch = remaining.match(/^(AND|OR|NOT)\s+/i);
    if (logicalMatch) {
      tokens.push({ type: 'LOGICAL', value: logicalMatch[1].toUpperCase(), position });
      remaining = remaining.slice(logicalMatch[0].length);
      position += logicalMatch[0].length;
      continue;
    }
    
    // Check for field filters
    let fieldFound = false;
    
    // Date filter
    const dateMatch = remaining.match(/^date(:|>|<)(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const operator = dateMatch[1] === ':' ? 'eq' : dateMatch[1] === '>' ? 'gt' : 'lt';
      tokens.push({ 
        type: 'FIELD', 
        value: dateMatch[0], 
        field: 'date', 
        operator,
        position 
      });
      remaining = remaining.slice(dateMatch[0].length);
      position += dateMatch[0].length;
      fieldFound = true;
    }
    
    // Time filter
    if (!fieldFound) {
      const timeMatch = remaining.match(/^time(:|>|<)(\d{1,2}:\d{2})/);
      if (timeMatch) {
        const operator = timeMatch[1] === ':' ? 'eq' : timeMatch[1] === '>' ? 'gt' : 'lt';
        tokens.push({ 
          type: 'FIELD', 
          value: timeMatch[0], 
          field: 'time', 
          operator,
          position 
        });
        remaining = remaining.slice(timeMatch[0].length);
        position += timeMatch[0].length;
        fieldFound = true;
      }
    }
    
    // Category filter
    if (!fieldFound) {
      const categoryMatch = remaining.match(/^category:(\S+)/);
      if (categoryMatch) {
        tokens.push({ 
          type: 'FIELD', 
          value: categoryMatch[0], 
          field: 'category',
          position 
        });
        remaining = remaining.slice(categoryMatch[0].length);
        position += categoryMatch[0].length;
        fieldFound = true;
      }
    }
    
    // Title filter (quoted)
    if (!fieldFound) {
      const titleQuotedMatch = remaining.match(/^title:"([^"]+)"/);
      if (titleQuotedMatch) {
        tokens.push({ 
          type: 'FIELD', 
          value: titleQuotedMatch[0], 
          field: 'title',
          position 
        });
        remaining = remaining.slice(titleQuotedMatch[0].length);
        position += titleQuotedMatch[0].length;
        fieldFound = true;
      }
    }
    
    // Title filter (unquoted)
    if (!fieldFound) {
      const titleMatch = remaining.match(/^title:(\S+)/);
      if (titleMatch) {
        tokens.push({ 
          type: 'FIELD', 
          value: titleMatch[0], 
          field: 'title',
          position 
        });
        remaining = remaining.slice(titleMatch[0].length);
        position += titleMatch[0].length;
        fieldFound = true;
      }
    }
    
    // Director filter (quoted)
    if (!fieldFound) {
      const directorQuotedMatch = remaining.match(/^director:"([^"]+)"/);
      if (directorQuotedMatch) {
        tokens.push({ 
          type: 'FIELD', 
          value: directorQuotedMatch[0], 
          field: 'director',
          position 
        });
        remaining = remaining.slice(directorQuotedMatch[0].length);
        position += directorQuotedMatch[0].length;
        fieldFound = true;
      }
    }
    
    // Director filter (unquoted)
    if (!fieldFound) {
      const directorMatch = remaining.match(/^director:(\S+)/);
      if (directorMatch) {
        tokens.push({ 
          type: 'FIELD', 
          value: directorMatch[0], 
          field: 'director',
          position 
        });
        remaining = remaining.slice(directorMatch[0].length);
        position += directorMatch[0].length;
        fieldFound = true;
      }
    }
    
    // If no field found, treat as general text
    if (!fieldFound) {
      // Find the next logical operator or end of string
      const nextOperatorMatch = remaining.match(/\s+(AND|OR|NOT)\s+/i);
      const nextParenMatch = remaining.match(/[()]/);
      
      let endPos = remaining.length;
      if (nextOperatorMatch && (!nextParenMatch || nextOperatorMatch.index! < nextParenMatch.index!)) {
        endPos = nextOperatorMatch.index!;
      } else if (nextParenMatch) {
        endPos = nextParenMatch.index!;
      }
      
      const textValue = remaining.slice(0, endPos).trim();
      if (textValue) {
        tokens.push({ type: 'TEXT', value: textValue, position });
        remaining = remaining.slice(endPos);
        position += endPos;
      } else {
        // Skip whitespace
        remaining = remaining.slice(1);
        position += 1;
      }
    }
  }
  
  return tokens;
}

/**
 * Parse tokens into expression tree using operator precedence
 * Precedence: NOT > AND > OR
 * Supports parentheses for grouping
 */
function parseExpression(tokens: Token[]): SearchExpression | undefined {
  if (tokens.length === 0) return undefined;
  
  let index = 0;
  
  const parseOr = (): SearchExpression | undefined => {
    let left = parseAnd();
    
    while (index < tokens.length && tokens[index].type === 'LOGICAL' && tokens[index].value === 'OR') {
      index++; // consume OR
      const right = parseAnd();
      if (!right) throw new Error('Expected expression after OR');
      
      left = {
        type: 'logical',
        operator: 'OR',
        left,
        right
      };
    }
    
    return left;
  };
  
  const parseAnd = (): SearchExpression | undefined => {
    let left = parseNot();
    
    while (index < tokens.length && tokens[index].type === 'LOGICAL' && tokens[index].value === 'AND') {
      index++; // consume AND
      const right = parseNot();
      if (!right) throw new Error('Expected expression after AND');
      
      left = {
        type: 'logical',
        operator: 'AND',
        left,
        right
      };
    }
    
    // Handle implicit AND (no explicit operator between conditions)
    while (index < tokens.length && 
           (tokens[index].type === 'FIELD' || tokens[index].type === 'TEXT' || tokens[index].type === 'PAREN_OPEN') &&
           (index === 0 || tokens[index - 1].type !== 'LOGICAL')) {
      const right = parseNot();
      if (!right) break;
      
      left = {
        type: 'logical',
        operator: 'AND',
        left,
        right
      };
    }
    
    return left;
  };
  
  const parseNot = (): SearchExpression | undefined => {
    if (index < tokens.length && tokens[index].type === 'LOGICAL' && tokens[index].value === 'NOT') {
      index++; // consume NOT
      const operand = parsePrimary();
      if (!operand) throw new Error('Expected expression after NOT');
      
      return {
        type: 'logical',
        operator: 'NOT',
        operand
      };
    }
    
    return parsePrimary();
  };
  
  const parsePrimary = (): SearchExpression | undefined => {
    if (index >= tokens.length) return undefined;
    
    const token = tokens[index];
    
    // Handle parentheses
    if (token.type === 'PAREN_OPEN') {
      index++; // consume (
      const expr = parseOr();
      if (index >= tokens.length || tokens[index].type !== 'PAREN_CLOSE') {
        throw new Error('Expected closing parenthesis');
      }
      index++; // consume )
      return expr;
    }
    
    // Handle field conditions
    if (token.type === 'FIELD') {
      index++;
      return {
        type: 'condition',
        field: token.field as SearchCondition['field'],
        value: token.value,
        operator: token.operator as SearchCondition['operator']
      };
    }
    
    // Handle general text
    if (token.type === 'TEXT') {
      index++;
      return {
        type: 'condition',
        field: 'general',
        value: token.value
      };
    }
    
    return undefined;
  };
  
  try {
    const result = parseOr();
    return result;
  } catch (error) {
    // If parsing fails, return undefined to fall back to legacy behavior
    console.warn('Search expression parsing failed:', error);
    return undefined;
  }
}

/**
 * Enhanced search query parser with logical operator support
 */
export function parseSearchQueryAdvanced(query: string): ParsedSearchExpression {
  if (!query || !query.trim()) {
    return {};
  }

  try {
    // Try to parse with logical operators
    const tokens = tokenizeQuery(query);
    const expression = parseExpression(tokens);
    
    if (expression) {
      return { expression };
    }
  } catch (error) {
    console.warn('Advanced search parsing failed, falling back to legacy:', error);
  }
  
  // Fallback to legacy parsing
  const fallbackFilters = parseSearchQuery(query);
  return { fallbackFilters };
}
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

/**
 * Extract field value from search condition
 */
function extractFieldValue(condition: SearchCondition): { field: string; value: string; operator?: string } {
  const { field, value, operator } = condition;
  
  // Extract actual value from field syntax
  if (field === 'date') {
    const match = value.match(/date(:|>|<)(.+)/);
    return { field, value: match?.[2] || value, operator: operator || 'eq' };
  }
  
  if (field === 'time') {
    const match = value.match(/time(:|>|<)(.+)/);
    return { field, value: match?.[2] || value, operator: operator || 'eq' };
  }
  
  if (field === 'category') {
    const match = value.match(/category:(.+)/);
    return { field, value: match?.[1] || value };
  }
  
  if (field === 'title') {
    const quotedMatch = value.match(/title:"([^"]+)"/);
    if (quotedMatch) return { field, value: quotedMatch[1] };
    
    const match = value.match(/title:(.+)/);
    return { field, value: match?.[1] || value };
  }
  
  if (field === 'director') {
    const quotedMatch = value.match(/director:"([^"]+)"/);
    if (quotedMatch) return { field, value: quotedMatch[1] };
    
    const match = value.match(/director:(.+)/);
    return { field, value: match?.[1] || value };
  }
  
  return { field, value };
}

/**
 * Evaluate a search condition against a film
 */
function evaluateCondition(
  condition: SearchCondition, 
  film: Film, 
  sections: Array<{ id: string; name: string }>
): boolean {
  const { field, value, operator } = extractFieldValue(condition);
  
  switch (field) {
    case 'date':
      if (!film.schedule || film.schedule.length === 0) return false;
      if (!dayjs(value, 'YYYY-MM-DD', true).isValid()) return false;
      
      return film.schedule.some((session: Session) => 
        matchesDateFilter(session.time, { operator: operator as DateFilter['operator'], date: value })
      );
      
    case 'time':
      if (!film.schedule || film.schedule.length === 0) return false;
      if (!dayjs(`2000-01-01 ${value}`, 'YYYY-MM-DD HH:mm', true).isValid()) return false;
      
      return film.schedule.some((session: Session) => 
        matchesTimeFilter(session.time, { operator: operator as TimeFilter['operator'], time: value })
      );
      
    case 'category':
      return matchesCategoryFilter(film, value, sections);
      
    case 'title':
      return matchesTitleFilter(film, value);
      
    case 'director':
      return matchesDirectorFilter(film, value);
      
    case 'general':
      return matchesGeneralSearch(film, value);
      
    default:
      return false;
  }
}

/**
 * Evaluate a search expression against a film
 */
export function evaluateSearchExpression(
  expression: SearchExpression,
  film: Film,
  sections: Array<{ id: string; name: string }>
): boolean {
  if (expression.type === 'condition') {
    return evaluateCondition(expression, film, sections);
  }
  
  if (expression.type === 'logical') {
    switch (expression.operator) {
      case 'AND':
        return Boolean(
          expression.left && evaluateSearchExpression(expression.left, film, sections) &&
          expression.right && evaluateSearchExpression(expression.right, film, sections)
        );
        
      case 'OR':
        return Boolean(
          (expression.left && evaluateSearchExpression(expression.left, film, sections)) ||
          (expression.right && evaluateSearchExpression(expression.right, film, sections))
        );
        
      case 'NOT':
        return expression.operand ? !evaluateSearchExpression(expression.operand, film, sections) : false;
        
      default:
        return false;
    }
  }
  
  return false;
}

/**
 * Main function to filter films using advanced search
 */
export function filterFilmsAdvanced(
  films: Film[],
  searchQuery: string,
  sections: Array<{ id: string; name: string }>
): Film[] {
  if (!searchQuery || !searchQuery.trim()) {
    return films;
  }
  
  const parsedQuery = parseSearchQueryAdvanced(searchQuery);
  
  // Use advanced expression-based filtering if available
  if (parsedQuery.expression) {
    return films.filter(film => 
      evaluateSearchExpression(parsedQuery.expression!, film, sections)
    );
  }
  
  // Fallback to legacy filtering
  if (parsedQuery.fallbackFilters) {
    const filters = parsedQuery.fallbackFilters;
    
    return films.filter((f) => {
      // Apply date filter if present
      if (filters.dateFilter) {
        const hasMatchingSession = f.schedule.some((session: Session) => 
          matchesDateFilter(session.time, filters.dateFilter!)
        );
        if (!hasMatchingSession) return false;
      }

      // Apply time filter if present
      if (filters.timeFilter) {
        const hasMatchingSession = f.schedule.some((session: Session) => 
          matchesTimeFilter(session.time, filters.timeFilter!)
        );
        if (!hasMatchingSession) return false;
      }

      // Apply title filter if present
      if (filters.title) {
        if (!matchesTitleFilter(f, filters.title)) return false;
      }

      // Apply director filter if present
      if (filters.director) {
        if (!matchesDirectorFilter(f, filters.director)) return false;
      }

      // Apply category filter if present
      if (filters.category) {
        if (!matchesCategoryFilter(f, filters.category, sections)) return false;
      }

      // Apply general search if present (legacy search behavior)
      if (filters.generalSearch) {
        if (!matchesGeneralSearch(f, filters.generalSearch)) return false;
      }

      return true;
    });
  }
  
  return films;
}