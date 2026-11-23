# 10. Interfície en català i castellà

Data: 2026-11-23 · Estat: acceptada

## Context

Fins ara la interfície era només en català ([ADR 5](0005-interficie-nomes-en-catala.md)).
El 23-11-2026 Juanjo va demanar que també es pogués fer servir en castellà.
Les cançons ja són en català i en castellà, segons la llengua en què es
canten.

## Decisió

La interfície es mostra en català o en castellà. Només es tradueix el que
posa el programa (botons, rètols, avisos, missatges d'error, les pàgines
«Per editar», «Privadesa» i «Crèdits», l'editor i el faristol). Les cançons,
les celebracions i els noms dels moments que vénen dels fitxers no es
tradueixen.

Com funciona:

- `js/llengua.js` guarda la llengua actual i té la funció `t(textCatala, ...dades)`.
  Els textos s'escriuen en català al codi, dins de `t()`; si la llengua és el
  castellà, `t()` torna la traducció del diccionari `ES` del mateix fitxer
  (`{ 'text català': 'texto castellano' }`). Les dades que canvien (un nom, un
  nombre, un enllaç) van amb marcadors: `t('Has entrat com a {0}: ja pots editar', nom)`.
  Un text que no és al diccionari surt en català.
- Els textos fixos d'`index.html` (capçalera i peu) porten `data-t`,
  `data-t-title` o `data-t-placeholder`; `traduixEstatics()` els tradueix en
  carregar i en canviar de llengua, i posa la llengua a `<html lang>`.
- La llengua inicial és la primera de `navigator.languages` que sigui català
  o castellà; si no n'hi ha cap, català. La que tria qui la fa servir es
  recorda a `localStorage` (`cantem.llengua`); si coincideix amb la del
  sistema, no es guarda, com el tema.
- El botó de la capçalera, al costat del del tema, mostra la llengua a què es
  passa («ES» o «CA»). En canviar, es torna a pintar la vista actual amb
  `ruta()`. A l'editor de cançons, si hi ha canvis sense desar, abans es
  pregunta, perquè es perdrien.
- `auth.html`, que no carrega `app.js`, tria la llengua de la mateixa manera
  amb un script propi.

## Alternatives descartades

- **Un fitxer de traducció per llengua (JSON)**: amb dues llengües i un sol
  programa petit, el diccionari al mateix `llengua.js` és més senzill i no
  afegeix cap càrrega.
- **Claus abstractes (`boto.desa`)**: el català al codi es llegeix millor i,
  si falta una traducció, surt el text bo en català i no una clau.
- **Les altres llengües habituals dels programes de Juanjo** (gallec, basc,
  anglès): no les ha demanat ningú per a aquest cançoner.

## Conseqüències

- Cada text nou de la interfície passa per `t()` i s'afegeix al diccionari
  `ES` de `js/llengua.js`; si es canvia un text català, cal canviar-ne també
  la clau. Un text sense traducció es veu en català, sense cap error.
- Els textos que el programa escriu als fitxers del repositori queden en
  català: els missatges de cada canvi a GitHub, els suggeriments de moments
  de l'editor de celebracions (Entrada, Glòria…) i la descripció de la web
  per als cercadors. La nota que afegeix el botó «Nota» de l'editor («Dues
  vegades» / «Dos veces») surt en la llengua de la interfície, perquè és un
  text de mostra per escriure-hi a sobre.
- Els missatges d'error que torna el servidor local (`scripts/servidor-local.py`)
  no es tradueixen.

## Validació

`node --check` de cada fitxer, `npm test`, una comprovació que cada `t()` del
codi té la seva entrada al diccionari i una prova amb Playwright que passa al
castellà amb el botó i mira que no quedi cap text català a la llista, una
cançó, una celebració, el faristol i «Per editar». També `probar-web` en
Chromium, Firefox i WebKit, a mòbil i escriptori.
