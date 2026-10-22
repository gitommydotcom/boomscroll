import { useEffect, useMemo, useState } from 'preact/hooks';
import { editionId, type EditionIndex, type Item } from '../../shared/types';
import { MiniRow } from '../cards/ItemCards';
import { fetchEdition, fetchIndex } from '../lib/data';
import { hash, today } from '../lib/dates';
import {
  distanceKm,
  fmtDist,
  geocode,
  goodOutside,
  mapsLink,
  places as fetchPlaces,
  reverseName,
  weather as fetchWeather,
  weatherLabel,
  wikiNearby,
  type GeoResult,
  type Place,
  type Weather,
  type WikiPlace,
} from '../lib/geo';
import { updateSettings, useAppState, type City } from '../lib/store';
import { IconExternal, IconLocate, IconSearch } from '../ui/icons';
import { Sheet } from '../ui/Sheet';

function CityPicker({ onClose, cities }: { onClose: () => void; cities: EditionIndex['cities'] }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(() => {
      geocode(q.trim())
        .then(setResults)
        .catch(() => setErr('Ricerca non disponibile offline.'));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const choose = (c: { name: string; lat: number; lon: number }) => {
    // Se la città è coperta dalla pipeline, avremo anche gli eventi locali.
    const local = cities.find((x) => distanceKm(x.lat, x.lon, c.lat, c.lon) < 25);
    const city: City = { name: c.name, lat: c.lat, lon: c.lon, id: local?.id };
    updateSettings({ city });
    onClose();
  };

  const locate = () => {
    if (!navigator.geolocation) return setErr('La posizione non è disponibile su questo dispositivo.');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        choose({ name: await reverseName(lat, lon), lat, lon });
        setBusy(false);
      },
      () => {
        setBusy(false);
        setErr('Non ho potuto leggere la posizione. Puoi cercare la città a mano.');
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  return (
    <Sheet title="Cambia città" onClose={onClose}>
      <button class="btn block" onClick={locate} disabled={busy}>
        <IconLocate size={18} /> {busy ? 'Cerco…' : 'Usa la mia posizione'}
      </button>
      <p class="muted small">La posizione viene usata solo sul telefono, per trovare cosa c’è intorno.</p>
      <label class="row" style={{ position: 'relative', marginTop: '12px' }}>
        <span class="sr-only">Cerca una città</span>
        <span style={{ position: 'absolute', left: '12px', color: 'var(--ink-3)', display: 'flex' }}>
          <IconSearch size={18} />
        </span>
        <input type="search" value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="Cerca una città" style={{ paddingLeft: '38px' }} autoFocus />
      </label>
      {err && <p class="muted small">{err}</p>}
      <div class="menu" style={{ marginTop: '8px' }}>
        {results.map((r) => (
          <button key={`${r.lat},${r.lon}`} onClick={() => choose(r)}>
            <span>
              <strong>{r.name}</strong>
              <br />
              <span class="muted small">{[r.region, r.country].filter(Boolean).join(', ')}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

const PLACE_GROUPS = [
  { title: 'Musei, gallerie e biblioteche', kinds: ['museum', 'gallery', 'library'] },
  { title: 'Teatri e cinema', kinds: ['theatre', 'cinema'] },
  { title: 'All’aria aperta', kinds: ['park', 'viewpoint', 'hut'] },
  { title: 'Storia e cose da vedere', kinds: ['historic', 'attraction'] },
];

function PlaceRow({ p }: { p: Place }) {
  return (
    <a class="place" href={p.website ?? mapsLink(p)} target="_blank" rel="noopener">
      <span class="ico" aria-hidden="true">
        {p.emoji}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <h3>{p.name}</h3>
        <p>
          {p.label} · {fmtDist(p.dist)}
        </p>
      </span>
      <IconExternal size={16} />
    </a>
  );
}

export function Nearby() {
  const s = useAppState();
  const city = s.settings.city;
  const [picker, setPicker] = useState(false);
  const [index, setIndex] = useState<EditionIndex | null>(null);
  const [events, setEvents] = useState<Item[]>([]);
  const [w, setW] = useState<Weather | null>(null);
  const [pl, setPl] = useState<Place[] | null>(null);
  const [wiki, setWiki] = useState<WikiPlace[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchIndex().then(async (idx) => {
      setIndex(idx);
      if (!idx?.latest || !city.id) return setEvents([]);
      // Eventi dalle ultime edizioni, i più recenti prima.
      const eds = await Promise.all(idx.editions.slice(0, 4).map((e) => fetchEdition(editionId(e))));
      const seen = new Set<string>();
      setEvents(
        eds
          .flatMap((e) => e?.local?.[city.id!] ?? [])
          .filter((i) => !seen.has(i.id) && seen.add(i.id))
          .slice(0, 8),
      );
    });
  }, [city.id]);

  useEffect(() => {
    setW(null);
    setPl(null);
    setWiki(null);
    setErrors([]);
    const fail = (what: string) => () => setErrors((e) => [...e, what]);
    fetchWeather(city.lat, city.lon).then(setW).catch(fail('meteo'));
    fetchPlaces(city.lat, city.lon).then(setPl).catch(fail('luoghi'));
    wikiNearby(city.lat, city.lon).then(setWiki).catch(fail('Wikipedia'));
  }, [city.lat, city.lon]);

  const outside = w ? goodOutside(w) : true;
  const idea = useMemo(() => {
    if (!pl?.length) return null;
    const pool = pl.filter((p) => p.outdoor === outside && p.dist < 6).slice(0, 8);
    const list = pool.length ? pool : pl.slice(0, 8);
    return list[hash(today() + city.name) % list.length];
  }, [pl, outside, city.name]);

  const [label, emoji] = w ? weatherLabel(w.code) : ['', ''];
  const groups = PLACE_GROUPS.map((g) => ({ ...g, list: (pl ?? []).filter((p) => g.kinds.includes(p.kind)) }))
    .filter((g) => g.list.length)
    // Con il bel tempo prima le attività all'aperto, altrimenti quelle al chiuso.
    .sort((a, b) => Number(outside ? b.list[0].outdoor : !b.list[0].outdoor) - Number(outside ? a.list[0].outdoor : !a.list[0].outdoor));

  return (
    <div class="screen">
      <div class="page">
        <div class="row between">
          <h1 class="page-title">{city.name}</h1>
          <button class="btn ghost small" onClick={() => setPicker(true)}>
            Cambia città
          </button>
        </div>
        <p class="page-sub">Idee per uscire dallo schermo, qui intorno.</p>

        {w && (
          <div class="panel weather">
            <span style={{ fontSize: '2.6rem' }} aria-hidden="true">
              {emoji}
            </span>
            <div>
              <div class="big">{w.temp}°</div>
              <div class="muted small">
                {label} · max {w.max}° min {w.min}°{w.rainProb ? ` · pioggia ${w.rainProb}%` : ''}
              </div>
            </div>
          </div>
        )}

        {idea && (
          <>
            <h2 class="section-title">L’idea di oggi</h2>
            <div class="panel">
              <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                {outside
                  ? `Il tempo è dalla tua parte: ${idea.kind === 'park' ? 'una passeggiata a' : idea.kind === 'viewpoint' ? 'goditi la vista da' : 'fai un salto a'} ${idea.name}.`
                  : `Giornata da interni: ${idea.kind === 'library' ? 'qualche ora di lettura alla' : 'una visita a'} ${idea.name}.`}
              </p>
              <p class="muted small" style={{ margin: 0 }}>
                {idea.label} · {fmtDist(idea.dist)} dal centro
              </p>
              <a class="btn small" href={mapsLink(idea)} target="_blank" rel="noopener" style={{ marginTop: '10px' }}>
                Vedi sulla mappa
              </a>
            </div>
          </>
        )}

        {city.id && (
          <>
            <h2 class="section-title">Dal territorio</h2>
            {events.length ? (
              events.map((e) => <MiniRow key={e.id} item={e} />)
            ) : (
              <p class="muted small">Nessun evento segnalato dalle fonti locali negli ultimi giorni.</p>
            )}
          </>
        )}
        {!city.id && index && (
          <p class="muted small" style={{ marginTop: '16px' }}>
            Per {city.name} non raccolgo ancora eventi locali: ti mostro luoghi e curiosità intorno a te. Gli eventi sono disponibili per{' '}
            {index.cities.map((c) => c.name).join(', ')}.
          </p>
        )}

        {groups.map((g) => (
          <section key={g.title}>
            <h2 class="section-title">{g.title}</h2>
            {g.list.slice(0, showAll ? 20 : 4).map((p) => (
              <PlaceRow key={p.id} p={p} />
            ))}
          </section>
        ))}
        {groups.some((g) => g.list.length > 4) && !showAll && (
          <button class="btn ghost small" style={{ marginTop: '12px' }} onClick={() => setShowAll(true)}>
            Mostra altri luoghi
          </button>
        )}
        {pl === null && !errors.includes('luoghi') && <p class="muted">Cerco luoghi intorno a te…</p>}

        {wiki && wiki.length > 0 && (
          <>
            <h2 class="section-title">Lo sapevi? Qui intorno</h2>
            {wiki.slice(0, 6).map((p) => (
              <a key={p.title} class="place" href={p.url} target="_blank" rel="noopener">
                {p.thumb ? <img src={p.thumb} alt="" loading="lazy" /> : <span class="ico">📖</span>}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <h3>{p.title}</h3>
                  <p>{p.extract}</p>
                  <p>{fmtDist(p.dist)}</p>
                </span>
              </a>
            ))}
          </>
        )}

        {errors.length > 0 && <p class="muted small">Non disponibile ora: {errors.join(', ')}. Riprova più tardi.</p>}
        <p class="muted small" style={{ marginTop: '24px' }}>
          Dati: Open-Meteo, © OpenStreetMap, Wikipedia.
        </p>
      </div>
      {picker && <CityPicker onClose={() => setPicker(false)} cities={index?.cities ?? []} />}
    </div>
  );
}
