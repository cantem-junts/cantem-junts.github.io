// SPDX-License-Identifier: AGPL-3.0-or-later
// Desa i esborra fitxers del cançoner: al repositori de GitHub amb la clau de
// qui el porta o, quan la web s'obre amb el servidor local, a la carpeta del
// mateix ordinador.

export const REPO = { owner: 'cantem-junts', repo: 'cantem-junts.github.io', branca: 'main' };
const CLAU = 'cantem.clau';
const API = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}`;

let local = null;

export async function esLocal() {
  if (local !== null) return local;
  try {
    const r = await fetch('api/local', { cache: 'no-store' });
    local = r.ok;
  } catch (e) {
    local = false;
  }
  return local;
}

export function clau() {
  try { return localStorage.getItem(CLAU); } catch (e) { return null; }
}
export function oblidaClau() {
  try { localStorage.removeItem(CLAU); } catch (e) { /* res */ }
}

export async function potEditar() {
  return (await esLocal()) || !!clau();
}

function aBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function capcaleres(c = clau()) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${c}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Comprova la clau abans de guardar-la: ha de poder escriure al repositori.
export async function provaClau(c) {
  const r = await fetch(API, { headers: capcaleres(c) });
  if (r.status === 401) return { ok: false, motiu: 'La clau no és vàlida o ha caducat.' };
  if (!r.ok) return { ok: false, motiu: 'Amb aquesta clau no es veu el repositori del cançoner.' };
  const j = await r.json();
  if (j.permissions && !j.permissions.push) return { ok: false, motiu: 'Aquesta clau només permet llegir: cal que pugui escriure.' };
  try { localStorage.setItem(CLAU, c); } catch (e) { return { ok: false, motiu: 'Aquest navegador no deixa guardar la clau.' }; }
  return { ok: true };
}

async function shaDe(ruta) {
  const r = await fetch(`${API}/contents/${encodeURI(ruta)}?ref=${REPO.branca}`, { headers: capcaleres(), cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw await errorDe(r);
  return (await r.json()).sha;
}

async function errorDe(r) {
  if (r.status === 401) return new Error('La clau per editar no és vàlida o ha caducat. Torna-la a posar a «Per editar».');
  if (r.status === 403 || r.status === 404) return new Error('La clau no té permís per escriure al cançoner.');
  if (r.status === 409) return new Error('Algú ha canviat aquest fitxer alhora. Torna a obrir-lo i repeteix el canvi.');
  let detall = '';
  try { detall = (await r.json()).message || ''; } catch (e) { /* res */ }
  return new Error(`GitHub ha respost ${r.status}. ${detall}`.trim());
}

export async function desaFitxer(ruta, text, missatge) {
  if (await esLocal()) {
    const r = await fetch(`api/fitxer?ruta=${encodeURIComponent(ruta)}`, { method: 'PUT', body: text });
    if (!r.ok) throw new Error(await r.text());
    return;
  }
  const sha = await shaDe(ruta);
  const r = await fetch(`${API}/contents/${encodeURI(ruta)}`, {
    method: 'PUT',
    headers: capcaleres(),
    body: JSON.stringify({ message: missatge, content: aBase64(text), branch: REPO.branca, ...(sha ? { sha } : {}) }),
  });
  if (!r.ok) throw await errorDe(r);
}

export async function esborraFitxer(ruta, missatge) {
  if (await esLocal()) {
    const r = await fetch(`api/fitxer?ruta=${encodeURIComponent(ruta)}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return;
  }
  const sha = await shaDe(ruta);
  if (!sha) return;
  const r = await fetch(`${API}/contents/${encodeURI(ruta)}`, {
    method: 'DELETE',
    headers: capcaleres(),
    body: JSON.stringify({ message: missatge, sha, branch: REPO.branca }),
  });
  if (!r.ok) throw await errorDe(r);
}
