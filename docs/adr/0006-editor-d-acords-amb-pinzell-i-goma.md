# 6. Editor d'acords amb pinzell i goma

Data: 2026-11-22 · Estat: acceptada

## Context

La primera versió de l'editor obria una finestra cada vegada que es tocava una
síl·laba: s'hi triava l'acord i es posava, o es treia amb una paperera. Per
posar molts acords o moure'n un calien massa passos. Juanjo va demanar una
forma senzilla d'afegir i treure acords en el lloc que es vulgui.

## Decisió

A la pestanya «Acords», una barra fixa amb:

- **Els acords de la cançó** com a pinzells: se'n tria un i cada síl·laba que
  es toca el rep, sense finestres. Sobre un acord que ja hi és, el canvia.
- **«Altre»**, per triar un acord que no hi és (nota, #/b, menor, 7); queda a
  la barra.
- **Goma**: cada acord que es toca es treu.
- **Desfés**: torna enrere l'últim canvi d'acords (fins a 100).
- **Arrossegar** un acord el mou a una altra síl·laba. Amb el ratolí,
  directament; amb el dit, mantenint-lo premut 350 ms, perquè no es confongui
  amb desplaçar la pàgina.

Sense cap eina triada, tocar la lletra només avisa que cal triar-ne una.

## Alternatives descartades

- La finestra per a cada síl·laba (la primera versió): massa passos.
- Arrossegar sense mantenir premut al mòbil: impediria desplaçar la pàgina
  quan el dit comença damunt d'un acord.

## Conseqüències

El text de la lletra continua sent l'original: l'editor només hi escriu o
n'esborra els `[acords]`.

## Evidència

`probar-web` amb `pasos-pinzell` (pinzell, goma, desfés, «Altre» i arrossegar
amb el ratolí) a Chromium, Firefox i WebKit, a mòbil i escriptori; arrossegar
amb el dit, simulat amb esdeveniments tàctils a Chromium.

## Riscos i limitacions

Arrossegar amb el dit no s'ha pogut simular a Firefox ni a Safari de mòbil:
cal provar-ho en un mòbil de veritat.

## Validació

22-11-2026, amb les proves de dalt.
