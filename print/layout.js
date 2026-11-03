/*
 * Impaginatore del giornale: gira dentro Chromium prima della stampa in PDF.
 *
 * I blocchi (testatine di sezione, articoli, video, brevi) arrivano già composti nei <template>.
 * Qui vengono versati nelle colonne una pagina alla volta, misurando davvero il testo:
 * - ogni elemento che non è testo corrente (titoli, foto, didascalie, codici QR) viene portato
 *   a un numero intero di righe da 11 pt, così le righe delle colonne restano a registro;
 * - quando un articolo non entra si prova con i successivi della stessa sezione;
 * - lo spazio che resta in fondo alla pagina si riempie con le brevi;
 * - alla fine si scrivono testatine, numeri di pagina, sommario e rimandi.
 */
(async function () {
  const meta = JSON.parse(document.getElementById('meta').textContent);
  await document.fonts.ready;
  const LH = (11 * 96) / 72;
  const root = document.getElementById('pages');
  const clones = (id) => {
    const t = document.getElementById(id);
    return t ? [...t.content.cloneNode(true).children] : [];
  };
  const tpl = (id) => {
    const t = document.getElementById(id);
    return t ? [...t.content.children] : [];
  };
  let usedFill = new Set();
  const frontUsed = new Set();

  /* ── Misure ─────────────────────────────────────────────────────────── */

  const fits = (box) => box.scrollWidth <= box.clientWidth + 1 && box.scrollHeight <= box.clientHeight + 1;

  function fitRegion(region, page) {
    const pr = page.getBoundingClientRect();
    const pb = parseFloat(getComputedStyle(page).paddingBottom);
    const avail = pr.bottom - pb - region.getBoundingClientRect().top;
    region.style.height = `${Math.floor(avail / LH + 0.001) * LH}px`;
  }

  /** Porta foto e blocchi non di testo a un numero intero di righe. */
  function snap(block) {
    for (const img of block.querySelectorAll('figure img[data-ar]')) {
      const w = img.closest('figure').getBoundingClientRect().width;
      const n = Math.max(+img.dataset.min || 4, Math.min(+img.dataset.max || 20, Math.round(w / +img.dataset.ar / LH)));
      img.style.height = `${n * LH}px`;
    }
    const els = [...block.querySelectorAll('.snap')];
    if (block.classList.contains('snap')) els.unshift(block);
    // Dall'interno verso l'esterno: prima le didascalie, poi i gruppi che le contengono.
    for (const el of els.reverse()) {
      if (el.dataset.pb === undefined) el.dataset.pb = parseFloat(getComputedStyle(el).paddingBottom) || 0;
      el.style.paddingBottom = `${el.dataset.pb}px`;
      const h = el.getBoundingClientRect().height;
      const target = Math.ceil(h / LH - 0.02) * LH;
      el.style.paddingBottom = `${+el.dataset.pb + Math.max(0, target - h)}px`;
    }
  }

  function tryAppend(region, block) {
    region.append(block);
    snap(block);
    if (fits(region)) return true;
    block.remove();
    return false;
  }

  /* ── Pagine ─────────────────────────────────────────────────────────── */

  let pageNo = 1;
  function newPage(kind = 'inner') {
    pageNo++;
    const sec = document.createElement('section');
    sec.className = `page ${kind} ${pageNo % 2 ? 'odd' : 'even'}`;
    sec.dataset.n = pageNo;
    sec.innerHTML = `<header class="rh"></header>${kind === 'inner' ? '<div class="region"></div>' : '<div class="body"></div>'}`;
    root.append(sec);
    const region = sec.querySelector('.region');
    if (region) fitRegion(region, sec);
    return { sec, region, body: sec.querySelector('.body') };
  }

  function briefLabel() {
    const p = document.createElement('p');
    p.className = 'brl';
    p.textContent = 'In breve';
    return p;
  }

  /** Riempie il fondo della pagina con le brevi, prima quelle della stessa sezione. */
  let fillPool = [];
  function fillBriefs(region, group) {
    const pool = fillPool.filter((b) => !usedFill.has(b.dataset.id));
    pool.sort((a, b) => (b.dataset.group === group) - (a.dataset.group === group));
    let label = null;
    let misses = 0;
    for (const b of pool) {
      if (misses > 14) break;
      if (!label) {
        label = briefLabel();
        if (!tryAppend(region, label)) return;
      }
      if (tryAppend(region, b)) {
        usedFill.add(b.dataset.id);
        misses = 0;
      } else misses++;
    }
    if (label && region.lastElementChild === label) label.remove();
  }

  /** Niente filetto sopra un pezzo che apre una colonna. */
  function markColumnStarts(region) {
    const kids = [...region.children];
    kids.forEach((el, i) => {
      el.classList.remove('colstart');
      if (!i) return;
      const prev = kids[i - 1].getClientRects();
      const last = prev[prev.length - 1];
      const first = el.getClientRects()[0];
      if (last && first && (Math.abs(first.left - last.left) > 2 || first.top < last.top)) el.classList.add('colstart');
    });
  }

  /* ── Prima pagina ───────────────────────────────────────────────────── */

  const front = root.querySelector('.page.front');
  const fmain = front.querySelector('#front-main');
  fitRegion(fmain, front);
  const lead = tpl('t-front-lead')[0];
  if (lead) {
    fmain.append(lead);
    snap(lead);
    // Se l'apertura non entra, si accorcia: prima il secondo paragrafo, poi la foto.
    for (const sel of ['.txt p + p', '.dek', 'figure']) {
      if (fits(fmain)) break;
      lead.querySelector(sel)?.remove();
      snap(lead);
    }
  }
  for (const t of tpl('t-teasers')) tryAppend(fmain, t);
  fillPool = clones('t-fill');
  fillBriefs(fmain, '');
  markColumnStarts(fmain);
  // Colonna laterale: sotto i riquadri, le brevi, come nella prima pagina dei quotidiani.
  const side = front.querySelector('.side');
  if (side && fits(side)) {
    const lab = briefLabel();
    side.append(lab);
    let misses = 0;
    for (const b of fillPool) {
      if (usedFill.has(b.dataset.id) || misses > 10) continue;
      side.append(b);
      if (fits(side)) usedFill.add(b.dataset.id);
      else {
        b.remove();
        misses++;
      }
    }
    if (side.lastElementChild === lab || !fits(side)) lab.remove();
  }
  usedFill.forEach((id) => frontUsed.add(id));

  /* ── Pagine interne ─────────────────────────────────────────────────── */

  const empty = (region) => !region.children.length;

  /** Versa il flusso nelle pagine; restituisce quanti blocchi sono rimasti fuori. */
  function flowPages() {
    for (const p of root.querySelectorAll('.page.inner')) p.remove();
    pageNo = 1;
    usedFill = new Set(frontUsed);
    fillPool = clones('t-fill');
    const flow = clones('t-flow');
    let page = newPage();
    let inner = 1;
    let i = 0;
    while (i < flow.length) {
      const b = flow[i];
      const isSect = b.classList.contains('sect');
      const group = b.dataset.group;
      // Una testatina di sezione non resta mai da sola in fondo alla pagina.
      const unit = isSect && flow[i + 1] ? [b, flow[i + 1]] : [b];
      const wasEmpty = empty(page.region);
      unit.forEach((x) => page.region.append(x));
      unit.forEach(snap);
      if (fits(page.region) || wasEmpty) {
        i += unit.length;
        continue;
      }
      unit.forEach((x) => x.remove());
      // Prova con i pezzi successivi della stessa sezione, che possono essere più corti.
      if (!isSect) {
        for (let j = i + 1, tried = 0; j < flow.length && tried < 4; j++) {
          const c = flow[j];
          if (c.classList.contains('sect') || c.dataset.group !== group) break;
          tried++;
          if (tryAppend(page.region, c)) {
            flow.splice(j, 1);
            j--;
          }
        }
      }
      fillBriefs(page.region, group);
      markColumnStarts(page.region);
      if (inner >= meta.maxInner) break;
      page = newPage();
      inner++;
    }
    if (i >= flow.length) {
      fillBriefs(page.region, flow[flow.length - 1]?.dataset.group ?? '');
      markColumnStarts(page.region);
    }
    if (!page.region.children.length) {
      page.sec.remove();
      pageNo--;
    }
    return flow.slice(i).filter((b) => b.classList.contains('st')).length + (i < flow.length ? 1 : 0);
  }

  /**
   * Se il giornale non ci sta nelle pagine, fa il caporedattore: toglie i pezzi meno importanti
   * dalle sezioni più lunghe (mai l'apertura), li trasforma in brevi e ricompone.
   */
  const flowT = document.getElementById('t-flow').content;
  const fillT = document.getElementById('t-fill').content;
  const briefsT = document.getElementById('t-briefs')?.content;
  function trim(n) {
    for (let k = 0; k < n; k++) {
      const counts = {};
      for (const st of flowT.querySelectorAll('.st:not(.lead)')) counts[st.dataset.group] = (counts[st.dataset.group] || 0) + 1;
      const g = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (!g) return;
      const last = [...flowT.querySelectorAll(`.st:not(.lead)[data-group="${g[0]}"]`)].pop();
      const brief = briefsT?.querySelector(`[data-id="${last.dataset.id}"]`);
      if (brief) fillT.prepend(brief);
      last.remove();
    }
  }
  let unplaced = flowPages();
  for (let attempt = 0; unplaced > 0 && attempt < 10; attempt++) {
    trim(unplaced + 1);
    unplaced = flowPages();
  }

  /**
   * Ultima pagina quasi vuota: si stringe il giornale di una pagina (con qualche breve in meno).
   * Se invece è piena per più di metà, le colonne si pareggiano, come in chiusura di un fascicolo.
   */
  const used = (region) => {
    const top = region.getBoundingClientRect().top;
    let bottom = top;
    for (const el of region.children) for (const r of el.getClientRects()) bottom = Math.max(bottom, r.bottom);
    return (bottom - top) / region.clientHeight;
  };
  const lastRegion = () => [...root.querySelectorAll('.page.inner .region')].pop();
  const balanced = (region) => {
    region.style.columnFill = 'balance';
    const r = used(region);
    region.style.columnFill = '';
    return r;
  };
  const innerCount = () => root.querySelectorAll('.page.inner').length;
  if (lastRegion() && innerCount() > 1 && balanced(lastRegion()) < 0.5) {
    meta.maxInner = innerCount() - 1;
    unplaced = flowPages();
    for (let attempt = 0; unplaced > 0 && attempt < 12; attempt++) {
      trim(unplaced + 1);
      unplaced = flowPages();
    }
  }
  const last = lastRegion();
  if (last && balanced(last) < 0.9) {
    last.style.columnFill = 'balance';
    markColumnStarts(last);
  }

  /* ── Tempo libero ───────────────────────────────────────────────────── */

  const games = document.getElementById('t-games');
  if (games) {
    const g = newPage('games-page');
    g.body.append(games.content.cloneNode(true));
    const colophon = document.getElementById('t-colophon');
    if (colophon) g.sec.append(colophon.content.cloneNode(true));
    const box = g.body.querySelector('.games');
    snap(g.body);
    // Se la pagina trabocca si toglie qualcosa, dal meno importante.
    // Prima si accorcia (versi, righe per scrivere, domande), poi si toglie.
    const drops = [
      '.quiz li:nth-child(5)',
      '.poem .gcap',
      ...Array(6).fill('.poem .v:nth-child(n+9):last-child'),
      ...Array(3).fill('.ask .lines i:nth-child(n+6):last-child'),
      '.quiz li:nth-child(4)',
      '.g.comic',
      '.g.poem',
    ];
    for (const sel of drops) {
      if (fits(box)) break;
      g.body.querySelector(sel)?.remove();
    }
    // Le soluzioni del quiz seguono le domande rimaste.
    const left = g.body.querySelectorAll('.quiz li').length;
    for (const a of g.body.querySelectorAll('.sol .qa')) if (+a.dataset.q > left) a.remove();
  }

  /* ── Testatine, sommario e rimandi ──────────────────────────────────── */

  const pagesEls = [...root.querySelectorAll('.page')];
  const pageOf = (sel) => {
    const el = root.querySelector(sel);
    return el ? +el.closest('.page').dataset.n || 1 : null;
  };
  for (const p of pagesEls.slice(1)) {
    const groups = [];
    for (const el of p.querySelectorAll('.sect, .st')) {
      const g = meta.groups[el.dataset.group];
      if (g && !groups.includes(g)) groups.push(g);
    }
    const title = groups.slice(0, 2).join(' · ') || 'In breve';
    const n = p.dataset.n;
    const left = `<span class="pn">${n}</span><span>Boomscroll</span>`;
    const right = `<span>${meta.date}</span>`;
    p.querySelector('.rh').innerHTML =
      +n % 2 === 0
        ? `<span class="l">${left}</span><span class="sx">${title}</span><span class="r">${right}</span>`
        : `<span class="l">${right}</span><span class="sx">${title}</span><span class="r"><span>Boomscroll</span><span class="pn">${n}</span></span>`;
  }
  for (const el of root.querySelectorAll('[data-page]')) {
    const n = pageOf(`[data-id="${el.dataset.page}"]`);
    if (n) el.textContent = n;
    else el.closest('.ref, .qp')?.remove();
  }
  for (const el of root.querySelectorAll('[data-sect-page]')) {
    const n = pageOf(`.sect[data-sect="${el.dataset.sectPage}"]`);
    if (n) el.textContent = n;
    else el.closest('li')?.remove();
  }
  while (side && !fits(side) && side.lastElementChild) side.lastElementChild.remove();

  await Promise.all([...document.images].map((im) => im.decode().catch(() => undefined)));
  window.__layout = { pages: root.querySelectorAll('.page').length, unplaced };
})().catch((e) => {
  window.__layout = { error: String(e && e.stack ? e.stack : e) };
});
