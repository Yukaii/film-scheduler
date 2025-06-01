'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import Main from '@/components/Main';
import { Festival } from '@/lib/types';

function MainWrapper() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/festivals')
      .then(res => res.json())
      .then(data => {
        setFestivals(data.festivals);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching festivals:', err);
        setLoading(false);
      });
  }, []);

  const defaultFestivalId = useMemo(() => {
    if (festivals.length === 0) return '';
    
    // Prefer Taipei Film Festival as default
    const taipeiFestival = festivals.find(f => f.category === 'TAIPEIFF');
    if (taipeiFestival) {
      return taipeiFestival.id;
    }
    
    // Fallback to first festival if Taipei Film Festival not found
    return festivals[0].id;
  }, [festivals]);

  if (loading) {
    return <div>Loading festivals...</div>;
  }

  return <Main festivals={festivals} defaultFestivalId={defaultFestivalId} />;
}

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <MainWrapper />
      </Suspense>
    </div>
  );
}
