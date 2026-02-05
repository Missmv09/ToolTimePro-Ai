import { NextResponse } from 'next/server';
import { getStockPhotos } from '@/lib/stock-photos';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trade = searchParams.get('trade');

    if (!trade) {
      return NextResponse.json({ error: 'trade query parameter is required' }, { status: 400 });
    }

    const photos = getStockPhotos(trade);

    return NextResponse.json({
      trade,
      hero: photos.hero || [],
      gallery: photos.gallery || [],
    });
  } catch (error) {
    console.error('[Stock Photos API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}
