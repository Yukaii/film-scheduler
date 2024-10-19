import Main from '@/components/Main';
import { films, filmsMap } from '@/lib/filmData';

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Main films={films} filmsMap={filmsMap}  />
    </div>
  );
}
