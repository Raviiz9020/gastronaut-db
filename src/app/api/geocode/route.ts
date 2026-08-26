import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!address && (!lat || !lng)) {
    return NextResponse.json({ error: 'Address or lat/lng parameters are required' }, { status: 400 });
  }

  // Use either server-only or public env variable
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('Google Maps API key is missing on the server');
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  try {
    const url = address
      ? `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      : `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    const res = await fetch(url);
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Google' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in geocode API proxy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
