import { useEffect, useRef, useState } from 'preact/hooks';
import type { Item } from '../../shared/types';
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

export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

/**
 * Video riproducibile nella card: parte solo con un tocco (niente autoplay)
 * e si ferma quando esce dallo schermo.
 */
export function VideoBox({ item, class: cls }: { item: Item; class?: string }) {
  const { playing } = useUi();
  const ref = useRef<HTMLDivElement>(null);
  const isPlaying = playing === item.id;
  const thumb = useYtThumb(item.youtubeId!);

  useEffect(() => {
    if (!isPlaying || !ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || e.intersectionRatio < 0.35) stopVideo();
    }, { threshold: [0, 0.35] });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [isPlaying]);

  return (
    <div class={`video-box ${cls ?? ''}`} ref={ref}>
      {isPlaying ? (
        <iframe
          src={embedUrl(item.youtubeId!)}
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
