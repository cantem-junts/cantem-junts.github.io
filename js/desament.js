// SPDX-License-Identifier: AGPL-3.0-or-later
// Desa i esborra fitxers del cançoner: al repositori de GitHub, amb la sessió
// de qui ha entrat amb el seu compte, o, quan la web s'obre amb el servidor local, a la carpeta del
// mateix ordinador.

import { t } from './llengua.js';

export const REPO = { owner: 'cantem-junts', repo: 'cantem-junts.github.io', branca: 'main' };
const API = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}`;

// Entrada amb GitHub (aplicació «Cantem junts», ADR 9). La web és estàtica:
// GitHub lliura la clau només a canvi del secret de l'aplicació, que és al
// hosting (token.php). Aquí hi ha el PKCE i la clau de cada persona, que
// dura vuit hores i es renova sola.
const APP = {
  clientId: 'Iv23liS6WIg5JUhHVhqo',
  intercanvi: 'https://bilateria.org/app/cantem-junts/token.php',
};
const SESSIO = 'cantem.sessio';
const RETORN = 'cantem.retorn-github';
const retornGithub = () => new URL('auth.html', location.href.split('#')[0]).href;
try { localStorage.removeItem('cantem.clau'); } catch (e) { /* la clau manual d'abans ja no s'usa */ }

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

function llegeixSessio() {
  try { return JSON.parse(localStorage.getItem(SESSIO) || 'null'); } catch (e) { return null; }
}
function guardaSessio(s) {
  try { localStorage.setItem(SESSIO, JSON.stringify(s)); } catch (e) { /* res */ }
}
export function tancaSessio() {
  try { localStorage.removeItem(SESSIO); } catch (e) { /* res */ }
}
// Qui ha entrat, si hi ha sessió que encara es pot fer servir o renovar.
export function usuari() {
  const s = llegeixSessio();
  if (!s) return null;
  const viva = Date.now() < s.caduca || (s.renova && Date.now() < (s.renovaCaduca || Infinity));
  return viva ? s.usuari : null;
}

export async function potEditar() {
  return (await esLocal()) || !!usuari();
}

async function intercanvia(cos) {
  const r = await fetch(APP.intercanvi, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cos) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(d.error_description || d.error || t('GitHub no ha donat accés.'));
  const ara = Date.now();
  return {
    clau: d.access_token,
    caduca: d.expires_in ? ara + (d.expires_in - 60) * 1000 : Infinity,
    renova: d.refresh_token || null,
    renovaCaduca: d.refresh_token_expires_in ? ara + (d.refresh_token_expires_in - 60) * 1000 : null,
  };
}

// Una clau vàlida, renovada si cal; null si cal tornar a entrar.
async function clauValida() {
  const s = llegeixSessio();
  if (!s) return null;
  if (Date.now() < s.caduca) return s.clau;
  if (!s.renova) { tancaSessio(); return null; }
  try {
    const nova = await intercanvia({ refresh_token: s.renova });
    guardaSessio({ ...s, ...nova });
    return nova.clau;
  } catch (e) {
    tancaSessio();
    return null;
  }
}

const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const aleatori = () => base64url(crypto.getRandomValues(new Uint8Array(32)));

// Obre la finestra de GitHub. Cal cridar-la dins del clic, abans de cap
// «await», perquè el navegador no la bloquegi. Si la bloqueja, la mateixa
// pestanya va a GitHub i torna (vegeu completaRetorn).
export async function iniciaSessio() {
  const finestra = window.open('', 'cantem-github', 'popup,width=640,height=760');
  const estat = aleatori();
  const verificador = aleatori();
  const repte = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador))));
  const url = `https://github.com/login/oauth/authorize?${new URLSearchParams({
    client_id: APP.clientId, redirect_uri: retornGithub(), state: estat, code_challenge: repte, code_challenge_method: 'S256',
  })}`;
  sessionStorage.setItem(RETORN, JSON.stringify({ estat, verificador }));
  if (!finestra) { location.href = url; return new Promise(() => {}); }
  finestra.location.href = url;
  const params = await new Promise((resol, rebutja) => {
    const vigila = setInterval(() => { if (finestra.closed) { neteja(); rebutja(new Error(t("S'ha tancat la finestra de GitHub."))); } }, 500);
    const missatge = (e) => {
      if (e.origin !== location.origin || e.source !== finestra || e.data?.tipus !== 'retorn-github') return;
      neteja();
      resol(new URLSearchParams(e.data.cerca));
    };
    const neteja = () => { clearInterval(vigila); window.removeEventListener('message', missatge); };
    window.addEventListener('message', missatge);
  });
  return acabaSessio(params);
}

// Si la pestanya va anar a GitHub (finestra bloquejada), auth.html hi torna amb el codi.
export async function completaRetorn() {
  const cerca = sessionStorage.getItem(RETORN + '.cerca');
  if (!cerca) return null;
  sessionStorage.removeItem(RETORN + '.cerca');
  return acabaSessio(new URLSearchParams(cerca));
}

async function acabaSessio(params) {
  const guardat = JSON.parse(sessionStorage.getItem(RETORN) || 'null');
  sessionStorage.removeItem(RETORN);
  if (!guardat || params.get('state') !== guardat.estat || !params.get('code')) throw new Error(t("No s'ha pogut completar l'entrada amb GitHub."));
  const sessio = await intercanvia({ code: params.get('code'), code_verifier: guardat.verificador, redirect_uri: retornGithub() });
  // Ha de poder escriure al cançoner: si no, no serveix.
  const cap = capcaleres(sessio.clau);
  const [rRepo, rUsuari] = await Promise.all([fetch(API, { headers: cap }), fetch('https://api.github.com/user', { headers: cap })]);
  const repo = rRepo.ok ? await rRepo.json() : null;
  if (!repo || (repo.permissions && !repo.permissions.push)) {
    throw new Error(t("El teu compte de GitHub no té permís per escriure al cançoner. Demana a qui l'administra que t'afegeixi a l'organització cantem-junts."));
  }
  sessio.usuari = rUsuari.ok ? (await rUsuari.json()).login : '';
  guardaSessio(sessio);
  return sessio.usuari;
}

function aBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function capcaleres(c) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${c}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function capcaleresSessio() {
  const c = await clauValida();
  if (!c) throw new Error(t('La sessió amb GitHub ha caducat. Torna a entrar a «Per editar».'));
  return capcaleres(c);
}

async function shaDe(ruta, cap) {
  const r = await fetch(`${API}/contents/${encodeURI(ruta)}?ref=${REPO.branca}`, { headers: cap, cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw await errorDe(r);
  return (await r.json()).sha;
}

async function errorDe(r) {
  if (r.status === 401) { tancaSessio(); return new Error(t('La sessió amb GitHub ha caducat. Torna a entrar a «Per editar».')); }
  if (r.status === 403 || r.status === 404) return new Error(t('El teu compte no té permís per escriure al cançoner.'));
  if (r.status === 409) return new Error(t('Algú ha canviat aquest fitxer alhora. Torna a obrir-lo i repeteix el canvi.'));
  let detall = '';
  try { detall = (await r.json()).message || ''; } catch (e) { /* res */ }
  return new Error(`${t('GitHub ha respost {0}.', r.status)} ${detall}`.trim());
}

export async function desaFitxer(ruta, text, missatge) {
  if (await esLocal()) {
    const r = await fetch(`api/fitxer?ruta=${encodeURIComponent(ruta)}`, { method: 'PUT', body: text });
    if (!r.ok) throw new Error(await r.text());
    return;
  }
  const cap = await capcaleresSessio();
  const sha = await shaDe(ruta, cap);
  const r = await fetch(`${API}/contents/${encodeURI(ruta)}`, {
    method: 'PUT',
    headers: cap,
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
  const cap = await capcaleresSessio();
  const sha = await shaDe(ruta, cap);
  if (!sha) return;
  const r = await fetch(`${API}/contents/${encodeURI(ruta)}`, {
    method: 'DELETE',
    headers: cap,
    body: JSON.stringify({ message: missatge, sha, branch: REPO.branca }),
  });
  if (!r.ok) throw await errorDe(r);
}
