// SPDX-License-Identifier: AGPL-3.0-or-later
// Acords: lectura en notació llatina (DO, lam, mi m, FA#7) i americana (C, Am),
// canvi de to, format ChordPro i conversió del text amb els acords a sobre.
// No depèn del navegador: també el fan servir les proves i l'índex.

const LLATI = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
const LLATI_SEMITO = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };
const AMERICA_SEMITO = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOMS = {
  llati: {
    sost: ['do', 'do#', 're', 're#', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'la#', 'si'],
    bemoll: ['do', 'reb', 're', 'mib', 'mi', 'fa', 'solb', 'sol', 'lab', 'la', 'sib', 'si'],
  },
  america: {
    sost: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    bemoll: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  },
};

// El que pot anar darrere de la nota: m, 7, maj7, sus4, dim, aug, add9, º, +…
const SUFIX = /^(?: ?m(?!aj))?(?:maj|min|dim|aug|sus|add|M|m|º|°|ø|\+|\d|\(|\)|#|b)*$/;
const RE_LLATI = /^(do|re|mi|fa|sol|la|si)([#♯b♭]?)(.*)$/i;
const RE_AMERICA = /^([A-G])([#♯b♭]?)(.*)$/;

function alteracio(a) {
  if (a === '#' || a === '♯') return 1;
  if (a === 'b' || a === '♭') return -1;
  return 0;
}

function estilDeMajuscules(arrel) {
  if (arrel === arrel.toUpperCase()) return 'majuscules';
  if (arrel === arrel.toLowerCase()) return 'minuscules';
  return 'titol';
}

// Llegeix una nota sola (sense baix). Torna null si no és un acord.
function llegeixNota(text) {
  let m = text.match(RE_LLATI);
  if (m && SUFIX.test(m[3])) {
    // «sib» és si bemoll, però «sim» és si menor: el sufix ja ho distingeix.
    const estil = estilDeMajuscules(m[1]);
    const sufix = m[3];
    const menor = estil === 'minuscules' || /^ ?m(?!aj)/.test(sufix) || /^ ?min/.test(sufix);
    return {
      notacio: 'llati',
      semito: (LLATI_SEMITO[m[1].toLowerCase()] + alteracio(m[2]) + 12) % 12,
      alteracio: alteracio(m[2]),
      estil,
      sufix,
      menor,
    };
  }
  m = text.match(RE_AMERICA);
  if (m && SUFIX.test(m[3]) && !/^ /.test(m[3])) {
    const sufix = m[3];
    return {
      notacio: 'america',
      semito: (AMERICA_SEMITO[m[1]] + alteracio(m[2]) + 12) % 12,
      alteracio: alteracio(m[2]),
      estil: 'majuscules',
      sufix,
      menor: /^m(?!aj)/.test(sufix) || /^min/.test(sufix),
    };
  }
  return null;
}

// Un acord pot dur baix («DO/SOL»). Torna null si no és un acord.
export function llegeixAcord(text) {
  const t = text.trim();
  if (!t) return null;
  const [cap, baix, ...resta] = t.split('/');
  if (resta.length) return null;
  const nota = llegeixNota(cap);
  if (!nota) return null;
  let notaBaix = null;
  if (baix !== undefined) {
    notaBaix = llegeixNota(baix);
    if (!notaBaix || notaBaix.sufix.trim()) return null;
  }
  return { ...nota, baix: notaBaix };
}

// Una etiqueta d'acord pot portar-ne diversos: «la-FA», «DO SOL», «(MI7)».
// Es parteix en trossos que són acords i separadors que es deixen igual.
function trossos(text) {
  // «mi m» és un sol acord: l'espai abans de la «m» no separa.
  const parts = text.split(/(\s+|-(?=[A-Za-z])|[()|])/);
  const sortida = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === undefined || p === '') continue;
    if (/^\s+$/.test(p) && /^m(?!aj)/.test(parts[i + 1] || '') && sortida.length && llegeixAcord(sortida[sortida.length - 1].text + ' ' + parts[i + 1])) {
      const anterior = sortida.pop();
      sortida.push({ text: anterior.text + ' ' + parts[i + 1], acord: llegeixAcord(anterior.text + ' ' + parts[i + 1]) });
      i++;
      continue;
    }
    sortida.push({ text: p, acord: llegeixAcord(p) });
  }
  return sortida;
}

export function esEtiquetaDAcords(text) {
  const t = trossos(text);
  return t.some((x) => x.acord) && t.every((x) => x.acord || /^[\s()|\-–.x\d:]*$/.test(x.text));
}

function nomNota(semito, notacio, estil, bemolls) {
  let nom = NOMS[notacio][bemolls ? 'bemoll' : 'sost'][semito];
  if (notacio === 'llati') {
    const arrel = nom.replace(/[#b]$/, '');
    const alt = nom.slice(arrel.length);
    if (estil === 'majuscules') nom = arrel.toUpperCase() + alt;
    else if (estil === 'titol') nom = arrel[0].toUpperCase() + arrel.slice(1) + alt;
  }
  return nom;
}

// Escriu un acord ja llegit, desplaçat «salt» semitons i en la notació demanada.
// Si no canvia res, es torna tal com estava escrit.
function escriuAcord(acord, salt, notacio, bemolls, original) {
  if (salt === 0 && notacio === acord.notacio) return original;
  const nota = (n, esBaix) => {
    const semito = (n.semito + salt + 12) % 12;
    // Sense canvi de to es manté l'alteració de l'original (SIb no passa a LA#).
    const bem = salt === 0 ? n.alteracio < 0 : bemolls;
    if (notacio === n.notacio) {
      return nomNota(semito, notacio, n.estil, bem) + n.sufix;
    }
    if (notacio === 'america') {
      // lam → Am, mi m → Em, fa#7 → F#m7 (la minúscula vol dir menor).
      const sufix = n.sufix.trim();
      const posaM = !esBaix && n.menor && !/^m(?!aj)/.test(sufix) && !/^min/.test(sufix);
      return nomNota(semito, 'america', 'majuscules', bem) + (posaM ? 'm' : '') + sufix;
    }
    // De l'americana a la llatina: Am → lam, C7 → DO7.
    return nomNota(semito, 'llati', n.menor && !esBaix ? 'minuscules' : 'majuscules', bem) + n.sufix;
  };
  return nota(acord, false) + (acord.baix ? '/' + nota(acord.baix, true) : '');
}

export function transposaEtiqueta(text, salt, notacio, bemolls) {
  return trossos(text)
    .map((x) => (x.acord ? escriuAcord(x.acord, salt, notacio, bemolls, x.text) : x.text))
    .join('');
}

// El primer acord de la cançó en dona el to, prou per triar sostinguts o bemolls.
const TONS_BEMOLL_MAJOR = new Set([5, 10, 3, 8, 1]); // FA, SIb, MIb, LAb, REb
const TONS_BEMOLL_MENOR = new Set([2, 7, 0, 5, 10, 3]); // re, sol, do, fa, sib, mib

export function toDeLaCanco(canco) {
  for (const linia of canco.linies) {
    for (const s of linia.segments || []) {
      if (!s.acord) continue;
      const primer = trossos(s.acord).find((x) => x.acord);
      if (primer) return primer.acord;
    }
  }
  return null;
}

export function usaBemolls(to, salt) {
  if (!to) return false;
  const semito = (to.semito + salt + 12) % 12;
  return to.menor ? TONS_BEMOLL_MENOR.has(semito) : TONS_BEMOLL_MAJOR.has(semito);
}

export function nomDelTo(to, salt, notacio) {
  if (!to) return '';
  const semito = (to.semito + salt + 12) % 12;
  const bem = salt === 0 ? to.alteracio < 0 : usaBemolls(to, salt);
  if (notacio === 'america') return nomNota(semito, 'america', 'majuscules', bem) + (to.menor ? 'm' : '');
  return to.menor ? nomNota(semito, 'llati', 'minuscules', bem) + 'm' : nomNota(semito, 'llati', 'majuscules', bem);
}

/* --- ChordPro --- */

const DIRECTIVA = /^\{\s*([A-Za-z_]+)\s*(?::\s*(.*?))?\s*\}\s*$/;
const ALIES = {
  t: 'title', st: 'subtitle', soc: 'start_of_chorus', eoc: 'end_of_chorus',
  sov: 'start_of_verse', eov: 'end_of_verse', sob: 'start_of_bridge', eob: 'end_of_bridge',
  c: 'comment', ci: 'comment_italic', cb: 'comment_box',
};

// Parteix una línia «[DO]Si cer[mi m]ques» en segments {acord, text, inici, negreta}.
// «inici» és la posició del text del segment dins la línia original.
// «<b>…</b>» marca la negreta (la síl·laba forta, com a les presentacions
// antigues): no és text, i un canvi de negreta comença un segment nou sense
// acord. La negreta pot travessar acords: «<b>mo[DO]ment</b>».
export function segmentsDeLinia(linia) {
  const segments = [];
  const re = /\[([^\]]*)\]|<(\/?)b>/gi;
  let ultim = 0;
  let acord = null;
  let inici = 0;
  let negreta = false;
  let m;
  while ((m = re.exec(linia))) {
    const text = linia.slice(ultim, m.index);
    if (m[1] !== undefined) {
      if (text || acord !== null) segments.push({ acord, text, inici, negreta });
      acord = m[1];
    } else {
      // Un acord just abans de la marca va amb el text que la segueix.
      if (text) {
        segments.push({ acord, text, inici, negreta });
        acord = null;
      }
      negreta = !m[2];
    }
    ultim = re.lastIndex;
    inici = ultim;
  }
  const text = linia.slice(ultim);
  if (text || acord !== null) segments.push({ acord, text, inici, negreta });
  return segments;
}

export function llegeixChordPro(font) {
  const canco = { titol: '', subtitol: '', autor: '', etiquetes: [], linies: [] };
  let seccio = null;
  const linies = font.replace(/\r\n?/g, '\n').split('\n');
  linies.forEach((text, num) => {
    if (/^\s*#/.test(text)) return;
    const d = text.match(DIRECTIVA);
    if (d) {
      const nom = ALIES[d[1].toLowerCase()] || d[1].toLowerCase();
      const valor = (d[2] || '').trim();
      if (nom === 'title') canco.titol = valor;
      else if (nom === 'subtitle') canco.subtitol = valor;
      else if (nom === 'artist' || nom === 'composer' || nom === 'lyricist') canco.autor = canco.autor ? canco.autor + ', ' + valor : valor;
      else if (nom === 'meta') {
        const [clau, ...resta] = valor.split(/\s+/);
        if (clau === 'etiquetes') canco.etiquetes = resta.join(' ').split(',').map((e) => e.trim()).filter(Boolean);
      } else if (nom.startsWith('start_of_')) seccio = nom.slice(9);
      else if (nom.startsWith('end_of_')) seccio = null;
      else if (nom.startsWith('comment')) canco.linies.push({ tipus: 'comentari', text: valor, seccio, num });
      else if (nom === 'cant') canco.linies.push({ tipus: 'cant', slug: valor, num });
      else if (nom === 'chorus') canco.linies.push({ tipus: 'tornada', num });
      return;
    }
    if (!text.trim()) {
      canco.linies.push({ tipus: 'buida', seccio, num });
      return;
    }
    canco.linies.push({ tipus: 'lletra', segments: segmentsDeLinia(text), seccio, num });
  });
  return canco;
}

// El text net de la lletra, sense acords ni directives: per cercar.
export function lletraNeta(font) {
  return llegeixChordPro(font)
    .linies.filter((l) => l.tipus === 'lletra')
    .map((l) => l.segments.map((s) => s.text).join(''))
    .join('\n');
}

/* --- Text amb els acords a la línia de sobre --- */

function esLiniaDAcords(linia) {
  return !!linia.trim() && esEtiquetaDAcords(linia.trim());
}

// Posicions dels acords d'una línia d'acords: [{col, acord}].
function acordsAmbColumna(linia) {
  const res = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(linia))) {
    // «mi m»: la «m» solta s'enganxa a l'acord d'abans.
    if (/^m(?!aj)\S*$/.test(m[0]) && res.length) {
      const ant = res[res.length - 1];
      const junt = ant.acord + linia.slice(ant.col + ant.acord.length, m.index) + m[0];
      if (/^\S+ m/.test(junt) && llegeixAcord(junt)) {
        ant.acord = ant.acord + ' ' + m[0];
        continue;
      }
    }
    res.push({ col: m.index, acord: m[0] });
  }
  return res;
}

function fusiona(liniaAcords, lletra) {
  const acords = acordsAmbColumna(liniaAcords);
  let sortida = '';
  let pos = 0;
  for (const { col, acord } of acords) {
    if (col > lletra.length) {
      sortida += lletra.slice(pos);
      pos = lletra.length;
      sortida += (sortida && !/\s$/.test(sortida) ? ' ' : '') + `[${acord}]`;
    } else {
      sortida += lletra.slice(pos, col) + `[${acord}]`;
      pos = col;
    }
  }
  return sortida + lletra.slice(pos);
}

function expandeixTabuladors(linia, amplada = 8) {
  let s = '';
  for (const c of linia) {
    if (c === '\t') s += ' '.repeat(amplada - (s.length % amplada));
    else s += c;
  }
  return s;
}

// Hi ha alguna línia que sigui només d'acords?
export function tensAcordsASobre(text) {
  return text.split(/\r?\n/).some((l) => esLiniaDAcords(expandeixTabuladors(l)));
}

// Converteix el text amb els acords a sobre en ChordPro.
export function acordsASobreAChordPro(text) {
  const linies = text.replace(/\r\n?/g, '\n').split('\n').map((l) => expandeixTabuladors(l).replace(/\s+$/, ''));
  const sortida = [];
  for (let i = 0; i < linies.length; i++) {
    const l = linies[i];
    if (esLiniaDAcords(l)) {
      const seguent = linies[i + 1];
      if (seguent !== undefined && seguent.trim() && !esLiniaDAcords(seguent)) {
        sortida.push(fusiona(l, seguent));
        i++;
      } else {
        sortida.push(acordsAmbColumna(l).map((a) => `[${a.acord}]`).join(' '));
      }
    } else {
      sortida.push(l);
    }
  }
  return sortida.join('\n');
}

/* --- Edició: posar i treure acords --- */

// Posició dins la línia font que correspon a la lletra número «idx» del text.
export function posicioFont(linia, idx) {
  let comptador = 0;
  for (let i = 0; i <= linia.length; i++) {
    // Les marques de negreta no són lletres.
    const marca = /^<\/?b>/i.exec(linia.slice(i, i + 4));
    if (marca) {
      i += marca[0].length - 1;
      continue;
    }
    if (linia[i] === '[') {
      const tanca = linia.indexOf(']', i);
      if (tanca > -1) {
        if (comptador === idx) return { pos: i, acord: { inici: i, fi: tanca + 1, text: linia.slice(i + 1, tanca) } };
        i = tanca;
        continue;
      }
    }
    if (comptador === idx) return { pos: i, acord: null };
    comptador++;
  }
  return { pos: linia.length, acord: null };
}

// Posa (o canvia, o treu amb acord buit) l'acord damunt la lletra «idx».
export function posaAcord(linia, idx, acord) {
  const { pos, acord: existent } = posicioFont(linia, idx);
  const nou = acord ? `[${acord}]` : '';
  if (existent) return linia.slice(0, existent.inici) + nou + linia.slice(existent.fi);
  // Si la lletra queda més enllà del final, l'acord va al final.
  if (pos >= linia.length) return linia + (acord ? (linia && !/\s$/.test(linia) ? ' ' : '') + nou : '');
  return linia.slice(0, pos) + nou + linia.slice(pos);
}

// Posa o treu la negreta dels caràcters del text entre «ini» i «fi» (posicions
// del text sencer, com la selecció d'un textarea). Si tot el que hi ha triat ja
// era negreta, la treu; si no, la posa. Les marques es tornen a escriure
// senceres a cada línia tocada, perquè quedin ben aparellades.
export function canviaNegreta(text, ini, fi) {
  const linies = text.split('\n');
  // Primer: estat de cada lletra triada, per saber si es posa o es treu.
  const tocades = [];
  let pos = 0;
  for (const [n, l] of linies.entries()) {
    const ini0 = pos;
    pos += l.length + 1;
    if (pos <= ini || ini0 >= fi || DIRECTIVA.test(l)) continue;
    tocades.push({ n, cars: caractersAmbNegreta(l), desde: ini - ini0, fins: fi - ini0 });
  }
  const triats = tocades.flatMap(({ cars, desde, fins }) => cars.filter((c) => c.text !== undefined && c.pos >= desde && c.pos < fins && /\S/.test(c.text)));
  if (!triats.length) return text;
  const posa = !triats.every((c) => c.negreta);
  for (const { n, cars, desde, fins } of tocades) {
    for (const c of cars) if (c.text !== undefined && c.pos >= desde && c.pos < fins) c.negreta = posa;
    linies[n] = escriuAmbNegreta(cars);
  }
  return linies.join('\n');
}

// Una línia en peces: {acord} o {text: un caràcter, negreta, pos}.
function caractersAmbNegreta(linia) {
  const out = [];
  let negreta = false;
  for (let i = 0; i < linia.length; i++) {
    const marca = /^<(\/?)b>/i.exec(linia.slice(i, i + 4));
    if (marca) { negreta = !marca[1]; i += marca[0].length - 1; continue; }
    if (linia[i] === '[') {
      const tanca = linia.indexOf(']', i);
      if (tanca > -1) { out.push({ acord: linia.slice(i, tanca + 1) }); i = tanca; continue; }
    }
    out.push({ text: linia[i], negreta, pos: i });
  }
  return out;
}

// Torna a escriure la línia amb les marques justes: la negreta s'obre davant
// de la primera lletra, es tanca després de l'última i no deixa espais ni
// acords sobrers a dins.
function escriuAmbNegreta(cars) {
  const lletres = cars.filter((c) => c.text !== undefined);
  const seguentEsNegreta = (k) => {
    for (let j = k; j < cars.length; j++) {
      const c = cars[j];
      if (c.text !== undefined && /\S/.test(c.text)) return c.negreta;
    }
    return false;
  };
  let out = '';
  let dins = false;
  cars.forEach((c, k) => {
    if (c.text === undefined || /\s/.test(c.text)) {
      if (dins && !seguentEsNegreta(k + 1)) { out += '</b>'; dins = false; }
      out += c.text === undefined ? c.acord : c.text;
      return;
    }
    if (c.negreta && !dins) { out += '<b>'; dins = true; }
    if (!c.negreta && dins) { out += '</b>'; dins = false; }
    out += c.text;
  });
  if (dins) out += '</b>';
  return lletres.length ? out : cars.map((c) => c.acord ?? c.text).join('');
}

/* --- Síl·labes, per posar la negreta d'un toc --- */

const FORTES = 'aeoàèéòóáíúï';
const FEBLES = 'iuy';
const esVocal = (ch) => FORTES.includes(ch) || FEBLES.includes(ch) || ch === 'ü';
const GRUPS = /^[pbfgckdt][lr]$/;

// Parteix una paraula en síl·labes, amb les regles comunes del català i el
// castellà. Torna els límits [inici, fi) de cada una. No cal que sigui
// perfecta: només serveix per saber quines lletres es posen en negreta.
export function sillabes(paraula) {
  const w = paraula.toLowerCase();
  const n = w.length;
  // Què és cada lletra: 'V' vocal forta, 'v' vocal feble, 'C' consonant.
  const tipus = [];
  for (let i = 0; i < n; i++) {
    const ch = w[i];
    const seg = w[i + 1] || '';
    if (ch === 'u' && (w[i - 1] === 'q' || w[i - 1] === 'g') && 'eiéíè'.includes(seg)) tipus.push('C'); // «qu», «gu» muda
    else if (ch === 'ü') tipus.push(w[i - 1] === 'q' || w[i - 1] === 'g' ? 'C' : 'v');
    else if (ch === 'y') tipus.push(i > 0 && !esVocal(seg) && seg !== 'y' && tipus[i - 1] !== 'C' ? 'v' : (esVocal(seg) ? 'C' : (i > 0 ? 'v' : 'C')));
    else if (FORTES.includes(ch)) tipus.push('V');
    else if (FEBLES.includes(ch)) tipus.push('v');
    else tipus.push('C');
  }
  // Una «i» o «u» entre dues vocals fortes fa de consonant: «noia», «creient».
  for (let i = 1; i < n - 1; i++) if (tipus[i] === 'v' && tipus[i - 1] === 'V' && tipus[i + 1] === 'V') tipus[i] = 'C';
  // Nuclis: vocals seguides, partides entre dues fortes o davant d'una «ï».
  const nuclis = [];
  for (let i = 0; i < n; i++) {
    if (tipus[i] === 'C') continue;
    const prev = nuclis[nuclis.length - 1];
    const enganxat = prev && prev.fi === i;
    const forta = (k) => tipus[k] === 'V';
    if (enganxat && !(forta(i) && forta(i - 1)) && w[i] !== 'ï' && !/[íú]/.test(w[i] + w[i - 1])) prev.fi = i + 1;
    else nuclis.push({ ini: i, fi: i + 1 });
  }
  if (nuclis.length < 2) return [[0, n]];
  const talls = [];
  for (let k = 1; k < nuclis.length; k++) {
    const a = nuclis[k - 1].fi;
    const b = nuclis[k].ini;
    // Consonants entre els dos nuclis, amb els dígrafs com una sola peça.
    const peces = [];
    for (let i = a; i < b; i++) {
      const dos = w.slice(i, i + 2);
      if (w[i] === '·') { peces.push({ ini: i, fi: i + 1, punt: true }); continue; }
      if (['ch', 'll', 'rr', 'ny', 'qu', 'gu', 'gü', 'qü'].includes(dos) && i + 1 < b + (dos[1] === 'u' || dos[1] === 'ü' ? 1 : 0)) { peces.push({ ini: i, fi: i + 2 }); i++; continue; }
      peces.push({ ini: i, fi: i + 1 });
    }
    let tall;
    const punt = peces.findIndex((p) => p.punt);
    if (punt > -1) tall = peces[punt].fi;
    else if (peces.length === 0) tall = b;
    else if (peces.length === 1) tall = peces[0].ini;
    else {
      const [p, q] = peces.slice(-2);
      const grup = w.slice(p.ini, p.fi) + w.slice(q.ini, q.fi);
      tall = GRUPS.test(grup) ? p.ini : q.ini;
    }
    talls.push(tall);
  }
  const out = [];
  let ini = 0;
  for (const t of talls) { out.push([ini, t]); ini = t; }
  out.push([ini, n]);
  return out;
}

// Posa o treu la negreta de les lletres «a» a «b» (incloses) d'una línia. Les
// posicions compten només el text, sense acords ni marques, com a la vista.
export function canviaNegretaLletres(linia, a, b, posa = null) {
  const cars = caractersAmbNegreta(linia);
  const lletres = cars.filter((c) => c.text !== undefined);
  const triats = lletres.slice(a, b + 1).filter((c) => /\S/.test(c.text));
  if (!triats.length) return linia;
  const valor = posa ?? !triats.every((c) => c.negreta);
  for (const c of lletres.slice(a, b + 1)) c.negreta = valor;
  return escriuAmbNegreta(cars);
}

// Un toc sobre la lletra «idx»: si ja és negreta, la treu de tot el tros en
// negreta; si no, posa en negreta la síl·laba on és.
export function canviaNegretaSillaba(linia, idx) {
  const lletres = caractersAmbNegreta(linia).filter((c) => c.text !== undefined);
  const esLletra = (k) => lletres[k] && /[\p{L}·]/u.test(lletres[k].text);
  if (!esLletra(idx)) return linia;
  if (lletres[idx].negreta) {
    let a = idx;
    let b = idx;
    while (a > 0 && lletres[a - 1].negreta && /\S/.test(lletres[a - 1].text)) a--;
    while (b < lletres.length - 1 && lletres[b + 1].negreta && /\S/.test(lletres[b + 1].text)) b++;
    return canviaNegretaLletres(linia, a, b, false);
  }
  let a = idx;
  let b = idx;
  while (esLletra(a - 1)) a--;
  while (esLletra(b + 1)) b++;
  const paraula = lletres.slice(a, b + 1).map((c) => c.text).join('');
  const [ini, fi] = sillabes(paraula).find(([i, f]) => idx - a >= i && idx - a < f);
  return canviaNegretaLletres(linia, a + ini, a + fi - 1, true);
}

/* --- Tornades i notes --- */

const esLliniaDeLletra = (l) => l !== undefined && l.trim() !== '' && !DIRECTIVA.test(l) && !/^\s*#/.test(l);
const esDirectiva = (l, noms) => {
  const d = l?.match(DIRECTIVA);
  return !!d && noms.includes(ALIES[d[1].toLowerCase()] || d[1].toLowerCase());
};

// Converteix en tornada l'estrofa on hi ha la línia «num», o, si ja ho és,
// la torna estrofa normal.
export function canviaTornada(font, num) {
  const ls = font.split('\n');
  if (!esLliniaDeLletra(ls[num])) return font;
  const seccio = llegeixChordPro(font).linies.find((l) => l.num === num)?.seccio;
  if (seccio === 'chorus') {
    let ini = num;
    while (ini >= 0 && !esDirectiva(ls[ini], ['start_of_chorus'])) ini--;
    let fi = num;
    while (fi < ls.length && !esDirectiva(ls[fi], ['end_of_chorus'])) fi++;
    // Si toca una altra estrofa, la directiva es torna una línia en blanc
    // perquè no s'ajuntin.
    if (fi < ls.length) ls.splice(fi, 1, ...(esLliniaDeLletra(ls[fi + 1]) ? [''] : []));
    if (ini >= 0) ls.splice(ini, 1, ...(esLliniaDeLletra(ls[ini - 1]) ? [''] : []));
    return ls.join('\n');
  }
  let ini = num;
  while (esLliniaDeLletra(ls[ini - 1])) ini--;
  let fi = num;
  while (esLliniaDeLletra(ls[fi + 1])) fi++;
  ls.splice(fi + 1, 0, '{end_of_chorus}');
  ls.splice(ini, 0, '{start_of_chorus}');
  return ls.join('\n');
}

// Posa una nota damunt la línia «num», o en canvia el text si «num» ja és una nota.
export function posaNota(font, num, text) {
  const ls = font.split('\n');
  if (num < 0 || num >= ls.length) return font;
  if (esDirectiva(ls[num], ['comment', 'comment_italic', 'comment_box'])) ls[num] = `{comment: ${text}}`;
  else ls.splice(num, 0, `{comment: ${text}}`);
  return ls.join('\n');
}

// Treu la nota de la línia «num».
export function treuNota(font, num) {
  const ls = font.split('\n');
  if (!esDirectiva(ls[num], ['comment', 'comment_italic', 'comment_box'])) return font;
  ls.splice(num, 1);
  return ls.join('\n');
}

export function acordsDeLaCanco(font) {
  const vistos = new Map();
  for (const m of font.matchAll(/\[([^\]]+)\]/g)) {
    for (const t of trossos(m[1])) if (t.acord && !vistos.has(t.text)) vistos.set(t.text, true);
  }
  return [...vistos.keys()];
}

export { LLATI };
