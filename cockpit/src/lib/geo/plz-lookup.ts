import plzData from "./plz-coordinates.json";

const coordinates = plzData as Record<
  string,
  { lat: number; lng: number; city?: string }
>;

export interface GeoEntity {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  type?: string;
}

export function getCoordinatesForPlz(
  plz: string | null | undefined
): { lat: number; lng: number } | null {
  if (!plz) return null;
  const clean = plz.trim().replace(/\s/g, "");
  return coordinates[clean] ?? null;
}

export function calculateDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function getEntitiesInRadius(
  entities: GeoEntity[],
  center: { lat: number; lng: number },
  radiusKm: number
): GeoEntity[] {
  return entities.filter(
    (e) => calculateDistance(center, { lat: e.lat, lng: e.lng }) <= radiusKm
  );
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface PlzMatch {
  plz: string;
  city: string;
  lat: number;
  lng: number;
}

export function searchLocation(query: string, limit = 10): PlzMatch[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results: PlzMatch[] = [];

  for (const [plz, data] of Object.entries(coordinates)) {
    if (results.length >= limit) break;
    const city = data.city || "";
    if (plz.startsWith(q) || city.toLowerCase().includes(q)) {
      results.push({ plz, city, lat: data.lat, lng: data.lng });
    }
  }
  return results;
}

// Map radius to zoom level
export function radiusToZoom(radiusKm: number): number {
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 25) return 11;
  if (radiusKm <= 50) return 10;
  return 9;
}

// Default map center: Germany
export const GERMANY_CENTER = { lat: 51.1657, lng: 10.4515 };
export const GERMANY_ZOOM = 6;
