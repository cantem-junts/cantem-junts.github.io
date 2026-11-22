// SPDX-License-Identifier: AGPL-3.0-or-later
// Cantem junts: llista i cercador, vista de cada cançó amb canvi de to,
// celebracions i editor.

import {
  llegeixChordPro, transposaEtiqueta, toDeLaCanco, usaBemolls, nomDelTo, lletraNeta,
  acordsASobreAChordPro, tensAcordsASobre, posaAcord, acordsDeLaCanco, LLATI,
} from './acords.js';
import { esLocal, potEditar, desaFitxer, esborraFitxer, provaClau, clau, oblidaClau } from './desament.js';

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

/* --- Tema --- */
const sistemaFosc = matchMedia('(prefers-color-scheme: dark)');
function aplicaTema(fosc, triat) {
  document.documentElement.dataset.theme = fosc ? 'dark' : 'light';
  if (triat) pref.set('tema', fosc === sistemaFosc.matches ? null : (fosc ? 'fosc' : 'clar'));
  const b = document.getElementById('btn-tema');
  b.querySelector('use').setAttribute('href', fosc ? '#i-sun' : '#i-moon');
  b.title = fosc ? 'Passa al tema clar' : 'Passa al tema fosc';
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
    if (s.text === '') {
      (actual || nova()).frags.push({ acord, text: '', ini: pos });
      continue;
    }
    for (const p of s.text.split(/(\s+)/)) {
      if (p === '') continue;
      if (/^\s+$/.test(p)) {
        if (acord !== null && acord !== undefined) {
          (actual || nova()).frags.push({ acord, text: '', ini: pos });
          acord = null;
        }
        out.push({ tipus: 'espai', text: p, ini: pos });
        actual = null;
      } else {
        (actual || nova()).frags.push({ acord, text: p, ini: pos });
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
  const lletres = (text, ini) => {
    if (!text) return '\u200b';
    return mode === 'edicio'
      ? [...text].map((ch, k) => `<span class="c" data-i="${ini + k}">${esc(ch)}</span>`).join('')
      : esc(text);
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
        ? `<span class="f"><span class="a"${dataA}>${a}</span><span class="t">${lletres(f.text, f.ini)}</span></span>`
        : `<span class="t">${lletres(f.text, f.ini)}</span>`;
    }
    html += '</span>';
  }
  if (mode === 'edicio') {
    html += teAcords
      ? `<span class="f"><span class="a"></span><span class="t"><span class="fi" data-i="${llargada}" title="Acord al final de la línia">·</span></span></span>`
      : `<span class="t"><span class="fi" data-i="${llargada}" title="Acord al final de la línia">·</span></span>`;
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
      html += `<p class="comentari">${esc(l.text)}</p>`;
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

/* --- Rutes --- */
const estatLlista = { q: '', pestanya: 'cants', etiqueta: null };

// Els escoltadors que una vista posa a window es treuen en canviar de vista.
let vistaActual = new AbortController();

async function ruta() {
  vistaActual.abort();
  vistaActual = new AbortController();
  const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [primer, segon, tercer] = hash.split('/');
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
      <input id="q" type="search" placeholder="Cerca pel títol o per un tros de la lletra" aria-label="Cerca" value="${esc(estatLlista.q)}" autocomplete="off">
    </label>
    <div class="pestanyes" role="tablist">
      <button class="pestanya" role="tab" data-p="cants" aria-selected="${estatLlista.pestanya === 'cants'}">Cants (${dades.cancons.length})</button>
      <button class="pestanya" role="tab" data-p="celebracions" aria-selected="${estatLlista.pestanya === 'celebracions'}">Celebracions (${dades.celebracions.length})</button>
    </div>
    <div id="contingut-llista"></div>
  `);
  const pintaContingut = () => {
    const cont = document.getElementById('contingut-llista');
    if (estatLlista.pestanya === 'celebracions') {
      cont.innerHTML = `
        <p class="recompte">Cada celebració recull els cants d'una missa, en ordre.</p>
        <ul class="llista">${dades.celebracions.map((c) => `<li><a href="#/celebracio/${esc(c.slug)}"><span class="titol-llista">${esc(c.titol)}</span>${c.subtitol ? `<span class="detall">${esc(c.subtitol)}</span>` : ''}</a></li>`).join('') || '<li class="buit">Encara no hi ha cap celebració.</li>'}</ul>
        <p class="no-imprimir" id="nova-celebracio" hidden><a class="boto" href="#/nou/celebracio"><svg><use href="#i-plus"/></svg>Nova celebració</a></p>`;
      potEditar().then((s) => { const b = document.getElementById('nova-celebracio'); if (b) b.hidden = !s; });
      return;
    }
    const res = cerca(estatLlista.q);
    cont.innerHTML = `
      ${etiquetes.length ? `<div class="etiquetes" aria-label="Filtra per tema">${etiquetes.map((e) => `<button class="etiqueta" data-e="${esc(e)}" aria-pressed="${estatLlista.etiqueta === e}">${esc(e)}</button>`).join('')}</div>` : ''}
      ${estatLlista.q || estatLlista.etiqueta ? `<p class="recompte">${res.length === 1 ? '1 cançó' : `${res.length} cançons`}</p>` : ''}
      <ul class="llista">${res.map((r) => `<li><a href="#/cant/${esc(r.c.slug)}"><span class="titol-llista">${marca(r.c.titol, r.paraulesQ)}</span><span class="detall">${marca(r.detall, r.paraulesQ)}</span></a></li>`).join('') || '<li class="buit">No hi ha cap cançó que coincideixi.</li>'}</ul>`;
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

/* --- Controls comuns de la vista --- */
function htmlControlsVista(ambTo) {
  return `
    ${ambTo ? `<div class="grup" role="group" aria-label="To">
      <button class="boto" data-acc="baixa" title="Baixa mig to"><svg><use href="#i-minus"/></svg></button>
      <button class="boto valor" data-acc="to-original" id="valor-to" title="Torna al to original"></button>
      <button class="boto" data-acc="puja" title="Puja mig to"><svg><use href="#i-plus"/></svg></button>
    </div>` : ''}
    <div class="grup" role="group" aria-label="Notació dels acords">
      <button class="boto" data-acc="llati" aria-pressed="${opcions.notacio === 'llati'}" title="Acords en notació llatina (DO, RE, MI)">DO</button>
      <button class="boto" data-acc="america" aria-pressed="${opcions.notacio === 'america'}" title="Acords en notació americana (C, D, E)">C</button>
    </div>
    <div class="grup" role="group" aria-label="Mida de la lletra">
      <button class="boto" data-acc="petita" title="Lletra més petita">A−</button>
      <button class="boto" data-acc="gran" title="Lletra més gran">A+</button>
    </div>
    <button class="boto" data-acc="acords" aria-pressed="${opcions.acords}" title="Mostra o amaga els acords"><svg><use href="#i-music"/></svg></button>
    <span class="separador"></span>
    <button class="boto" data-acc="imprimeix" title="Imprimeix o desa en PDF"><svg><use href="#i-printer"/></svg></button>
    <button class="boto" data-acc="comparteix" title="Comparteix l'enllaç"><svg><use href="#i-share"/></svg></button>`;
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
    } else if (acc === 'petita' || acc === 'gran') {
      opcions.mida = Math.round(Math.min(2.2, Math.max(0.7, opcions.mida + (acc === 'gran' ? 0.1 : -0.1))) * 10) / 10;
      pref.set('mida', opcions.mida);
      document.documentElement.style.setProperty('--mida', opcions.mida);
      reajusta();
    } else if (acc === 'acords') {
      opcions.acords = !opcions.acords; pref.set('acords', opcions.acords ? '1' : '0');
      b.setAttribute('aria-pressed', opcions.acords);
      document.querySelector('.canco')?.classList.toggle('sense-acords', !opcions.acords);
      reajusta();
    } else if (acc === 'imprimeix') {
      window.print();
    } else if (acc === 'comparteix') {
      const dades2 = { title: document.title, url: location.href };
      if (navigator.share) { try { await navigator.share(dades2); } catch (err) { /* cancel·lat */ } }
      else { try { await navigator.clipboard.writeText(location.href); avis('Enllaç copiat'); } catch (err) { avis(location.href, 6000); } }
    } else if (salt) {
      salt(acc);
    }
  });
}

/* --- Cançó --- */
function vistaCanco(slug) {
  const entrada = cancoPerSlug(slug);
  if (!entrada) return posa('<p class="buit">No s\'ha trobat aquesta cançó. <a href="#/">Torna a la llista</a>.</p>');
  const canco = llegeixChordPro(entrada.font);
  const to = toDeLaCanco(canco);
  let salt = Number(pref.get('to.' + slug, '0'));
  posa(`
    <div class="barra">
      <a class="boto" href="#/" title="Torna a la llista"><svg><use href="#i-left"/></svg></a>
      ${to ? htmlControlsVista(true) : htmlControlsVista(false)}
      <a class="boto" id="btn-edita" href="#/edita/cant/${esc(slug)}" title="Edita aquesta cançó" hidden><svg><use href="#i-pencil"/></svg></a>
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
      v.title = salt ? `Torna al to original (${nomDelTo(to, 0, opcions.notacio)})` : 'To original';
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
  if (!entrada) return posa('<p class="buit">No s\'ha trobat aquesta celebració. <a href="#/">Torna a la llista</a>.</p>');
  const cel = llegeixChordPro(entrada.font);
  posa(`
    <div class="barra">
      <a class="boto" href="#/" title="Torna a la llista"><svg><use href="#i-left"/></svg></a>
      ${htmlControlsVista(false)}
      <a class="boto" id="btn-edita" href="#/edita/celebracio/${esc(slug)}" title="Edita aquesta celebració" hidden><svg><use href="#i-pencil"/></svg></a>
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
      if (!e) { index.push(`<li>${esc(s)}</li>`); return `<section class="moment" id="${id}"><h2>${esc(s)}</h2><p class="buit">Aquesta cançó ja no hi és.</p></section>`; }
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
  selector.setAttribute('aria-label', 'Tria un acord');
  selector.innerHTML = `
    <h3>${actual ? `Canvia ${esc(actual)}` : 'Posa un acord'}<button class="boto" data-tanca title="Tanca"><svg><use href="#i-x"/></svg></button></h3>
    ${usats.length ? `<div class="fila usats">${usats.map((a) => `<button class="boto" data-a="${esc(a)}">${esc(a)}</button>`).join('')}</div>` : ''}
    <div class="fila">${arrels.map((a) => `<button class="boto" data-arrel="${a}">${a}</button>`).join('')}</div>
    <div class="fila">
      <button class="boto" data-mod="#" title="Sostingut">#</button>
      <button class="boto" data-mod="b" title="Bemoll">b</button>
      <button class="boto" data-mod="m" title="Menor">m</button>
      <button class="boto" data-mod="7" title="Sèptima">7</button>
    </div>
    <div class="escriure">
      <input type="text" value="${esc(actual || '')}" aria-label="Acord" placeholder="Escriu l'acord">
      <button class="boto boto-principal" data-posa>Posa</button>
      ${actual ? '<button class="boto boto-perill" data-treu title="Treu aquest acord"><svg><use href="#i-trash"/></svg></button>' : ''}
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
  if (slug && !entrada) return posa('<p class="buit">No s\'ha trobat aquesta cançó.</p>');
  const inicial = entrada ? llegeixChordPro(entrada.font) : { titol: '', etiquetes: [] };
  // El títol i les etiquetes es treuen del text: al quadre només hi ha la lletra.
  let cos = entrada ? entrada.font.split('\n').filter((l) => !/^\{\s*(title|t|meta)\s*:/.test(l)).join('\n').replace(/^\n+/, '') : '';
  const totesEtiquetes = [...new Set(dades.cancons.flatMap((c) => c.etiquetes))].sort(col.compare);
  posa(`
    <div class="barra">
      <a class="boto" href="${entrada ? `#/cant/${esc(slug)}` : '#/'}" title="Torna sense desar"><svg><use href="#i-left"/></svg></a>
      <strong>${entrada ? 'Edita la cançó' : 'Cançó nova'}</strong>
    </div>
    <div class="camps-editor">
        <div class="camp"><label for="ed-titol">Títol</label><input id="ed-titol" value="${esc(inicial.titol)}" autocomplete="off"></div>
        <div class="camp"><label for="ed-etiq">Temes</label><input id="ed-etiq" list="llista-etiq" value="${esc(inicial.etiquetes.join(', '))}" placeholder="Per exemple: Nadal, Maria" autocomplete="off">
          <datalist id="llista-etiq">${totesEtiquetes.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>
          <p class="ajuda">Separats per comes. Serveixen per filtrar la llista.</p></div>
        <div class="pestanyes pestanyes-editor" role="tablist">
          <button class="pestanya" role="tab" data-v="text" aria-selected="true">Lletra</button>
          <button class="pestanya" role="tab" data-v="vista" aria-selected="false">Acords</button>
        </div>
    </div>
    <div class="editor" data-vista="text">
      <div class="panell-text">
        <div class="camp">
          <label for="ed-text" class="rotol-lletra">Lletra</label>
          <p class="ajuda">Escriu o enganxa la lletra. Si l'enganxes amb els acords a la línia de sobre, es col·loquen sols damunt de cada síl·laba. Una línia en blanc separa les estrofes.</p>
          <div class="eines-text">
            <button class="boto" data-eina="tornada" title="Marca les línies triades com a tornada">Tornada</button>
            <button class="boto" data-eina="nota" title="Afegeix una nota, com «Dues vegades»">Nota</button>
          </div>
          <textarea id="ed-text" spellcheck="false">${esc(cos)}</textarea>
        </div>
      </div>
      <div class="panell-vista">
        <div class="barra-acords" id="ed-barra" role="toolbar" aria-label="Acords"></div>
        <p class="ajuda" id="ed-ajuda-acords">Tria un acord de la barra i toca les síl·labes on va. Amb la goma, toca els acords que sobren. Per moure'n un, arrossega'l (al mòbil, mantén-lo premut un moment).</p>
        <div class="vista-editor canco" id="ed-vista"></div>
      </div>
    </div>
    <div class="accions-editor">
      <button class="boto boto-principal" id="ed-desa"><svg><use href="#i-pencil"/></svg>Desa</button>
      <span class="estat" id="ed-estat"></span>
      <span class="separador"></span>
      ${entrada ? '<button class="boto boto-perill" id="ed-esborra"><svg><use href="#i-trash"/></svg>Esborra</button>' : ''}
    </div>
  `, entrada ? `Edita: ${inicial.titol}` : 'Cançó nova');

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
    $vista.innerHTML = htmlCanco(c, 0, 'edicio') || '<p class="ajuda">Aquí es veurà la lletra amb els acords.</p>';
    ajustaAcords($vista);
  };
  pinta();
  const marcaCanvi = () => { canviat = true; document.getElementById('ed-estat').textContent = 'Canvis sense desar'; };
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
    avis('Acords col·locats damunt de la lletra. Revisa-ho a «Acords».', 4000);
  });

  $app.querySelector('.eines-text').addEventListener('click', (e) => {
    const b = e.target.closest('[data-eina]');
    if (!b) return;
    const v = $text.value;
    let ini = $text.selectionStart;
    let fi = $text.selectionEnd;
    if (b.dataset.eina === 'tornada') {
      ini = v.lastIndexOf('\n', ini - 1) + 1;
      const f = v.indexOf('\n', Math.max(fi - 1, ini));
      fi = f === -1 ? v.length : f;
      const tros = v.slice(ini, fi);
      $text.setRangeText(`{start_of_chorus}\n${tros}\n{end_of_chorus}`, ini, fi, 'end');
    } else {
      const inici = v.lastIndexOf('\n', ini - 1) + 1;
      $text.setRangeText('{comment: Dues vegades}\n', inici, inici, 'select');
      $text.setSelectionRange(inici + 10, inici + 22);
    }
    $text.focus();
    pinta(); marcaCanvi();
  });

  $app.querySelector('.pestanyes-editor').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    $editor.dataset.vista = b.dataset.v;
    $app.querySelectorAll('.pestanyes-editor .pestanya').forEach((x) => x.setAttribute('aria-selected', x === b));
    pinta();
  });

  /* Pinzell i goma: es tria a la barra què fa tocar la lletra. */
  let eina = null; // { acord: 'SOL' } o { goma: true }
  const extres = [];
  const historial = [];
  const $barra = document.getElementById('ed-barra');
  const pintaBarra = () => {
    const acords = [...new Set([...acordsDeLaCanco($text.value), ...extres])];
    $barra.innerHTML = `
      <div class="xips">${acords.map((a) => `<button class="boto xip" data-pinzell="${esc(a)}" aria-pressed="${eina?.acord === a}" title="Posa ${esc(a)} on toquis">${esc(a)}</button>`).join('')}
        <button class="boto" data-altre title="Un acord que no és a la barra"><svg><use href="#i-plus"/></svg>Altre</button></div>
      <div class="eines-acords">
        <button class="boto" data-goma aria-pressed="${!!eina?.goma}" title="Goma: treu l'acord que toquis"><svg><use href="#i-eraser"/></svg></button>
        <button class="boto" data-desfes title="Desfés l'últim canvi d'acords" ${historial.length ? '' : 'disabled'}><svg><use href="#i-undo"/></svg></button>
      </div>`;
    $vista.classList.toggle('amb-goma', !!eina?.goma);
    $vista.classList.toggle('amb-pinzell', !!eina?.acord);
  };
  const canviaLinia = (canvis) => {
    historial.push($text.value);
    if (historial.length > 100) historial.shift();
    const ls = $text.value.split('\n');
    for (const [num, f] of canvis) ls[num] = f(ls[num]);
    $text.value = ls.join('\n');
    pinta(); pintaBarra(); marcaCanvi();
  };
  pintaBarra();
  $text.addEventListener('input', pintaBarra);

  $barra.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pinzell) eina = eina?.acord === b.dataset.pinzell ? null : { acord: b.dataset.pinzell };
    else if ('goma' in b.dataset) eina = eina?.goma ? null : { goma: true };
    else if ('desfes' in b.dataset) {
      if (!historial.length) return;
      $text.value = historial.pop();
      pinta(); marcaCanvi();
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
  });

  // Tocar la lletra fa el que digui l'eina triada.
  $vista.addEventListener('click', (e) => {
    if (arrossegat) { arrossegat = false; return; }
    const marca = e.target.closest('[data-i]');
    const pl = e.target.closest('[data-num]');
    if (!marca || !pl) return;
    const num = Number(pl.dataset.num);
    const idx = Number(marca.dataset.i);
    const teAcord = actualA($text.value.split('\n')[num], idx) !== null;
    if (!eina) { avis('Tria primer un acord de la barra, o la goma per treure\'n.'); return; }
    if (eina.goma) {
      if (teAcord) canviaLinia([[num, (l) => posaAcord(l, idx, '')]]);
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
        const acord = actualA($text.value.split('\n')[num], idx);
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
    if (!titol) { avis('Cal posar un títol.'); $titol.focus(); return; }
    let nouSlug = slug;
    if (!nouSlug) {
      nouSlug = slugDe(titol);
      let n = 2;
      while (cancoPerSlug(nouSlug)) nouSlug = `${slugDe(titol)}-${n++}`;
    }
    const text = font();
    const estat = document.getElementById('ed-estat');
    estat.textContent = 'Desant…';
    try {
      await desaFitxer(`cancons/${nouSlug}.cho`, text, `${entrada ? 'Canvia' : 'Afegeix'} «${titol}»`);
      if (!(await esLocal())) apuntaPendent(`cancons/${nouSlug}.cho`, text);
      aplicaCanvi(`cancons/${nouSlug}.cho`, text);
      canviat = false;
      avis((await esLocal()) ? 'Desat' : 'Desat. La web pública s\'actualitzarà en un minut.', 4000);
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
        esb.innerHTML = '<svg><use href="#i-trash"/></svg>Segur? Toca per esborrar-la';
        setTimeout(() => { if (esb.isConnected) { delete esb.dataset.segur; esb.innerHTML = '<svg><use href="#i-trash"/></svg>Esborra'; } }, 5000);
        return;
      }
      const usada = dades.celebracions.filter((c) => new RegExp(`\\{\\s*cant\\s*:\\s*${slug}\\s*\\}`).test(c.font));
      if (usada.length) {
        document.getElementById('ed-estat').textContent = `No es pot esborrar: és a ${usada.map((c) => `«${c.titol}»`).join(', ')}. Treu-la'n primer.`;
        return;
      }
      try {
        await esborraFitxer(`cancons/${slug}.cho`, `Esborra «${inicial.titol}»`);
        if (!(await esLocal())) apuntaPendent(`cancons/${slug}.cho`, null);
        aplicaCanvi(`cancons/${slug}.cho`, null);
        avis('Cançó esborrada');
        location.hash = '#/';
      } catch (err) {
        document.getElementById('ed-estat').textContent = err.message;
      }
    });
  }

  window.onbeforeunload = () => (canviat ? true : undefined);
}

function actualA(linia, idx) {
  let comptador = 0;
  for (let i = 0; i < linia.length; i++) {
    if (linia[i] === '[') {
      const t = linia.indexOf(']', i);
      if (t > -1) { if (comptador === idx) return linia.slice(i + 1, t); i = t; continue; }
    }
    if (comptador === idx) return null;
    comptador++;
  }
  return null;
}

/* --- Editor de celebracions --- */
async function editorCelebracio(slug) {
  if (!(await potEditar())) { location.hash = '#/acces'; return; }
  const entrada = slug ? celebracioPerSlug(slug) : null;
  if (slug && !entrada) return posa('<p class="buit">No s\'ha trobat aquesta celebració.</p>');
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
      <a class="boto" href="${entrada ? `#/celebracio/${esc(slug)}` : '#/'}" title="Torna sense desar"><svg><use href="#i-left"/></svg></a>
      <strong>${entrada ? 'Edita la celebració' : 'Celebració nova'}</strong>
    </div>
    <div class="pagina">
      <div class="camp"><label for="cel-titol">Títol</label><input id="cel-titol" value="${esc(cel.titol)}" placeholder="Per exemple: Inici de curs 2026-27"></div>
      <div class="camp"><label for="cel-sub">Detall</label><input id="cel-sub" value="${esc(cel.subtitol || '')}" placeholder="Data, lloc…"></div>
      <h2>Cants, en ordre</h2>
      <ul class="items" id="items"></ul>
      <div class="camp">
        <label for="cel-cerca">Afegeix un cant</label>
        <input id="cel-cerca" type="search" placeholder="Cerca pel títol o la lletra" autocomplete="off">
        <ul class="resultats-afegir" id="cel-resultats" hidden></ul>
      </div>
      <p><button class="boto" id="cel-text"><svg><use href="#i-plus"/></svg>Afegeix un text (salm, resposta…)</button></p>
      <div class="accions-editor">
        <button class="boto boto-principal" id="cel-desa">Desa</button>
        <span class="estat" id="cel-estat"></span>
        <span class="separador"></span>
        ${entrada ? '<button class="boto boto-perill" id="cel-esborra"><svg><use href="#i-trash"/></svg>Esborra</button>' : ''}
      </div>
    </div>
  `, entrada ? `Edita: ${cel.titol}` : 'Celebració nova');

  const $items = document.getElementById('items');
  const pintaItems = () => {
    $items.innerHTML = items.map((it, i) => `
      <li class="item" data-i="${i}">
        <div>
          <div class="camp"><label for="mom-${i}">Moment</label><input id="mom-${i}" data-camp="moment" value="${esc(it.moment)}" placeholder="Entrada, Glòria, Ofertori…" list="moments"></div>
          ${'cant' in it
            ? `<p class="nom-canco">${esc(cancoPerSlug(it.cant)?.titol || it.cant)}</p>`
            : `<div class="camp"><label for="txt-${i}">Text</label><textarea id="txt-${i}" data-camp="text" rows="3" style="min-height:5rem">${esc(it.text)}</textarea></div>`}
        </div>
        <div class="botons-item">
          <button class="boto" data-mou="-1" title="Puja" ${i === 0 ? 'disabled' : ''}><svg><use href="#i-up"/></svg></button>
          <button class="boto" data-mou="1" title="Baixa" ${i === items.length - 1 ? 'disabled' : ''}><svg><use href="#i-down"/></svg></button>
          <button class="boto boto-perill" data-treu title="Treu-lo de la llista"><svg><use href="#i-x"/></svg></button>
        </div>
      </li>`).join('') + `<datalist id="moments">${['Entrada', 'Perdó', 'Glòria', 'Salm', 'Al·leluia', 'Ofertori', 'Sant', 'Pare nostre', 'Pau', 'Anyell de Déu', 'Comunió', 'Acció de gràcies', 'Sortida'].map((m) => `<option value="${m}">`).join('')}</datalist>`;
    if (!items.length) $items.innerHTML = '<li class="buit">Encara no hi ha cap cant. Cerca\'ls a sota.</li>';
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
    $res.innerHTML = res.map((r) => `<li><button data-s="${esc(r.c.slug)}">${esc(r.c.titol)}</button></li>`).join('') || '<li class="buit">Cap cançó.</li>';
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
    if (!titol) { avis('Cal posar un títol.'); return; }
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
    estat.textContent = 'Desant…';
    try {
      await desaFitxer(`celebracions/${nouSlug}.cho`, font, `${entrada ? 'Canvia' : 'Afegeix'} la celebració «${titol}»`);
      if (!(await esLocal())) apuntaPendent(`celebracions/${nouSlug}.cho`, font);
      aplicaCanvi(`celebracions/${nouSlug}.cho`, font);
      avis((await esLocal()) ? 'Desat' : 'Desat. La web pública s\'actualitzarà en un minut.', 4000);
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
        esb.innerHTML = '<svg><use href="#i-trash"/></svg>Segur? Toca per esborrar-la';
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
  const te = !!clau();
  posa(`
    <div class="pagina">
      <h1>Per editar el cançoner</h1>
      ${local ? '<p>Ara la web està oberta amb el servidor local: els canvis es desen en aquest ordinador i no cal cap clau.</p><p><a class="boto" href="#/nou/cant"><svg><use href="#i-plus"/></svg>Afegeix una cançó</a></p>' : te ? `
        <p>Aquest navegador ja pot editar: a cada cançó hi ha el botó per editar-la i, a dalt, el de «Nova».</p>
        <p><button class="boto" id="oblida">Deixa d'editar en aquest navegador</button></p>` : `
        <p>Només cal fer-ho una vegada en cada navegador. Les cançons es desen al repositori del cançoner a GitHub, i per escriure-hi cal una clau personal.</p>
        <ol>
          <li>Entra a GitHub amb el teu compte i obre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">la pàgina per crear una clau</a>.</li>
          <li>Posa-li un nom (per exemple, «Cantem junts») i, a la caducitat, la data més llunyana que et deixi.</li>
          <li>A «Resource owner» tria <strong>cantem-junts</strong>; a «Repository access», «Only select repositories» i el repositori <strong>cantem-junts.github.io</strong>.</li>
          <li>A «Permissions», busca <strong>Contents</strong> i tria «Read and write». Crea la clau i copia-la.</li>
          <li>Enganxa-la aquí:</li>
        </ol>
        <div class="camp"><label for="clau">Clau</label><input id="clau" type="password" autocomplete="off" placeholder="github_pat_…"></div>
        <p><button class="boto boto-principal" id="desa-clau">Comprova i desa</button> <span class="estat" id="estat-clau"></span></p>
        <p class="ajuda">La clau es queda només en aquest navegador i només s'envia a GitHub. Qui no la té pot llegir el cançoner, però no canviar-lo.</p>`}
    </div>`, 'Per editar');
  document.getElementById('oblida')?.addEventListener('click', () => { oblidaClau(); avis('Aquest navegador ja no pot editar'); ruta(); });
  document.getElementById('desa-clau')?.addEventListener('click', async () => {
    const c = document.getElementById('clau').value.trim();
    const estat = document.getElementById('estat-clau');
    if (!c) return;
    estat.textContent = 'Comprovant…';
    try {
      const r = await provaClau(c);
      if (r.ok) { avis('Llest: ja pots editar des d\'aquest navegador'); location.hash = '#/'; }
      else estat.textContent = r.motiu;
    } catch (e) {
      estat.textContent = 'No s\'ha pogut connectar amb GitHub.';
    }
  });
}

function vistaPrivadesa() {
  posa(`
    <div class="pagina">
      <h1>Privadesa</h1>
      <p>Aquesta web no recull cap dada de qui la visita: no fa servir galetes, no compta visites i no carrega res de tercers.</p>
      <p>Les preferències (tema, notació dels acords, mida de la lletra, el to triat de cada cançó) es guarden només en el teu navegador.</p>
      <p>Qui edita el cançoner hi guarda una clau de GitHub, també només en el seu navegador; s'envia únicament a GitHub per desar els canvis.</p>
      <p>La web està allotjada a GitHub Pages, que, com qualsevol servidor, rep l'adreça IP de qui hi entra. Ho explica a la <a href="https://docs.github.com/ca/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">declaració de privadesa de GitHub</a>.</p>
    </div>`, 'Privadesa');
}

function vistaCredits() {
  posa(`
    <div class="pagina">
      <h1>Crèdits</h1>
      <p>Les lletres i les músiques dels cants són dels seus autors.</p>
      <p>Programa fet amb IA (<a href="https://jjdeharo.github.io/miae/?nivel=4" target="_blank" rel="noopener">MIAE nivell 4</a>). Codi amb llicència <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">AGPL 3.0 o posterior</a>.</p>
      <p>Icones de <a href="https://lucide.dev" target="_blank" rel="noopener">Lucide</a>, amb llicència ISC.</p>
      <p>Les cançons es guarden en format <a href="https://www.chordpro.org" target="_blank" rel="noopener">ChordPro</a>.</p>
    </div>`, 'Crèdits');
}

/* --- Inici --- */
window.addEventListener('hashchange', () => { window.onbeforeunload = null; ruta(); });
carregaDades().then(ruta).catch((e) => {
  $app.innerHTML = `<p class="buit">No s'han pogut carregar les cançons. ${esc(e.message)}</p>`;
});
