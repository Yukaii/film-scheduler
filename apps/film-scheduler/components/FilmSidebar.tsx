import { useState } from 'react';
import type { Film } from './types';
import FilmModal from './FilmModal';

export interface FilmSidebarProps {
  films: Film[];
  onSelectFilm: (film: Film, session: { date: string; time: string; location: string }) => void;
}

export default function FilmSidebar({ films, onSelectFilm }: FilmSidebarProps) {
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);

  const handleFilmClick = (film: Film) => {
    setSelectedFilm(film);
  };

  return (
    <div className="w-1/4 p-4 border-r border-gray-300 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Film List</h2>
      {films.map((film) => (
        <div key={film.id} className="mb-3">
          <button
            onClick={() => handleFilmClick(film)}
            className="text-left w-full py-2 px-4 rounded hover:bg-gray-200"
          >
            {film.filmTitle} ({film.schedule.length} sessions)
          </button>
          {selectedFilm?.id === film.id && (
            <div className="ml-4 mt-2">
              {film.schedule.map((session, index) => (
                <div
                  key={index}
                  className="cursor-pointer text-sm hover:underline"
                  onClick={() => onSelectFilm(film, session)}
                >
                  {session.date} at {session.time} - {session.location}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {selectedFilm && (
        <FilmModal film={selectedFilm} onClose={() => setSelectedFilm(null)} />
      )}
    </div>
  );
}
