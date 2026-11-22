# 1. Web estàtica a GitHub Pages amb les cançons en ChordPro

- Estat: acceptada
- Data: 2026-11-22

## Context

El cançoner antic és un TiddlyWiki a Tiddlyhost. Unes 140 cançons són una
presentació de Google insertada, perquè era l'única manera de tenir cada acord
damunt la seva síl·laba; unes 25 són text amb els acords a la línia de sobre.
Les presentacions no deixen cercar dins la lletra, no s'adapten al mòbil, no
canvien de to i cada cançó nova obliga a fer-ne una a Google. Es vol deixar
Tiddlyhost i que afegir cançons sigui fàcil. El manté una sola persona.

## Decisió

Web estàtica a GitHub Pages (organització `cantem-junts`), amb cada cançó en un
fitxer de text en format ChordPro, l'estàndard dels cançoners: l'acord va entre
claudàtors dins la lletra (`[DO]Si cerques`). La web dibuixa l'acord damunt la
síl·laba i, si la línia no cap, salta amb ella.

## Conseqüències

- Cerca a tota la lletra, canvi de to i notació a triar, sense servidor.
- Les dades són text pla, llegible i portable a altres programes de ChordPro.
- GitHub Pages gratuït demana un repositori públic, i per tant les lletres hi
  són a la vista, com ja ho eren a Tiddlyhost. Juanjo ho va acceptar el
  22-11-2026.
- Cal passar les cançons antigues: les de text es converteixen soles, però
  els seus acords ja estaven desplaçats i s'han de revisar; les de Google es
  treuen del text de la presentació publicada.
