import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Edition, EditionIndex, Item } from '../../shared/types';
import { EndCard, ExerciseCard, FinishedCard, PauseCard, QuizCard, RecallCard, WeekCard } from '../cards/Specials';
import { Post, Slide } from '../cards/ItemCards';
import { markSeen } from '../lib/actions';
import { fetchEdition, fetchIndex } from '../lib/data';
import { addDays, isoWeek, longDate, today } from '../lib/dates';
import { exercisesFor, type FeedExercise } from '../lib/exercises';
import { composeEdition } from '../lib/ranking';
import { getState, setState, updateSettings, useAppState, type FeedOrder, type SavedEntry } from '../lib/store';
import { IconList, IconStack } from '../ui/icons';

type Entry =
  | { k: 'item'; item: Item; explored: boolean; main: boolean }
  | { k: 'ex'; ex: FeedExercise }
  | { k: 'recall'; entry: SavedEntry }
  | { k: 'week' }
  | { k: 'quiz' }
  | { k: 'end' }
  | { k: 'pause'; n: number; count: number }
  | { k: 'finished' };

const entryKey = (e: Entry, i: number) => (e.k === 'item' ? e.item.id : `${e.k}-${i}`);

/** Ordine dell'edizione: calcolato una volta al giorno e poi stabile. */
function ensureOrder(edition: Edition): FeedOrder {
  const s = getState();
  const existing = s.orders[edition.date];
  const ids = new Set(edition.items.map((i) => i.id));
  if (existing && existing.ids.filter((id) => ids.has(id)).length >= existing.ids.length * 0.6) return existing;
  const order = composeEdition(edition.items, s.weights, s.settings.editionSize, edition.date);
  setState((st) => ({ orders: { ...st.orders, [edition.date]: order } }));
  return order;
}

export function Today() {
  const s = useAppState();
  const view = s.settings.view;
  const [index, setIndex] = useState<EditionIndex | null | undefined>(undefined);
  const [edition, setEdition] = useState<Edition | null | undefined>(undefined);
  const [deep, setDeep] = useState(false);
  const [deepList, setDeepList] = useState<{ item: Item; explored: boolean }[]>([]);
  const [deepCursor, setDeepCursor] = useState(0);
  const [deepDone, setDeepDone] = useState(false);
  const [current, setCurrent] = useState(0);
  const [snooze, setSnooze] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const loadingDeep = useRef(false);

  useEffect(() => {
    fetchIndex().then(async (idx) => {
      setIndex(idx);
      if (!idx?.latest) return setEdition(null);
      setEdition(await fetchEdition(idx.latest));
    });
  }, []);

  const date = edition?.date ?? '';
  const order = useMemo(() => (edition ? ensureOrder(edition) : null), [edition]);
  // Il ripasso e il riepilogo si decidono all'apertura e restano fermi durante la lettura.
  const recall = useMemo(() => {
    const t = today();
    return Object.values(getState().saved)
      .filter((e) => e.review && e.review.next <= t)
      .sort((a, b) => a.review!.next.localeCompare(b.review!.next))[0];
  }, [date]);
  const showWeek = useMemo(() => {
    const st = getState();
    const dow = new Date().getDay();
    const hasStats = Object.keys(st.stats).some((d) => d >= addDays(today(), -7) && d < today());
    return (dow === 0 || dow === 1) && st.recapSeen !== isoWeek(today()) && hasStats;
  }, [date]);

  const mainItems = useMemo(() => {
    if (!edition || !order) return [];
    const byId = new Map(edition.items.map((i) => [i.id, i]));
    return order.ids.map((id) => byId.get(id)).filter(Boolean) as Item[];
  }, [edition, order]);

  const entries = useMemo<Entry[]>(() => {
    if (!edition || !order) return [];
    const out: Entry[] = [];
    if (showWeek && s.recapSeen !== isoWeek(today())) out.push({ k: 'week' });
    const [ex1, ex2] = exercisesFor(date);
    mainItems.forEach((item, i) => {
      if (i === 6) out.push({ k: 'ex', ex: ex1 });
      if (i === 12 && recall) out.push({ k: 'recall', entry: recall });
      if (i === 18) out.push({ k: 'ex', ex: ex2 });
      out.push({ k: 'item', item, explored: order.explore.includes(item.id), main: true });
    });
    if (mainItems.some((i) => i.quiz)) out.push({ k: 'quiz' });
    out.push({ k: 'end' });
    if (deep) {
      deepList.forEach((d, i) => {
        if (i > 0 && i % 12 === 0) out.push({ k: 'pause', n: i / 12, count: i });
        out.push({ k: 'item', item: d.item, explored: d.explored, main: false });
      });
      if (deepDone) out.push({ k: 'finished' });
    }
    return out;
  }, [edition, order, mainItems, deep, deepList, deepDone, recall, showWeek, s.recapSeen]);

  /** Approfondimenti: il resto di oggi, poi le edizioni precedenti (fino a una settimana). */
  const loadMoreDeep = async () => {
    if (!edition || !index || deepDone || loadingDeep.current) return;
    loadingDeep.current = true;
    try {
      await loadNextChunk();
    } finally {
      loadingDeep.current = false;
    }
  };
  const loadNextChunk = async () => {
    if (!edition || !index) return;
    const dates = index.editions.map((e) => e.date).filter((d) => d <= edition.date).slice(0, 7);
    let cursor = deepCursor;
    while (cursor < dates.length) {
      const ed = cursor === 0 ? edition : await fetchEdition(dates[cursor]);
      cursor++;
      if (!ed) continue;
      const st = getState();
      const exclude = new Set([...Object.keys(st.seen), ...(order?.ids ?? []), ...deepList.map((d) => d.item.id)]);
      const pick = composeEdition(ed.items, st.weights, ed.items.length, `${ed.date}-deep`, exclude);
      const byId = new Map(ed.items.map((i) => [i.id, i]));
      const chunk = pick.ids.map((id) => ({ item: byId.get(id)!, explored: pick.explore.includes(id) }));
      if (chunk.length) {
        setDeepList((l) => [...l, ...chunk]);
        setDeepCursor(cursor);
        return;
      }
    }
    setDeepCursor(cursor);
    setDeepDone(true);
  };

  const startDeep = () => {
    setDeep(true);
    loadMoreDeep();
  };

  // Segna come "visto" ciò che resta sullo schermo per almeno un secondo.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const io = new IntersectionObserver(
      (obs) => {
        for (const o of obs) {
          const el = o.target as HTMLElement;
          const idx = Number(el.dataset.idx);
          if (o.isIntersecting) {
            setCurrent(idx);
            const e = entries[idx];
            if (e?.k === 'item' && !timers.has(el)) {
              timers.set(
                el,
                setTimeout(() => markSeen(e.item), 1000),
              );
            }
          } else {
            clearTimeout(timers.get(el));
            timers.delete(el);
          }
        }
      },
      { root: view === 'immersive' ? root : null, threshold: 0.6 },
    );
    root.querySelectorAll('[data-idx]').forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      timers.forEach((t) => clearTimeout(t));
    };
  }, [entries, view]);

  // Carica altri approfondimenti quando ci si avvicina alla fine.
  useEffect(() => {
    if (deep && !deepDone && current >= entries.length - 4) loadMoreDeep();
  }, [current, deep, deepDone, entries.length]);

  const seenMain = useMemo(() => {
    const e = entries.slice(0, current + 1).filter((x) => x.k === 'item' && x.main).length;
    return e;
  }, [current, entries]);
  const total = mainItems.length;
  const inDeep = entries[current] && entries.findIndex((e) => e.k === 'end') < current;

  const limit = s.settings.dailyLimitMin;
  const usedMin = (s.stats[today()]?.seconds ?? 0) / 60;
  const overLimit = limit > 0 && usedMin >= limit + snooze;

  if (edition === undefined) {
    return <div class="empty" style={{ paddingTop: '30vh' }}>Carico l’edizione…</div>;
  }
  if (!edition) {
    return (
      <div class="page">
        <div class="empty">
          <h3>Nessuna edizione disponibile</h3>
          <p>La prima edizione viene preparata ogni mattina. Se sei offline, riprova quando torni in rete.</p>
        </div>
      </div>
    );
  }

  const stale = edition.date !== today();
  const toggle = () => updateSettings({ view: view === 'immersive' ? 'list' : 'immersive' });
  const top = (
    <header class={`topbar ${view === 'immersive' ? 'over' : 'solid'}`}>
      <div>
        <div class="wordmark">
          Boomscroll<i>.</i>
        </div>
        {view === 'list' && <div class="muted small" style={{ marginTop: '-4px' }}>{stale ? `Edizione di ${longDate(edition.date).toLowerCase()}` : longDate(edition.date)}</div>}
      </div>
      <div class="row" style={{ gap: '8px' }}>
        <span class="progress-pill" aria-live="polite">
          {inDeep ? 'Approfondimenti' : `${Math.min(seenMain, total)}/${total}`}
        </span>
        <button class="icon-btn" onClick={toggle} aria-label={view === 'immersive' ? 'Passa alla vista a lista' : 'Passa alla vista a schermo intero'}>
          {view === 'immersive' ? <IconList size={20} /> : <IconStack size={20} />}
        </button>
      </div>
    </header>
  );

  const renderEntry = (e: Entry) => {
    switch (e.k) {
      case 'item':
        return view === 'immersive' ? <Slide item={e.item} explored={e.explored} /> : <Post item={e.item} explored={e.explored} />;
      case 'ex':
        return <ExerciseCard ex={e.ex} />;
      case 'recall':
        return <RecallCard entry={e.entry} />;
      case 'week':
        return <WeekCard />;
      case 'quiz':
        return <QuizCard items={mainItems} date={date} />;
      case 'end':
        return <EndCard date={date} isToday={!stale} onMore={startDeep} />;
      case 'pause':
        return <PauseCard n={e.n} count={e.count} />;
      case 'finished':
        return <FinishedCard />;
    }
  };

  const limitOverlay = overLimit && (
    <div class="sheet-backdrop" style={{ display: 'grid', placeItems: 'center', padding: '16px', background: 'rgb(0 0 0 / 65%)' }}>
      <section class="special" style={{ maxWidth: '420px' }}>
        <div class="kicker">⏳ Limite di oggi</div>
        <h2>Hai usato Boomscroll per {Math.round(usedMin)} minuti.</h2>
        <p>È il limite che ti sei dato. Le cose salvate ti aspettano domani.</p>
        <div class="row">
          <a class="btn" href="#/pratica">
            Vai a Pratica
          </a>
          <button class="btn ghost" onClick={() => setSnooze((x) => x + 5)}>
            Ancora 5 minuti
          </button>
        </div>
      </section>
    </div>
  );

  if (view === 'immersive') {
    return (
      <div style={{ position: 'relative' }}>
        {top}
        <div class="immersive" ref={rootRef}>
          {entries.map((e, i) =>
            e.k === 'item' ? (
              <div key={entryKey(e, i)} data-idx={i}>
                {renderEntry(e)}
              </div>
            ) : (
              <div key={entryKey(e, i)} data-idx={i} class="slide special-slide">
                {renderEntry(e)}
              </div>
            ),
          )}
        </div>
        {limitOverlay}
      </div>
    );
  }

  return (
    <div class="screen" ref={rootRef}>
      {top}
      <div class="list-feed">
        {stale && (
          <p class="list-special muted small">L’edizione di oggi non è ancora pronta: ecco la più recente.</p>
        )}
        {entries.map((e, i) => (
          <div key={entryKey(e, i)} data-idx={i} class={e.k === 'item' ? undefined : 'list-special'}>
            {renderEntry(e)}
          </div>
        ))}
      </div>
      {limitOverlay}
    </div>
  );
}
