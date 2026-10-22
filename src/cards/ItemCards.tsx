import { categoryMeta } from '../../shared/categories';
import type { Item } from '../../shared/types';
import { compact, account } from '../lib/accounts';
import { react, share, toggleFollow, toggleSave } from '../lib/actions';
import { getState, useAppState } from '../lib/store';
import { openDetail, openMenu, openNotes } from '../lib/ui';
import { Avatar } from '../ui/Avatar';
import {
  Icon,
  IconBookmark,
  IconComment,
  IconExternal,
  IconHeart,
  IconMore,
  IconPlus,
  IconShare,
  IconThumbDown,
  IconUp,
  IconVerified,
} from '../ui/icons';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CatTag, KIND_ICON, bodyText, metaBits, titles } from './common';
import { ChessPuzzle } from './Chess';
import { VideoBox } from './Video';

const FULL_IMAGE = new Set(['artwork', 'image', 'comic']);

function useImage(src?: string) {
  const [failed, setFailed] = useState(false);
  return { ok: !!src && !failed, onError: () => setFailed(true) };
}

/** Numeri veri dalla fonte, quando ci sono (mai inventati). */
export function statsLine(item: Item): string | null {
  const st = item.stats;
  if (!st) return null;
  if (st.views) return `${compact(st.views)} visualizzazioni`;
  if (st.points) return `${compact(st.points)} punti${st.comments ? ` · ${compact(st.comments)} commenti` : ''} su Hacker News`;
  return null;
}

/**
 * Tocco singolo e doppio tocco sullo stesso elemento: il doppio tocco mette "mi piace"
 * (con il cuore che compare), il singolo aspetta un attimo per non confondersi.
 */
function useTaps(item: Item, onSingle: () => void) {
  const [burst, setBurst] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const last = useRef(0);
  const onClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, textarea, iframe')) return;
    const now = Date.now();
    if (now - last.current < 300) {
      clearTimeout(timer.current);
      last.current = 0;
      if (getState().reactions[item.id] !== 'like') react(item, 'like');
      setBurst((b) => b + 1);
      return;
    }
    last.current = now;
    timer.current = setTimeout(onSingle, 280);
  };
  const heart = burst > 0 && (
    <span class="heart-burst" key={burst} aria-hidden="true">
      <IconHeart size={96} fill />
    </span>
  );
  return { onClick, heart };
}

/** Nome dell'account con badge di verifica: porta al profilo della fonte. */
export function SourceName({ item, follow }: { item: Item; follow?: boolean }) {
  const s = useAppState();
  const a = account(item.sourceId, item);
  const key = `s:${item.sourceId}`;
  const following = !!s.follows[key];
  return (
    <span class="src-name">
      <a href={`#/fonte/${item.sourceId}`} onClick={(e) => e.stopPropagation()}>
        <b>{item.sourceName}</b>
        {a.verified && <IconVerified />}
      </a>
      {follow && !following && (
        <button
          class="follow-link"
          onClick={(e) => {
            e.stopPropagation();
            toggleFollow(key, item.sourceName);
          }}
        >
          Segui
        </button>
      )}
    </span>
  );
}

/* ── Vista immersiva ────────────────────────────────────────────────────── */

/**
 * Testo del contenuto: sale dal basso sopra l'immagine quando tocchi la card,
 * e si richiude da solo quando scorri alla card successiva.
 */
function SlideText({ item, explored, onClose }: { item: Item; explored?: boolean; onClose: () => void }) {
  const s = useAppState();
  const mode = s.settings.summaryMode;
  const t = titles(item, mode);
  return (
    <div class="slide-text" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t.main}>
      <button class="slide-text-grip" onClick={onClose} aria-label="Chiudi il testo" />
      <h2>{t.main}</h2>
      <p class="slide-summary">{bodyText(item, mode)}</p>
      {item.excerptIt && (
        <div class="quote">
          {item.excerptIt}
          <small>Traduzione dell’estratto</small>
        </div>
      )}
      <Tags item={item} />
      <div class="row">
        <a class="btn small" href={item.url} target="_blank" rel="noopener">
          Leggi l’originale <IconExternal size={16} />
        </a>
        <button class="btn ghost small" onClick={() => openDetail(item, explored)}>
          Dettagli
        </button>
        <button class="btn ghost small" onClick={onClose}>
          Chiudi
        </button>
      </div>
    </div>
  );
}

/** Richiude il pannello del testo quando la card esce dallo schermo. */
function useCloseWhenHidden(open: boolean, close: () => void) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open || !ref.current) return;
    const io = new IntersectionObserver(([e]) => e.intersectionRatio < 0.5 && close(), { threshold: [0.5] });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [open]);
  return ref;
}

function SlideMeta({ item }: { item: Item }) {
  const stats = statsLine(item);
  return (
    <div class="slide-meta">
      <CatTag item={item} light />
      <span>{[...metaBits(item).slice(1), stats].filter(Boolean).join(' · ')}</span>
    </div>
  );
}

export function Slide({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const mode = s.settings.summaryMode;
  const img = useImage(item.image);
  const t = titles(item, mode);
  const [textOpen, setTextOpen] = useState(false);
  const ref = useCloseWhenHidden(textOpen, () => setTextOpen(false));
  const video = item.kind === 'video' && !!item.youtubeId;
  const showFull = FULL_IMAGE.has(item.kind) && img.ok;
  const typo = !video && (!img.ok || item.kind === 'poem' || item.kind === 'word' || item.kind === 'chess');
  const taps = useTaps(item, () => (typo ? openDetail(item, explored) : setTextOpen((o) => !o)));
  const who = (
    <div class="slide-who">
      <SourceName item={item} follow />
    </div>
  );

  // Video: il player in alto, poi titolo e testo.
  if (video) {
    return (
      <article class={`slide video${textOpen ? ' text-open' : ''}`} ref={ref} onClick={taps.onClick}>
        <div class="slide-blur" style={{ backgroundImage: `url("https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg")` }} />
        <VideoBox item={item} class="top" auto />
        <div class="slide-head">
          {who}
          <h2 class="slide-title">{t.main}</h2>
          {t.sub && <div class="slide-orig">{t.sub}</div>}
          <p class="slide-summary clamp">{bodyText(item, mode)}</p>
          <SlideMeta item={item} />
        </div>
        <Rail item={item} explored={explored} />
        {taps.heart}
        {textOpen && <SlideText item={item} explored={explored} onClose={() => setTextOpen(false)} />}
      </article>
    );
  }

  // Scacchi: il puzzle si gioca direttamente nella card.
  if (item.kind === 'chess' && item.chess) {
    return (
      <article class="slide typo chess" ref={ref}>
        <div class="slide-head" style={{ cursor: 'default' }}>
          {who}
          <h2 class="slide-title">{t.main}</h2>
          <ChessPuzzle data={item.chess} puzzleUrl={item.url} compact />
        </div>
        <Rail item={item} explored={explored} />
      </article>
    );
  }

  // Senza immagine (parole, poesie, testi): titolo e testo su fondo neutro.
  if (typo) {
    return (
      <article class="slide typo" ref={ref} onClick={taps.onClick}>
        <div class="slide-head">
          {who}
          {item.kind === 'word' && item.word ? (
            <>
              <div class="slide-orig">Parola del giorno · {metaBits(item).at(-1)}</div>
              <h2 class="slide-title huge">{item.word.word}</h2>
              <p class="slide-summary">{item.word.definitionIt}</p>
              {item.word.example && <p class="slide-orig">“{item.word.example}”</p>}
            </>
          ) : item.kind === 'poem' ? (
            <>
              <h2 class="slide-title">{t.main}</h2>
              {item.author && <div class="slide-orig">{item.author}</div>}
              {item.excerpt && <div class="poem-lines">{item.excerpt.split('\n').slice(0, 8).join('\n')}</div>}
            </>
          ) : (
            <>
              <h2 class={`slide-title${t.main.length < 70 ? ' huge' : ''}`}>{t.main}</h2>
              {t.sub && <div class="slide-orig">{t.sub}</div>}
              <p class="slide-summary">{bodyText(item, mode)}</p>
            </>
          )}
          <SlideMeta item={item} />
          <span class="slide-more">Apri</span>
        </div>
        <Rail item={item} explored={explored} />
        {taps.heart}
      </article>
    );
  }

  // Con immagine: prima l'immagine a schermo intero e il titolo, il testo con un tocco.
  return (
    <article class={`slide${textOpen ? ' text-open' : ''}`} ref={ref} onClick={taps.onClick}>
      {showFull ? (
        <>
          <div class="slide-blur" style={{ backgroundImage: `url("${item.image}")` }} />
          <img class="slide-bg contain" src={item.image} alt={item.imageAlt ?? ''} loading="lazy" referrerpolicy="no-referrer" onError={img.onError} />
        </>
      ) : (
        <img class="slide-bg" src={item.image} alt={item.imageAlt ?? ''} loading="lazy" referrerpolicy="no-referrer" onError={img.onError} />
      )}
      <div class="slide-shade" />
      <div class="slide-head" role="button" tabIndex={0} aria-expanded={textOpen} aria-label={`Leggi: ${t.main}`}>
        {who}
        <h2 class="slide-title">{t.main}</h2>
        {t.sub && <div class="slide-orig">{t.sub}</div>}
        <SlideMeta item={item} />
        {item.imageNote && <div class="img-note">Immagine illustrativa</div>}
        <span class="slide-more">
          <IconUp size={15} /> Leggi
        </span>
      </div>
      <Rail item={item} explored={explored} />
      {taps.heart}
      {textOpen && <SlideText item={item} explored={explored} onClose={() => setTextOpen(false)} />}
    </article>
  );
}

function Rail({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const r = s.reactions[item.id];
  const saved = !!s.saved[item.id];
  const notes = s.notes[item.id]?.length ?? 0;
  const key = `s:${item.sourceId}`;
  const following = !!s.follows[key];
  return (
    <div class="rail" onClick={(e) => e.stopPropagation()}>
      <span class="rail-avatar">
        <a href={`#/fonte/${item.sourceId}`} aria-label={`Profilo di ${item.sourceName}`}>
          <Avatar id={item.sourceId} item={item} size={46} />
        </a>
        {!following && (
          <button class="follow-plus" onClick={() => toggleFollow(key, item.sourceName)} aria-label={`Segui ${item.sourceName}`}>
            <IconPlus size={14} />
          </button>
        )}
      </span>
      <button class="like" aria-pressed={r === 'like'} onClick={() => react(item, 'like')} aria-label="Mi piace">
        <span class="disc">
          <IconHeart fill={r === 'like'} />
        </span>
        Mi piace
      </button>
      <button onClick={() => openNotes(item)} aria-label="Note">
        <span class="disc">
          <IconComment />
        </span>
        {notes ? notes : 'Nota'}
      </button>
      <button aria-pressed={saved} onClick={() => toggleSave(item)} aria-label="Salva">
        <span class="disc">
          <IconBookmark fill={saved} />
        </span>
        Salva
      </button>
      <button onClick={() => share(item)} aria-label="Condividi">
        <span class="disc">
          <IconShare />
        </span>
        Invia
      </button>
      <button onClick={() => openMenu(item, explored)} aria-label="Altro">
        <span class="disc small">
          <IconMore />
        </span>
      </button>
    </div>
  );
}

/* ── Vista a lista: account, immagine, azioni, poi titolo e testo ───────── */

export function Tags({ item }: { item: Item }) {
  if (!item.tags.length) return null;
  return (
    <div class="tags">
      {item.tags.map((t) => (
        <a key={t} href={`#/tag/${encodeURIComponent(t)}`} onClick={(e) => e.stopPropagation()}>
          #{t.replace(/\s+/g, '')}
        </a>
      ))}
    </div>
  );
}

export function Post({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const mode = s.settings.summaryMode;
  const img = useImage(item.image);
  const t = titles(item, mode);
  const open = () => openDetail(item, explored);
  const tall = FULL_IMAGE.has(item.kind);
  const taps = useTaps(item, open);
  const notes = s.notes[item.id] ?? [];
  const stats = statsLine(item);

  return (
    <article class="post">
      <header class="post-head">
        <a href={`#/fonte/${item.sourceId}`} class="post-av">
          <Avatar id={item.sourceId} item={item} size={34} />
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SourceName item={item} follow />
          <div class="post-sub">{[categoryMeta(item.category).label, ...metaBits(item).slice(1)].join(' · ')}</div>
        </div>
        <button class="icon-btn" onClick={() => openMenu(item, explored)} aria-label="Altro">
          <IconMore size={20} />
        </button>
      </header>
      {item.kind === 'video' && item.youtubeId ? (
        <div class="post-media video">
          <VideoBox item={item} />
        </div>
      ) : item.kind === 'chess' && item.chess ? (
        <div style={{ padding: '0 16px' }}>
          <ChessPuzzle data={item.chess} puzzleUrl={item.url} compact />
        </div>
      ) : (
        img.ok && (
          <div class={`post-media${tall ? ' tall' : ''}`} onClick={taps.onClick}>
            <img src={item.image} alt={item.imageAlt ?? ''} loading="lazy" referrerpolicy="no-referrer" onError={img.onError} />
            {taps.heart}
          </div>
        )
      )}
      <div class="post-body">
        <Actions item={item} explored={explored} />
        {stats && <div class="post-stats">{stats}</div>}
        <h2 class="post-title" onClick={open}>
          {t.main}
        </h2>
        {t.sub && <p class="muted small" style={{ margin: '-2px 0 6px' }}>{t.sub}</p>}
        {item.kind === 'poem' && item.excerpt ? (
          <p class="quote poem" style={{ margin: '6px 0' }}>{item.excerpt.split('\n').slice(0, 6).join('\n')}</p>
        ) : (
          <p class="post-summary" onClick={open}>
            {bodyText(item, mode)}
          </p>
        )}
        <Tags item={item} />
        {img.ok && item.imageNote && <p class="img-note muted" style={{ margin: '6px 0 0' }}>Immagine illustrativa · Wikipedia</p>}
        <button class="post-notes" onClick={() => openNotes(item)}>
          {notes.length ? (
            <>
              <b>Tu</b> {notes[notes.length - 1].text}
              {notes.length > 1 && <span class="muted"> · altre {notes.length - 1}</span>}
            </>
          ) : (
            <span class="muted">Aggiungi una nota…</span>
          )}
        </button>
      </div>
    </article>
  );
}

/** Azioni sotto un contenuto: mi piace, nota, invia, non mi piace e (a destra) salva. */
export function Actions({ item }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const r = s.reactions[item.id];
  const saved = !!s.saved[item.id];
  const notes = s.notes[item.id]?.length ?? 0;
  return (
    <div class="actions">
      <button class="like" aria-pressed={r === 'like'} onClick={() => react(item, 'like')} aria-label="Mi piace">
        <IconHeart size={24} fill={r === 'like'} />
      </button>
      <button onClick={() => openNotes(item)} aria-label="Note">
        <IconComment size={23} />
        {notes > 0 && <span>{notes}</span>}
      </button>
      <button onClick={() => share(item)} aria-label="Condividi">
        <IconShare size={23} />
      </button>
      <button class="dislike" aria-pressed={r === 'dislike'} onClick={() => react(item, 'dislike')} aria-label="Non mi piace" title="Non mi piace">
        <IconThumbDown size={22} />
      </button>
      <span style={{ flex: 1 }} />
      <button class="save" aria-pressed={saved} onClick={() => toggleSave(item)} aria-label="Salva">
        <IconBookmark size={23} fill={saved} />
      </button>
    </div>
  );
}

/** Riga compatta per Salvati e ricerche. */
export function MiniRow({ item, note }: { item: Item; note?: string }) {
  const img = useImage(item.image);
  const c = categoryMeta(item.category);
  const t = titles(item, getState().settings.summaryMode);
  return (
    <button class="mini" onClick={() => openDetail(item)}>
      <div style={{ minWidth: 0 }}>
        <CatTag item={item} />
        <h3>{t.main}</h3>
        <p>{note ?? item.sourceName}</p>
      </div>
      {img.ok ? (
        <img src={item.image} alt="" loading="lazy" referrerpolicy="no-referrer" onError={img.onError} />
      ) : (
        <div class="ph" aria-hidden="true">
          <Icon name={KIND_ICON[item.kind] ?? c.icon} size={28} />
        </div>
      )}
    </button>
  );
}

/** Riquadro di una griglia (Esplora, profili): immagine quadrata o testo. */
export function GridTile({ item, big }: { item: Item; big?: boolean }) {
  const img = useImage(item.image);
  const t = titles(item, getState().settings.summaryMode);
  return (
    <button class={`tile-g${big ? ' big' : ''}`} onClick={() => openDetail(item)} aria-label={t.main}>
      {img.ok ? (
        <img src={item.image} alt="" loading="lazy" referrerpolicy="no-referrer" onError={img.onError} />
      ) : (
        <span class="tile-text">{item.kind === 'word' && item.word ? item.word.word : t.main}</span>
      )}
      {KIND_ICON[item.kind] && item.kind !== 'artwork' && (
        <span class="tile-kind">
          <Icon name={KIND_ICON[item.kind]!} size={16} />
        </span>
      )}
    </button>
  );
}
