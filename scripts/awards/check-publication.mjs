import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createAdminSessionValue } from '../../lib/adminAuth.ts';
const base=process.env.AWARDS_PREVIEW_URL||'http://localhost:4400';
if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))throw Error('Publication test only permits a localhost app');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage();
 await page.goto(`${base}/goty?year=2025`,{waitUntil:'networkidle'});
 assert.ok(await page.getByText('Historical data under review.',{exact:false}).count());
 await page.goto(`${base}/all-games?search=Clair%20Obscur`,{waitUntil:'networkidle'});
 assert.equal(await page.locator('span[aria-label^="Game of the Year Winner"]').count(),0);
 await page.goto(`${base}/stats`,{waitUntil:'networkidle'});
 const wins=async()=>Number(await page.getByText('Awards won',{exact:true}).locator('..').locator('p').first().textContent());
 const before=await wins();
 const cookie=await createAdminSessionValue();
 const headers={'Content-Type':'application/json',Cookie:`admin_auth=${cookie}`};
 const wrong=await fetch(`${base}/api/admin/awards`,{method:'POST',headers,body:JSON.stringify({year:2025,expectedDatabaseUrl:'http://127.0.0.1:1'})});assert.equal(wrong.status,409);
 const invalid=await fetch(`${base}/api/admin/awards`,{method:'POST',headers,body:JSON.stringify({year:2030})});assert.equal(invalid.status,409);
 const saved=await fetch(`${base}/api/admin/awards`,{method:'POST',headers,body:JSON.stringify({year:2025,expectedDatabaseUrl:'http://127.0.0.1:4401'})});assert.equal(saved.status,200,await saved.text());
 await page.reload({waitUntil:'networkidle'});const after=await wins();assert.ok(after>before,'Stats changes on the very next request');
 await page.goto(`${base}/goty?year=2025`,{waitUntil:'networkidle'});assert.equal(await page.getByText('Historical data under review.',{exact:false}).count(),0);
 const link=await page.locator('#game-of-the-year a[href^="/game/"]').first().getAttribute('href');
 await page.goto(`${base}${link}`,{waitUntil:'networkidle'});assert.ok(await page.getByRole('heading',{name:'AWARDS',exact:true}).count());
 await page.goto(`${base}/all-games?search=Clair%20Obscur`,{waitUntil:'networkidle'});assert.ok(await page.locator('span[aria-label^="Game of the Year Winner"]').count());
 await writeFile('docs/awards-publication-report.json',JSON.stringify({environment:'isolated localhost PGlite fixture',beforeWins:before,afterWins:after,immediate:['GOTY','Game Details','game card badges','Stats'],wrongDatabaseRejected:true,unverifiedYearRejected:true},null,2)+'\n');
 console.log({before,after,immediate:true});
}finally{await browser.close();}
