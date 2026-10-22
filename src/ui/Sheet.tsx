import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { IconClose } from './icons';

/**
 * Foglio che sale dal basso. Il tasto "indietro" del telefono lo chiude,
 * invece di uscire dalla pagina.
 */
export function Sheet({
  title,
  onClose,
  children,
  full,
}: {
  title?: string;
  onClose: () => void;
  children: ComponentChildren;
  full?: boolean;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let closedByBack = false;
    history.pushState({ sheet: true }, '');
    const onPop = () => {
      closedByBack = true;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      if (!closedByBack && history.state?.sheet) history.back();
    };
  }, []);

  return (
    <>
      <div class="sheet-backdrop" onClick={onClose} />
      <div class={`sheet${full ? ' full' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        {!full && <div class="sheet-grip" />}
        <div class="sheet-head">
          <strong>{title}</strong>
          <button class="icon-btn" onClick={onClose} aria-label="Chiudi">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
