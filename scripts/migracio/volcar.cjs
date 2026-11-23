// NODE_PATH=$(npm root -g) node volcar.cjs URL sortida.json : bolca cada diapositiva d'una presentació publicada de
// Google (text accessible i traços de les lletres, en ordre). Fa servir el Playwright global.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1200,height:900}});
  await p.goto(process.argv[2], {waitUntil:'networkidle'}); await p.waitForTimeout(1500);
  const slides=[]; let prev=null;
  for (let i=0;i<40;i++){
    const r = await p.evaluate(() => {
      const s=document.querySelector('svg'); if(!s) return null;
      const items=[]; 
      const walk=(e)=>{ for(const c of e.children){
        if(c.tagName==='g' && c.getAttribute('role')==='img'){ items.push({t:'text',label:c.getAttribute('aria-label')||''}); continue; }
        if(c.tagName==='path'){ items.push({t:'path',d:c.getAttribute('d'),fill:c.getAttribute('fill')}); continue; }
        if(c.tagName==='image'){ items.push({t:'image'}); continue; }
        if(c.tagName==='g'){ if(c.getAttribute('transform')) items.push({t:'transform',v:c.getAttribute('transform')}); walk(c); }
      }};
      walk(s);
      return {vb:s.getAttribute('viewBox'), items};
    });
    const key=JSON.stringify(r);
    if(!r || key===prev) break;
    slides.push(r); prev=key;
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
  }
  fs.writeFileSync(process.argv[3], JSON.stringify(slides));
  console.log(process.argv[3], slides.length,'diapositives');
  await b.close();
})();
