// SPDX-License-Identifier: AGPL-3.0-or-later
// Comptes del gest per passar pàgina al faristol, com al lector PageKeeper.
//
// Aquí només hi ha l'aritmètica: quan el gest és nostre i en quin eix, quant es
// mou la pàgina i si el recorregut dona per canviar-la. Qui escolta el dit i què
// es mou és cosa del faristol (js/app.js).

// Píxels abans de decidir l'eix: si el dit no s'ha mogut més, és un toc.
export const MARGE_GEST = 10;
// Part de l'amplada que cal recórrer en horitzontal perquè la pàgina passi.
export const LLINDAR_HORITZONTAL = 0.22;
// Sense pàgina a l'altra banda, el recorregut es queda curt: es nota el topall.
export const RESISTENCIA_TOPALL = 0.25;
// En vertical la pàgina no segueix el dit: es decideix en deixar-lo anar. Una
// part més curta de l'alçada (el 22 % seria un escombrat incòmode), però amb un
// mínim en píxels perquè en horitzontal un frec no passi pàgina.
export const LLINDAR_VERTICAL = 0.12;
export const RECORREGUT_VERTICAL_MINIM = 60;

// «espera» mentre no se sap per on va; després, l'eix dominant.
export function decideixEix(dx, dy, marge = MARGE_GEST) {
  if (Math.abs(dx) <= marge && Math.abs(dy) <= marge) return 'espera';
  return Math.abs(dx) >= Math.abs(dy) ? 'horitzontal' : 'vertical';
}

// El que es desplaça la pàgina, que no sempre és el que s'ha mogut el dit: més
// enllà d'una pàgina començaria a treure el nas la següent d'aquella.
export function recorregut(dx, { hiHaDesti, pas }) {
  if (!hiHaDesti) return dx * RESISTENCIA_TOPALL;
  return Math.max(-pas, Math.min(pas, dx));
}

// En deixar anar: passat el llindar la pàgina acaba de sortir; si no, torna al
// seu lloc. Així un frec no canvia de pàgina i es pot fer una ullada.
export function passaHoritzontal(dx, amplada, llindar = LLINDAR_HORITZONTAL) {
  return Math.abs(dx) > (amplada || 1) * llindar;
}

export function passaVertical(dy, alcada) {
  return Math.abs(dy) > Math.max(RECORREGUT_VERTICAL_MINIM, (alcada || 0) * LLINDAR_VERTICAL);
}

// Cap a on va la pàgina: el dit cap a l'esquerra o cap amunt porta la següent
// (el text se'n va com en desplaçar-lo); cap a la dreta o avall, l'anterior.
export function sentit(eix, dx, dy) {
  return (eix === 'vertical' ? dy : dx) < 0 ? 1 : -1;
}
