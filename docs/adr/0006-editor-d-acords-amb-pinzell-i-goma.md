# 6. Editor amb pinzell i goma: tot es marca tocant la lletra

Data: 2026-11-22 · Actualitzada: 2026-11-24 · Estat: acceptada

## Context

La primera versió de l'editor obria una finestra cada vegada que es tocava una
síl·laba: s'hi triava l'acord i es posava, o es treia amb una paperera. Per
posar molts acords o moure'n un calien massa passos. Juanjo va demanar una
forma senzilla d'afegir i treure acords en el lloc que es vulgui.

Després, la tornada, les notes i la negreta es posaven a l'altra meitat, sobre
el text amb les marques (`[SOL]`, `<b>`), seleccionant-lo i prement un botó.
Les dues meitats es repartien la feina sense un criteri clar, i seleccionar
text al mòbil és incòmode. Juanjo va preguntar si es podia millorar.

## Decisió

L'editor té dues meitats, que al mòbil són dues pestanyes:

- **«Lletra»**: només per escriure, enganxar i corregir el text. Si s'enganxa
  amb els acords a la línia de sobre, es col·loquen sols. No hi ha botons.
- **«Marcar»**: tota la resta, tocant la lletra amb una eina de la barra, sense
  finestres ni seleccions:
  - **Els acords de la cançó** com a pinzells: se'n tria un i cada síl·laba
    que es toca el rep. Sobre un acord que ja hi és, el canvia. **«Altre»**,
    per a un acord que no hi és; queda a la barra.
  - **«N»**: tocar una lletra posa en negreta la seva síl·laba (la síl·laba
    forta); tocar una lletra que ja és negreta la treu de tot aquell tros. La
    síl·laba l'endevina `sillabes` (`js/acords.js`), amb les regles comunes
    del català i el castellà.
  - **«Tornada»**: tocar una estrofa la fa tornada o, si ja ho és, la desfà.
  - **«Nota»**: tocar una línia hi posa una nota a sobre amb el text del camp
    que apareix a la barra («Dues vegades» de sèrie); tocar una nota li canvia
    el text.
  - **Goma**: treu l'acord o la nota que es toca.
  - **Desfés**: torna enrere l'últim canvi de qualsevol d'aquestes eines (fins
    a 100).
  - **Arrossegar** un acord el mou a una altra síl·laba. Amb el ratolí,
    directament; amb el dit, mantenint-lo premut 350 ms, perquè no es
    confongui amb desplaçar la pàgina.

Sense cap eina triada, tocar la lletra només avisa que cal triar-ne una.

## Alternatives descartades

- La finestra per a cada síl·laba (la primera versió): massa passos.
- Arrossegar sense mantenir premut al mòbil: impediria desplaçar la pàgina
  quan el dit comença damunt d'un acord.
- Afegir «N» i «Tornada» a «Marcar» i deixar també els botons de «Lletra»: dos
  llocs per fer el mateix.
- Una finestra per escriure el text de la nota: es van descartar les finestres
  per als acords, i un camp a la barra fa el mateix sense tapar la lletra.
- Triar les lletres de la negreta arrossegant per sobre: més precís, però amb
  el dit xocaria amb desplaçar la pàgina i amb arrossegar els acords. Si la
  síl·laba endevinada no és la bona, es corregeix a «Lletra».

## Conseqüències

El text de la lletra continua sent l'original: l'editor només hi escriu o
n'esborra les marques (`[acords]`, `<b>`, `{start_of_chorus}`,
`{end_of_chorus}` i `{comment: …}`). Desfer una tornada enganxada a una altra
estrofa deixa una línia en blanc, perquè no s'ajuntin.

## Evidència

- 22-11-2026: `probar-web` amb un guió de pinzell, goma, desfés, «Altre» i
  arrossegar amb el ratolí a Chromium, Firefox i WebKit, a mòbil i escriptori;
  arrossegar amb el dit, simulat amb esdeveniments tàctils a Chromium.
- 24-11-2026: `npm test` (síl·labes, negreta d'un toc, tornada i notes) i
  `probar-web` amb `tests/navegador/pasos-marcar.cjs` (goma i desfés d'un
  acord, negreta, tornada, nota, goma sobre la nota i desfés) a Chromium,
  Firefox i WebKit, a escriptori, mòbil i tauleta.

## Riscos i limitacions

- Arrossegar amb el dit no s'ha pogut simular a Firefox ni a Safari de mòbil:
  cal provar-ho en un mòbil de veritat.
- Les síl·labes es parteixen amb regles generals: hi pot haver casos dubtosos
  (els hiats del català com «grà-ci-a», que surt «grà-cia»). Només afecta quines
  lletres es marquen d'un toc.

## Validació

22-11-2026 i 24-11-2026, amb les proves de dalt.
