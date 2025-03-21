import Main from '@/components/Main';
import { fetchFestivals } from '@/lib/filmData';

export default async function Home() {
  // Fetch available festivals
  const festivals = await fetchFestivals();
  
  // Default to the first festival if available
  const defaultFestivalId = festivals.length > 0 ? festivals[0].id : '';
  
  return (
    <div className="flex min-h-screen">
      <Main festivals={festivals} defaultFestivalId={defaultFestivalId} />
    </div>
  );
}
