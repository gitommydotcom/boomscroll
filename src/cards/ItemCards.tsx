import { categoryMeta } from '../../shared/categories';
import type { Item } from '../../shared/types';
import { react, share, toggleSave } from '../lib/actions';
import { getState, useAppState } from '../lib/store';
import { openDetail, openMenu } from '../lib/ui';
import { IconBookmark, IconHeart, IconMore, IconShare, IconThumbDown } from '../ui/icons';
import { useState } from 'preact/hooks';
import { CatTag, KIND_EMOJI, bodyText, initials, metaBits, titles } from './common';
import { ChessBoard } from './Chess';
import { VideoBox } from './Video';

const FULL_IMAGE = new Set(['artwork', 'image', 'comic']);

function useImage(src?: string) {
  const [failed, setFailed] = useState(false);
  return { ok: !!src && !failed, onError: () => setFailed(true) };
}

/* ── Vista immersiva ────────────────────────────────────────────────────── */

export function Slide({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const mode = s.settings.summaryMode;
  const img = useImage(item.image);
  const t = titles(item, mode);
  const color = categoryMeta(item.category).color;
  const open = () => openDetail(item, explored);
  const video = item.kind === 'video' && !!item.youtubeId;
  const showFull = FULL_IMAGE.has(item.kind) && img.ok;
  const typo = !video && (!img.ok || item.kind === 'poem' || item.kind === 'word' || item.kind === 'chess');

  if (video) {
    return (
      <article class="slide video" style={{ background: '#0d0c0a' }}>
        <div class="slide-blur" style={{ backgroundImage: `url("https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg")` }} />
        <VideoBox item={item} class="top" />
        <div class="slide-body" onClick={open} role="button" tabIndex={0} aria-label={`Apri: ${t.main}`}>
          <div class="slide-meta">
            <CatTag item={item} light />
            <span>▶ {metaBits(item).join(' · ')}</span>
          </div>
          <h2 class="slide-title">{t.main}</h2>
          {t.sub && <div class="slide-orig">{t.sub}</div>}
          <p class="slide-summary">{bodyText(item, mode)}</p>
          <span class="slide-more">Leggi di più</span>
        </div>
        <Rail item={item} explored={explored} />
      </article>
    );
  }

  return (
    <article class={`slide${typo ? ' typo' : ''}`} style={{ background: typo ? color : '#0d0c0a' }}>
      {showFull && (
        <>
          <div class="slide-blur" style={{ backgroundImage: `url("${item.image}")` }} />
          <img class="slide-bg contain" src={item.image} alt={item.imageAlt ?? ''} loading="lazy" referrerpolicy="no-referrer" onError={img.onError} />
        </>
      )}
      {!typo && !showFull && (
        <img class="slide-bg" src={item.image} alt={item.imageAlt ?? ''} loading="lazy" referrerpolicy="no-referrer" onError={img.onError} />
      )}
      {!typo && <div class="slide-shade" />}

      <div class="slide-body" onClick={open} role="button" tabIndex={0} aria-label={`Apri: ${t.main}`}>
        <div class="slide-meta">
          <CatTag item={item} light />
          <span>{metaBits(item).join(' · ')}</span>
        </div>
        {img.ok && item.imageNote && <div class="img-note">Immagine illustrativa</div>}
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
        ) : item.kind === 'chess' && item.chess ? (
          <>
            <h2 class="slide-title">{t.main}</h2>
            <div style={{ maxWidth: '260px', width: '70%', pointerEvents: 'none' }}>
              <ChessBoard fen={item.chess.fen} />
            </div>
            <p class="slide-summary">{item.summary}</p>
          </>
        ) : (
          <>
            <h2 class={`slide-title${typo && t.main.length < 70 ? ' huge' : ''}`}>{t.main}</h2>
            {t.sub && <div class="slide-orig">{t.sub}</div>}
            <p class="slide-summary">{bodyText(item, mode)}</p>
          </>
        )}
        <span class="slide-more">{item.kind === 'chess' ? 'Risolvi il puzzle' : 'Leggi di più'}</span>
      </div>
      <Rail item={item} explored={explored} />
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

/* ── Vista a lista ──────────────────────────────────────────────────────── */

export function Post({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const mode = s.settings.summaryMode;
  const img = useImage(item.image);
  const t = titles(item, mode);
  const c = categoryMeta(item.category);
  const open = () => openDetail(item, explored);
  const tall = FULL_IMAGE.has(item.kind);

  return (
    <article class="post">
      <div class="avatar" style={{ background: c.color }} aria-hidden="true">
        {initials(item.sourceName)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div class="post-head">
          <b>{item.sourceName}</b>
          <span class="muted">· {metaBits(item).slice(1).join(' · ')}</span>
        </div>
        <CatTag item={item} />
        <div onClick={open} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
          <h2 class="post-title">
            {KIND_EMOJI[item.kind] && item.kind !== 'artwork' ? `${KIND_EMOJI[item.kind]} ` : ''}
            {t.main}
          </h2>
          {t.sub && <p class="muted small" style={{ margin: '-2px 0 6px', fontStyle: 'italic' }}>{t.sub}</p>}
          {item.kind === 'poem' && item.excerpt ? (
            <p class="quote poem" style={{ margin: '6px 0' }}>{item.excerpt.split('\n').slice(0, 6).join('\n')}</p>
          ) : (
            <p class="post-summary">{bodyText(item, mode)}</p>
          )}
          {item.kind === 'chess' && item.chess && (
            <div style={{ maxWidth: '240px', marginTop: '10px', pointerEvents: 'none' }}>
              <ChessBoard fen={item.chess.fen} />
            </div>
          )}
          {item.kind === 'video' && item.youtubeId ? (
            <div class="post-media video" onClick={(e) => e.stopPropagation()}>
              <VideoBox item={item} />
            </div>
          ) : (
            img.ok && (
              <div class={`post-media${tall ? ' tall' : ''}`}>
                <img src={item.image} alt={item.imageAlt ?? ''} loading="lazy" referrerpolicy="no-referrer" onError={img.onError} />
              </div>
            )
          )}
          {img.ok && item.imageNote && <p class="img-note muted" style={{ margin: '4px 0 0' }}>Immagine illustrativa · Wikipedia</p>}
        </div>
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
        <div class="ph" style={{ background: c.color, color: '#fff' }} aria-hidden="true">
          {c.emoji}
        </div>
      )}
    </button>
  );
}
