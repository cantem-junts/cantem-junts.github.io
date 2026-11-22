# 4. Els acords es mostren tal com s'escriuen

- Estat: acceptada
- Data: 2026-11-22

## Context

El cançoner antic escriu els acords en notació llatina i amb un costum propi:
majúscula per als majors (`DO`, `SOL7`) i minúscula per als menors (`lam`,
`rem`, `fa#`), a vegades amb una «m» separada (`mi m`).

## Decisió

- La minúscula vol dir menor. `fa#7` és fa# menor amb sèptima.
- Sense canvi de to i en notació llatina, l'acord es mostra exactament com és
  al fitxer.
- En canviar de to es manté l'estil de cada acord: `lam` puja a `sim`, `mi m`
  a `fa m`, `DO` a `RE`.
- En notació americana s'escriu la forma estàndard: `lam` → `Am`,
  `fa#7` → `F#m7`.
- Sostinguts o bemolls segons el to d'arribada, calculat amb el primer acord.

## Conseqüències

Qui escriu no ha de canviar de costum. Un acord en minúscula que en realitat
sigui major es mostrarà com a menor en notació americana: s'ha de corregir al
fitxer.
