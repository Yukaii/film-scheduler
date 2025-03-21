'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import Main from '@/components/Main';
import { Festival } from '@/lib/filmData';

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <MainWrapper />
      </Suspense>
    </div>
  );
}

function MainWrapper() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const defaultFestivalId = useMemo(() => 
    festivals.length > 0 ? festivals[0].id : '', 
    [festivals]
  );

  useEffect(() => {
    fetch('/api/festivals')
      .then(res => res.json())
      .then(data => setFestivals(data.festivals))
      .catch(console.error);
  }, []);

  return <Main festivals={festivals} defaultFestivalId={defaultFestivalId} />;
}
