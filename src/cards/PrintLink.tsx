import { useEffect, useState } from 'preact/hooks';
import { fetchPrints, printUrl, type PrintEntry } from '../lib/data';
import { Icon } from '../ui/icons';

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

/** Link al PDF dell'edizione, impaginato come un quotidiano: compare solo se il giornale esiste. */
export function PrintLink({ id, block }: { id: string; block?: boolean }) {
  const [entry, setEntry] = useState<PrintEntry | null>(null);
  useEffect(() => {
    fetchPrints().then((m) => setEntry(m.get(id) ?? null));
  }, [id]);
  if (!entry) return null;
  return (
    <a class={`btn ghost print-link${block ? ' block' : ''}`} href={printUrl(entry)} download={`Boomscroll ${id}.pdf`} target="_blank" rel="noopener">
      <Icon name="newspaper" size={18} />
      <span>
        Il giornale da stampare
        <span class="print-meta">
          {entry.pages} pagine A4 · {mb(entry.bytes)}
        </span>
      </span>
    </a>
  );
}
