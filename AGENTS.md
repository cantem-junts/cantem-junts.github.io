# Cantem junts: instruccions per a agents

Cançoner web de cants per a la missa. Web estàtica a GitHub Pages, sense
servidor ni dependències externes. La interfície és només en català, sense
traduccions ([ADR 5](docs/adr/0005-interficie-nomes-en-catala.md)).

## Peces

- `index.html`, `css/estil.css`, `js/app.js`: la web (llista, cançó,
  celebració, editor, pàgines d'accés, privadesa i crèdits). Rutes amb `#/`.
- `js/acords.js`: lectura dels acords, canvi de to, ChordPro i conversió del
  text amb els acords a sobre. No depèn del navegador; el fan servir les proves
  i `scripts/index.mjs`.
- `js/desament.js`: desa a GitHub (API de continguts, amb la clau de qui
  edita) o al servidor local.
- `cancons/*.cho`, `celebracions/*.cho`: les dades, en ChordPro.
- `scripts/index.mjs`: genera `dades/index.json` (no es versiona). Falla si
  una celebració cita una cançó que no existeix.
- `scripts/servidor-local.py`: serveix la web i fa d'editor local.
- `scripts/migracio/`: eines d'un sol ús per passar el cançoner antic; després de
  `lot.py` cal `retocs.sh`, que hi torna a posar les cançons passades a mà (`a-ma/`).
  Les presentacions de Google
  del cançoner antic ([ADR 7](docs/adr/0007-migracio-de-les-presentacions-de-google.md)).
- `.github/workflows/pages.yml`: proves, índex i publicació a cada canvi.
  GitHub Pages ha d'estar configurat amb la font «GitHub Actions»
  (`build_type: workflow`): si publica des de la branca, aquesta publicació
  sense `dades/index.json` trepitja la bona i la web no carrega les cançons.

## Regles

- **Els acords es respecten tal com s'escriuen**: majúscula, major; minúscula,
  menor (`lam`, `fa#`, `mi m`). Sense canvi de to i en notació llatina es
  mostren tal com són al fitxer. Vegeu l'[ADR 4](docs/adr/0004-notacio-dels-acords.md).
- **Res de tercers** a la web: ni tipografies, ni biblioteques de CDN, ni
  estadístiques. Icones de Lucide copiades a `index.html`.
- **Prova abans de donar res per bo**: `npm test` i `probar-web` en Chromium,
  Firefox i WebKit, a mòbil i escriptori, mirant les captures.
- Les proves de l'editor es fan sobre una còpia, no sobre aquest repositori,
  perquè desen fitxers.
- Cada decisió, al seu ADR a `docs/adr/` (índex al `README.md`; `nuevo-adr "Títol"` en crea un, però la plantilla que posa és en castellà: es tradueix).
