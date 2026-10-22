# Boomscroll

**Un feed che finisce.** Un'app personale che sostituisce i social: tre edizioni al giorno (mattina, pomeriggio e sera) di contenuti di qualità (notizie, scienza, tech, arte, design, lingue, poesia, antropologia, psicologia, produttività, lezioni universitarie, curiosità, giochi), più esercizi per crescere e idee per uscire di casa.

- Feed a schermo intero (stile TikTok) o a lista (stile Twitter)
- L'edizione ha una fine; dopo ci sono solo approfondimenti, con pause
- Impara solo da *mi piace*, *non mi piace*, *salva* e “meno di…”, mai dal tempo passato su un contenuto
- Contenuti in qualsiasi lingua, con riassunto in italiano e traduzione per le lingue più difficili
- Installabile come app (PWA), funziona offline, nessun account, nessun tracciamento

## Come funziona

```
GitHub Actions, 3 volte al giorno               GitHub Pages
┌─────────────────────────────────┐            ┌──────────────────────────────┐
│ pipeline/ ~110 fonti, 39 YouTube│  commit →  │ PWA statica (Preact)          │
│ → doppioni → riassunti con IA   │            │ ordina l'edizione sul telefono│
│ → public/data/editions/*.json   │            │ gusti e salvati in IndexedDB  │
└─────────────────────────────────┘            └──────────────────────────────┘
```

- **`pipeline/`**: raccoglie, filtra, riassume e salva l'edizione del giorno (`npm run pipeline`). Le fonti sono in `pipeline/sources.ts`.
- **`src/`**: l'app. Il motore dei gusti è in `src/lib/ranking.ts`.
- **`public/data/`**: le edizioni (l'archivio), generate dalla pipeline.

### Riassunti automatici, gratis

La pipeline usa il primo servizio disponibile:

1. **Google Gemini** se c'è il secret `GEMINI_API_KEY`: piano gratuito, riassunti migliori e più veloci (consigliato).
2. **Groq** se c'è il secret `GROQ_API_KEY` (piano gratuito).
3. **Un modello open source sul runner di Actions** (Gemma 3 4B via Ollama): nessuna chiave, nessuna registrazione. Più lento (~40 minuti), qualità discreta.

Se nessuno risponde, l'edizione esce lo stesso con gli estratti delle fonti.

## Edizioni

Tre al giorno, ognuna solo con contenuti nuovi rispetto alle precedenti:

| Edizione | Avvio (ora italiana, legale / solare) | Pronta circa |
|---|---|---|
| Mattina | 05:07 / 04:07 | 06:30 |
| Pomeriggio | 11:37 / 10:37 | 13:00 |
| Sera | 17:37 / 16:37 | 19:00 |

Con una chiave Gemini sono pronte in pochi minuti invece che in un'ora e mezza. Gli orari sono in `.github/workflows/daily.yml` (in UTC).

**Aggiornare a mano:**
- nell'app, il pulsante ↻ in alto in *Oggi* controlla se è uscita una nuova edizione (lo fa anche da solo quando riapri l'app);
- per *crearne* una nuova: GitHub → *Actions → Edizione quotidiana → Run workflow*, oppure dall'app in *Tu → Edizioni → Crea un'edizione adesso* (serve un token GitHub personale con permesso *Actions: Read and write* solo su questo repository; resta salvato sul telefono).

## Pubblicazione

1. **Una volta sola:** *Settings → Pages → Build and deployment → Source: **GitHub Actions*** (non "Deploy from a branch", che pubblicherebbe i file sorgente non compilati).
2. Ogni push su `main` e ogni edizione quotidiana ripubblicano il sito su `https://gitommydotcom.github.io/boomscroll/`.
3. Sul telefono apri il sito, poi *Condividi → Aggiungi a schermata Home* (iPhone) o *Installa app* (Android).

### Secret facoltativi (*Settings → Secrets and variables → Actions*)

| Nome | A cosa serve | Dove si prende |
|---|---|---|
| `GEMINI_API_KEY` | Riassunti migliori e più rapidi | [aistudio.google.com](https://aistudio.google.com/apikey), gratuito |
| `GROQ_API_KEY` | Alternativa a Gemini | [console.groq.com](https://console.groq.com), gratuito |
| `NASA_API_KEY` | Foto astronomica del giorno senza limiti | [api.nasa.gov](https://api.nasa.gov), gratuito |

## Sviluppo

```bash
npm install
npm run dev            # app su http://localhost:5173/boomscroll/
npm test               # test di pipeline e motore dei gusti
npm run pipeline -- --dry --only=quanta,xkcd   # prova alcune fonti senza scrivere
BOOMSCROLL_NO_AI=1 npm run pipeline            # edizione senza riassunti
```

### Aggiungere una fonte

Una riga in `pipeline/sources.ts`:

```ts
{ id: 'nome', name: 'Nome leggibile', type: 'rss', url: 'https://…/feed', category: 'scienza', lang: 'en', quality: 0.85, max: 2, maxAgeDays: 3 },
```

Al push la pipeline rigenera l'edizione e in *Tu → Fonti dell'ultima edizione* vedi se la fonte funziona.

### Aggiungere una città con eventi locali

In `pipeline/sources.ts` aggiungi la città a `CITIES` e le sue fonti a `LOCAL_SOURCES` con `city: '<id>'`. Per qualunque altra città, "Vicino a te" mostra comunque meteo, luoghi da OpenStreetMap e curiosità da Wikipedia.

## Privacy

Le reazioni, i gusti, i salvati, il diario e le abitudini restano nel browser (IndexedDB). Da *Tu → I tuoi dati* puoi esportarli, importarli o cancellarli. La posizione, se la usi, serve solo sul telefono per cercare luoghi vicini.

Ogni contenuto mostra un riassunto e un breve estratto, con il link alla fonte originale.
