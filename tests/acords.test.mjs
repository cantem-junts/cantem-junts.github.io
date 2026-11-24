// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  llegeixAcord, esEtiquetaDAcords, transposaEtiqueta, acordsASobreAChordPro,
  llegeixChordPro, posaAcord, lletraNeta, toDeLaCanco, nomDelTo, usaBemolls, acordsDeLaCanco, canviaNegreta,
  sillabes, canviaNegretaSillaba, canviaTornada, posaNota, treuNota,
} from '../js/acords.js';

test('reconeix els acords tal com s’escriuen al cançoner', () => {
  for (const a of ['DO', 'Do', 'SOL7', 'lam', 'mi m', 'rem', 'fa#', 'fa#m', 'fa#7', 'MI7', 'sim', 'SIb', 'DO/SOL', 'C', 'Am', 'F#m7', 'Gsus4', 'LAmaj7']) {
    assert.ok(llegeixAcord(a), a);
  }
  for (const p of ['Si cerques', 'aixeca', 'VINE', 'amic', 'mira', 'domini', 'solo', 'a', 'DO/', '']) {
    assert.equal(llegeixAcord(p), null, p);
  }
});

test('la minúscula vol dir menor', () => {
  assert.equal(llegeixAcord('lam').menor, true);
  assert.equal(llegeixAcord('fa#').menor, true);
  assert.equal(llegeixAcord('mi m').menor, true);
  assert.equal(llegeixAcord('DO').menor, false);
  assert.equal(llegeixAcord('Do').menor, false);
  assert.equal(llegeixAcord('Am').menor, true);
  assert.equal(llegeixAcord('Cmaj7').menor, false);
});

test('les etiquetes amb diversos acords', () => {
  assert.ok(esEtiquetaDAcords('la-FA'));
  assert.ok(esEtiquetaDAcords('DO SOL'));
  assert.ok(esEtiquetaDAcords('(MI7)'));
  assert.ok(!esEtiquetaDAcords('VINE AMB MI'));
});

test('canvi de to respectant com s’escriu', () => {
  assert.equal(transposaEtiqueta('DO', 2, 'llati', false), 'RE');
  assert.equal(transposaEtiqueta('Do', 2, 'llati', false), 'Re');
  assert.equal(transposaEtiqueta('lam', 2, 'llati', false), 'sim');
  assert.equal(transposaEtiqueta('mi m', 1, 'llati', false), 'fa m');
  assert.equal(transposaEtiqueta('SOL7', 5, 'llati', false), 'DO7');
  assert.equal(transposaEtiqueta('la-FA', 2, 'llati', false), 'si-SOL');
  assert.equal(transposaEtiqueta('DO/SOL', 2, 'llati', false), 'RE/LA');
  assert.equal(transposaEtiqueta('DO', 1, 'llati', true), 'REb');
  assert.equal(transposaEtiqueta('DO', -1, 'llati', false), 'SI');
  assert.equal(transposaEtiqueta('mi m', 0, 'llati', false), 'mi m');
  assert.equal(transposaEtiqueta('SIb', 0, 'llati', false), 'SIb');
});

test('pas a la notació americana i tornada', () => {
  assert.equal(transposaEtiqueta('lam', 0, 'america', false), 'Am');
  assert.equal(transposaEtiqueta('mi m', 0, 'america', false), 'Em');
  assert.equal(transposaEtiqueta('fa#7', 0, 'america', false), 'F#m7');
  assert.equal(transposaEtiqueta('SOL7', 0, 'america', false), 'G7');
  assert.equal(transposaEtiqueta('fa#m', 0, 'america', false), 'F#m');
  assert.equal(transposaEtiqueta('DO/SOL', 0, 'america', false), 'C/G');
  assert.equal(transposaEtiqueta('Am', 0, 'llati', false), 'lam');
  assert.equal(transposaEtiqueta('C7', 0, 'llati', false), 'DO7');
  assert.equal(transposaEtiqueta('Am', 2, 'america', false), 'Bm');
});

test('el to de la cançó i els bemolls', () => {
  const c = llegeixChordPro('[DO]Si cerques [mi m]quelcom');
  const to = toDeLaCanco(c);
  assert.equal(nomDelTo(to, 0, 'llati'), 'DO');
  assert.equal(nomDelTo(to, 5, 'llati'), 'FA');
  assert.equal(usaBemolls(to, 5), true);
  assert.equal(nomDelTo(to, 0, 'america'), 'C');
  const m = toDeLaCanco(llegeixChordPro('[lam]Tota la vida'));
  assert.equal(nomDelTo(m, 0, 'llati'), 'lam');
});

test('converteix el text amb els acords a sobre', () => {
  const text = [
    'DO                mi m           FA          SOL',
    'Si cerques quelcom a la vida que et faci viure content',
    '',
    'lam  SOL lam DO',
  ].join('\n');
  assert.equal(
    acordsASobreAChordPro(text),
    '[DO]Si cerques quelcom[mi m] a la vida que [FA]et faci viur[SOL]e content\n\n[lam] [SOL] [lam] [DO]',
  );
});

test('un acord més enllà del final de la lletra va al final', () => {
  assert.equal(acordsASobreAChordPro('DO        SOL\nHola'), '[DO]Hola [SOL]');
});

test('una línia en majúscules no es confon amb acords', () => {
  const text = 'FA     DO\nVINE AMB MI, AMIC MEU';
  assert.equal(acordsASobreAChordPro(text), '[FA]VINE AM[DO]B MI, AMIC MEU');
});

test('llegeix ChordPro amb tornada, comentaris i etiquetes', () => {
  const c = llegeixChordPro('{title: Prova}\n{meta: etiquetes Nadal, Maria}\n{soc}\n[DO]Glò[SOL]ria\n{eoc}\n{c: Dues vegades}');
  assert.equal(c.titol, 'Prova');
  assert.deepEqual(c.etiquetes, ['Nadal', 'Maria']);
  assert.equal(c.linies[0].seccio, 'chorus');
  assert.deepEqual(c.linies[0].segments.map((s) => [s.acord, s.text]), [['DO', 'Glò'], ['SOL', 'ria']]);
  assert.equal(c.linies[1].tipus, 'comentari');
});

test('posa, canvia i treu acords', () => {
  assert.equal(posaAcord('Si cerques', 3, 'FA'), 'Si [FA]cerques');
  assert.equal(posaAcord('Si [FA]cerques', 3, 'SOL'), 'Si [SOL]cerques');
  assert.equal(posaAcord('Si [FA]cerques', 3, ''), 'Si cerques');
  assert.equal(posaAcord('[DO]Si cerques', 0, 'RE'), '[RE]Si cerques');
  assert.equal(posaAcord('[DO]Si cerques', 5, 'mi m'), '[DO]Si ce[mi m]rques');
  assert.equal(posaAcord('Hola', 4, 'SOL'), 'Hola [SOL]');
});

test('lletra neta per cercar i acords de la cançó', () => {
  assert.equal(lletraNeta('{title: X}\n[DO]Si cer[mi m]ques\n{c: nota}'), 'Si cerques');
  assert.deepEqual(acordsDeLaCanco('[DO]a [mi m]b [la-FA]c [DO]d'), ['DO', 'mi m', 'la', 'FA']);
});

test('negreta dins la línia: no és text i pot travessar acords', () => {
  const c = llegeixChordPro('Enmig del [DO]<b>món</b> quin <b>go[RE]ig</b> sen<b>tir</b>');
  const segs = c.linies[0].segments;
  assert.equal(segs.map((s) => s.text).join(''), 'Enmig del món quin goig sentir');
  assert.deepEqual(segs.map((s) => [s.acord, s.text, s.negreta]), [
    [null, 'Enmig del ', false], ['DO', 'món', true], [null, ' quin ', false],
    [null, 'go', true], ['RE', 'ig', true], [null, ' sen', false], [null, 'tir', true],
  ]);
  assert.equal(lletraNeta('a<b>rri</b>[SOL]ba'), 'arriba');
});

test('les marques de negreta no compten en posar acords', () => {
  assert.equal(posaAcord('Enmig del <b>món</b>', 10, 'DO'), 'Enmig del <b>[DO]món</b>');
  assert.equal(posaAcord('Enmig del [DO]<b>món</b>', 10, 'RE'), 'Enmig del [RE]<b>món</b>');
  assert.equal(posaAcord('a<b>rri</b>ba', 4, 'SOL'), 'a<b>rri</b>[SOL]ba');
  assert.equal(posaAcord('a<b>rri</b>ba', 6, 'SOL'), 'a<b>rri</b>ba [SOL]');
});

test('el botó de negreta la posa i la treu de la selecció', () => {
  const l = 'Enmig del [DO]món quin goig';
  // «món» (posicions 14 a 17)
  assert.equal(canviaNegreta(l, 14, 17), 'Enmig del [DO]<b>món</b> quin goig');
  assert.equal(canviaNegreta('Enmig del [DO]<b>món</b> quin goig', 18, 20), 'Enmig del [DO]<b>m</b>ón quin goig');
  // Tot triat ja era negreta: es treu.
  const b = 'Enmig del [DO]<b>món</b> quin goig';
  assert.equal(canviaNegreta(b, 10, b.indexOf(' quin')), l);
  // Una selecció que en toca una part la completa, també a través d'un acord.
  assert.equal(canviaNegreta('<b>go</b>[RE]ig', 0, 15), '<b>go[RE]ig</b>');
  // Dues línies, sense tocar les directives.
  assert.equal(canviaNegreta('{soc}\nla\nsi\n{eoc}', 0, 11), '{soc}\n<b>la</b>\n<b>si</b>\n{eoc}');
  // Només espais: res.
  assert.equal(canviaNegreta('a  b', 1, 3), 'a  b');
});

test('parteix les paraules en síl·labes', () => {
  const parts = (w) => sillabes(w).map(([a, b]) => w.slice(a, b)).join('-');
  const casos = {
    Enmig: 'En-mig', goig: 'goig', arriba: 'a-rri-ba', proclamant: 'pro-cla-mant', justícia: 'jus-tí-cia',
    Senyor: 'Se-nyor', ACLAMEM: 'A-CLA-MEM', quiero: 'quie-ro', pingüino: 'pin-güi-no', veïna: 've-ï-na',
    passa: 'pas-sa', caixa: 'cai-xa', país: 'pa-ís', poeta: 'po-e-ta', noia: 'no-ia', creient: 'cre-ient', món: 'món',
  };
  for (const [w, esperat] of Object.entries(casos)) assert.equal(parts(w), esperat, w);
});

test('un toc posa o treu la negreta d’una síl·laba', () => {
  const l = 'Tot procla[DO]mant els [RE7]pobres';
  // «m» de «mant» (la lletra 10, comptant només el text).
  assert.equal(canviaNegretaSillaba(l, 10), 'Tot procla[DO]<b>mant</b> els [RE7]pobres');
  assert.equal(canviaNegretaSillaba('Tot procla[DO]<b>mant</b> els [RE7]pobres', 12), l);
  assert.equal(canviaNegretaSillaba(l, 19), 'Tot procla[DO]mant els [RE7]<b>po</b>bres');
  assert.equal(canviaNegretaSillaba('un Déu d’a[la RE7]mor', 10), 'un Déu d’a[la RE7]<b>mor</b>');
  // Un espai o un signe: res.
  assert.equal(canviaNegretaSillaba(l, 3), l);
});

test('fa i desfà una tornada', () => {
  const t = 'cc\n\nA[DO]a\nbb\n\ndd';
  const amb = 'cc\n\n{start_of_chorus}\nA[DO]a\nbb\n{end_of_chorus}\n\ndd';
  assert.equal(canviaTornada(t, 3), amb);
  assert.equal(canviaTornada(amb, 4), t);
  // Desfer una tornada enganxada a una altra estrofa no les ajunta.
  assert.equal(canviaTornada('cc\n{soc}\ndd\n{eoc}\nff', 2), 'cc\n\ndd\n\nff');
  // Una línia que no és de lletra: res.
  assert.equal(canviaTornada(t, 1), t);
});

test('posa, canvia i treu notes', () => {
  const t = 'aa\nbb';
  assert.equal(posaNota(t, 1, 'Dues vegades'), 'aa\n{comment: Dues vegades}\nbb');
  assert.equal(posaNota('aa\n{comment: X}\nbb', 1, 'Y'), 'aa\n{comment: Y}\nbb');
  assert.equal(treuNota('aa\n{comment: X}\nbb', 1), t);
  assert.equal(treuNota(t, 1), t);
});
