/**
 * Pipeline quotidiana di Boomscroll.
 *   npm run pipeline                 → edizione di oggi
 *   npm run pipeline -- --dry        → non scrive nulla
 *   npm run pipeline -- --only=quanta,met   → solo alcune fonti (con --dry per provarle)
 *   BOOMSCROLL_NO_AI=1               → senza riassunti dell'IA
 */
import { SLOTS, SLOT_LABEL, type Edition, type Item, type Slot, type SourceReport } from '../shared/types';
import { enrich } from './enrich';
import { illustrate } from './images';
import { fetchSource, type FetchContext, type RawItem } from './fetchers';
import { summarize } from './llm';
import { buildItem, dedupe, finalize, preselect } from './select';
import { CITIES, LOCAL_SOURCES, SOURCES, YOUTUBE, type SourceDef } from './sources';
import { readIndex, recentIds, writeEdition } from './store';
import { mapLimit, romeDate, seeded } from './util';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');

/** Fascia dell'edizione: dal workflow (BOOMSCROLL_SLOT) oppure dall'ora di Roma. */
function currentSlot(now: Date): Slot {
  const env = process.env.BOOMSCROLL_SLOT as Slot | undefined;
  if (env && SLOTS.includes(env)) return env;
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false }).format(now));
  return hour < 10 ? 'mattina' : hour < 16 ? 'pomeriggio' : 'sera';
}

async function main() {
  const now = new Date();
  const date = romeDate(now);
  const slot = currentSlot(now);
  const id = `${date}-${slot}`;
  const index = await readIndex();
  const seen = await recentIds(index, id);
  const ctx: FetchContext = { date, now, rng: seeded(id), seen };
  console.log(`📰 Boomscroll · edizione ${SLOT_LABEL[slot]} del ${date} · ${seen.size} contenuti già visti nelle ultime edizioni`);

  const all: SourceDef[] = [...SOURCES, ...YOUTUBE, ...LOCAL_SOURCES].filter((s) => !only || only.includes(s.id));
  const reports: SourceReport[] = [];
  const fetched = await mapLimit(all, 8, async (src) => {
    try {
      const items = await fetchSource(src, ctx);
      reports.push({ id: src.id, name: src.name, ok: true, count: items.length });
      console.log(`  ✅ ${src.id.padEnd(20)} ${items.length}`);
      return items;
    } catch (e) {
      const error = (e as Error).name === 'AbortError' ? 'timeout' : (e as Error).message.slice(0, 160);
      reports.push({ id: src.id, name: src.name, ok: false, count: 0, error });
      console.log(`  ❌ ${src.id.padEnd(20)} ${error}`);
      return [] as RawItem[];
    }
  });

  const raw = fetched.flat();
  const global = preselect(dedupe(raw.filter((r) => !r.source.city)), now);
  const local = dedupe(raw.filter((r) => r.source.city));
  console.log(`🔎 ${raw.length} candidati → ${global.length} generali + ${local.length} locali`);

  await enrich([...global, ...local]);
  const ai = await summarize([...global, ...local]);
  console.log(`🤖 IA: ${ai.results.size} riassunti, ${ai.calls} chiamate, ${ai.failures} errori (${ai.model ?? 'nessun modello'})`);

  const items = finalize(global.map((r) => buildItem(r, ai.results.get(r), now)));
  const localByCity: Record<string, Item[]> = {};
  for (const city of CITIES) {
    localByCity[city.id] = local.filter((r) => r.source.city === city.id).map((r) => buildItem(r, ai.results.get(r), now));
  }
  const illustrated = await illustrate([...items, ...Object.values(localByCity).flat()]);
  console.log(`🖼️  ${items.filter((i) => i.image).length}/${items.length} con immagine (${illustrated} illustrative da Wikipedia), ${items.filter((i) => i.kind === 'video').length} video`);

  const edition: Edition = {
    id,
    slot,
    date,
    generatedAt: now.toISOString(),
    items,
    local: localByCity,
    sources: reports.sort((a, b) => a.id.localeCompare(b.id)),
    ai: { model: ai.model, calls: ai.calls, failures: ai.failures },
  };

  const byCat = items.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.category]: (acc[i.category] ?? 0) + 1 }), {});
  console.log(`📦 ${items.length} contenuti:`, byCat);
  const failed = reports.filter((r) => !r.ok);
  if (failed.length) console.log(`⚠️  ${failed.length} fonti non raggiungibili: ${failed.map((f) => f.id).join(', ')}`);

  if (dry) {
    console.log(JSON.stringify(items.slice(0, 3), null, 2));
    return;
  }
  if (items.length < 10) {
    console.error('❌ Troppo pochi contenuti: edizione non pubblicata.');
    process.exit(1);
  }
  await writeEdition(edition, index);
  console.log(`✅ Scritta public/data/editions/${id}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
