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

// Parteix una línia «[DO]Si cer[mi m]ques» en segments {acord, text, inici}.
// «inici» és la posició del text del segment dins la línia original.
export function segmentsDeLinia(linia) {
  const segments = [];
  const re = /\[([^\]]*)\]/g;
  let ultim = 0;
  let acord = null;
  let inici = 0;
  let m;
  while ((m = re.exec(linia))) {
    const text = linia.slice(ultim, m.index);
    if (text || acord !== null) segments.push({ acord, text, inici });
    acord = m[1];
    ultim = re.lastIndex;
    inici = ultim;
  }
  const text = linia.slice(ultim);
  if (text || acord !== null) segments.push({ acord, text, inici });
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

export function acordsDeLaCanco(font) {
  const vistos = new Map();
  for (const m of font.matchAll(/\[([^\]]+)\]/g)) {
    for (const t of trossos(m[1])) if (t.acord && !vistos.has(t.text)) vistos.set(t.text, true);
  }
  return [...vistos.keys()];
}

export { LLATI };
