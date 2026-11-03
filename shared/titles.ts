/**
 * Ripara i titoli tradotti dai modelli piccoli, che a volte lasciano attaccati pezzi della loro
 * risposta: `Titolo”, 2023`, `Titolo”, “kind”: “article”…`, `Titolo”, (o titolo originale), 2-3 frasi…`.
 * Una virgoletta di chiusura seguita da una virgola, senza una virgoletta aperta prima, è un avanzo:
 * si taglia lì. Se resta comunque qualcosa del formato JSON, il titolo non è utilizzabile.
 */
export function repairTitle(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let t = raw.trim();
  const m = t.match(/[”"]\s*,/);
  if (m && m.index !== undefined) {
    const before = t.slice(0, m.index);
    const straight = (before.match(/"/g) ?? []).length;
    const curlyOpen = (before.match(/“/g) ?? []).length - (before.match(/”/g) ?? []).length;
    if (straight % 2 === 0 && curlyOpen <= 0) t = before.trim();
  }
  t = t.replace(/^["“]([^"“”]+)["”]$/, '$1').replace(/[\s,;:]+$/, '');
  if (!t || /[“"«]?\b(kind|lang|source|text|summary|title_it)[”"»]?\s*:|titolo originale|frasi in italiano/i.test(t)) return undefined;
  return t;
}
