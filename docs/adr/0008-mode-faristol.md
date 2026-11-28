# 8. Mode faristol per tocar a la missa

Data: 2026-11-23 · Estat: acceptada

## Context

El cançoner es fa servir a la missa amb una tauleta (de vegades un mòbil) al
faristol, a 60-80 cm, mentre es toca la guitarra i es canta. La vista normal
té la lletra a uns 17 px, posa dues columnes petites en horitzontal, deixa
espai buit i té barres que en aquell moment no calen. Les mans estan ocupades:
desplaçar la pàgina amb el dit és incòmode.

## Decisió

Un botó «Faristol» (destacat, al costat de tornar) obre la cançó o la
celebració a pantalla completa:

- **Mida automàtica**: la lletra creix fins que la línia més llarga omple
  l'amplada de la columna (si una línia és molt més llarga que les altres, es
  deixa partir aquesta). Entre 16 i 36 px; A− i A+ la retoquen i es recorda,
  i el botó del mig (el percentatge) torna a la mida automàtica.
  A la celebració, cada cant té la seva mida.
- **Pàgines, no desplaçament**: tocar la meitat dreta avança i l'esquerra
  torna; també el teclat (fletxes, Re Pàg/Av Pàg, espai), que és el que envien
  els pedals de passar pàgina per Bluetooth. Un indicador «1/3».
- **Lliscar com a PageKeeper** (des del 28-11-2026): en horitzontal la pàgina
  segueix el dit i, en deixar-lo anar, passa si s'ha arrossegat més del 22 % de
  l'amplada o torna al seu lloc; a la primera i l'última es resisteix. En
  vertical no es mou fins que es deixa anar: amunt avança i avall torna, a
  partir del 12 % de l'alçada (60 px com a mínim). Tocant o amb el pedal la
  pàgina fa el mateix lliscament (220 ms; sense animació si el sistema demana
  menys moviment). El pessic es deixa al navegador (`touch-action:
  pinch-zoom`) i anul·la el gest. Les comptes són a `js/gestos.js`.
- **Dues columnes només en horitzontal i si la lletra hi continua sent
  grossa** (22 px o més); si no, una columna i més pàgines.
- Una estrofa pot continuar a la pàgina següent, però una línia no es parteix.
  A la celebració, cada cant comença en una columna nova i el seu nom (amb el
  moment de la missa) és a la barra de dalt.
- La pantalla no s'apaga (Screen Wake Lock) i es demana pantalla completa
  on el navegador ho permet. El botó enrere del mòbil tanca el faristol.

Les pàgines són columnes CSS d'alçada fixa: cada pàgina és una o dues
columnes, i es passa movent `scrollLeft` una amplada de pàgina.

## Alternatives descartades

- Fer més gran la lletra de la vista normal: obliga a desplaçar amb la mà.
- Desplaçament automàtic: cada cant i cada músic va a un ritme diferent.

## Conseqüències

- La vista normal queda per buscar i preparar; el faristol, per tocar.
- En un mòbil vertical la lletra queda petita (16-18 px) perquè hi càpiguen
  les línies; en horitzontal hi guanya.

## Evidència

Captures amb Playwright a 820×1180 (tauleta vertical), 1180×820 (horitzontal)
i 412×860 (mòbil): «Benaurances» passa de 17 px a 32 px en vertical;
«Aixeca els ulls», a 30 px. Provat a Chromium, Firefox i WebKit, tocant per
passar pàgina i tancant amb Escape.

## Riscos i limitacions

- La pantalla completa no existeix a Safari d'iPhone; allà el faristol ocupa
  la finestra, amb la barra del navegador.
- Wake Lock necessita HTTPS i un navegador recent; si no hi és, la pantalla
  s'apaga segons la configuració del dispositiu.
- Arrossegar i tocar amb el dit real no s'ha pogut provar fora del simulador:
  el lliscament s'ha provat amb el ratolí, que passa pels mateixos
  esdeveniments de punter.

## Validació

`npm test` (també `tests/gestos.test.mjs`) i les captures de les tres mides
als tres motors. El lliscament, amb un guió de probar-web que arrossega curt
(torna), llarg a l'esquerra i a la dreta, amunt i avall, contra el topall, i
toca i prem el pedal, comprovant l'indicador de pàgina: passa a Chromium,
Firefox i WebKit, a mòbil, tauleta i escriptori.
