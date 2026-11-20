import { Suspense } from 'react';
import Main from '@/components/Main';
import { getFestivals } from '@/lib/festivals';

// Regenerate hourly (ISR) to pick up festivals added to GitHub main; literal required by Next
export const revalidate = 3600;

// The festival list is resolved on the server (prerendered at build time, like
// /api/festivals), so the app shell renders on the first frame instead of after
// a client-side fetch.
export default async function Home() {
  const festivals = await getFestivals();

  return (
    <div className="flex min-h-dvh">
      {/* Main reads ?festival= via useSearchParams, which needs a Suspense boundary */}
      <Suspense>
        <Main festivals={festivals} defaultFestivalId={festivals[0]?.id ?? ''} />
      </Suspense>
    </div>
  );
}
