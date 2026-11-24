// SPDX-License-Identifier: AGPL-3.0-or-later
// Prova de les eines de «Marcar»: acords, negreta, tornada, nota, goma i desfés.
// S'executa amb probar-web sobre una còpia servida amb scripts/servidor-local.py
// (desa fitxers), oberta a #/edita/cant/aclamem-el-senyor:
//   probar-web "http://localhost:8765/#/edita/cant/aclamem-el-senyor" -s tests/navegador/pasos-marcar.cjs
module.exports = async (page, info) => {
  const text = () => page.$eval('#ed-text', (t) => t.value);
  const falla = (m) => { throw new Error(`${info?.navegador || ''} ${info?.dispositivo || ''}: ${m}`); };
  await page.waitForSelector('#ed-vista .linia', { state: 'attached' });
  const pest = page.locator('.pestanyes-editor [data-v="vista"]');
  if (await pest.isVisible()) await pest.click();
  const inicial = await text();
  if (await page.locator('.eines-text').count()) falla('encara hi ha botons a l’esquerra');
  // Les catorze bàsiques a la barra; posar-ne una que la cançó no fa servir.
  // De sèrie, només els majors; el menor que fa servir la cançó («la»), a sota.
  if ((await page.locator('.xips-basics .xip').count()) !== 7) falla('de sèrie hi hauria d’haver 7 bàsiques');
  if (!(await page.locator('.xips [data-pinzell="la"]').count())) falla('plegats, no es veu el «la» que fa servir la cançó');
  await page.click('[data-menors]');
  if ((await page.locator('.xips-basics .xip').count()) !== 14) falla('desplegats no hi ha les 14 bàsiques');
  if (await page.locator('.xips [data-pinzell="la"]').count()) falla('desplegats, el «la» surt dues vegades');
  await page.click('.xips-basics [data-pinzell="mi"]');
  await page.locator('#ed-vista [data-num="0"] .c[data-i="0"]').click();
  if (!(await text()).startsWith('[mi]Enmig')) falla('no ha posat «mi»: ' + (await text()).split('\n')[0]);
  if (await page.locator('.xips-basics [data-pinzell="mi"]').evaluate((b) => b.classList.contains('xip-nou'))) falla('«mi» encara surt com a no usat');
  await page.click('[data-desfes]');
  if ((await text()) !== inicial) falla('el desfés no ha tornat el SOL');
  // Es tornen a plegar.
  await page.click('[data-menors]');
  if ((await page.locator('.xips-basics .xip').count()) !== 7) falla('no s’han tornat a plegar');
  // Goma sobre un acord que té negreta al davant: «RE» damunt de «goig».
  await page.click('[data-goma]');
  await page.locator('#ed-vista [data-num="0"] .a[data-i="19"]').click();
  if ((await text()).split('\n')[0].includes('[RE]')) falla('la goma no ha tret el RE');
  await page.click('[data-desfes]');
  if ((await text()) !== inicial) falla('el desfés no ha tornat el RE');
  // Negreta.
  await page.click('[data-marca="negreta"]');
  // Treu la negreta de «món» tocant-la.
  const mon = page.locator('#ed-vista [data-num="0"] .c[data-i="10"]');
  await mon.click();
  let t1 = await text();
  if (t1 === inicial) falla('la N no ha canviat res');
  const l0 = t1.split('\n')[0];
  if (l0.includes('<b>món</b>') || !l0.includes('món')) falla('no ha tret la negreta de «món»: ' + l0);
  await mon.click();
  if (!(await text()).split('\n')[0].includes('<b>món</b>')) falla('no ha tornat a posar la negreta a «món»');
  // Tornada: toca la primera estrofa.
  await page.click('[data-marca="tornada"]');
  await page.locator('#ed-vista .estrofa').first().locator('.linia').first().click();
  const t2 = await text();
  if (!/\{start_of_chorus\}\n\[SOL\]Enmig/.test(t2)) falla('no ha fet tornada la primera estrofa');
  if (!(await page.locator('#ed-vista .estrofa').first().getAttribute('class')).includes('tornada')) falla('la vista no mostra la tornada');
  // Nota: canvia el text i toca la segona línia.
  await page.click('[data-marca="nota"]');
  await page.fill('#ed-nota', 'Tres vegades');
  await page.locator('#ed-vista .linia').nth(1).click();
  if (!(await text()).includes('{comment: Tres vegades}')) falla('no ha posat la nota');
  if (!(await page.locator('#ed-vista .comentari', { hasText: 'Tres vegades' }).count())) falla('la nota no es veu');
  // Goma sobre la nota.
  await page.click('[data-goma]');
  await page.locator('#ed-vista .comentari', { hasText: 'Tres vegades' }).click();
  if ((await text()).includes('Tres vegades')) falla('la goma no ha tret la nota');
  // Desfés quatre vegades (goma, nota, tornada i negreta): torna a «món» sense negreta.
  for (let i = 0; i < 4; i++) await page.click('[data-desfes]');
  if ((await text()) !== t1) falla('el desfés no torna enrere');
  // Per a la captura: tornada a la primera estrofa i l'eina de nota triada.
  await page.click('[data-marca="tornada"]');
  await page.locator('#ed-vista .linia').first().click();
  await page.click('[data-marca="nota"]');
  await page.locator('#ed-vista .linia').nth(2).click();
  console.log('PROVA-MARCAR OK');
};
