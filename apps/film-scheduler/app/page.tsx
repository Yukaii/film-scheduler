import Main from '@/components/Main';
import filmsData from '../data/filmsData.json';
import { Film } from '@/components/types';

export default function Home() {
  const films = Object.values(filmsData) as unknown as Film[];

  return (
    <div className="flex min-h-screen">
      <Main films={films}  />
    </div>
  );
}
