import { useEffect, useMemo, useState } from 'preact/hooks';
import { CATEGORIES, categoryMeta } from '../../shared/categories';
import { SLOT_LABEL, editionId, editionSlot, type CategoryId, type Edition, type EditionIndex } from '../../shared/types';
import { MiniRow, Post } from '../cards/ItemCards';
import { fetchEdition, fetchIndex } from '../lib/data';
import { longDate, shortDate } from '../lib/dates';
import { composeEdition } from '../lib/ranking';
import { getState, useAppState } from '../lib/store';
import { IconBack, IconSearch } from '../ui/icons';

function Saved() {
  const s = useAppState();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CategoryId | null>(null);
  const all = Object.values(s.saved).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const cats = [...new Set(all.map((e) => e.item.category))];
  const needle = q.trim().toLowerCase();
  const list = all.filter(
    (e) =>
      (!cat || e.item.category === cat) &&
      (!needle ||
        [e.item.title, e.item.titleIt, e.item.summary, e.item.sourceName, ...e.item.tags].some((x) => x?.toLowerCase().includes(needle))),
  );

  if (!all.length) {
    return (
      <div class="empty">
        <h3>Ancora niente di salvato</h3>
        <p>Tocca il segnalibro su un contenuto per ritrovarlo qui. Ogni tanto te lo riproporrò per aiutarti a ricordarlo.</p>
      </div>
    );
  }
  return (
    <>
      <label class="row" style={{ position: 'relative' }}>
        <span class="sr-only">Cerca nei salvati</span>
        <span style={{ position: 'absolute', left: '12px', color: 'var(--ink-3)', display: 'flex' }}>
          <IconSearch size={18} />
        </span>
        <input type="search" value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="Cerca nei salvati" style={{ paddingLeft: '38px' }} />
      </label>
      {cats.length > 1 && (
        <div class="chips scroll" style={{ marginTop: '12px' }}>
          <button class="chip" aria-pressed={!cat} onClick={() => setCat(null)}>
            Tutti ({all.length})
          </button>
          {CATEGORIES.filter((c) => cats.includes(c.id)).map((c) => (
            <button key={c.id} class="chip" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ marginTop: '8px' }}>
        {list.map((e) => (
          <MiniRow key={e.item.id} item={e.item} note={`${e.item.sourceName} · salvato il ${shortDate(e.savedAt.slice(0, 10))}`} />
        ))}
        {!list.length && <p class="muted">Nessun risultato.</p>}
      </div>
    </>
  );
}

function Archive() {
  const [index, setIndex] = useState<EditionIndex | null | undefined>(undefined);
  useEffect(() => {
    fetchIndex().then(setIndex);
  }, []);
  if (index === undefined) return <p class="muted">Carico l’archivio…</p>;
  if (!index?.editions.length) return <div class="empty">Ancora nessuna edizione in archivio.</div>;
  return (
    <div>
      {index.editions.map((e) => (
        <a key={editionId(e)} class="edition-row" href={`#/libreria/archivio/${editionId(e)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div class="row between">
            <h3>
              {longDate(e.date)} <span class="muted" style={{ fontWeight: 500 }}>· {editionSlot(e)}</span>
            </h3>
            <span class="muted small">{e.count} contenuti</span>
          </div>
          <div class="muted small">
            {Object.entries(e.categories)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([c]) => categoryMeta(c as CategoryId).emoji)
              .join(' ')}
          </div>
          {e.highlights.length > 0 && (
            <ul>
              {e.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
        </a>
      ))}
    </div>
  );
}

function EditionView({ date }: { date: string }) {
  const [edition, setEdition] = useState<Edition | null | undefined>(undefined);
  const [cat, setCat] = useState<CategoryId | null>(null);
  useEffect(() => {
    fetchEdition(date).then(setEdition);
  }, [date]);
  const ordered = useMemo(() => {
    if (!edition) return [];
    const byId = new Map(edition.items.map((i) => [i.id, i]));
    return composeEdition(edition.items, getState().weights, edition.items.length, `${editionId(edition)}-archive`).ids.map((id) => byId.get(id)!);
  }, [edition]);
  const cats = [...new Set(ordered.map((i) => i.category))];
  const list = cat ? ordered.filter((i) => i.category === cat) : ordered;

  return (
    <>
      <a href="#/libreria/archivio" class="row muted" style={{ textDecoration: 'none', marginBottom: '8px' }}>
        <IconBack size={18} /> Archivio
      </a>
      <h1 class="page-title">{edition ? longDate(edition.date) : 'Edizione'}</h1>
      {edition && <p class="muted" style={{ margin: '0 0 4px' }}>Edizione {SLOT_LABEL[editionSlot(edition)]}</p>}
      {edition === undefined && <p class="muted">Carico…</p>}
      {edition === null && <p class="muted">Edizione non disponibile offline.</p>}
      {edition && (
        <>
          <p class="page-sub">{edition.items.length} contenuti da {new Set(edition.items.map((i) => i.sourceId)).size} fonti</p>
          <div class="chips scroll">
            <button class="chip" aria-pressed={!cat} onClick={() => setCat(null)}>
              Tutto
            </button>
            {CATEGORIES.filter((c) => cats.includes(c.id)).map((c) => (
              <button key={c.id} class="chip" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <div style={{ margin: '8px -16px 0' }}>
            {list.map((i) => (
              <Post key={i.id} item={i} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function Library({ tab, date }: { tab?: string; date?: string }) {
  const current = tab === 'archivio' ? 'archivio' : 'salvati';
  return (
    <div class="screen">
      <div class="page">
        {current === 'archivio' && date ? (
          <EditionView date={date} />
        ) : (
          <>
            <h1 class="page-title">Libreria</h1>
            <p class="page-sub">Quello che hai salvato e tutte le edizioni passate.</p>
            <div class="tabs" role="tablist">
              <button role="tab" aria-selected={current === 'salvati'} onClick={() => (location.hash = '#/libreria/salvati')}>
                Salvati
              </button>
              <button role="tab" aria-selected={current === 'archivio'} onClick={() => (location.hash = '#/libreria/archivio')}>
                Archivio
              </button>
            </div>
            {current === 'salvati' ? <Saved /> : <Archive />}
          </>
        )}
      </div>
    </div>
  );
}
