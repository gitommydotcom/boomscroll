import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Item } from '../../shared/types';
import { ClipGate, ClipLimit, ClipPoster } from '../cards/Interactions';
import { Rail, SourceName, statsLine } from '../cards/ItemCards';
import { bodyText, CatTag, titles } from '../cards/common';
import { markSeen } from '../lib/actions';
import { clipDay, countClip, nextRound, orderClips } from '../lib/clips';
import { loadRecent } from '../lib/data';
import { getState, updateSettings, useAppState } from '../lib/store';
import { stopVideo } from '../lib/ui';
import { Icon, IconSoundOff, IconSoundOn } from '../ui/icons';

/** Comandi al player di YouTube (audio, play) senza caricare la sua libreria. */
function ytCommand(frame: HTMLIFrameElement | null, func: string) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
}

/**
 * Player della clip attiva. Parte sempre senza audio (così l'avvio automatico funziona ovunque);
 * se hai acceso l'audio lo riattiva subito dopo.
 */
function ClipPlayer({ item, sound }: { item: Item; sound: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const id = item.youtubeId!;
  const src =
    `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}` +
    `&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const apply = (on: boolean) => {
    timers.current.forEach(clearTimeout);
    // Il player accetta i comandi solo quando è pronto: qualche tentativo distanziato.
    timers.current = [0, 400, 1200, 2500].map((ms) =>
      setTimeout(() => {
        ytCommand(ref.current, on ? 'unMute' : 'mute');
        if (on) ytCommand(ref.current, 'playVideo');
      }, ms),
    );
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (ref.current) apply(sound);
  }, [sound]);
  return (
    <iframe
      ref={ref}
      src={src}
      title={item.title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      onLoad={() => sound && apply(true)}
    />
  );
}

function ClipSlide({ item, active, sound }: { item: Item; active: boolean; sound: boolean }) {
  const s = useAppState();
  const mode = s.settings.summaryMode;
  const t = titles(item, mode);
  const body = bodyText(item, mode);
  const [open, setOpen] = useState(false);
  const stats = statsLine(item);
  return (
    <article class="slide clip">
      <div class="slide-blur" style={{ backgroundImage: `url("https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg")` }} />
      <div class="clip-frame">{active ? <ClipPlayer item={item} sound={sound} /> : <ClipPoster item={item} />}</div>
      <div class="clip-shade" />
      <div class={`clip-info${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)}>
        <div class="slide-who">
          <SourceName item={item} follow />
        </div>
        <h2 class="clip-title">{t.main}</h2>
        {body && body !== item.title && body !== t.main && <p class="clip-sum">{body}</p>}
        <div class="clip-meta">
          <CatTag item={item} light />
          {stats && <span>{stats}</span>}
        </div>
      </div>
      <Rail item={item} />
    </article>
  );
}

type Entry = { k: 'clip'; item: Item } | { k: 'gate'; round: number; clips: Item[]; others: Item[] } | { k: 'limit' } | { k: 'empty' };

/**
 * Le clip, una dopo l'altra come nei social. Dopo ogni giro (8 clip, si può cambiare)
 * c'è una pausa attiva; dopo l'ultimo giro della giornata, basta.
 */
export function Clips({ start }: { start?: string }) {
  const s = useAppState();
  const N = s.settings.clipRound;
  const R = s.settings.clipRounds;
  const sound = s.settings.clipSound;
  const [pool, setPool] = useState<Item[] | null>(null);
  const [active, setActive] = useState(0);
  const [gates, setGates] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const counted = useRef(new Set<string>());
  // La situazione all'apertura resta ferma: guardare una clip non deve spostare le altre.
  const init = useMemo(() => clipDay(getState()), []);
  const startDone = init.rounds >= R - 1 && init.inRound >= N;

  useEffect(() => {
    stopVideo();
    loadRecent().then((list) => setPool(orderClips(list.map((r) => r.item), start)));
  }, []);

  const entries = useMemo<Entry[]>(() => {
    if (!pool) return [];
    // Con il limite già raggiunto si può ancora guardare la clip scelta, ma non scorrere oltre.
    const first = startDone ? (start ? 1 : 0) : N - Math.min(N, init.inRound);
    const unlocked = first + gates * N;
    const list: Entry[] = pool.slice(0, unlocked).map((item) => ({ k: 'clip', item }));
    const last = startDone || init.rounds + gates >= R - 1;
    if (pool.length <= unlocked && !last) list.push({ k: 'empty' });
    else if (last) list.push({ k: 'limit' });
    // Per il test di memoria: clip mai viste, prese tra le ultime della coda.
    else list.push({ k: 'gate', round: init.rounds + gates, clips: pool.slice(Math.max(0, unlocked - N), unlocked), others: pool.slice(unlocked).slice(-2) });
    return list;
  }, [pool, gates, N, R]);

  // La clip sullo schermo è quella attiva; conta nel giro la prima volta che la vedi.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (obs) => {
        for (const o of obs) if (o.isIntersecting) setActive(Number((o.target as HTMLElement).dataset.idx));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll('[data-idx]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [entries]);

  useEffect(() => {
    const e = entries[active];
    if (e?.k !== 'clip' || counted.current.has(e.item.id)) return;
    const t = setTimeout(() => {
      counted.current.add(e.item.id);
      markSeen(e.item);
      if (!startDone) countClip(N);
    }, 1200);
    return () => clearTimeout(t);
  }, [active, entries]);

  // Fermo il video se l'app va in secondo piano.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const on = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  const day = clipDay(s);
  const filled = startDone ? N : day.inRound;
  const round = Math.min(R, day.rounds + 1);

  return (
    <div style={{ position: 'relative' }}>
      <header class="clip-top">
        <div class="clip-brand">
          <Icon name="clip" size={20} /> Clip
          <span class="clip-round">
            giro {round} di {R}
          </span>
        </div>
        <div class="clip-segs" aria-label={`${filled} clip su ${N} in questo giro`}>
          {Array.from({ length: N }, (_, i) => (
            <i key={i} class={i < filled ? 'on' : ''} />
          ))}
        </div>
        <button class="icon-btn" onClick={() => updateSettings({ clipSound: !sound })} aria-label={sound ? 'Togli l’audio' : 'Attiva l’audio'} aria-pressed={sound}>
          {sound ? <IconSoundOn size={21} /> : <IconSoundOff size={21} />}
        </button>
      </header>
      <div class="immersive clips" ref={rootRef}>
        {pool === null ? (
          <div class="slide special-slide">
            <p class="muted" style={{ textAlign: 'center' }}>
              Carico le clip…
            </p>
          </div>
        ) : (
          entries.map((e, i) =>
            e.k === 'clip' ? (
              <div key={e.item.id} data-idx={i}>
                <ClipSlide item={e.item} active={i === active && !hidden} sound={sound} />
              </div>
            ) : (
              <div key={`${e.k}-${i}`} data-idx={i} class="slide special-slide">
                {e.k === 'gate' ? (
                  <ClipGate
                    round={e.round}
                    clips={e.clips}
                    pool={e.others}
                    count={N}
                    onDone={() => {
                      nextRound();
                      setGates((g) => g + 1);
                    }}
                  />
                ) : e.k === 'limit' ? (
                  <ClipLimit total={day.rounds * N + day.inRound} />
                ) : (
                  <section class="special">
                    <div class="kicker">
                      <Icon name="clip" size={15} /> Clip
                    </div>
                    <h2>{i === 0 ? 'Nessuna clip nuova, per ora.' : 'Hai visto tutte le clip nuove.'}</h2>
                    <p>Le clip arrivano con le edizioni, tre volte al giorno, solo da canali scelti per qualità.</p>
                    <a class="btn ghost" href="#/oggi">
                      Torna al feed
                    </a>
                  </section>
                )}
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
