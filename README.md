# Boomscroll

**Un feed che finisce.** Un'app personale che sostituisce i social: tre edizioni al giorno (mattina, pomeriggio e sera) di contenuti di qualità (notizie, scienza, natura, tech, arte, design, storia, libri, film e musica, filosofia, lingue, poesia, antropologia, psicologia, produttività, lezioni universitarie, curiosità, giochi), più esercizi per crescere e idee per uscire di casa.

**Un cavallo di Troia.** Si usa come un social network, ma non lo è:

| Sembra… | …invece è |
|---|---|
| Account da seguire, con foto profilo, bio e badge di verifica | Quasi 200 fonti affidabili (riviste, università, musei, canali YouTube di divulgazione) |
| Storie in cima al feed | Il meglio dell'edizione per categoria e dagli account che segui, poi finiscono |
| Schede *Per te* e *Seguiti* | L'edizione scelta per i tuoi gusti, e i contenuti delle fonti che segui, fino a “Sei in pari” |
| Commenti | Note private: le vedi solo tu, e il contenuto finisce nei salvati |
| Notifiche con il pallino rosso | Avvisi calcolati sul telefono (edizione nuova, parole da ripassare, sfida del giorno), mai push |
| Esplora con griglia, ricerca e #hashtag | Le edizioni degli ultimi tre giorni, per categoria e argomento |
| Doppio tocco per mettere mi piace, video che partono da soli | Segnali per i gusti; i video partono senza audio e si possono disattivare |
| Clip brevi in verticale, una dopo l'altra (come Reels e Shorts) | Solo da canali di divulgazione scelti; 8 di fila al massimo, poi una pausa attiva; 3 giri al giorno, poi finiscono |
| Post interattivi tra un contenuto e l'altro | Respiro guidato, quiz lampo su ciò che hai appena letto, “Questo o quello?”, “Indovina l'anno” di un'opera, check-in dell'umore, pause per occhi e collo, ripasso delle parole |

- Feed a schermo intero (stile TikTok) o a lista (stile Instagram)
- L'edizione ha una fine; dopo ci sono solo approfondimenti, con pause
- Impara solo da *mi piace*, *non mi piace*, *salva*, *segui* e “meno di…”, mai dal tempo passato su un contenuto
- Contenuti in qualsiasi lingua, con riassunto in italiano e traduzione per le lingue più difficili
- Installabile come app (PWA), funziona offline, nessun account, nessun tracciamento
- Ogni edizione è anche **un giornale da stampare**: PDF A4 impaginato come un quotidiano di una volta

## Come funziona

```
GitHub Actions, 3 volte al giorno               GitHub Pages
┌─────────────────────────────────┐            ┌──────────────────────────────┐
│ pipeline/ 113 fonti, 88 YouTube │  commit →  │ PWA statica (Preact)          │
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
3. **Un modello open source sul runner di Actions** (Gemma 3 4B via Ollama): nessuna chiave, nessuna registrazione. Più lento (circa 100 minuti per un centinaio di contenuti), qualità discreta. Riassume prima le lingue difficili, poi le altre lingue straniere, per ultimi i contenuti in italiano (che restano leggibili anche senza).

Se nessuno risponde, l'edizione esce lo stesso con gli estratti delle fonti.

## Il giornale da stampare

Ogni edizione diventa un PDF A4 impaginato come un quotidiano (`print/`, `npm run giornale`). Si scarica dalla scheda *Fine dell'edizione* e dall'archivio.

- **Gabbia:** quattro colonne con filetti e griglia di base a 11 punti. Titoli, foto, didascalie e codici QR occupano sempre un numero intero di righe, così le righe delle colonne vicine stanno alla stessa altezza.
- **Caratteri:** Source Serif 4 di Adobe nel taglio ottico per il corpo piccolo, con maiuscoletto vero e cifre old style. Didascalie nel taglio *Caption*, titoli in Playfair Display, testata in gotico (UnifrakturMaguntia). Tutti liberi (OFL) e incorporati nel PDF come TrueType.
- **Composizione:**
  - testo giustificato con sillabazione italiana e inglese (pattern di Liang, almeno 2 lettere prima e 3 dopo il taglio);
  - caporali «», apostrofi e lineette tipografici, spazi indivisibili dopo le parole di una lettera e tra numero e unità;
  - capolettera nelle aperture, titoli bilanciati, niente righe orfane o vedove;
  - i titoli tradotti "all'inglese" (Ogni Parola Maiuscola) tornano in italiano corrente, con la maiuscola solo ai nomi propri.
- **Struttura:**
  - prima pagina con testata, orecchie (il tempo a L'Aquila), apertura, rimandi alle pagine interne, sommario e brevi;
  - sezioni con testatine, testatine di pagina pari/dispari e brevi a chiudere le colonne;
  - *Da guardare*: i video con codice QR;
  - *Tempo libero*: problema di scacchi su diagramma, quiz con rimando alla pagina, poesia, domanda del giorno con le righe per scrivere, vignetta, soluzioni capovolte e gerenza.
- **Impaginazione:** la fa Chromium misurando il testo vero (`print/layout.js`). Se le pagine non bastano, toglie i pezzi meno importanti delle sezioni più lunghe, li trasforma in brevi e ricompone. Non lascia pagine quasi vuote.
- **Foto:** in scala di grigi con il contrasto per la stampa, circa 300 dpi su una colonna. I codici QR hanno moduli di almeno 0,4 mm.

I PDF delle ultime 9 edizioni si creano durante la pubblicazione del sito, con una cache (non finiscono nel repository). Per provarli in locale: `npm run build && npm run giornale -- --editions=1` (il PDF è in `dist/stampa/`).

## Edizioni

Tre al giorno, ognuna solo con contenuti nuovi rispetto alle precedenti:

| Edizione | Avvio (ora italiana, legale / solare) | Pronta circa |
|---|---|---|
| Mattina | 04:37 / 03:37 | 06:30 |
| Pomeriggio | 11:07 / 10:07 | 13:00 |
| Sera | 17:07 / 16:07 | 19:00 |

Con una chiave Gemini sono pronte in pochi minuti invece che in due ore. Gli orari sono in `.github/workflows/daily.yml` (in UTC).

**Aggiornare a mano:**
- nell'app, il pulsante ↻ in alto in *Home* (o un tocco su *Per te* quando è già selezionato) controlla se è uscita una nuova edizione (lo fa anche da solo quando riapri l'app);
- per *crearne* una nuova: GitHub → *Actions → Edizione quotidiana → Run workflow*, oppure dall'app in *Profilo → Impostazioni → Edizioni → Crea un'edizione adesso* (serve un token GitHub personale con permesso *Actions: Read and write* solo su questo repository; resta salvato sul telefono).

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
rss('nome', 'Nome leggibile', 'https://…/feed', 'scienza', 'en', 0.85, 2, 3, 'Bio dell’account in una riga'),
```

Gli argomenti sono: id, nome, feed, categoria, lingua, qualità (da 0,85 in su ha il badge di verifica), massimo per edizione, età massima in giorni, bio. La fonte diventa subito un account con il suo profilo. Al push la pipeline rigenera l'edizione e in *Profilo → Impostazioni → Fonti dell'ultima edizione* vedi se la fonte funziona.

### Video e clip

Un canale YouTube è una riga in `YOUTUBE` (`pipeline/sources.ts`): `yt('id', 'Nome', 'UC…', 'scienza', { about: '…' })`. Con `shorts: true` la pipeline raccoglie anche le sue clip brevi (dalla playlist delle Shorts del canale, due al massimo per canale e per edizione, senza clip promozionali). Le clip non entrano nel feed: hanno la sezione **Clip**, con il limite che scegli in *Profilo → Impostazioni → Clip* (clip per giro e giri al giorno). Ogni edizione ha fino a 30 video e 36 clip.

### Aggiungere una città con eventi locali

In `pipeline/sources.ts` aggiungi la città a `CITIES` e le sue fonti a `LOCAL_SOURCES` con `city: '<id>'`. Per qualunque altra città, "Vicino a te" (in cima a Esplora) mostra comunque meteo, luoghi da OpenStreetMap e curiosità da Wikipedia.

## Privacy

Le reazioni, i gusti, gli account seguiti, le note, i salvati, il diario, le abitudini e le risposte al check-in dell’umore restano nel browser (IndexedDB). Le foto profilo degli account sono le icone dei siti, chieste al servizio di favicon di Google. Video e clip si guardano con il player senza cookie di YouTube (youtube-nocookie.com). Da *Profilo → Impostazioni → I tuoi dati* puoi esportarli, importarli o cancellarli. La posizione, se la usi, serve solo sul telefono per cercare luoghi vicini.

Ogni contenuto mostra un riassunto e un breve estratto, con il link alla fonte originale.
