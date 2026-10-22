/** Servizi geografici gratuiti e senza chiave: Open-Meteo, OpenStreetMap (Overpass), Wikipedia. */

export interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  region?: string;
  country?: string;
}

export interface Weather {
  temp: number;
  code: number;
  isDay: boolean;
  max: number;
  min: number;
  rainProb: number;
}

export interface Place {
  id: string;
  name: string;
  kind: string;
  emoji: string;
  label: string;
  outdoor: boolean;
  lat: number;
  lon: number;
  dist: number;
  website?: string;
}

export interface WikiPlace {
  title: string;
  extract: string;
  thumb?: string;
  dist: number;
  url: string;
}

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const fmtDist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`);

function cacheGet<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    return Date.now() - at < maxAgeMs ? (data as T) : null;
  } catch {
    return null;
  }
}
function cacheSet(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // spazio esaurito o archiviazione non disponibile
  }
}

export async function geocode(q: string): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=it&format=json`;
  const data = await (await fetch(url)).json();
  return (data.results ?? []).map((r: any) => ({ name: r.name, lat: r.latitude, lon: r.longitude, region: r.admin1, country: r.country }));
}

export async function reverseName(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=it`);
    const d = await r.json();
    return d.city || d.locality || 'La tua posizione';
  } catch {
    return 'La tua posizione';
  }
}

const WMO: Record<number, [string, string]> = {
  0: ['Sereno', '☀️'],
  1: ['Quasi sereno', '🌤️'],
  2: ['Poco nuvoloso', '⛅'],
  3: ['Nuvoloso', '☁️'],
  45: ['Nebbia', '🌫️'],
  48: ['Nebbia', '🌫️'],
  51: ['Pioviggine', '🌦️'],
  53: ['Pioviggine', '🌦️'],
  55: ['Pioviggine', '🌦️'],
  61: ['Pioggia', '🌧️'],
  63: ['Pioggia', '🌧️'],
  65: ['Pioggia forte', '🌧️'],
  71: ['Neve', '🌨️'],
  73: ['Neve', '🌨️'],
  75: ['Neve forte', '❄️'],
  80: ['Rovesci', '🌦️'],
  81: ['Rovesci', '🌧️'],
  82: ['Rovesci forti', '⛈️'],
  95: ['Temporale', '⛈️'],
  96: ['Temporale', '⛈️'],
  99: ['Temporale', '⛈️'],
};
export const weatherLabel = (code: number) => WMO[code] ?? ['Variabile', '🌥️'];

export async function weather(lat: number, lon: number): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1';
  const d = await (await fetch(url)).json();
  return {
    temp: Math.round(d.current.temperature_2m),
    code: d.current.weather_code,
    isDay: !!d.current.is_day,
    max: Math.round(d.daily.temperature_2m_max[0]),
    min: Math.round(d.daily.temperature_2m_min[0]),
    rainProb: d.daily.precipitation_probability_max?.[0] ?? 0,
  };
}

/** Bel tempo per stare fuori? */
export const goodOutside = (w: Weather) => w.code <= 3 && w.rainProb < 40 && w.max >= 6 && w.max <= 32;

const KINDS: { match: (t: Record<string, string>) => boolean; kind: string; emoji: string; label: string; outdoor: boolean }[] = [
  { match: (t) => t.tourism === 'museum', kind: 'museum', emoji: '🏛️', label: 'Museo', outdoor: false },
  { match: (t) => t.tourism === 'gallery' || t.amenity === 'arts_centre', kind: 'gallery', emoji: '🖼️', label: 'Galleria e arte', outdoor: false },
  { match: (t) => t.amenity === 'library', kind: 'library', emoji: '📚', label: 'Biblioteca', outdoor: false },
  { match: (t) => t.amenity === 'theatre', kind: 'theatre', emoji: '🎭', label: 'Teatro', outdoor: false },
  { match: (t) => t.amenity === 'cinema', kind: 'cinema', emoji: '🎬', label: 'Cinema', outdoor: false },
  { match: (t) => t.tourism === 'viewpoint', kind: 'viewpoint', emoji: '🌄', label: 'Punto panoramico', outdoor: true },
  { match: (t) => t.tourism === 'alpine_hut' || t.tourism === 'wilderness_hut', kind: 'hut', emoji: '🏔️', label: 'Rifugio', outdoor: true },
  { match: (t) => ['park', 'garden', 'nature_reserve'].includes(t.leisure), kind: 'park', emoji: '🌳', label: 'Parco e verde', outdoor: true },
  { match: (t) => !!t.historic, kind: 'historic', emoji: '🏰', label: 'Luogo storico', outdoor: true },
  { match: (t) => t.tourism === 'attraction' || t.tourism === 'artwork', kind: 'attraction', emoji: '✨', label: 'Da vedere', outdoor: true },
];

export async function places(lat: number, lon: number): Promise<Place[]> {
  const key = `bs-places:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cacheGet<Place[]>(key, 7 * 86_400_000);
  if (cached) return cached;
  const a = `around:4000,${lat},${lon}`;
  const query = `[out:json][timeout:25];(
    nwr(${a})["tourism"~"^(museum|gallery|viewpoint|attraction|artwork)$"]["name"];
    nwr(${a})["amenity"~"^(library|theatre|cinema|arts_centre)$"]["name"];
    nwr(${a})["leisure"~"^(park|garden|nature_reserve)$"]["name"];
    nwr(${a})["historic"~"^(castle|monument|archaeological_site|ruins|city_gate|fort|church|memorial)$"]["name"];
    nwr(around:15000,${lat},${lon})["tourism"~"^(alpine_hut|viewpoint)$"]["name"];
  );out center 200;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const data = await res.json();
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const el of data.elements ?? []) {
    const t = el.tags ?? {};
    const k = KINDS.find((x) => x.match(t));
    const plat = el.lat ?? el.center?.lat;
    const plon = el.lon ?? el.center?.lon;
    if (!k || !t.name || plat == null || seen.has(t.name)) continue;
    seen.add(t.name);
    out.push({
      id: `${el.type}/${el.id}`,
      name: t.name,
      kind: k.kind,
      emoji: k.emoji,
      label: k.label,
      outdoor: k.outdoor,
      lat: plat,
      lon: plon,
      dist: distanceKm(lat, lon, plat, plon),
      website: t.website || t['contact:website'],
    });
  }
  out.sort((x, y) => x.dist - y.dist);
  cacheSet(key, out);
  return out;
}

export async function wikiNearby(lat: number, lon: number): Promise<WikiPlace[]> {
  const key = `bs-wiki:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cacheGet<WikiPlace[]>(key, 7 * 86_400_000);
  if (cached) return cached;
  const url =
    'https://it.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch' +
    `&ggscoord=${lat}%7C${lon}&ggsradius=10000&ggslimit=20&prop=extracts%7Cpageimages%7Ccoordinates` +
    '&exintro=1&explaintext=1&exsentences=2&exlimit=20&pithumbsize=300&pilimit=20';
  const data = await (await fetch(url)).json();
  const pages = Object.values(data.query?.pages ?? {}) as any[];
  const out = pages
    .filter((p) => p.extract && p.coordinates?.[0])
    .map((p) => ({
      title: p.title,
      extract: p.extract,
      thumb: p.thumbnail?.source,
      dist: distanceKm(lat, lon, p.coordinates[0].lat, p.coordinates[0].lon),
      url: `https://it.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    }))
    .sort((a, b) => Number(!!b.thumb) - Number(!!a.thumb) || a.dist - b.dist);
  cacheSet(key, out);
  return out;
}

export const mapsLink = (p: { lat: number; lon: number; name: string }) =>
  `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`;
