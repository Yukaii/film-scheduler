'use client';

import { Film } from "@/components/types";

export interface Festival {
  id: string;
  year: string;
  category: string;
  label: string;
}

export interface Section {
  id: string;
  name: string;
}

// This function will be used to fetch festivals from the API
export async function fetchFestivals(): Promise<Festival[]> {
  try {
    const response = await fetch('/api/festivals');
    if (!response.ok) {
      throw new Error(`Failed to fetch festivals: ${response.statusText}`);
    }
    const data = await response.json();
    return data.festivals;
  } catch (error) {
    console.error('Error fetching festivals:', error);
    return [];
  }
}

// This function will be used to fetch films for a specific festival
export async function fetchFilms(festivalId: string): Promise<{
  films: Film[];
  filmsMap: Map<string, Film>;
  sections: Section[];
}> {
  try {
    const response = await fetch(`/api/films/${festivalId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch films: ${response.statusText}`);
    }
    
    const data = await response.json();
    const films = data.films as Film[];
    const filmsMap = films.reduce((acc, film) => {
      acc.set(film.id, film);
      return acc;
    }, new Map<string, Film>());
    
    return {
      films,
      filmsMap,
      sections: data.sections
    };
  } catch (error) {
    console.error('Error fetching films:', error);
    return {
      films: [],
      filmsMap: new Map(),
      sections: []
    };
  }
}
