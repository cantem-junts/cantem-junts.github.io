// SPDX-License-Identifier: AGPL-3.0-or-later
// Cantem junts: llista i cercador, vista de cada cançó amb canvi de to,
// celebracions i editor.

import {
  llegeixChordPro, transposaEtiqueta, toDeLaCanco, usaBemolls, nomDelTo, lletraNeta,
  acordsASobreAChordPro, tensAcordsASobre, posaAcord, acordsBasics, posicioFont, canviaNegretaSillaba, canviaTornada, posaNota, treuNota, LLATI,
} from './acords.js';
import { esLocal, potEditar, desaFitxer, esborraFitxer, usuari, iniciaSessio, completaRetorn, tancaSessio } from './desament.js';
import { t, llengua, canviaLlengua, altraLlengua, traduixEstatics } from './llengua.js';

const $app = document.getElementById('app');
const col = new Intl.Collator('ca');

/* --- Preferències del dispositiu --- */
const pref = {
  get(nom, perDefecte) {
    try { const v = localStorage.getItem('cantem.' + nom); return v === null ? perDefecte : v; } catch (e) { return perDefecte; }
  },
  set(nom, valor) {
    try {
      if (valor === null) localStorage.removeItem('cantem.' + nom);
      else localStorage.setItem('cantem.' + nom, String(valor));
    } catch (e) { /* res */ }
  },
};
const opcions = {
  notacio: pref.get('notacio', 'llati'),
  mida: Number(pref.get('mida', '1')),
  acords: pref.get('acords', '1') === '1',
};
document.documentElement.style.setProperty('--mida', opcions.mida);

/* --- Dades --- */
let dades = { cancons: [], celebracions: [], generat: 0 };
const PENDENTS = 'pendents';

// Els canvis desats a GitHub tarden un minut a arribar a la web publicada:
// mentrestant es mostren els guardats en aquest navegador.
function pendents() {
  try { return JSON.parse(pref.get(PENDENTS, '{}')); } catch (e) { return {}; }
}
function apuntaPendent(ruta, font) {
  const p = pendents();
  p[ruta] = { font, quan: Date.now() };
  pref.set(PENDENTS, JSON.stringify(p));
}

function entradaDe(slug, font) {
  const c = llegeixChordPro(font);
  return { slug, titol: c.titol || slug, subtitol: c.subtitol, etiquetes: c.etiquetes, font };
}

function aplicaCanvi(ruta, font) {
  const [carpeta, fitxer] = ruta.split('/');
  const llista = carpeta === 'cancons' ? dades.cancons : dades.celebracions;
  const slug = fitxer.replace(/\.cho$/, '');
  const i = llista.findIndex((x) => x.slug === slug);
  if (font === null) { if (i > -1) llista.splice(i, 1); }
  else if (i > -1) llista[i] = entradaDe(slug, font);
  else llista.push(entradaDe(slug, font));
  llista.sort((a, b) => col.compare(a.titol, b.titol));
  prepara();
}

function prepara() {
  for (const c of dades.cancons) {
    c.lletra = lletraNeta(c.font);
    c.cerca = normalitza(c.titol + ' ' + (c.subtitol || '') + '\n' + c.lletra);
    c.titolNorm = normalitza(c.titol);
  }
}

async function carregaDades() {
  const r = await fetch('dades/index.json', { cache: 'no-cache' });
  dades = await r.json();
  dades.generat = dades.generat || 0;
  const p = pendents();
  let canviat = false;
  for (const [ruta, { font, quan }] of Object.entries(p)) {
    if (quan > dades.generat) aplicaCanvi(ruta, font);
    else { delete p[ruta]; canviat = true; }
  }
  if (canviat) pref.set(PENDENTS, JSON.stringify(p));
  prepara();
}

/* --- Utilitats --- */
function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function normalitza(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/l[·.•]l/g, 'll').replace(/[’']/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/[ \t]+/g, ' ');
}
function slugDe(titol) {
  return normalitza(titol).trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'canco';
}
function avis(text, ms = 2600) {
  const el = document.getElementById('avis');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(avis.t);
  avis.t = setTimeout(() => { el.hidden = true; }, ms);
}
const cancoPerSlug = (s) => dades.cancons.find((c) => c.slug === s);
const celebracioPerSlug = (s) => dades.celebracions.find((c) => c.slug === s);

traduixEstatics();

/* --- Tema --- */
const sistemaFosc = matchMedia('(prefers-color-scheme: dark)');
function aplicaTema(fosc, triat) {
  document.documentElement.dataset.theme = fosc ? 'dark' : 'light';
  if (triat) pref.set('tema', fosc === sistemaFosc.matches ? null : (fosc ? 'fosc' : 'clar'));
  const b = document.getElementById('btn-tema');
  b.querySelector('use').setAttribute('href', fosc ? '#i-sun' : '#i-moon');
  b.title = fosc ? t('Passa al tema clar') : t('Passa al tema fosc');
}
document.getElementById('btn-tema').addEventListener('click', () => aplicaTema(document.documentElement.dataset.theme !== 'dark', true));
sistemaFosc.addEventListener('change', (e) => { if (pref.get('tema', null) === null) aplicaTema(e.matches, false); });
aplicaTema(document.documentElement.dataset.theme === 'dark', false);

// Al mòbil no hi ha ratolí: mantenir premut un botó en mostra el rètol.
let tempsPremut = null;
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  const b = e.target.closest('[title]');
  if (!b) return;
  tempsPremut = setTimeout(() => avis(b.title), 450);
});
for (const ev of ['pointerup', 'pointercancel', 'pointermove']) document.addEventListener(ev, () => clearTimeout(tempsPremut));

/* --- Dibuix de la lletra amb acords --- */

// Agrupa els segments d'una línia en paraules, perquè un acord a mitja paraula
// no la parteixi en saltar de línia al mòbil.
function paraules(segments) {
  const out = [];
  let actual = null;
  let pos = 0;
  const nova = () => { actual = { tipus: 'paraula', frags: [] }; out.push(actual); return actual; };
  for (const s of segments) {
    let acord = s.acord;
    const negreta = !!s.negreta;
    if (s.text === '') {
      (actual || nova()).frags.push({ acord, text: '', ini: pos, negreta });
      continue;
    }
    for (const p of s.text.split(/(\s+)/)) {
      if (p === '') continue;
      if (/^\s+$/.test(p)) {
        if (acord !== null && acord !== undefined) {
          (actual || nova()).frags.push({ acord, text: '', ini: pos, negreta });
          acord = null;
        }
        out.push({ tipus: 'espai', text: p, ini: pos });
        actual = null;
      } else {
        (actual || nova()).frags.push({ acord, text: p, ini: pos, negreta });
        acord = null;
      }
      pos += p.length;
    }
  }
  return { parts: out, llargada: pos };
}

function etiquetaAcord(acord, salt, bemolls) {
  return transposaEtiqueta(acord, salt, opcions.notacio, bemolls);
}

// mode: 'vista' (per llegir) o 'edicio' (cada lletra es pot tocar).
function htmlLinia(linia, salt, bemolls, mode) {
  const teAcords = linia.segments.some((s) => s.acord !== null);
  const { parts, llargada } = paraules(linia.segments);
  const nomesAcords = teAcords && !linia.segments.some((s) => s.text.trim());
  const lletres = (text, ini, negreta) => {
    if (!text) return '\u200b';
    const html = mode === 'edicio'
      ? [...text].map((ch, k) => `<span class="c" data-i="${ini + k}">${esc(ch)}</span>`).join('')
      : esc(text);
    return negreta ? `<b>${html}</b>` : html;
  };
  let html = '';
  for (const p of parts) {
    if (p.tipus === 'espai') {
      html += mode === 'edicio' ? `<span class="t">${lletres(p.text, p.ini)}</span>` : ' ';
      continue;
    }
    html += '<span class="p">';
    for (const f of p.frags) {
      const a = f.acord !== null && f.acord !== undefined ? esc(etiquetaAcord(f.acord, salt, bemolls)) : '';
      const dataA = mode === 'edicio' && a ? ` data-i="${f.ini}"` : '';
      html += teAcords
        ? `<span class="f"><span class="a"${dataA}>${a}</span><span class="t">${lletres(f.text, f.ini, f.negreta)}</span></span>`
        : `<span class="t">${lletres(f.text, f.ini, f.negreta)}</span>`;
    }
    html += '</span>';
  }
  if (mode === 'edicio') {
    html += teAcords
      ? `<span class="f"><span class="a"></span><span class="t"><span class="fi" data-i="${llargada}" title="${t('Acord al final de la línia')}">·</span></span></span>`
      : `<span class="t"><span class="fi" data-i="${llargada}" title="${t('Acord al final de la línia')}">·</span></span>`;
  }
  const classes = ['linia', teAcords ? 'amb-acords' : '', nomesAcords && mode !== 'edicio' ? 'nomes-acords' : ''].filter(Boolean).join(' ');
  return `<p class="${classes}" data-num="${linia.num}">${html}</p>`;
}

// Dibuixa una cançó (o una celebració) llegida de ChordPro.
function htmlCanco(canco, salt, mode = 'vista', ambCants = false) {
  const to = toDeLaCanco(canco);
  const bemolls = usaBemolls(to, salt);
  let html = '';
  let estrofa = '';
  let classe = null;
  const tanca = () => { if (classe !== null) { html += `<div class="${classe}">${estrofa}</div>`; classe = null; estrofa = ''; } };
  const obre = (seccio) => {
    const cls = seccio === 'chorus' ? 'estrofa tornada' : 'estrofa';
    if (classe === cls) return;
    tanca();
    classe = cls;
  };
  const afegeix = (t) => { estrofa += t; };
  let ultimaTornada = [];
  let tornadaActual = null;
  for (const l of canco.linies) {
    if (l.tipus === 'buida') { tanca(); tornadaActual = null; continue; }
    if (l.tipus === 'cant' && ambCants) { tanca(); html += ambCants(l); continue; }
    if (l.tipus === 'tornada') {
      tanca();
      html += `<div class="estrofa tornada">${ultimaTornada.map((x) => htmlLinia(x, salt, bemolls, 'vista')).join('')}</div>`;
      continue;
    }
    if (l.tipus === 'comentari') {
      tanca();
      html += `<p class="comentari"${mode === 'edicio' ? ` data-num="${l.num}"` : ''}>${esc(l.text)}</p>`;
      continue;
    }
    if (l.tipus !== 'lletra') continue;
    obre(l.seccio);
    if (l.seccio === 'chorus') {
      if (tornadaActual === null) { tornadaActual = []; ultimaTornada = tornadaActual; }
      tornadaActual.push(l);
    } else tornadaActual = null;
    afegeix(htmlLinia(l, salt, bemolls, mode));
  }
  tanca();
  return html;
}

// Fa lloc on dos acords seguits xocarien. Es mira fila a fila de la pantalla,
// perquè depèn de l'amplada i de la mida de la lletra.
const SEPARACIO = 6;
function ajustaAcords(arrel) {
  if (!arrel) return;
  const frags = [...arrel.querySelectorAll('.amb-acords:not(.nomes-acords) .f')];
  for (const f of frags) { f.style.paddingRight = ''; f.classList.remove('fila-sense-acords'); }
  if (arrel.closest('.sense-acords') || arrel.classList.contains('sense-acords')) return;
  let anterior = null;
  for (const f of frags) {
    const a = f.firstElementChild;
    if (!a || !a.textContent) continue;
    if (anterior && anterior.f.parentElement.closest('.linia') === f.closest('.linia')) {
      const ra = anterior.a.getBoundingClientRect();
      const rb = a.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) < 2) {
        const falta = ra.right + SEPARACIO - rb.left;
        if (falta > 0) {
          anterior.f.style.paddingRight = `${falta}px`;
        }
      }
    }
    anterior = { f, a };
  }
  // Quan una línia llarga es parteix, la fila de sota que no té cap acord no
  // ha de deixar-ne l'espai.
  const files = new Map();
  for (const f of frags) {
    const clau = f.closest('.linia');
    const top = Math.round(f.getBoundingClientRect().top);
    if (!files.has(clau)) files.set(clau, new Map());
    const perTop = files.get(clau);
    if (!perTop.has(top)) perTop.set(top, []);
    perTop.get(top).push(f);
  }
  for (const perTop of files.values()) {
    if (perTop.size < 2) continue;
    for (const fila of perTop.values()) {
      if (!fila.some((f) => f.firstElementChild?.textContent)) fila.forEach((f) => f.classList.add('fila-sense-acords'));
    }
  }
}
let ajustPendent = null;
function reajusta() {
  cancelAnimationFrame(ajustPendent);
  ajustPendent = requestAnimationFrame(() => {
    document.querySelectorAll('.canco').forEach(ajustaAcords);
    triaColumnes();
  });
}
// A l'ordinador, si la cançó no cap a la pantalla, va a dues columnes.
function triaColumnes() {
  const el = document.querySelector('.canco.pot-columnes');
  if (!el) return;
  el.classList.remove('columnes');
  if (window.innerWidth < 900) return;
  const disponible = window.innerHeight - el.getBoundingClientRect().top - 24;
  if (el.scrollHeight > disponible) el.classList.add('columnes');
  ajustaAcords(el);
}
window.addEventListener('resize', reajusta);
if (document.fonts) document.fonts.ready.then(reajusta);

/* --- Faristol: la cançó a pantalla completa, per tocar ---
   La lletra es fa tan gran com permet l'amplada (la línia llarga de la cançó
   omple la columna) i es passa pàgina tocant la meitat dreta o esquerra, amb
   un pedal (teclat) o lliscant. Les pàgines són columnes CSS: cada pàgina és
   una o dues columnes i es mou amb scrollLeft. */
const FARISTOL = { min: 16, max: 36, dues: 22, base: 20, gap: 48 };
let faristol = null;

// «ambit» és la part que es mesura: tota la cançó o un sol cant de la celebració.
function midaPerAmplada(contingut, amplada, ambit = contingut) {
  // Amplada natural de cada línia a la mida base, sense partir.
  contingut.classList.add('mesura');
  contingut.style.fontSize = `${FARISTOL.base}px`;
  contingut.querySelectorAll('.moment').forEach((m) => { m.style.fontSize = ''; });
  const esq = contingut.getBoundingClientRect().left;
  const amples = [...ambit.querySelectorAll('.linia')]
    .map((l) => l.getBoundingClientRect().right - esq)
    .filter((w) => w > 0)
    .sort((a, b) => a - b);
  contingut.classList.remove('mesura');
  if (!amples.length) return FARISTOL.max;
  // Mana la línia més llarga, perquè no se'n parteixi cap; només si és molt
  // més llarga que les altres es deixa partir, perquè no ho faci tot petit.
  const llarga = amples[amples.length - 1];
  const quasi = amples[Math.floor((amples.length - 1) * 0.9)];
  const ref = llarga > quasi * 1.25 ? quasi : llarga;
  return FARISTOL.base * amplada / ref;
}

function obreFaristol() {
  const origen = document.getElementById('canco');
  if (!origen || faristol) return;
  const titol = document.querySelector('.encap-canco h1')?.textContent || '';
  const el = document.createElement('div');
  el.className = 'faristol';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', t('Faristol: {0}', titol));
  el.innerHTML = `
    <div class="faristol-capa">
      <span class="faristol-titol"></span>
      <span class="faristol-pagina" aria-live="polite"></span>
      <div class="grup" role="group" aria-label="${t('Mida de la lletra')}">
        <button class="boto" data-f="petita" title="${t('Lletra més petita')}">A−</button>
        <button class="boto valor" data-f="original" title="${t('Torna a la mida que omple la pantalla')}"></button>
        <button class="boto" data-f="gran" title="${t('Lletra més gran')}">A+</button>
      </div>
      <button class="boto" data-f="tanca" title="${t('Surt del faristol')}"><svg><use href="#i-x"/></svg></button>
    </div>
    <div class="faristol-marc">
      <div class="faristol-text canco${origen.classList.contains('sense-acords') ? ' sense-acords' : ''}">${origen.innerHTML}</div>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('amb-faristol');
  const text = el.querySelector('.faristol-text');
  const marc = el.querySelector('.faristol-marc');
  const rotolTitol = el.querySelector('.faristol-titol');
  const rotolPagina = el.querySelector('.faristol-pagina');
  // A la celebració, el títol de cada cant fa de capçalera de la pàgina.
  const moments = [...text.querySelectorAll('.moment')];
  let pagina = 0;
  let pagines = 1;
  let pas = 1;
  let escala = Number(pref.get('mida-faristol', '1'));

  const situa = () => {
    pagina = Math.max(0, Math.min(pagines - 1, pagina));
    text.scrollLeft = pagina * pas;
    rotolPagina.textContent = pagines > 1 ? `${pagina + 1}/${pagines}` : '';
    el.querySelector('[data-f="original"]').textContent = percent(escala);
    let nom = titol;
    if (moments.length) {
      const esq = text.getBoundingClientRect().left;
      let actual = moments[0];
      for (const m of moments) {
        const x = m.getBoundingClientRect().left - esq;
        if (x < pas - FARISTOL.gap / 2) actual = m; else break;
      }
      const tipus = actual.querySelector('.tipus-moment')?.textContent;
      const nomCant = actual.querySelector('h2')?.textContent || '';
      nom = tipus ? `${tipus} · ${nomCant}` : nomCant;
    }
    rotolTitol.textContent = nom;
  };

  const maqueta = () => {
    const primer = text.scrollLeft && pas ? text.scrollLeft / pas : pagina;
    text.style.columnWidth = '';
    text.style.columnCount = '';
    text.scrollLeft = 0;
    const amplada = marc.clientWidth - parseFloat(getComputedStyle(marc).paddingLeft) * 2;
    const alcada = marc.clientHeight - parseFloat(getComputedStyle(marc).paddingTop) * 2;
    const una = Math.min(FARISTOL.max, Math.max(FARISTOL.min, midaPerAmplada(text, amplada)));
    const ampleDues = (amplada - FARISTOL.gap) / 2;
    const dues = Math.min(FARISTOL.max, midaPerAmplada(text, ampleDues));
    // Dues columnes només si la lletra hi continua sent grossa.
    const columnes = amplada > alcada && dues >= FARISTOL.dues ? 2 : 1;
    const ampleColumna = columnes === 2 ? ampleDues : amplada;
    const limita = (m) => Math.min(FARISTOL.max, Math.max(FARISTOL.min, m)) * escala;
    // A la celebració, cada cant amb la seva mida: un de línies llargues no
    // fa petits els altres.
    const mides = moments.map((m) => limita(midaPerAmplada(text, ampleColumna, m)));
    text.style.fontSize = `${limita(columnes === 2 ? dues : una)}px`;
    moments.forEach((m, i) => { m.style.fontSize = `${mides[i]}px`; });
    text.style.height = `${alcada}px`;
    text.style.columnCount = '';
    text.style.columnWidth = `${ampleColumna}px`;
    text.style.columnGap = `${FARISTOL.gap}px`;
    ajustaAcords(text);
    pas = amplada + FARISTOL.gap;
    pagines = Math.max(1, Math.round((text.scrollWidth + FARISTOL.gap) / pas));
    pagina = Math.round(primer) || 0;
    situa();
  };

  const avanca = (d) => { pagina += d; situa(); };
  const tanca = () => {
    window.removeEventListener('resize', alRedimensionar);
    document.removeEventListener('keydown', teclat);
    document.removeEventListener('visibilitychange', demanaPantalla);
    if (bloqueig) bloqueig.release().catch(() => {});
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    el.remove();
    document.body.classList.remove('amb-faristol');
    faristol = null;
    if (history.state && history.state.faristol) history.back();
  };
  const teclat = (e) => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); avanca(1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); avanca(-1); }
    else if (e.key === 'Escape') tanca();
  };
  let espera = null;
  const alRedimensionar = () => { clearTimeout(espera); espera = setTimeout(maqueta, 120); };

  // Tocar a la dreta avança, a l'esquerra torna; lliscar també.
  let inici = null;
  marc.addEventListener('pointerdown', (e) => { inici = { x: e.clientX, y: e.clientY }; });
  marc.addEventListener('pointerup', (e) => {
    if (!inici) return;
    const dx = e.clientX - inici.x;
    const dy = e.clientY - inici.y;
    inici = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) return avanca(dx < 0 ? 1 : -1);
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const r = marc.getBoundingClientRect();
      avanca(e.clientX > r.left + r.width / 2 ? 1 : -1);
    }
  });
  marc.addEventListener('click', (e) => e.preventDefault());
  el.querySelector('.faristol-capa').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    if (b.dataset.f === 'tanca') return tanca();
    escala = b.dataset.f === 'original' ? 1
      : Math.round(Math.min(1.8, Math.max(0.6, escala + (b.dataset.f === 'gran' ? 0.1 : -0.1))) * 10) / 10;
    pref.set('mida-faristol', escala === 1 ? null : escala);
    maqueta();
  });

  // Que la pantalla no s'apagui mentre es toca.
  let bloqueig = null;
  const demanaPantalla = async () => {
    if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
    try { bloqueig = await navigator.wakeLock.request('screen'); } catch (err) { /* no disponible */ }
  };
  demanaPantalla();
  document.addEventListener('visibilitychange', demanaPantalla);
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}).finally(() => setTimeout(maqueta, 150));
  }
  window.addEventListener('resize', alRedimensionar);
  document.addEventListener('keydown', teclat);
  // El botó «enrere» del mòbil tanca el faristol en lloc de sortir de la cançó.
  history.pushState({ faristol: true }, '', location.href);
  faristol = { tanca };
  maqueta();
  el.querySelector('[data-f="tanca"]').focus({ preventScroll: true });
}
window.addEventListener('popstate', () => {
  if (faristol) { const f = faristol; faristol = null; history.replaceState(null, '', location.href); f.tanca(); }
});

/* --- Rutes --- */
const estatLlista = { q: '', pestanya: 'cants', etiqueta: null };

// Els escoltadors que una vista posa a window es treuen en canviar de vista.
let vistaActual = new AbortController();

async function ruta() {
  vistaActual.abort();
  vistaActual = new AbortController();
  const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [primer, segon, tercer] = hash.split('/');
  if (faristol) { const f = faristol; faristol = null; f.tanca(); }
  document.getElementById('btn-nou').hidden = !(await potEditar());
  tancaSelector();
  if (!primer) return vistaLlista();
  if (primer === 'cant') return vistaCanco(segon);
  if (primer === 'celebracio') return vistaCelebracio(segon);
  if (primer === 'edita' && segon === 'cant') return editorCanco(tercer);
  if (primer === 'nou' && segon === 'cant') return editorCanco(null);
  if (primer === 'edita' && segon === 'celebracio') return editorCelebracio(tercer);
  if (primer === 'nou' && segon === 'celebracio') return editorCelebracio(null);
  if (primer === 'acces') return vistaAcces();
  if (primer === 'privadesa') return vistaPrivadesa();
  if (primer === 'credits') return vistaCredits();
  return vistaLlista();
}

function posa(html, titol) {
  $app.innerHTML = html;
  document.title = titol ? `${titol} · Cantem junts` : 'Cantem junts';
  window.scrollTo(0, 0);
}

/* --- Llista i cercador --- */
// Cada paraula buscada ha de ser el començament d'una paraula de la cançó;
// primer surten les del títol i després les que tenen la frase sencera.
function cerca(q) {
  const paraulesQ = normalitza(q).trim().split(/\s+/).filter(Boolean);
  let llista = dades.cancons;
  if (estatLlista.etiqueta) llista = llista.filter((c) => c.etiquetes.includes(estatLlista.etiqueta));
  if (!paraulesQ.length) return llista.map((c) => ({ c, detall: primeraLinia(c) }));
  const res = [];
  const frase = ' ' + paraulesQ.join(' ');
  const comenca = (text, p) => (' ' + text.replace(/\s+/g, ' ')).includes(' ' + p);
  for (const c of llista) {
    if (!paraulesQ.every((p) => comenca(c.cerca, p))) continue;
    const alTitol = paraulesQ.every((p) => comenca(c.titolNorm, p));
    const ambFrase = (' ' + c.cerca.replace(/\s+/g, ' ')).includes(frase);
    let detall = primeraLinia(c);
    if (!alTitol) {
      const linies = c.lletra.split('\n');
      const linia = linies.find((l) => (' ' + normalitza(l).replace(/\s+/g, ' ')).includes(frase))
        || linies.find((l) => comenca(normalitza(l), paraulesQ[0]));
      if (linia) detall = linia.trim();
    }
    res.push({ c, punts: (alTitol ? 2 : 0) + (ambFrase ? 1 : 0), detall, paraulesQ });
  }
  res.sort((a, b) => (b.punts - a.punts) || col.compare(a.c.titol, b.c.titol));
  return res;
}
function primeraLinia(c) {
  return (c.lletra.split('\n').find((l) => l.trim()) || '').trim();
}
function marca(text, paraulesQ) {
  if (!paraulesQ || !paraulesQ.length) return esc(text);
  // Es marca sobre el text original, comparant-lo normalitzat lletra a lletra.
  const norm = [...text].map((ch) => normalitza(ch) || ' ');
  const flat = norm.join('');
  const marques = new Array(text.length).fill(false);
  for (const p of paraulesQ) {
    let i = flat.indexOf(p);
    while (i > -1) { for (let k = i; k < i + p.length && k < marques.length; k++) marques[k] = true; i = flat.indexOf(p, i + 1); }
  }
  let out = '';
  let obert = false;
  [...text].forEach((ch, k) => {
    if (marques[k] && !obert) { out += '<mark>'; obert = true; }
    if (!marques[k] && obert) { out += '</mark>'; obert = false; }
    out += esc(ch);
  });
  return out + (obert ? '</mark>' : '');
}

function vistaLlista() {
  const etiquetes = [...new Set(dades.cancons.flatMap((c) => c.etiquetes))].sort(col.compare);
  posa(`
    <label class="cercador">
      <svg aria-hidden="true"><use href="#i-search"/></svg>
      <input id="q" type="search" placeholder="${t('Cerca pel títol o per un tros de la lletra')}" aria-label="${t('Cerca')}" value="${esc(estatLlista.q)}" autocomplete="off">
    </label>
    <div class="pestanyes" role="tablist">
      <button class="pestanya" role="tab" data-p="cants" aria-selected="${estatLlista.pestanya === 'cants'}">${t('Cants ({0})', dades.cancons.length)}</button>
      <button class="pestanya" role="tab" data-p="celebracions" aria-selected="${estatLlista.pestanya === 'celebracions'}">${t('Celebracions ({0})', dades.celebracions.length)}</button>
    </div>
    <div id="contingut-llista"></div>
  `);
  const pintaContingut = () => {
    const cont = document.getElementById('contingut-llista');
    if (estatLlista.pestanya === 'celebracions') {
      cont.innerHTML = `
        <p class="recompte">${t("Cada celebració recull els cants d'una missa, en ordre.")}</p>
        <ul class="llista">${dades.celebracions.map((c) => `<li><a href="#/celebracio/${esc(c.slug)}"><span class="titol-llista">${esc(c.titol)}</span>${c.subtitol ? `<span class="detall">${esc(c.subtitol)}</span>` : ''}</a></li>`).join('') || `<li class="buit">${t('Encara no hi ha cap celebració.')}</li>`}</ul>
        <p class="no-imprimir" id="nova-celebracio" hidden><a class="boto" href="#/nou/celebracio"><svg><use href="#i-plus"/></svg>${t('Nova celebració')}</a></p>`;
      potEditar().then((s) => { const b = document.getElementById('nova-celebracio'); if (b) b.hidden = !s; });
      return;
    }
    const res = cerca(estatLlista.q);
    cont.innerHTML = `
      ${etiquetes.length ? `<div class="etiquetes" aria-label="${t('Filtra per tema')}">${etiquetes.map((e) => `<button class="etiqueta" data-e="${esc(e)}" aria-pressed="${estatLlista.etiqueta === e}">${esc(e)}</button>`).join('')}</div>` : ''}
      ${estatLlista.q || estatLlista.etiqueta ? `<p class="recompte">${res.length === 1 ? t('1 cançó') : t('{0} cançons', res.length)}</p>` : ''}
      <ul class="llista">${res.map((r) => `<li><a href="#/cant/${esc(r.c.slug)}"><span class="titol-llista">${marca(r.c.titol, r.paraulesQ)}</span><span class="detall">${marca(r.detall, r.paraulesQ)}</span></a></li>`).join('') || `<li class="buit">${t('No hi ha cap cançó que coincideixi.')}</li>`}</ul>`;
  };
  pintaContingut();
  const q = document.getElementById('q');
  q.addEventListener('input', () => {
    estatLlista.q = q.value;
    if (estatLlista.pestanya !== 'cants') { estatLlista.pestanya = 'cants'; vistaLlista(); document.getElementById('q').focus(); return; }
    pintaContingut();
  });
  $app.querySelector('.pestanyes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    estatLlista.pestanya = b.dataset.p;
    $app.querySelectorAll('.pestanya').forEach((x) => x.setAttribute('aria-selected', x === b));
    pintaContingut();
  });
  document.getElementById('contingut-llista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    estatLlista.etiqueta = estatLlista.etiqueta === b.dataset.e ? null : b.dataset.e;
    pintaContingut();
  });
}

// Mida de la lletra respecte a la de sèrie: «100 %», «120 %».
const percent = (x) => `${Math.round(x * 100)}\u00a0%`;

/* --- Controls comuns de la vista --- */
function htmlControlsVista(ambTo) {
  return `
    <button class="boto boto-principal boto-faristol" data-acc="faristol" title="${t('Pantalla completa amb la lletra grossa, per tocar: toca la dreta per passar pàgina')}"><svg><use href="#i-faristol"/></svg><span>${t('Faristol')}</span></button>
    ${ambTo ? `<div class="grup" role="group" aria-label="${t('To')}">
      <button class="boto" data-acc="baixa" title="${t('Baixa mig to')}"><svg><use href="#i-minus"/></svg></button>
      <button class="boto valor" data-acc="to-original" id="valor-to" title="${t('Torna al to original')}"></button>
      <button class="boto" data-acc="puja" title="${t('Puja mig to')}"><svg><use href="#i-plus"/></svg></button>
    </div>` : ''}
    <div class="grup" role="group" aria-label="${t('Notació dels acords')}">
      <button class="boto" data-acc="llati" aria-pressed="${opcions.notacio === 'llati'}" title="${t('Acords en notació llatina (DO, RE, MI)')}">DO</button>
      <button class="boto" data-acc="america" aria-pressed="${opcions.notacio === 'america'}" title="${t('Acords en notació americana (C, D, E)')}">C</button>
    </div>
    <div class="grup" role="group" aria-label="${t('Mida de la lletra')}">
      <button class="boto" data-acc="petita" title="${t('Lletra més petita')}">A−</button>
      <button class="boto valor" data-acc="mida-original" id="valor-mida" title="${t('Torna a la mida de sèrie')}">${percent(opcions.mida)}</button>
      <button class="boto" data-acc="gran" title="${t('Lletra més gran')}">A+</button>
    </div>
    <button class="boto" data-acc="acords" aria-pressed="${opcions.acords}" title="${t('Mostra o amaga els acords')}"><svg><use href="#i-music"/></svg></button>
    <span class="separador"></span>
    <button class="boto" data-acc="imprimeix" title="${t('Imprimeix o desa en PDF')}"><svg><use href="#i-printer"/></svg></button>
    <button class="boto" data-acc="comparteix" title="${t("Comparteix l'enllaç")}"><svg><use href="#i-share"/></svg></button>`;
}

function gestionaControls(barra, repinta, salt) {
  barra.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'llati' || acc === 'america') {
      opcions.notacio = acc; pref.set('notacio', acc);
      barra.querySelectorAll('[data-acc="llati"],[data-acc="america"]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.acc === acc));
      repinta();
    } else if (acc === 'petita' || acc === 'gran' || acc === 'mida-original') {
      opcions.mida = acc === 'mida-original' ? 1
        : Math.round(Math.min(2.2, Math.max(0.7, opcions.mida + (acc === 'gran' ? 0.1 : -0.1))) * 10) / 10;
      pref.set('mida', opcions.mida === 1 ? null : opcions.mida);
      const v = document.getElementById('valor-mida');
      if (v) v.textContent = percent(opcions.mida);
      document.documentElement.style.setProperty('--mida', opcions.mida);
      reajusta();
    } else if (acc === 'acords') {
      opcions.acords = !opcions.acords; pref.set('acords', opcions.acords ? '1' : '0');
      b.setAttribute('aria-pressed', opcions.acords);
      document.querySelector('.canco')?.classList.toggle('sense-acords', !opcions.acords);
      reajusta();
    } else if (acc === 'faristol') {
      obreFaristol();
    } else if (acc === 'imprimeix') {
      window.print();
    } else if (acc === 'comparteix') {
      const dades2 = { title: document.title, url: location.href };
      if (navigator.share) { try { await navigator.share(dades2); } catch (err) { /* cancel·lat */ } }
      else { try { await navigator.clipboard.writeText(location.href); avis(t('Enllaç copiat')); } catch (err) { avis(location.href, 6000); } }
    } else if (salt) {
      salt(acc);
    }
  });
}

/* --- Cançó --- */
function vistaCanco(slug) {
  const entrada = cancoPerSlug(slug);
  if (!entrada) return posa(`<p class="buit">${t("No s'ha trobat aquesta cançó.")} <a href="#/">${t('Torna a la llista')}</a>.</p>`);
  const canco = llegeixChordPro(entrada.font);
  const to = toDeLaCanco(canco);
  let salt = Number(pref.get('to.' + slug, '0'));
  posa(`
    <div class="barra">
      <a class="boto" href="#/" title="${t('Torna a la llista')}"><svg><use href="#i-left"/></svg></a>
      ${to ? htmlControlsVista(true) : htmlControlsVista(false)}
      <a class="boto" id="btn-edita" href="#/edita/cant/${esc(slug)}" title="${t('Edita aquesta cançó')}" hidden><svg><use href="#i-pencil"/></svg></a>
    </div>
    <div class="encap-canco">
      <h1>${esc(canco.titol)}</h1>
      ${canco.subtitol ? `<p class="sub">${esc(canco.subtitol)}</p>` : ''}
      ${canco.autor ? `<p class="sub">${esc(canco.autor)}</p>` : ''}
      ${canco.etiquetes.length ? `<div class="etiquetes-canco">${canco.etiquetes.map((e) => `<span>${esc(e)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="canco${opcions.acords ? '' : ' sense-acords'}" id="canco"></div>
  `, canco.titol);
  potEditar().then((s) => { const b = document.getElementById('btn-edita'); if (b) b.hidden = !s; });
  const pinta = () => {
    const el = document.getElementById('canco');
    el.innerHTML = htmlCanco(canco, salt);
    el.classList.add('pot-columnes');
    triaColumnes();
    ajustaAcords(el);
    const v = document.getElementById('valor-to');
    if (v) {
      v.textContent = nomDelTo(to, salt, opcions.notacio) + (salt ? ` ${salt > 0 ? '+' : '−'}${Math.abs(salt)}` : '');
      v.title = salt ? t('Torna al to original ({0})', nomDelTo(to, 0, opcions.notacio)) : t('To original');
    }
  };
  pinta();
  gestionaControls($app.querySelector('.barra'), pinta, (acc) => {
    if (acc === 'puja') salt = salt >= 11 ? 0 : salt + 1;
    else if (acc === 'baixa') salt = salt <= -11 ? 0 : salt - 1;
    else if (acc === 'to-original') salt = 0;
    else return;
    // Més enllà de mitja octava és més còmode anar per l'altre costat.
    if (salt > 6) salt -= 12;
    if (salt < -6) salt += 12;
    pref.set('to.' + slug, salt || null);
    pinta();
  });
}

/* --- Celebració --- */
function vistaCelebracio(slug) {
  const entrada = celebracioPerSlug(slug);
  if (!entrada) return posa(`<p class="buit">${t("No s'ha trobat aquesta celebració.")} <a href="#/">${t('Torna a la llista')}</a>.</p>`);
  const cel = llegeixChordPro(entrada.font);
  posa(`
    <div class="barra">
      <a class="boto" href="#/" title="${t('Torna a la llista')}"><svg><use href="#i-left"/></svg></a>
      ${htmlControlsVista(false)}
      <a class="boto" id="btn-edita" href="#/edita/celebracio/${esc(slug)}" title="${t('Edita aquesta celebració')}" hidden><svg><use href="#i-pencil"/></svg></a>
    </div>
    <div class="encap-canco">
      <h1>${esc(cel.titol)}</h1>
      ${cel.subtitol ? `<p class="sub">${esc(cel.subtitol)}</p>` : ''}
    </div>
    <ol class="index-celebracio no-imprimir" id="index-cel"></ol>
    <div class="canco${opcions.acords ? '' : ' sense-acords'}" id="canco"></div>
  `, cel.titol);
  potEditar().then((s) => { const b = document.getElementById('btn-edita'); if (b) b.hidden = !s; });
  const pinta = () => {
    const index = [];
    // Cada cant de la celebració, amb el to que s'hi hagi triat.
    const cant = ({ slug: s, moment }) => {
      const e = cancoPerSlug(s);
      const id = 'm' + index.length;
      if (!e) { index.push(`<li>${esc(s)}</li>`); return `<section class="moment" id="${id}"><h2>${esc(s)}</h2><p class="buit">${t('Aquesta cançó ja no hi és.')}</p></section>`; }
      const c = llegeixChordPro(e.font);
      const salt = Number(pref.get('to.' + s, '0'));
      index.push(`<li><a href="#${id}" data-salta="${id}">${esc(c.titol)}</a></li>`);
      return `<section class="moment" id="${id}">${moment ? `<span class="tipus-moment">${esc(moment)}</span>` : ''}<h2><a href="#/cant/${esc(s)}">${esc(c.titol)}</a></h2>${htmlCanco(c, salt)}</section>`;
    };
    // El comentari just abans d'un cant és el moment de la missa (Entrada, Glòria…).
    const linies = cel.linies;
    const copia = { ...cel, linies: [] };
    let moment = '';
    for (let i = 0; i < linies.length; i++) {
      const l = linies[i];
      const seguent = linies.slice(i + 1).find((x) => x.tipus !== 'buida');
      if (l.tipus === 'comentari' && seguent && seguent.tipus === 'cant') { moment = l.text; continue; }
      if (l.tipus === 'cant') { copia.linies.push({ ...l, moment }); moment = ''; continue; }
      copia.linies.push(l);
    }
    document.getElementById('canco').innerHTML = htmlCanco(copia, 0, 'vista', cant);
    document.getElementById('index-cel').innerHTML = index.join('');
    ajustaAcords(document.getElementById('canco'));
  };
  pinta();
  document.getElementById('index-cel').addEventListener('click', (e) => {
    const a = e.target.closest('[data-salta]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.salta)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  gestionaControls($app.querySelector('.barra'), pinta);
}

/* --- Selector d'acords (editor) --- */
let selector = null;
function tancaSelector() {
  if (selector) { selector.remove(); selector = null; }
  document.querySelectorAll('.vista-editor .sel').forEach((x) => x.classList.remove('sel'));
}

function obreSelector(ancora, actual, usats, tria) {
  tancaSelector();
  const arrels = LLATI.map((n) => n.toUpperCase());
  selector = document.createElement('div');
  selector.className = 'selector-acord';
  selector.setAttribute('role', 'dialog');
  selector.setAttribute('aria-label', t('Tria un acord'));
  selector.innerHTML = `
    <h3>${actual ? t('Canvia {0}', esc(actual)) : t('Posa un acord')}<button class="boto" data-tanca title="${t('Tanca')}"><svg><use href="#i-x"/></svg></button></h3>
    ${usats.length ? `<div class="fila usats">${usats.map((a) => `<button class="boto" data-a="${esc(a)}">${esc(a)}</button>`).join('')}</div>` : ''}
    <div class="fila">${arrels.map((a) => `<button class="boto" data-arrel="${a}">${a}</button>`).join('')}</div>
    <div class="fila">
      <button class="boto" data-mod="#" title="${t('Sostingut')}">#</button>
      <button class="boto" data-mod="b" title="${t('Bemoll')}">b</button>
      <button class="boto" data-mod="m" title="${t('Menor')}">m</button>
      <button class="boto" data-mod="7" title="${t('Sèptima')}">7</button>
    </div>
    <div class="escriure">
      <input type="text" value="${esc(actual || '')}" aria-label="${t('Acord')}" placeholder="${t("Escriu l'acord")}">
      <button class="boto boto-principal" data-posa>${t('Posa')}</button>
      ${actual ? `<button class="boto boto-perill" data-treu title="${t('Treu aquest acord')}"><svg><use href="#i-trash"/></svg></button>` : ''}
    </div>`;
  document.body.appendChild(selector);
  const r = ancora.getBoundingClientRect();
  const amp = selector.offsetWidth;
  selector.style.left = `${Math.max(16, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - amp - 16))}px`;
  selector.style.top = `${window.scrollY + r.bottom + 6}px`;
  const input = selector.querySelector('input');
  selector.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if ('tanca' in b.dataset) return tancaSelector();
    if (b.dataset.a) { tria(b.dataset.a); return tancaSelector(); }
    if (b.dataset.arrel) { input.value = b.dataset.arrel; input.focus(); return; }
    if (b.dataset.mod) {
      let v = input.value;
      if (b.dataset.mod === 'm') v = v.replace(/^[A-Z]+/, (x) => x.toLowerCase()) + (/^[a-z]/.test(v) ? '' : 'm');
      else v += b.dataset.mod;
      input.value = v; input.focus(); return;
    }
    if ('posa' in b.dataset) { if (input.value.trim()) tria(input.value.trim()); return tancaSelector(); }
    if ('treu' in b.dataset) { tria(''); return tancaSelector(); }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (input.value.trim()) tria(input.value.trim()); tancaSelector(); }
    if (e.key === 'Escape') tancaSelector();
  });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tancaSelector(); });
document.addEventListener('pointerdown', (e) => {
  if (selector && !selector.contains(e.target) && !e.target.closest('.vista-editor')) tancaSelector();
});

/* --- Editor de cançons --- */
async function editorCanco(slug) {
  if (!(await potEditar())) { location.hash = '#/acces'; return; }
  const entrada = slug ? cancoPerSlug(slug) : null;
  if (slug && !entrada) return posa(`<p class="buit">${t("No s'ha trobat aquesta cançó.")}</p>`);
  const inicial = entrada ? llegeixChordPro(entrada.font) : { titol: '', etiquetes: [] };
  // El títol i les etiquetes es treuen del text: al quadre només hi ha la lletra.
  let cos = entrada ? entrada.font.split('\n').filter((l) => !/^\{\s*(title|t|meta)\s*:/.test(l)).join('\n').replace(/^\n+/, '') : '';
  const totesEtiquetes = [...new Set(dades.cancons.flatMap((c) => c.etiquetes))].sort(col.compare);
  posa(`
    <div class="barra">
      <a class="boto" href="${entrada ? `#/cant/${esc(slug)}` : '#/'}" title="${t('Torna sense desar')}"><svg><use href="#i-left"/></svg></a>
      <strong>${entrada ? t('Edita la cançó') : t('Cançó nova')}</strong>
    </div>
    <div class="camps-editor">
        <div class="camp"><label for="ed-titol">${t('Títol')}</label><input id="ed-titol" value="${esc(inicial.titol)}" autocomplete="off"></div>
        <div class="camp"><label for="ed-etiq">${t('Temes')}</label><input id="ed-etiq" list="llista-etiq" value="${esc(inicial.etiquetes.join(', '))}" placeholder="${t('Per exemple: {0}', 'Nadal, Maria')}" autocomplete="off">
          <datalist id="llista-etiq">${totesEtiquetes.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>
          <p class="ajuda">${t('Separats per comes. Serveixen per filtrar la llista.')}</p></div>
        <div class="pestanyes pestanyes-editor" role="tablist">
          <button class="pestanya" role="tab" data-v="text" aria-selected="true">${t('Lletra')}</button>
          <button class="pestanya" role="tab" data-v="vista" aria-selected="false">${t('Marcar')}</button>
        </div>
    </div>
    <div class="editor" data-vista="text">
      <div class="panell-text">
        <div class="camp">
          <label for="ed-text" class="rotol-lletra">${t('Lletra')}</label>
          <p class="ajuda">${t("Escriu o enganxa la lletra. Si l'enganxes amb els acords a la línia de sobre, es col·loquen sols damunt de cada síl·laba. Una línia en blanc separa les estrofes.")}</p>
          <textarea id="ed-text" spellcheck="false">${esc(cos)}</textarea>
        </div>
      </div>
      <div class="panell-vista">
        <div class="barra-acords" id="ed-barra" role="toolbar" aria-label="${t('Marcar')}"></div>
        <p class="ajuda" id="ed-ajuda-acords">${t("Tria una eina de la barra i toca la lletra: un acord va a la síl·laba que toquis; «N» hi posa o hi treu la negreta; «Tornada» converteix l'estrofa en tornada o la desfà, i «Nota» n'hi posa una a sobre. La goma treu els acords i les notes. Per moure un acord, arrossega'l (al mòbil, mantén-lo premut un moment).")}</p>
        <div class="vista-editor canco" id="ed-vista"></div>
      </div>
    </div>
    <div class="accions-editor">
      <button class="boto boto-principal" id="ed-desa"><svg><use href="#i-pencil"/></svg>${t('Desa')}</button>
      <span class="estat" id="ed-estat"></span>
      <span class="separador"></span>
      ${entrada ? `<button class="boto boto-perill" id="ed-esborra"><svg><use href="#i-trash"/></svg>${t('Esborra')}</button>` : ''}
    </div>
  `, entrada ? t('Edita: {0}', inicial.titol) : t('Cançó nova'));

  const $titol = document.getElementById('ed-titol');
  const $etiq = document.getElementById('ed-etiq');
  const $text = document.getElementById('ed-text');
  const $vista = document.getElementById('ed-vista');
  const $editor = $app.querySelector('.editor');
  let canviat = false;

  const font = () => {
    const etiq = $etiq.value.split(',').map((e) => e.trim()).filter(Boolean);
    return `{title: ${$titol.value.trim()}}\n${etiq.length ? `{meta: etiquetes ${etiq.join(', ')}}\n` : ''}\n${$text.value.replace(/\s+$/, '')}\n`;
  };
  const pinta = () => {
    const c = llegeixChordPro($text.value);
    $vista.innerHTML = htmlCanco(c, 0, 'edicio') || `<p class="ajuda">${t('Aquí es veurà la lletra amb els acords.')}</p>`;
    ajustaAcords($vista);
  };
  pinta();
  const marcaCanvi = () => { canviat = true; document.getElementById('ed-estat').textContent = t('Canvis sense desar'); };
  $text.addEventListener('input', () => { pinta(); marcaCanvi(); });
  $titol.addEventListener('input', marcaCanvi);
  $etiq.addEventListener('input', marcaCanvi);

  // Enganxar text amb els acords a sobre el converteix sol.
  $text.addEventListener('paste', (e) => {
    const t = e.clipboardData?.getData('text/plain');
    if (!t || !tensAcordsASobre(t)) return;
    e.preventDefault();
    const conv = acordsASobreAChordPro(t);
    $text.setRangeText(conv, $text.selectionStart, $text.selectionEnd, 'end');
    pinta(); marcaCanvi();
    avis(t('Acords col·locats damunt de la lletra. Revisa-ho a «Marcar».'), 4000);
  });

  $app.querySelector('.pestanyes-editor').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    $editor.dataset.vista = b.dataset.v;
    $app.querySelectorAll('.pestanyes-editor .pestanya').forEach((x) => x.setAttribute('aria-selected', x === b));
    pinta();
  });

  /* Pinzell i goma: es tria a la barra què fa tocar la lletra. */
  let eina = null; // { acord: 'SOL' }, { goma: true }, { negreta: true }, { tornada: true } o { nota: true }
  let textNota = t('Dues vegades');
  const extres = [];
  const historial = [];
  const $barra = document.getElementById('ed-barra');
  const pintaBarra = () => {
    // Les set notes, majors i menors, sempre a mà; les que ja fa servir la
    // cançó, amb el color dels acords. Després, la resta d'acords de la cançó.
    // Els menors es pleguen (es recorda a cada dispositiu); plegats, els que
    // fa servir la cançó o el que està triat passen a la fila de sota.
    const { majors, menors, altres } = acordsBasics($text.value);
    const menorsVisibles = pref.get('menors', '0') === '1';
    const fixos = menorsVisibles ? [...majors, ...menors] : majors;
    const basics = new Set(fixos.map((x) => x.text));
    const menorsALaVista = menorsVisibles ? [] : menors.filter((x) => x.usat || x.text === eina?.acord).map((x) => x.text);
    const acords = [...new Set([...menorsALaVista, ...altres, ...extres])].filter((a) => !basics.has(a));
    const xip = (a, usat = true) => `<button class="boto xip${usat ? '' : ' xip-nou'}" data-pinzell="${esc(a)}" aria-pressed="${eina?.acord === a}" title="${t('Posa {0} on toquis', esc(a))}">${esc(a)}</button>`;
    $barra.innerHTML = `
      <div class="xips-basics">${fixos.map((x) => xip(x.text, x.usat)).join('')}</div>
      <div class="xips">${acords.map((a) => xip(a)).join('')}
        <button class="boto" data-menors aria-expanded="${menorsVisibles}" title="${menorsVisibles ? t('Amaga la fila dels acords menors') : t('Mostra la fila dels acords menors')}">${t('Menors')}<svg><use href="#i-${menorsVisibles ? 'up' : 'down'}"/></svg></button>
        <button class="boto" data-altre title="${t('Un acord que no és a la barra')}"><svg><use href="#i-plus"/></svg>${t('Altre')}</button></div>
      <div class="eines-marca">
        <button class="boto boto-negreta" data-marca="negreta" aria-pressed="${!!eina?.negreta}" aria-label="${t('Negreta')}" title="${t('Negreta: toca una síl·laba per posar-la o treure-la en negreta (la síl·laba forta)')}">${t('N')}</button>
        <button class="boto" data-marca="tornada" aria-pressed="${!!eina?.tornada}" title="${t("Tornada: toca una estrofa per fer-la tornada, o per desfer-la")}">${t('Tornada')}</button>
        <button class="boto" data-marca="nota" aria-pressed="${!!eina?.nota}" title="${t('Nota: toca una línia per posar-hi una nota a sobre, o una nota per canviar-ne el text')}">${t('Nota')}</button>
      </div>
      <div class="eines-acords">
        <button class="boto" data-goma aria-pressed="${!!eina?.goma}" title="${t('Goma: treu l’acord o la nota que toquis')}"><svg><use href="#i-eraser"/></svg></button>
        <button class="boto" data-desfes title="${t("Desfés l'últim canvi")}" ${historial.length ? '' : 'disabled'}><svg><use href="#i-undo"/></svg></button>
      </div>
      ${eina?.nota ? `<label class="text-nota">${t('Text de la nota')} <input id="ed-nota" value="${esc(textNota)}" autocomplete="off"></label>` : ''}`;
    $vista.classList.toggle('amb-goma', !!eina?.goma);
    $vista.classList.toggle('amb-pinzell', !!eina?.acord);
    $vista.classList.toggle('amb-negreta', !!eina?.negreta);
    $vista.classList.toggle('amb-tornada', !!eina?.tornada);
    $vista.classList.toggle('amb-nota', !!eina?.nota);
  };
  const canviaLinia = (canvis) => {
    historial.push($text.value);
    if (historial.length > 100) historial.shift();
    const ls = $text.value.split('\n');
    for (const [num, f] of canvis) ls[num] = f(ls[num]);
    $text.value = ls.join('\n');
    pinta(); pintaBarra(); marcaCanvi();
  };
  const canviaText = (nou) => {
    if (nou === $text.value) return;
    historial.push($text.value);
    if (historial.length > 100) historial.shift();
    $text.value = nou;
    pinta(); pintaBarra(); marcaCanvi();
  };
  pintaBarra();
  $text.addEventListener('input', pintaBarra);

  $barra.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pinzell) eina = eina?.acord === b.dataset.pinzell ? null : { acord: b.dataset.pinzell };
    else if ('goma' in b.dataset) eina = eina?.goma ? null : { goma: true };
    else if ('menors' in b.dataset) pref.set('menors', pref.get('menors', '0') === '1' ? null : '1');
    else if (b.dataset.marca) eina = eina?.[b.dataset.marca] ? null : { [b.dataset.marca]: true };
    else if ('desfes' in b.dataset) {
      if (!historial.length) return;
      $text.value = historial.pop();
      pinta(); marcaCanvi();
      pintaBarra();
      return;
    } else if ('altre' in b.dataset) {
      obreSelector(b, null, [], (acord) => {
        if (!acord) return;
        if (!extres.includes(acord)) extres.push(acord);
        eina = { acord };
        pintaBarra();
      });
      return;
    }
    pintaBarra();
    if (eina?.nota) document.getElementById('ed-nota')?.focus();
  });
  $barra.addEventListener('input', (e) => { if (e.target.id === 'ed-nota') textNota = e.target.value; });

  // Tocar la lletra fa el que digui l'eina triada.
  $vista.addEventListener('click', (e) => {
    if (arrossegat) { arrossegat = false; return; }
    const marca = e.target.closest('[data-i]');
    const pl = e.target.closest('[data-num]');
    if (!pl) return;
    const num = Number(pl.dataset.num);
    const esNota = pl.classList.contains('comentari');
    if (!eina) { avis(t('Tria primer una eina de la barra.')); return; }
    if (eina.tornada) { if (!esNota) canviaText(canviaTornada($text.value, num)); return; }
    if (eina.nota) {
      const text = textNota.trim();
      if (!text) { avis(t('Escriu primer el text de la nota.')); document.getElementById('ed-nota')?.focus(); return; }
      canviaText(posaNota($text.value, num, text));
      return;
    }
    if (eina.goma && esNota) { canviaText(treuNota($text.value, num)); return; }
    if (!marca || esNota) return;
    const idx = Number(marca.dataset.i);
    if (eina.negreta) {
      if (marca.classList.contains('c')) canviaLinia([[num, (l) => canviaNegretaSillaba(l, idx)]]);
      return;
    }
    if (eina.goma) {
      if (acordA($text.value.split('\n')[num], idx) !== null) canviaLinia([[num, (l) => posaAcord(l, idx, '')]]);
      return;
    }
    canviaLinia([[num, (l) => posaAcord(l, idx, eina.acord)]]);
  });

  // Arrossegar un acord el mou a una altra síl·laba. Amb el dit, cal mantenir-lo
  // premut un moment perquè no es confongui amb desplaçar la pàgina.
  let arrossegat = false;
  let ar = null;
  $vista.addEventListener('pointerdown', (e) => {
    const a = e.target.closest('.a[data-i]');
    const pl = e.target.closest('[data-num]');
    if (!a || !pl || e.button > 0) return;
    ar = { a, num: Number(pl.dataset.num), idx: Number(a.dataset.i), x: e.clientX, y: e.clientY, actiu: false, id: e.pointerId, tipus: e.pointerType };
    if (e.pointerType === 'touch') {
      ar.temps = setTimeout(() => { if (ar) comencaArrossegar(e); }, 350);
    }
  });
  const comencaArrossegar = (e) => {
    ar.actiu = true;
    ar.fantasma = document.createElement('div');
    ar.fantasma.className = 'fantasma-acord';
    ar.fantasma.textContent = ar.a.textContent;
    document.body.appendChild(ar.fantasma);
    ar.a.classList.add('arrossegant');
    $vista.classList.add('arrossegant-acord');
    mouFantasma(e.clientX, e.clientY);
    if (navigator.vibrate) navigator.vibrate(15);
  };
  const mouFantasma = (x, y) => {
    ar.fantasma.style.left = `${x}px`;
    ar.fantasma.style.top = `${y}px`;
    document.querySelectorAll('.vista-editor .desti').forEach((d) => d.classList.remove('desti'));
    const sota = document.elementFromPoint(x, y)?.closest('.vista-editor [data-i]');
    if (sota && !sota.classList.contains('a')) sota.classList.add('desti');
  };
  window.addEventListener('pointermove', (e) => {
    if (!ar || e.pointerId !== ar.id) return;
    const lluny = Math.hypot(e.clientX - ar.x, e.clientY - ar.y) > 6;
    if (!ar.actiu) {
      if (!lluny) return;
      if (ar.tipus === 'touch') { clearTimeout(ar.temps); ar = null; return; }
      comencaArrossegar(e);
    }
    e.preventDefault();
    mouFantasma(e.clientX, e.clientY);
  }, { passive: false, signal: vistaActual.signal });
  // Mentre s'arrossega amb el dit, la pàgina no s'ha de moure.
  $vista.addEventListener('touchmove', (e) => { if (ar?.actiu) e.preventDefault(); }, { passive: false });
  const acabaArrossegar = (e) => {
    if (!ar || e.pointerId !== ar.id) return;
    clearTimeout(ar.temps);
    if (ar.actiu) {
      arrossegat = true;
      setTimeout(() => { arrossegat = false; }, 0);
      ar.fantasma.remove();
      $vista.classList.remove('arrossegant-acord');
      const sota = e.type === 'pointerup' ? document.elementFromPoint(e.clientX, e.clientY)?.closest('.vista-editor [data-i]') : null;
      const pl = sota?.closest('[data-num]');
      if (sota && pl && !sota.classList.contains('a')) {
        const desti = { num: Number(pl.dataset.num), idx: Number(sota.dataset.i) };
        const { num, idx } = ar;
        const acord = acordA($text.value.split('\n')[num], idx);
        if (acord !== null && (desti.num !== num || desti.idx !== idx)) {
          canviaLinia([[num, (l) => posaAcord(l, idx, '')], [desti.num, (l) => posaAcord(l, desti.idx, acord)]]);
        } else pinta();
      } else pinta();
    }
    ar = null;
  };
  window.addEventListener('pointerup', acabaArrossegar, { signal: vistaActual.signal });
  window.addEventListener('pointercancel', acabaArrossegar, { signal: vistaActual.signal });

  document.getElementById('ed-desa').addEventListener('click', async () => {
    const titol = $titol.value.trim();
    if (!titol) { avis(t('Cal posar un títol.')); $titol.focus(); return; }
    let nouSlug = slug;
    if (!nouSlug) {
      nouSlug = slugDe(titol);
      let n = 2;
      while (cancoPerSlug(nouSlug)) nouSlug = `${slugDe(titol)}-${n++}`;
    }
    const text = font();
    const estat = document.getElementById('ed-estat');
    estat.textContent = t('Desant…');
    try {
      await desaFitxer(`cancons/${nouSlug}.cho`, text, `${entrada ? 'Canvia' : 'Afegeix'} «${titol}»`);
      if (!(await esLocal())) apuntaPendent(`cancons/${nouSlug}.cho`, text);
      aplicaCanvi(`cancons/${nouSlug}.cho`, text);
      canviat = false;
      avis((await esLocal()) ? t('Desat') : t("Desat. La web pública s'actualitzarà en un minut."), 4000);
      location.hash = `#/cant/${nouSlug}`;
    } catch (err) {
      estat.textContent = err.message;
    }
  });

  const esb = document.getElementById('ed-esborra');
  if (esb) {
    esb.addEventListener('click', async () => {
      if (!esb.dataset.segur) {
        esb.dataset.segur = '1';
        esb.innerHTML = `<svg><use href="#i-trash"/></svg>${t('Segur? Toca per esborrar-la')}`;
        setTimeout(() => { if (esb.isConnected) { delete esb.dataset.segur; esb.innerHTML = `<svg><use href="#i-trash"/></svg>${t('Esborra')}`; } }, 5000);
        return;
      }
      const usada = dades.celebracions.filter((c) => new RegExp(`\\{\\s*cant\\s*:\\s*${slug}\\s*\\}`).test(c.font));
      if (usada.length) {
        document.getElementById('ed-estat').textContent = t("No es pot esborrar: és a {0}. Treu-la'n primer.", usada.map((c) => `«${c.titol}»`).join(', '));
        return;
      }
      try {
        await esborraFitxer(`cancons/${slug}.cho`, `Esborra «${inicial.titol}»`);
        if (!(await esLocal())) apuntaPendent(`cancons/${slug}.cho`, null);
        aplicaCanvi(`cancons/${slug}.cho`, null);
        avis(t('Cançó esborrada'));
        location.hash = '#/';
      } catch (err) {
        document.getElementById('ed-estat').textContent = err.message;
      }
    });
  }

  window.onbeforeunload = () => (canviat ? true : undefined);
}

// L'acord damunt la lletra «idx» d'una línia, o null.
function acordA(linia, idx) {
  return posicioFont(linia, idx).acord?.text ?? null;
}

/* --- Editor de celebracions --- */
async function editorCelebracio(slug) {
  if (!(await potEditar())) { location.hash = '#/acces'; return; }
  const entrada = slug ? celebracioPerSlug(slug) : null;
  if (slug && !entrada) return posa(`<p class="buit">${t("No s'ha trobat aquesta celebració.")}</p>`);
  const cel = entrada ? llegeixChordPro(entrada.font) : { titol: '', subtitol: '', linies: [] };
  // La celebració es guarda com a ChordPro: un comentari amb el moment i el cant.
  const items = [];
  let moment = '';
  for (const l of cel.linies) {
    if (l.tipus === 'comentari') { if (moment) items.push({ moment, text: '' }); moment = l.text; continue; }
    if (l.tipus === 'cant') { items.push({ moment, cant: l.slug }); moment = ''; continue; }
    if (l.tipus === 'lletra' || l.tipus === 'buida') {
      const font = entrada.font.split('\n')[l.num];
      const ult = items[items.length - 1];
      if (l.tipus === 'buida') { if (moment) { items.push({ moment, text: '' }); moment = ''; } continue; }
      if (moment) { items.push({ moment, text: font }); moment = ''; } else if (ult && 'text' in ult) ult.text += '\n' + font;
      else items.push({ moment: '', text: font });
    }
  }
  if (moment) items.push({ moment, text: '' });

  posa(`
    <div class="barra">
      <a class="boto" href="${entrada ? `#/celebracio/${esc(slug)}` : '#/'}" title="${t('Torna sense desar')}"><svg><use href="#i-left"/></svg></a>
      <strong>${entrada ? t('Edita la celebració') : t('Celebració nova')}</strong>
    </div>
    <div class="pagina">
      <div class="camp"><label for="cel-titol">${t('Títol')}</label><input id="cel-titol" value="${esc(cel.titol)}" placeholder="${t('Per exemple: Inici de curs 2026-27')}"></div>
      <div class="camp"><label for="cel-sub">${t('Detall')}</label><input id="cel-sub" value="${esc(cel.subtitol || '')}" placeholder="${t('Data, lloc…')}"></div>
      <h2>${t('Cants, en ordre')}</h2>
      <ul class="items" id="items"></ul>
      <div class="camp">
        <label for="cel-cerca">${t('Afegeix un cant')}</label>
        <input id="cel-cerca" type="search" placeholder="${t('Cerca pel títol o la lletra')}" autocomplete="off">
        <ul class="resultats-afegir" id="cel-resultats" hidden></ul>
      </div>
      <p><button class="boto" id="cel-text"><svg><use href="#i-plus"/></svg>${t('Afegeix un text (salm, resposta…)')}</button></p>
      <div class="accions-editor">
        <button class="boto boto-principal" id="cel-desa">${t('Desa')}</button>
        <span class="estat" id="cel-estat"></span>
        <span class="separador"></span>
        ${entrada ? `<button class="boto boto-perill" id="cel-esborra"><svg><use href="#i-trash"/></svg>${t('Esborra')}</button>` : ''}
      </div>
    </div>
  `, entrada ? t('Edita: {0}', cel.titol) : t('Celebració nova'));

  const $items = document.getElementById('items');
  const pintaItems = () => {
    $items.innerHTML = items.map((it, i) => `
      <li class="item" data-i="${i}">
        <div>
          <div class="camp"><label for="mom-${i}">${t('Moment')}</label><input id="mom-${i}" data-camp="moment" value="${esc(it.moment)}" placeholder="${t('Entrada, Glòria, Ofertori…')}" list="moments"></div>
          ${'cant' in it
            ? `<p class="nom-canco">${esc(cancoPerSlug(it.cant)?.titol || it.cant)}</p>`
            : `<div class="camp"><label for="txt-${i}">${t('Text')}</label><textarea id="txt-${i}" data-camp="text" rows="3" style="min-height:5rem">${esc(it.text)}</textarea></div>`}
        </div>
        <div class="botons-item">
          <button class="boto" data-mou="-1" title="${t('Puja')}" ${i === 0 ? 'disabled' : ''}><svg><use href="#i-up"/></svg></button>
          <button class="boto" data-mou="1" title="${t('Baixa')}" ${i === items.length - 1 ? 'disabled' : ''}><svg><use href="#i-down"/></svg></button>
          <button class="boto boto-perill" data-treu title="${t('Treu-lo de la llista')}"><svg><use href="#i-x"/></svg></button>
        </div>
      </li>`).join('') + `<datalist id="moments">${['Entrada', 'Perdó', 'Glòria', 'Salm', 'Al·leluia', 'Ofertori', 'Sant', 'Pare nostre', 'Pau', 'Anyell de Déu', 'Comunió', 'Acció de gràcies', 'Sortida'].map((m) => `<option value="${m}">`).join('')}</datalist>`;
    if (!items.length) $items.innerHTML = `<li class="buit">${t("Encara no hi ha cap cant. Cerca'ls a sota.")}</li>`;
  };
  pintaItems();
  $items.addEventListener('input', (e) => {
    const li = e.target.closest('[data-i]');
    if (li && e.target.dataset.camp) items[Number(li.dataset.i)][e.target.dataset.camp] = e.target.value;
  });
  $items.addEventListener('click', (e) => {
    const li = e.target.closest('[data-i]');
    const b = e.target.closest('button');
    if (!li || !b) return;
    const i = Number(li.dataset.i);
    if (b.dataset.mou) {
      const j = i + Number(b.dataset.mou);
      [items[i], items[j]] = [items[j], items[i]];
    } else if ('treu' in b.dataset) items.splice(i, 1);
    pintaItems();
  });
  const $cerca = document.getElementById('cel-cerca');
  const $res = document.getElementById('cel-resultats');
  $cerca.addEventListener('input', () => {
    const q = $cerca.value.trim();
    if (!q) { $res.hidden = true; return; }
    const res = cerca(q).slice(0, 12);
    $res.innerHTML = res.map((r) => `<li><button data-s="${esc(r.c.slug)}">${esc(r.c.titol)}</button></li>`).join('') || `<li class="buit">${t('Cap cançó.')}</li>`;
    $res.hidden = false;
  });
  $res.addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]');
    if (!b) return;
    items.push({ moment: '', cant: b.dataset.s });
    $cerca.value = ''; $res.hidden = true;
    pintaItems();
    $items.lastElementChild?.querySelector('input')?.focus();
  });
  document.getElementById('cel-text').addEventListener('click', () => {
    items.push({ moment: '', text: '' });
    pintaItems();
    $items.lastElementChild?.querySelector('textarea')?.focus();
  });

  document.getElementById('cel-desa').addEventListener('click', async () => {
    const titol = document.getElementById('cel-titol').value.trim();
    if (!titol) { avis(t('Cal posar un títol.')); return; }
    const sub = document.getElementById('cel-sub').value.trim();
    let font = `{title: ${titol}}\n${sub ? `{subtitle: ${sub}}\n` : ''}`;
    for (const it of items) {
      font += '\n';
      if (it.moment.trim()) font += `{comment: ${it.moment.trim()}}\n`;
      font += 'cant' in it ? `{cant: ${it.cant}}\n` : `${it.text.replace(/\s+$/, '')}\n`;
    }
    let nouSlug = slug;
    if (!nouSlug) {
      nouSlug = slugDe(titol);
      let n = 2;
      while (celebracioPerSlug(nouSlug)) nouSlug = `${slugDe(titol)}-${n++}`;
    }
    const estat = document.getElementById('cel-estat');
    estat.textContent = t('Desant…');
    try {
      await desaFitxer(`celebracions/${nouSlug}.cho`, font, `${entrada ? 'Canvia' : 'Afegeix'} la celebració «${titol}»`);
      if (!(await esLocal())) apuntaPendent(`celebracions/${nouSlug}.cho`, font);
      aplicaCanvi(`celebracions/${nouSlug}.cho`, font);
      avis((await esLocal()) ? t('Desat') : t("Desat. La web pública s'actualitzarà en un minut."), 4000);
      location.hash = `#/celebracio/${nouSlug}`;
    } catch (err) {
      estat.textContent = err.message;
    }
  });
  const esb = document.getElementById('cel-esborra');
  if (esb) {
    esb.addEventListener('click', async () => {
      if (!esb.dataset.segur) {
        esb.dataset.segur = '1';
        esb.innerHTML = `<svg><use href="#i-trash"/></svg>${t('Segur? Toca per esborrar-la')}`;
        return;
      }
      try {
        await esborraFitxer(`celebracions/${slug}.cho`, `Esborra la celebració «${cel.titol}»`);
        if (!(await esLocal())) apuntaPendent(`celebracions/${slug}.cho`, null);
        aplicaCanvi(`celebracions/${slug}.cho`, null);
        estatLlista.pestanya = 'celebracions';
        location.hash = '#/';
      } catch (err) {
        document.getElementById('cel-estat').textContent = err.message;
      }
    });
  }
}

/* --- Accés per editar --- */
async function vistaAcces() {
  const local = await esLocal();
  const pinta = (estat = '') => {
    const qui = usuari();
    posa(`
    <div class="pagina">
      <h1>${t('Per editar el cançoner')}</h1>
      ${local ? `<p>${t('Ara la web està oberta amb el servidor local: els canvis es desen en aquest ordinador i no cal entrar.')}</p><p><a class="boto" href="#/nou/cant"><svg><use href="#i-plus"/></svg>${t('Afegeix una cançó')}</a></p>` : qui ? `
        <p>${t('Has entrat amb el compte de GitHub {0}: a cada cançó hi ha el llapis per editar-la i, a dalt, el botó «Nova».', `<strong>${esc(qui)}</strong>`)}</p>
        <p><button class="boto" id="surt">${t('Surt')}</button></p>` : `
        <p>${t("Entra amb el teu compte de GitHub. Si formes part de l'organització {0} amb permís per escriure, podràs afegir i editar cançons des d'aquest navegador.", '<strong>cantem-junts</strong>')}</p>
        <p><button class="boto boto-principal" id="entra">${t('Entra amb GitHub')}</button> <span class="estat" id="estat-entrada" role="status">${esc(estat)}</span></p>
        <p class="ajuda">${t("La primera vegada GitHub et demanarà que autoritzis l'aplicació «Cantem junts», que només pot escriure al cançoner. La sessió es queda en aquest navegador fins que surts.")}</p>`}
    </div>`, t('Per editar'));
    document.getElementById('surt')?.addEventListener('click', () => { tancaSessio(); avis(t('Has sortit')); ruta(); });
    document.getElementById('entra')?.addEventListener('click', async () => {
      const e = document.getElementById('estat-entrada');
      e.textContent = t('Esperant GitHub…');
      try {
        const nom = await iniciaSessio();
        avis(t('Has entrat com a {0}: ja pots editar', nom), 4000);
        location.hash = '#/';
      } catch (err) {
        e.textContent = err.message;
      }
    });
  };
  pinta();
  // Tornada de GitHub a la mateixa pestanya (si el navegador va bloquejar la finestra).
  try {
    const nom = await completaRetorn();
    if (nom) { avis(t('Has entrat com a {0}: ja pots editar', nom), 4000); location.hash = '#/'; }
  } catch (err) {
    pinta(err.message);
  }
}

function vistaPrivadesa() {
  posa(`
    <div class="pagina">
      <h1>${t('Privadesa')}</h1>
      <p>${t('Aquesta web no recull cap dada de qui la visita: no fa servir galetes, no compta visites i no carrega res de tercers.')}</p>
      <p>${t('Les preferències (tema, llengua, notació dels acords, mida de la lletra, el to triat de cada cançó) es guarden només en el teu navegador.')}</p>
      <p>${t("Qui edita el cançoner hi entra amb el seu compte de GitHub. La clau de la sessió es guarda només en el seu navegador i s'envia a GitHub per desar els canvis; per obtenir-la i renovar-la passa per un petit servei a bilateria.org, el hosting de l'autor, que no en guarda res.")}</p>
      <p>${t("La web està allotjada a GitHub Pages, que, com qualsevol servidor, rep l'adreça IP de qui hi entra. Ho explica a la {0}.", `<a href="https://docs.github.com/${llengua}/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">${t('declaració de privadesa de GitHub')}</a>`)}</p>
    </div>`, t('Privadesa'));
}

function vistaCredits() {
  posa(`
    <div class="pagina">
      <h1>${t('Crèdits')}</h1>
      <p>${t('Les lletres i les músiques dels cants són dels seus autors.')}</p>
      <p>${t('Programa fet amb IA ({0}). Codi amb llicència {1}.', `<a href="https://jjdeharo.github.io/miae/?nivel=4" target="_blank" rel="noopener">${t('MIAE nivell 4')}</a>`, '<a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">AGPL 3.0 o posterior</a>')}</p>
      <p>${t('Icones de {0}, amb llicència ISC.', '<a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a>')}</p>
      <p>${t('Les cançons es guarden en format {0}.', '<a href="https://www.chordpro.org" target="_blank" rel="noopener">ChordPro</a>')}</p>
    </div>`, t('Crèdits'));
}

/* --- Llengua --- */
// Canviar de llengua torna a pintar la vista. A l'editor, si hi ha canvis
// sense desar, abans es pregunta, perquè es perdrien.
document.getElementById('btn-llengua').addEventListener('click', () => {
  if (window.onbeforeunload && window.onbeforeunload() && !confirm(t('Hi ha canvis sense desar. Si canvies de llengua es perdran. Vols continuar?'))) return;
  window.onbeforeunload = null;
  canviaLlengua(altraLlengua());
  aplicaTema(document.documentElement.dataset.theme === 'dark', false);
  if (dades.generat || dades.cancons.length) ruta();
});

/* --- Inici --- */
window.addEventListener('hashchange', () => { window.onbeforeunload = null; ruta(); });
carregaDades().then(ruta).catch((e) => {
  $app.innerHTML = `<p class="buit">${t("No s'han pogut carregar les cançons. {0}", esc(e.message))}</p>`;
});
