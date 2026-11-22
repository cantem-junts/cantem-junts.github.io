# 2. Codi propi per llegir i transportar els acords

- Estat: acceptada
- Data: 2026-11-22

## Context

Es va proposar fer servir ChordSheetJS (GPL-2.0), la biblioteca de referència
per a ChordPro en JavaScript. Provada la versió 18.0.0 amb els acords tal com
s'escriuen al cançoner:

- entén «Do», «Re», «Lam», però no «DO», «SOL7», «lam», «mi m» ni «fa#7»;
- amb «[DO]» dins un ChordPro, el formatador HTML falla («Not possible, grade
  and number are null»), i amb «lam» el lector d'acords a sobre també;
- el paquet per al navegador pesa uns 400 KB.

## Decisió

Codi propi a `js/acords.js` (unes 300 línies): llegeix la notació llatina i
l'americana, transporta, llegeix ChordPro i converteix el text amb els acords
a sobre. Cobert per proves a `tests/`.

## Conseqüències

Sense dependències ni pas de compilació. Si apareix una forma d'escriure
acords que no s'entén, s'afegeix a `llegeixAcord` amb la seva prova.
