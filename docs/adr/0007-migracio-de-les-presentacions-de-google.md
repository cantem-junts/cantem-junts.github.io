# 7. Migració de les presentacions de Google llegint la posició dels traços

Data: 2026-11-23 · Estat: acceptada

## Context

Al cançoner antic, unes 116 cançons eren una presentació de Google publicada i
inserida al TiddlyWiki. El text de cada presentació porta els acords en una
línia a sobre de la lletra, alineats amb espais i tabuladors sobre una lletra
proporcional: si es converteix el text tal com és, els acords cauen lluny de la
síl·laba. Google no deixa descarregar en PDF ni PPTX una presentació publicada
amb un enllaç `/d/e/`.

## Decisió

Llegir la presentació com la veu qui la mira. `scripts/migracio/volcar.cjs`
obre cada presentació publicada amb Playwright i en guarda, per a cada
diapositiva, el text accessible (`aria-label`) i els traços SVG amb què Google
dibuixa les lletres. `scripts/migracio/convertir.py`:

1. Agrupa els contorns dels traços en files de text i descarta les vores de
   la caixa, els subratllats i els fons ressaltats.
2. Aparella les files amb les línies del text (programació dinàmica), tenint
   en compte que una línia de lletra llarga es pot partir en dues files.
3. Pren la x de cada acord dels grups de traços de la seva fila, i la x de
   cada lletra mesurant el text amb Liberation Sans (mètriques d'Arial)
   escalat a l'amplada real de la fila.
4. Posa cada acord a l'inici de síl·laba més proper (síl·labes aproximades per
   al català i el castellà) i escriu ChordPro. Les estrofes en majúscules es
   marquen com a tornada, i un rètol sol en majúscules, com a comentari.

`scripts/migracio/lot.py` ho fa per a totes i hi afegeix les etiquetes
(Nadal, Maria, Pasqua) que tenien al TiddlyWiki.

Les 18 cançons que eren text amb els acords a sobre (`scripts/migracio/text.py`,
amb les dades de `extreu.py`) no estaven alineades en lletra d'amplada fixa:
qui les va escriure va quadrar els acords mirant una lletra proporcional
(sovint Times New Roman). Per a cada cançó es mesuren les línies amb Liberation
Serif, Liberation Sans i per columnes, i es tria la que deixa menys acords
fora del final de la lletra; després, la mateixa regla de síl·labes.

Les cançons que eren una imatge, i les presentacions on l'autor partia les
línies amb espais, es llegeixen amb OCR (`scripts/migracio/imatge.py`,
tesseract en català i castellà), que dona la posició de cada paraula; després
la mateixa regla de síl·labes i una revisió a mà del text i dels acords contra
la imatge. On la imatge subratlla o posa en negreta la síl·laba de l'acord, mana
això. Les que eren un duplicat d'una altra ja passada (la mateixa cançó en un
altre to, o la mateixa en imatge i en text) no es passen: la web ja canvia de to.

## Alternatives descartades

- Convertir el text amb els espais com si fos d'amplada fixa: els acords queden
  desplaçats, com ja passava a les cançons de text de la web antiga.
- Exportar a PDF o PPTX: Google no ho permet per a presentacions publicades.
- Llegir les diapositives amb reconeixement de text sobre una imatge: perd la
  lletra exacta, que el text accessible ja dona sense errors.

## Conseqüències

- 100 cançons passades de les presentacions, 18 de text i 10 d'imatges o
  presentacions que s'han hagut de llegir amb OCR. L'acord queda damunt la mateixa síl·laba que a la
  diapositiva, amb els errors que ja hi hagués.
- No s'han pogut passar 12 presentacions que Google ja ha esborrat
  (responen 410).

## Evidència

Mesura sobre les 106 presentacions llegibles (6.431 acords): la distància
entre l'acord a la diapositiva i l'inici de la síl·laba on queda és de menys
d'un caràcter en el 75 %, de menys de dos en el 95 % i de més de tres en
l'1 %. Prova de cinc cançons (Benaurances, Al·leluia en català, El cant dels
ocells, Dios está aquí, Itaca) comparades al costat de la diapositiva: mateixa
estructura i acords a la síl·laba de la diapositiva o a la del costat quan
l'acord hi queda entremig.

## Riscos i limitacions

- Les síl·labes són aproximades; un acord que a la diapositiva queda entre dues
  síl·labes pot anar a la del costat. Es corregeix a l'editor.
- Formes d'acord que la web no entén i cal revisar: `LA-7`, `SOL-7`, `f#m`,
  `(RE- SOL- RE)`, `LA7-`. A «Bona Mare», el `SOL4/5` de l'original s'ha escrit
  `SOL4`, perquè la web no l'entén.

## Validació

`volcar.cjs` i `convertir.py` sobre «Aixeca els ulls» des del repositori donen
el mateix fitxer que hi ha a `cancons/`.
