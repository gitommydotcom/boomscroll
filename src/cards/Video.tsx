import { useEffect, useRef, useState } from 'preact/hooks';
import type { Item } from '../../shared/types';
import { getState } from '../lib/store';
import { playVideo, stopVideo, useUi } from '../lib/ui';
import { IconPlay } from '../ui/icons';

/** Miniatura alla massima risoluzione disponibile, con ripiego su quella standard. */
export function useYtThumb(id: string) {
  const [hi, setHi] = useState(true);
  const [failed, setFailed] = useState(false);
  return {
    src: `https://i.ytimg.com/vi/${id}/${hi ? 'maxresdefault' : 'hqdefault'}.jpg`,
    failed,
    onError: () => (hi ? setHi(false) : setFailed(true)),
    // Se maxres non esiste YouTube a volte risponde con un'immagine grigia 120×90.
    onLoad: (e: Event) => {
      if ((e.currentTarget as HTMLImageElement).naturalWidth <= 120) setHi(false);
    },
  };
}

export const embedUrl = (id: string, mute = false) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1${mute ? '&mute=1' : ''}`;

/**
 * Video riproducibile nella card. Con `auto` (feed a schermo intero) parte da solo e senza audio
 * quando la card è sullo schermo, se l'opzione è attiva; altrimenti con un tocco.
 * Si ferma sempre quando esce dallo schermo.
 */
export function VideoBox({ item, class: cls, auto }: { item: Item; class?: string; auto?: boolean }) {
  const { playing, muted } = useUi();
  const ref = useRef<HTMLDivElement>(null);
  const isPlaying = playing === item.id;
  const thumb = useYtThumb(item.youtubeId!);

  useEffect(() => {
    if (!ref.current) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        const visible = e.isIntersecting && e.intersectionRatio >= 0.7;
        clearTimeout(timer);
        if (!visible && playing === item.id) stopVideo();
        // Un attimo di attesa: se stai solo scorrendo oltre, il video non parte.
        if (visible && auto && getState().settings.autoplay && playing !== item.id) timer = setTimeout(() => playVideo(item.id, true), 700);
      },
      { threshold: [0, 0.35, 0.7] },
    );
    io.observe(ref.current);
    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
  }, [playing, auto]);

  return (
    <div class={`video-box ${cls ?? ''}`} ref={ref}>
      {isPlaying ? (
        <iframe
          src={embedUrl(item.youtubeId!, muted)}
          title={item.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          class="video-poster"
          onClick={(e) => {
            e.stopPropagation();
            playVideo(item.id);
          }}
          aria-label={`Guarda il video: ${item.title}`}
        >
          {!thumb.failed && <img src={thumb.src} onError={thumb.onError} onLoad={thumb.onLoad} alt="" loading="lazy" referrerpolicy="no-referrer" />}
          <span class="play-badge">
            <IconPlay size={30} />
          </span>
        </button>
      )}
    </div>
  );
}
