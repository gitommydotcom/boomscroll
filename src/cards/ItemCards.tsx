import { categoryMeta } from '../../shared/categories';
import type { Item } from '../../shared/types';
import { react, share, toggleSave } from '../lib/actions';
import { getState, useAppState } from '../lib/store';
import { openDetail, openMenu } from '../lib/ui';
import { IconBookmark, IconExternal, IconHeart, IconMore, IconShare, IconThumbDown, IconUp } from '../ui/icons';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CatTag, bodyText, initials, metaBits, titles } from './common';
import { ChessPuzzle } from './Chess';
import { VideoBox } from './Video';

const FULL_IMAGE = new Set(['artwork', 'image', 'comic']);

function useImage(src?: string) {
  const [failed, setFailed] = useState(false);
  return { ok: !!src && !failed, onError: () => setFailed(true) };
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
  const meta = (
    <div class="slide-meta">
      <CatTag item={item} light />
      <span>
        {video ? '▶ ' : ''}
        {metaBits(item).join(' · ')}
      </span>
    </div>
  );

  // Video: il player in alto, poi titolo e testo.
  if (video) {
    return (
      <article class={`slide video${textOpen ? ' text-open' : ''}`} ref={ref}>
        <div class="slide-blur" style={{ backgroundImage: `url("https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg")` }} />
        <VideoBox item={item} class="top" />
        <div class="slide-head" onClick={() => setTextOpen(true)}>
          {meta}
          <h2 class="slide-title">{t.main}</h2>
          {t.sub && <div class="slide-orig">{t.sub}</div>}
          <p class="slide-summary clamp">{bodyText(item, mode)}</p>
        </div>
        <Rail item={item} explored={explored} />
        {textOpen && <SlideText item={item} explored={explored} onClose={() => setTextOpen(false)} />}
      </article>
    );
  }

  // Scacchi: il puzzle si gioca direttamente nella card.
  if (item.kind === 'chess' && item.chess) {
    return (
      <article class="slide typo chess" ref={ref}>
        <div class="slide-head" style={{ cursor: 'default' }}>
          {meta}
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
      <article class="slide typo" ref={ref}>
        <div class="slide-head" onClick={() => openDetail(item, explored)}>
          {meta}
          {item.kind === 'word' && item.word ? (
            <>
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
          <span class="slide-more">Apri</span>
        </div>
        <Rail item={item} explored={explored} />
      </article>
    );
  }

  // Con immagine: prima l'immagine a schermo intero e il titolo, il testo con un tocco.
  return (
    <article class={`slide${textOpen ? ' text-open' : ''}`} ref={ref} onClick={() => setTextOpen(!textOpen)}>
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
        {meta}
        <h2 class="slide-title">{t.main}</h2>
        {t.sub && <div class="slide-orig">{t.sub}</div>}
        {item.imageNote && <div class="img-note">Immagine illustrativa</div>}
        <span class="slide-more">
          <IconUp size={15} /> Leggi
        </span>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <Rail item={item} explored={explored} />
      </div>
      {textOpen && <SlideText item={item} explored={explored} onClose={() => setTextOpen(false)} />}
    </article>
  );
}

function Rail({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const r = s.reactions[item.id];
  const saved = !!s.saved[item.id];
  return (
    <div class="rail">
      <button class="like" aria-pressed={r === 'like'} onClick={() => react(item, 'like')} aria-label="Mi piace">
        <span class="disc">
          <IconHeart fill={r === 'like'} />
        </span>
        Mi piace
      </button>
      <button aria-pressed={r === 'dislike'} onClick={() => react(item, 'dislike')} aria-label="Non mi piace">
        <span class="disc">
          <IconThumbDown />
        </span>
        No
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
        <span class="disc">
          <IconMore />
        </span>
        Altro
      </button>
    </div>
  );
}

/* ── Vista a lista: immagine, poi titolo, poi testo ─────────────────────── */

export function Post({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const mode = s.settings.summaryMode;
  const img = useImage(item.image);
  const t = titles(item, mode);
  const open = () => openDetail(item, explored);
  const tall = FULL_IMAGE.has(item.kind);

  return (
    <article class="post">
      {item.kind === 'video' && item.youtubeId ? (
        <div class="post-media video">
          <VideoBox item={item} />
        </div>
      ) : item.kind === 'chess' && item.chess ? (
        <div style={{ padding: '16px 16px 0' }}>
          <ChessPuzzle data={item.chess} puzzleUrl={item.url} compact />
        </div>
      ) : (
        img.ok && (
          <div class={`post-media${tall ? ' tall' : ''}`} onClick={open}>
            <img src={item.image} alt={item.imageAlt ?? ''} loading="lazy" referrerpolicy="no-referrer" onError={img.onError} />
          </div>
        )
      )}
      <div class="post-body">
        <div class="post-head">
          <span class="avatar" aria-hidden="true">
            {initials(item.sourceName)}
          </span>
          <b>{item.sourceName}</b>
          <span>· {metaBits(item).slice(1).join(' · ')}</span>
          <CatTag item={item} />
        </div>
        <h2 class="post-title" onClick={open}>
          {t.main}
        </h2>
        {t.sub && <p class="muted small" style={{ margin: '-2px 0 6px' }}>{t.sub}</p>}
        {item.kind === 'poem' && item.excerpt ? (
          <p class="quote poem" style={{ margin: '6px 0' }}>{item.excerpt.split('\n').slice(0, 6).join('\n')}</p>
        ) : (
          <p class="post-summary">{bodyText(item, mode)}</p>
        )}
        {img.ok && item.imageNote && <p class="img-note muted" style={{ margin: '6px 0 0' }}>Immagine illustrativa · Wikipedia</p>}
        <Actions item={item} explored={explored} />
      </div>
    </article>
  );
}

export function Actions({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const r = s.reactions[item.id];
  const saved = !!s.saved[item.id];
  return (
    <div class="actions">
      <button class="like" aria-pressed={r === 'like'} onClick={() => react(item, 'like')} aria-label="Mi piace">
        <IconHeart size={20} fill={r === 'like'} />
      </button>
      <button class="dislike" aria-pressed={r === 'dislike'} onClick={() => react(item, 'dislike')} aria-label="Non mi piace">
        <IconThumbDown size={20} />
      </button>
      <button class="save" aria-pressed={saved} onClick={() => toggleSave(item)} aria-label="Salva">
        <IconBookmark size={20} fill={saved} />
      </button>
      <button onClick={() => share(item)} aria-label="Condividi">
        <IconShare size={20} />
      </button>
      <button onClick={() => openMenu(item, explored)} aria-label="Altro">
        <IconMore size={20} />
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
        <div class="ph" style={{ background: 'var(--paper-2)' }} aria-hidden="true">
          {c.emoji}
        </div>
      )}
    </button>
  );
}
