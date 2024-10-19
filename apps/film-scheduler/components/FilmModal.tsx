import React from 'react'
import { Film } from './types';

interface FilmModalProps {
  film: Film;
  onClose: () => void;
}

export default function FilmModal({ film, onClose }: FilmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-xl font-semibold mb-2">{film.filmTitle}</h3>
        <p className="text-gray-700 mb-4">{film.synopsis}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
