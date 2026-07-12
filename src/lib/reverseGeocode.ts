'use client';

// In-memory cache keyed by rounded coords (~1km precision)
const cityCache = new Map<string, string | null>();

function getCacheKey(lat: number, lng: number): string {
  // Round to 2 decimal places (~1.1km precision) for cache grouping
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/**
 * Reverse-geocodes lat/lng to a high-level city/town name using Nominatim (OpenStreetMap).
 * Returns the city name (e.g. "Pune", "Mumbai") or null if unavailable.
 * Results are cached in-memory to avoid redundant API calls.
 */
export async function getCityFromCoords(
  lat: number | undefined | null,
  lng: number | undefined | null
): Promise<string | null> {
  if (lat == null || lng == null || (lat === 0 && lng === 0)) return null;

  const key = getCacheKey(lat, lng);

  if (cityCache.has(key)) {
    return cityCache.get(key) ?? null;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      {
        headers: {
          'Accept': 'application/json',
          // Nominatim requires a valid User-Agent for their usage policy
          'User-Agent': 'HyperDelivery-CommandCentre/1.0',
        },
      }
    );

    if (!res.ok) {
      cityCache.set(key, null);
      return null;
    }

    const data = await res.json();

    if (data?.address) {
      const city =
        data.address.city ||
        data.address.town ||
        data.address.state_district ||
        data.address.county ||
        data.address.village ||
        data.address.suburb ||
        null;

      cityCache.set(key, city);
      return city;
    }

    cityCache.set(key, null);
    return null;
  } catch (err) {
    console.error('Reverse geocoding failed:', err);
    cityCache.set(key, null);
    return null;
  }
}

/**
 * Batch resolve multiple coordinate pairs with rate-limiting.
 * Nominatim allows ~1 req/sec, so we stagger requests with a small delay.
 * Skips coordinates that are already cached.
 */
export async function batchResolveCities(
  coords: Array<{ id: string; lat: number | undefined | null; lng: number | undefined | null }>
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};

  // Separate cached vs uncached
  const uncached: typeof coords = [];
  for (const c of coords) {
    if (c.lat == null || c.lng == null || (c.lat === 0 && c.lng === 0)) {
      results[c.id] = null;
      continue;
    }
    const key = getCacheKey(c.lat, c.lng);
    if (cityCache.has(key)) {
      results[c.id] = cityCache.get(key) ?? null;
    } else {
      uncached.push(c);
    }
  }

  // Resolve uncached with staggered requests (~300ms apart to respect rate limit)
  for (let i = 0; i < uncached.length; i++) {
    const c = uncached[i];
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 300));
    }
    results[c.id] = await getCityFromCoords(c.lat, c.lng);
  }

  return results;
}
