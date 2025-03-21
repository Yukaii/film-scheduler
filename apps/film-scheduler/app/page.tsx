'use client';

import { useEffect, useState } from 'react';
import Main from '@/components/Main';
import { fetchFestivals, Festival } from '@/lib/filmData';

export default function Home() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const defaultFestivalId = festivals.length > 0 ? festivals[0].id : '';
  
  useEffect(() => {
    const loadFestivals = async () => {
      const data = await fetchFestivals();
      setFestivals(data);
    };
    loadFestivals();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Main festivals={festivals} defaultFestivalId={defaultFestivalId} />
    </div>
  );
}
