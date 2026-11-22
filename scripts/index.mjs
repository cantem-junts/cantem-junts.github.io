// SPDX-License-Identifier: AGPL-3.0-or-later
// Fa dades/index.json amb totes les cançons i celebracions: la web el llegeix
// d'una sola vegada i hi cerca sense servidor.
import fs from 'node:fs';
import path from 'node:path';
import { llegeixChordPro } from '../js/acords.js';

const arrel = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function llegeix(carpeta) {
  const dir = path.join(arrel, carpeta);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.cho'))
    .map((f) => {
      const font = fs.readFileSync(path.join(dir, f), 'utf8');
      const c = llegeixChordPro(font);
      return { slug: f.replace(/\.cho$/, ''), titol: c.titol || f, subtitol: c.subtitol, etiquetes: c.etiquetes, font };
    });
}

const index = { generat: Date.now(), cancons: llegeix('cancons'), celebracions: llegeix('celebracions') };
const col = new Intl.Collator('ca');
index.cancons.sort((a, b) => col.compare(a.titol, b.titol));
index.celebracions.sort((a, b) => col.compare(a.titol, b.titol));

// Una celebració no pot citar una cançó que no existeix.
const slugs = new Set(index.cancons.map((c) => c.slug));
let errors = 0;
for (const cel of index.celebracions) {
  for (const m of cel.font.matchAll(/\{\s*cant\s*:\s*([^}]+?)\s*\}/g)) {
    if (!slugs.has(m[1])) { console.error(`${cel.slug}: no hi ha cap cançó «${m[1]}»`); errors++; }
  }
}
fs.mkdirSync(path.join(arrel, 'dades'), { recursive: true });
fs.writeFileSync(path.join(arrel, 'dades/index.json'), JSON.stringify(index));
console.log(`${index.cancons.length} cançons i ${index.celebracions.length} celebracions`);
if (errors) process.exit(1);
