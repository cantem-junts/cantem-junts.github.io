// SPDX-License-Identifier: AGPL-3.0-or-later
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideixEix, recorregut, passaHoritzontal, passaVertical, sentit,
  RESISTENCIA_TOPALL,
} from '../js/gestos.js';

test('un moviment curt és un toc; després mana l’eix dominant', () => {
  assert.equal(decideixEix(4, -6), 'espera');
  assert.equal(decideixEix(-30, 8), 'horitzontal');
  assert.equal(decideixEix(5, -40), 'vertical');
  assert.equal(decideixEix(20, 20), 'horitzontal');
});

test('la pàgina segueix el dit fins a un pas, i al topall es resisteix', () => {
  assert.equal(recorregut(-120, { hiHaDesti: true, pas: 800 }), -120);
  assert.equal(recorregut(-1200, { hiHaDesti: true, pas: 800 }), -800);
  assert.equal(recorregut(1200, { hiHaDesti: true, pas: 800 }), 800);
  assert.equal(recorregut(200, { hiHaDesti: false, pas: 800 }), 200 * RESISTENCIA_TOPALL);
});

test('en horitzontal passa a partir del 22 % de l’amplada', () => {
  assert.equal(passaHoritzontal(-170, 800), false);
  assert.equal(passaHoritzontal(-180, 800), true);
  assert.equal(passaHoritzontal(180, 800), true);
});

test('en vertical, el 12 % de l’alçada amb un mínim de 60 px', () => {
  assert.equal(passaVertical(-100, 1000), false);
  assert.equal(passaVertical(-130, 1000), true);
  // Pantalla baixa (mòbil en horitzontal): el mínim evita que un frec passi.
  assert.equal(passaVertical(50, 360), false);
  assert.equal(passaVertical(65, 360), true);
});

test('esquerra i amunt avancen; dreta i avall tornen', () => {
  assert.equal(sentit('horitzontal', -200, 10), 1);
  assert.equal(sentit('horitzontal', 200, -10), -1);
  assert.equal(sentit('vertical', 10, -200), 1);
  assert.equal(sentit('vertical', -10, 200), -1);
});
