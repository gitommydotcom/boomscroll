import { useState } from 'preact/hooks';
import { categoryMeta } from '../../shared/categories';
import { isHardLang, type Item } from '../../shared/types';
import { addFlashcard, lessOf, share } from '../lib/actions';
import { explain } from '../lib/ranking';
import { useAppState } from '../lib/store';
import { closeDetail, closeMenu, stopVideo, useUi } from '../lib/ui';
import { IconExternal, IconInfo, IconMute, IconPlay, IconShare, IconTranslate } from '../ui/icons';
import { Sheet } from '../ui/Sheet';
import { ChessPuzzle } from './Chess';
import { Actions } from './ItemCards';
import { embedUrl, useYtThumb } from './Video';
import { CatTag, langName, metaBits, titles } from './common';

function Why({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const reasons = explain(item, s.weights, !!explored);
  return (
    <div class="why">
      <strong>Perché vedo questo?</strong>
      <ul>
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function Detail({ item, explored }: { item: Item; explored?: boolean }) {
  const s = useAppState();
  const mode = s.settings.summaryMode;
  const [play, setPlay] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [showIt, setShowIt] = useState(false);
  const thumb = useYtThumb(item.youtubeId ?? '');
  const [why, setWhy] = useState(false);
  const t = titles(item, mode);
  const foreign = !item.lang.startsWith('it');
  const hard = isHardLang(item.lang);
  const training = mode === 'original' && foreign && !hard;

  return (
    <article>
      {item.kind === 'video' && item.youtubeId ? (
        play ? (
          <iframe
            class="video-frame"
            src={embedUrl(item.youtubeId)}
            title={item.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => {
              stopVideo();
              setPlay(true);
            }}
            style={{ position: 'relative', display: 'block', width: '100%' }}
            aria-label="Guarda il video"
          >
            <img class="detail-img" src={thumb.src} onError={thumb.onError} onLoad={thumb.onLoad} alt="" referrerpolicy="no-referrer" />
            <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>
              <span style={{ background: 'rgb(0 0 0 / 55%)', borderRadius: '999px', padding: '18px' }}>
                <IconPlay size={32} />
              </span>
            </span>
          </button>
        )
      ) : (
        item.image &&
        imgOk &&
        item.kind !== 'chess' && (
          <figure style={{ margin: 0 }}>
            <img class="detail-img" src={item.image} alt={item.imageAlt ?? ''} referrerpolicy="no-referrer" onError={() => setImgOk(false)} />
            {item.imageNote && <figcaption class="muted small" style={{ marginTop: '6px' }}>{item.imageNote}</figcaption>}
          </figure>
        )
      )}

      <div class="row" style={{ marginTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <CatTag item={item} />
        <span class="muted small">{metaBits(item).join(' · ')}</span>
      </div>
      <h1 class="detail-title">{t.main}</h1>
      {t.sub && <p class="detail-orig">{t.sub}</p>}
      {item.author && item.kind !== 'chess' && <p class="muted small" style={{ marginTop: 0 }}>di {item.author}</p>}

      {item.art && (
        <p class="muted small">
          {[item.art.artist, item.art.date, item.art.medium].filter(Boolean).join(' · ')}
          <br />
          {item.art.museum} · pubblico dominio
        </p>
      )}

      {item.kind === 'chess' && item.chess ? (
        <ChessPuzzle data={item.chess} puzzleUrl={item.url} />
      ) : item.kind === 'word' && item.word ? (
        <div class="stack">
          <p class="detail-summary" style={{ margin: 0 }}>
            <b>Significato:</b> {item.word.definitionIt}
          </p>
          {item.word.example && (
            <div class="quote">
              “{item.word.example}”{item.word.exampleIt && <small>{item.word.exampleIt}</small>}
            </div>
          )}
          <p class="detail-summary" style={{ margin: 0 }}>
            {item.summary}
          </p>
          <button class="btn" onClick={() => addFlashcard(item)}>
            + Aggiungi alle flashcard
          </button>
        </div>
      ) : training && !showIt ? (
        <>
          <p class="detail-summary">{item.excerpt ?? item.summary}</p>
          <button class="btn ghost small" onClick={() => setShowIt(true)}>
            <IconTranslate size={18} /> Mostra il riassunto in italiano
          </button>
        </>
      ) : (
        <p class="detail-summary">{item.summary}</p>
      )}

      {item.kind === 'poem' && item.excerpt && (
        <div class="quote poem">
          {item.excerpt}
          <small>Prime righe · la poesia completa è sul sito della fonte</small>
        </div>
      )}
      {item.kind !== 'poem' && item.kind !== 'word' && item.kind !== 'chess' && item.excerpt && !training && foreign && (
        <div class="quote">
          {item.excerpt}
          <small>Estratto originale in {langName(item.lang)}</small>
        </div>
      )}
      {item.excerptIt && (
        <div class="quote">
          {item.excerptIt}
          <small>Traduzione automatica dell’estratto</small>
        </div>
      )}
      {!item.ai && item.kind !== 'chess' && (
        <p class="muted small">Oggi il riassunto automatico non era disponibile: qui sopra trovi il testo della fonte.</p>
      )}

      {item.tags.length > 0 && (
        <div class="tags">
          {item.tags.map((t) => (
            <span key={t}>#{t.replace(/\s+/g, '')}</span>
          ))}
        </div>
      )}

      {item.kind !== 'chess' && (
        <a class="btn block" href={item.url} target="_blank" rel="noopener" style={{ margin: '8px 0 4px' }}>
          {item.kind === 'video' ? 'Apri su YouTube' : 'Leggi l’originale'} <IconExternal size={18} />
        </a>
      )}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Actions item={item} explored={explored} />
      </div>
      <div style={{ marginTop: '12px' }}>
        {why ? (
          <Why item={item} explored={explored} />
        ) : (
          <button class="btn ghost small" onClick={() => setWhy(true)}>
            <IconInfo size={18} /> Perché vedo questo?
          </button>
        )}
      </div>
    </article>
  );
}

function Menu({ item, explored }: { item: Item; explored?: boolean }) {
  const [why, setWhy] = useState(false);
  const cat = categoryMeta(item.category).label;
  const act = (fn: () => void) => () => {
    fn();
    closeMenu();
  };
  return (
    <div class="menu">
      {why ? (
        <Why item={item} explored={explored} />
      ) : (
        <button onClick={() => setWhy(true)}>
          <IconInfo /> Perché vedo questo?
        </button>
      )}
      <a href={item.url} target="_blank" rel="noopener" onClick={() => closeMenu()}>
        <IconExternal /> Apri l’originale
      </a>
      <button onClick={act(() => share(item))}>
        <IconShare /> Condividi
      </button>
      <button onClick={act(() => lessOf(item, 'source'))}>
        <IconMute /> Meno contenuti da {item.sourceName}
      </button>
      <button onClick={act(() => lessOf(item, 'topic'))}>
        <IconMute /> Meno contenuti di {cat}
      </button>
    </div>
  );
}

/** Ospita il foglio di dettaglio e il menu, apribili da qualsiasi schermata. */
export function ItemSheets() {
  const { detail, menu } = useUi();
  return (
    <>
      {detail && (
        <Sheet title={categoryMeta(detail.item.category).label} onClose={closeDetail} key={detail.item.id}>
          <Detail item={detail.item} explored={detail.explored} />
        </Sheet>
      )}
      {menu && (
        <Sheet title="Opzioni" onClose={closeMenu} key={`m-${menu.item.id}`}>
          <Menu item={menu.item} explored={menu.explored} />
        </Sheet>
      )}
    </>
  );
}
