import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { SLOT_LABEL, editionId, editionSlot, type Edition, type EditionIndex, type Item } from '../../shared/types';
import { CaughtUpCard, EndCard, ExerciseCard, FinishedCard, NoFollowsCard, PauseCard, QuizCard, RecallCard, WeekCard } from '../cards/Specials';
import { Post, Slide } from '../cards/ItemCards';
import { BellButton, StoriesBar, setCurrentEdition } from '../cards/Social';
import { markSeen, toast } from '../lib/actions';
import { fetchEdition, fetchIndex, loadRecent } from '../lib/data';
import { addDays, isoWeek, longDate, today } from '../lib/dates';
import { exercisesFor, type FeedExercise } from '../lib/exercises';
import { composeEdition } from '../lib/ranking';
import { getState, setState, updateSettings, useAppState, type FeedOrder, type SavedEntry } from '../lib/store';
import { Icon, IconList, IconRefresh, IconStack } from '../ui/icons';

type Entry =
  | { k: 'item'; item: Item; explored: boolean; main: boolean }
  | { k: 'ex'; ex: FeedExercise }
  | { k: 'recall'; entry: SavedEntry }
  | { k: 'week' }
  | { k: 'quiz' }
  | { k: 'end' }
  | { k: 'pause'; n: number; count: number }
  | { k: 'finished' }
  | { k: 'caughtup'; count: number }
  | { k: 'nofollow' };

const entryKey = (e: Entry, i: number) => (e.k === 'item' ? e.item.id : `${e.k}-${i}`);

/** Ordine dell'edizione: calcolato una volta e poi stabile. */
function ensureOrder(edition: Edition): FeedOrder {
  const s = getState();
  const key = editionId(edition);
  const existing = s.orders[key];
  if (existing && existing.generatedAt === edition.generatedAt) return existing;
  // Non riproporre ciò che hai già visto (nelle edizioni precedenti o in una versione precedente di questa).
  const seen = new Set(Object.keys(s.seen));
  const fresh = edition.items.filter((i) => !seen.has(i.id));
  const order = { ...composeEdition(fresh.length >= 10 ? fresh : edition.items, s.weights, s.settings.editionSize, key), generatedAt: edition.generatedAt };
  setState((st) => ({ orders: { ...st.orders, [key]: order } }));
  return order;
}

const NEXT_EDITION: Record<string, string> = {
  mattina: 'La prossima edizione arriva nel primo pomeriggio.',
  pomeriggio: 'La prossima edizione arriva in serata.',
  sera: 'La prossima edizione arriva domattina.',
};

/** Immagini delle prossime card scaricate in anticipo: lo scorrimento resta fluido. */
const preloaded = new Set<string>();
function preload(url?: string) {
  if (!url || preloaded.has(url)) return;
  preloaded.add(url);
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.src = url;
}

export function Today() {
  const s = useAppState();
  const view = s.settings.view;
  const tab = s.settings.feedTab;
  const [followed, setFollowed] = useState<Item[] | null>(null);
  const [index, setIndex] = useState<EditionIndex | null | undefined>(undefined);
  const [edition, setEdition] = useState<Edition | null | undefined>(undefined);
  const [deep, setDeep] = useState(false);
  const [deepList, setDeepList] = useState<{ item: Item; explored: boolean }[]>([]);
  const [deepCursor, setDeepCursor] = useState(0);
  const [deepDone, setDeepDone] = useState(false);
  const [current, setCurrent] = useState(0);
  const [snooze, setSnooze] = useState(0);
  const [newer, setNewer] = useState<EditionIndex | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const loadingDeep = useRef(false);

  const openEdition = async (idx: EditionIndex | null) => {
    setIndex(idx);
    setNewer(null);
    setDeep(false);
    setDeepList([]);
    setDeepCursor(0);
    setDeepDone(false);
    setCurrent(0);
    rootRef.current?.scrollTo(0, 0);
    if (!idx?.latest) return setEdition(null);
    setEdition(await fetchEdition(idx.latest, true));
  };

  useEffect(() => {
    fetchIndex().then(openEdition);
    // Dall'attività: "È uscita l'edizione…" apre la più recente.
    const onLatest = () =>
      fetchIndex().then((idx) => {
        if (idx?.latest) openEdition(idx);
      });
    window.addEventListener('bs:latest', onLatest);
    return () => window.removeEventListener('bs:latest', onLatest);
  }, []);

  const key = edition ? editionId(edition) : '';
  useEffect(() => {
    if (key) setCurrentEdition(key);
  }, [key]);

  // Seguiti: i contenuti degli account e degli argomenti che segui, dal più recente.
  const followKeys = Object.keys(s.follows).join(',');
  useEffect(() => {
    if (tab !== 'seguiti') return;
    loadRecent().then((list) => {
      const f = getState().follows;
      setFollowed(
        list
          .map((r) => r.item)
          .filter((i) => f[`s:${i.sourceId}`] || i.tags.some((t) => f[`t:${t}`]))
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
          .slice(0, 80),
      );
    });
  }, [tab, followKeys, key]);

  /** C'è un'edizione più recente? Non la sostituisce mentre leggi: la propone. */
  const checkUpdates = async (manual = false) => {
    const idx = await fetchIndex();
    const latest = idx?.editions.find((e) => editionId(e) === idx.latest);
    const changed = latest && (idx!.latest !== key || (latest.generatedAt && latest.generatedAt !== edition?.generatedAt));
    if (changed) setNewer(idx);
    else if (manual) toast(idx ? `Sei in pari. ${NEXT_EDITION[editionSlot(edition ?? {})]}` : 'Sei offline: riprova più tardi');
  };
  useEffect(() => {
    if (!key) return;
    const onShow = () => document.visibilityState === 'visible' && checkUpdates();
    document.addEventListener('visibilitychange', onShow);
    const t = setInterval(() => checkUpdates(), 10 * 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onShow);
      clearInterval(t);
    };
  }, [key]);
  const order = useMemo(() => (edition ? ensureOrder(edition) : null), [edition]);
  // Il ripasso e il riepilogo si decidono all'apertura e restano fermi durante la lettura.
  const recall = useMemo(() => {
    const t = today();
    return Object.values(getState().saved)
      .filter((e) => e.review && e.review.next <= t)
      .sort((a, b) => a.review!.next.localeCompare(b.review!.next))[0];
  }, [key]);
  const showWeek = useMemo(() => {
    const st = getState();
    const dow = new Date().getDay();
    const hasStats = Object.keys(st.stats).some((d) => d >= addDays(today(), -7) && d < today());
    return (dow === 0 || dow === 1) && st.recapSeen !== isoWeek(today()) && hasStats;
  }, [key]);

  const mainItems = useMemo(() => {
    if (!edition || !order) return [];
    const byId = new Map(edition.items.map((i) => [i.id, i]));
    return order.ids.map((id) => byId.get(id)).filter(Boolean) as Item[];
  }, [edition, order]);

  const entries = useMemo<Entry[]>(() => {
    if (!edition || !order) return [];
    const out: Entry[] = [];
    if (tab === 'seguiti') {
      if (!followKeys) return [{ k: 'nofollow' }];
      for (const item of followed ?? []) out.push({ k: 'item', item, explored: false, main: false });
      if (followed) out.push({ k: 'caughtup', count: followed.length });
      return out;
    }
    if (showWeek && s.recapSeen !== isoWeek(today())) out.push({ k: 'week' });
    const [ex1, ex2] = exercisesFor(key);
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
  }, [edition, order, mainItems, deep, deepList, deepDone, recall, showWeek, s.recapSeen, tab, followed, followKeys]);

  /** Approfondimenti: il resto di questa edizione, poi quelle precedenti (circa tre giorni). */
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
    const ids = index.editions.map(editionId);
    const ids2 = ids.slice(Math.max(0, ids.indexOf(key)), Math.max(0, ids.indexOf(key)) + 9);
    let cursor = deepCursor;
    while (cursor < ids2.length) {
      const ed = cursor === 0 ? edition : await fetchEdition(ids2[cursor]);
      cursor++;
      if (!ed) continue;
      const st = getState();
      const exclude = new Set([...Object.keys(st.seen), ...(order?.ids ?? []), ...deepList.map((d) => d.item.id)]);
      const pick = composeEdition(ed.items, st.weights, ed.items.length, `${editionId(ed)}-deep`, exclude);
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

  useEffect(() => {
    for (const e of entries.slice(current + 1, current + 4)) if (e.k === 'item' && e.item.kind !== 'video') preload(e.item.image);
  }, [current, entries]);

  // Cambiando scheda si riparte dall'inizio.
  useEffect(() => {
    setCurrent(0);
    rootRef.current?.scrollTo(0, 0);
  }, [tab]);

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
          <p>Le edizioni escono tre volte al giorno. Se sei offline, riprova quando torni in rete.</p>
        </div>
      </div>
    );
  }

  const stale = edition.date !== today();
  const slot = editionSlot(edition);
  const editionName = `Edizione ${SLOT_LABEL[slot]}`;
  const toggle = () => updateSettings({ view: view === 'immersive' ? 'list' : 'immersive' });
  const setTab = (t: 'perte' | 'seguiti') => {
    // Toccare di nuovo "Per te" cerca una nuova edizione, come nei social.
    if (t === tab && t === 'perte') checkUpdates(true);
    updateSettings({ feedTab: t });
  };
  const tabs = (
    <div class="feed-tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'seguiti'} onClick={() => setTab('seguiti')}>
        Seguiti
      </button>
      <button role="tab" aria-selected={tab === 'perte'} onClick={() => setTab('perte')}>
        Per te
      </button>
    </div>
  );
  const progress = tab === 'perte' && !inDeep ? Math.min(1, seenMain / Math.max(1, total)) : 0;
  const top =
    view === 'immersive' ? (
      <header class="topbar over">
        <StoriesBar edition={edition} compact />
        {tabs}
        <div class="row" style={{ gap: '2px' }}>
          <button class="icon-btn" onClick={() => checkUpdates(true)} aria-label="Cerca una nuova edizione">
            <IconRefresh size={19} />
          </button>
          <BellButton />
          <button class="icon-btn" onClick={toggle} aria-label="Passa alla vista a lista">
            <IconList size={20} />
          </button>
        </div>
        <div class="feed-progress" aria-hidden="true">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      </header>
    ) : (
      <header class="topbar solid">
        <div>
          <div class="wordmark">
            Boomscroll<i>.</i>
          </div>
          <div class="muted small topbar-sub">
            {editionName}
            {stale ? ` · ${longDate(edition.date).toLowerCase()}` : ''}
          </div>
        </div>
        <div class="row" style={{ gap: '2px' }}>
          {tab === 'perte' && (
            <span class="progress-pill" aria-live="polite">
              {inDeep ? 'Approfondimenti' : `${Math.min(seenMain, total)}/${total}`}
            </span>
          )}
          <button class="icon-btn" onClick={() => checkUpdates(true)} aria-label="Cerca una nuova edizione">
            <IconRefresh size={19} />
          </button>
          <BellButton />
          <button class="icon-btn" onClick={toggle} aria-label="Passa alla vista a schermo intero">
            <IconStack size={20} />
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
        return <QuizCard items={mainItems} date={key} />;
      case 'end':
        return <EndCard date={key} name={editionName} next={NEXT_EDITION[slot]} isToday={!stale} onMore={startDeep} />;
      case 'pause':
        return <PauseCard n={e.n} count={e.count} />;
      case 'finished':
        return <FinishedCard />;
      case 'caughtup':
        return <CaughtUpCard count={e.count} />;
      case 'nofollow':
        return <NoFollowsCard items={edition.items} />;
    }
  };

  const limitOverlay = overLimit && (
    <div class="sheet-backdrop" style={{ display: 'grid', placeItems: 'center', padding: '16px', background: 'rgb(0 0 0 / 65%)' }}>
      <section class="special" style={{ maxWidth: '420px' }}>
        <div class="kicker">
          <Icon name="hourglass" size={15} /> Limite di oggi
        </div>
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

  const newerBanner = newer && (
    <button class="new-edition" onClick={() => openEdition(newer)}>
      È uscita una nuova edizione · Apri
    </button>
  );

  if (view === 'immersive') {
    return (
      <div style={{ position: 'relative' }}>
        {top}
        {newerBanner}
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
      {newerBanner}
      <div class="list-feed">
        <StoriesBar edition={edition} />
        {tabs}
        {stale && tab === 'perte' && (
          <p class="list-special muted small">La prima edizione di oggi non è ancora pronta: ecco la più recente.</p>
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
