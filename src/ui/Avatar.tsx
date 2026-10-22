import { useState } from 'preact/hooks';
import { account, logoUrl } from '../lib/accounts';
import { initials } from '../cards/common';
import type { Item } from '../../shared/types';

/** Foto profilo di un account: il logo del sito in scala di grigi, oppure le iniziali. */
export function Avatar({ id, item, size = 32, ring }: { id: string; item?: Item; size?: number; ring?: 'new' | 'seen' }) {
  const a = account(id, item);
  const [failed, setFailed] = useState(false);
  const logo = logoUrl(a);
  const inner =
    logo && !failed ? (
      <img
        src={logo}
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
        onError={() => setFailed(true)}
        // Google risponde con un globo da 16px quando il sito non ha un'icona grande.
        onLoad={(e) => e.currentTarget.naturalWidth < 48 && setFailed(true)}
      />
    ) : (
      <span>{initials(a.name)}</span>
    );
  return (
    <span class={`av${ring ? ` ring ${ring}` : ''}`} style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(9, size * 0.36)}px` }} aria-hidden="true">
      {inner}
    </span>
  );
}
