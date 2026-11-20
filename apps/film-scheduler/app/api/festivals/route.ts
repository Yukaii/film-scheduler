import { NextResponse } from 'next/server';
import { getFestivals } from '@/lib/festivals';

// Prerendered at build time and regenerated hourly, so new festival data on GitHub
// main shows up without a redeploy. Must be a literal (Next reads it statically).
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  try {
    return NextResponse.json({ festivals: await getFestivals() });
  } catch (error) {
    console.error('Error fetching festivals:', error);
    return NextResponse.json({ error: 'Failed to fetch festivals' }, { status: 500 });
  }
}
