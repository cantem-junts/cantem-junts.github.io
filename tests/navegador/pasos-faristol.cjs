// SPDX-License-Identifier: AGPL-3.0-or-later
// Prova del faristol: arrossegar en horitzontal i en vertical passa pàgina.
// S'executa amb probar-web sobre la web servida (n'hi ha prou amb python3 -m http.server):
//   probar-web "http://localhost:8766/#/cant/benaurances" -s tests/navegador/pasos-faristol.cjs
module.exports = async (page, info) => {
  const qui = `${info?.navegador || ''} ${info?.dispositivo || ''}`;
  const falla = (m) => { throw new Error(`${qui}: ${m}`); };
  await page.waitForSelector('[data-acc="faristol"]');
  await page.click('[data-acc="faristol"]');
  await page.waitForSelector('.faristol-marc');
  await page.waitForTimeout(500);
  const ind = () => page.$eval('.faristol-pagina', (e) => e.textContent);
  const scroll = () => page.$eval('.faristol-text', (e) => e.scrollLeft);
  const total = (await ind()).split('/')[1];
  if (!total || Number(total) < 3) falla('cal una cançó de 3 pàgines o més, hi ha: ' + (await ind()));
  const r = await page.$eval('.faristol-marc', (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const arrossega = async (dx, dy, { mig } = {}) => {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(cx + dx * i / 10, cy + dy * i / 10);
    if (mig) await mig();
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  // 1. Esquerra curt: la pàgina segueix el dit però torna al lloc.
  await arrossega(-r.w * 0.1, 0, { mig: async () => { if ((await scroll()) <= 5) falla('la pàgina no segueix el dit'); } });
  if ((await ind()) !== `1/${total}`) falla('un arrossegament curt ha passat pàgina: ' + await ind());
  if ((await scroll()) !== 0) falla('no ha tornat al lloc: ' + await scroll());
  // 2. Esquerra llarg: avança.
  await arrossega(-r.w * 0.4, 0);
  if ((await ind()) !== `2/${total}`) falla('lliscar a l’esquerra no avança: ' + await ind());
  // 3. Amunt: avança.
  await arrossega(0, -Math.max(90, r.h * 0.2));
  if ((await ind()) !== `3/${total}`) falla('lliscar amunt no avança: ' + await ind());
  // 4. Avall: torna.
  await arrossega(0, Math.max(90, r.h * 0.2));
  if ((await ind()) !== `2/${total}`) falla('lliscar avall no torna: ' + await ind());
  // 5. Dreta: torna.
  await arrossega(r.w * 0.4, 0);
  if ((await ind()) !== `1/${total}`) falla('lliscar a la dreta no torna: ' + await ind());
  // 6. Al topall (primera pàgina, cap a la dreta): es resisteix i no es mou.
  await arrossega(r.w * 0.5, 0, { mig: async () => {
    const tr = await page.$eval('.faristol-text', (e) => e.style.transform);
    if (!/translateX\(\d/.test(tr)) falla('al topall no es nota la resistència: ' + tr);
  } });
  if ((await ind()) !== `1/${total}`) falla('al topall ha canviat: ' + await ind());
  if (await page.$eval('.faristol-text', (e) => e.style.transform)) falla('al topall no torna al lloc');
  // 7. Toc a la dreta i pedal.
  await page.mouse.click(r.x + r.w * 0.8, cy);
  await page.waitForTimeout(400);
  if ((await ind()) !== `2/${total}`) falla('tocar a la dreta no avança: ' + await ind());
  await page.keyboard.press('PageUp');
  await page.waitForTimeout(400);
  if ((await ind()) !== `1/${total}`) falla('el pedal no torna: ' + await ind());
  if ((await scroll()) !== 0) falla('el pedal no deixa la pàgina al lloc: ' + await scroll());
  // Captura a mig arrossegament.
  await page.mouse.move(cx, cy); await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(cx - r.w * 0.06 * i, cy);
};
