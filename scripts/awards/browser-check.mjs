import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const browser=await chromium.launch(process.env.AWARDS_BROWSER_PATH ? { executablePath:process.env.AWARDS_BROWSER_PATH,headless:true } : { channel:"msedge",headless:true });
const errors=[];const report=[];
const base=process.env.AWARDS_PREVIEW_URL || "http://localhost:4400";
try {
  await mkdir("docs/screenshots",{recursive:true});
  for(const width of [1440,768,390]) {
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:"reduce"});
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(`${base}/goty?year=2025`,{waitUntil:"networkidle",timeout:60000});
    assert.equal(response.status(),200);
    await page.getByRole('heading',{name:'GOTY 2025'}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Game of the Year',exact:true}).count(),1);
    const notice=page.getByText('Historical data under review.',{exact:false});
    const incomplete=await notice.count()>0;
    if(incomplete)assert.ok(await page.getByText('Reported winner',{exact:true}).count()>0);
    assert.ok(await page.locator('a[href^="/game/"]').count()>0);
    assert.ok(await page.locator('article').count()>0,'Unlinked entries render without game links');
    assert.ok(await page.getByText('Outside your library',{exact:true}).count()>0,'Unowned game nominees appear by default');
    assert.ok(await page.getByText('On your wishlist',{exact:true}).count()>0,'Matched wishlist nominees appear by default');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false,`${width}px horizontal overflow`);
    await page.screenshot({path:`docs/screenshots/goty-${incomplete ? "" : "fixture-"}${width}.png`,fullPage:false});
    if(!incomplete) {
      const link=await page.locator('#game-of-the-year a[href^="/game/"]').first().getAttribute('href');
      const details=await browser.newPage({viewport:{width,height:1000}});await details.goto(`${base}${link}`,{waitUntil:'networkidle',timeout:60000});
      assert.ok(await details.getByRole('heading',{name:'AWARDS',exact:true}).count()>0);
      const awardLink=details.locator('a[href="/goty?year=2025#game-of-the-year"]');assert.ok(await awardLink.count()>0);
      assert.ok((await awardLink.first().textContent()).includes('Winner'));
      await details.close();
      const cards=await browser.newPage({viewport:{width,height:1000}});await cards.goto(`${base}/all-games?search=Clair%20Obscur`,{waitUntil:'networkidle',timeout:60000});
      // The read-only fixture returns representative library rows; badge wiring uses the real list fetcher.
      assert.ok(await cards.locator('span[aria-label^="Game of the Year Winner"]').count()>0,'Shared game card shows awards summary');
      await cards.close();
      const stats=await browser.newPage({viewport:{width,height:1000}});stats.on('pageerror',e=>errors.push(e.message));
      await stats.goto(`${base}/stats`,{waitUntil:'networkidle',timeout:60000});
      await stats.getByText('All-Time Game Awards',{exact:true}).waitFor();
      assert.ok(await stats.getByRole('link',{name:/All-Time Game Awards/}).count()>0,'Published awards appear on Stats');
      assert.ok(Number(await stats.getByText('Awards won',{exact:true}).locator('..').locator('p').first().textContent())>0);
      await stats.close();
    }
    const total=await page.locator('section[id] h3').count();
    await page.getByRole('button',{name:'Winners',exact:true}).click();
    const winners=await page.locator('section[id] h3').count();assert.ok(winners<total);
    await page.getByRole('button',{name:'Owned games',exact:true}).click();assert.equal(await page.locator('section[id] article').count(),0);
    assert.equal(await page.getByText('Outside your library',{exact:true}).count(),0);
    assert.equal(await page.getByText('On your wishlist',{exact:true}).count(),0);
    await page.getByRole('button',{name:'All nominees',exact:true}).click();
    await page.getByRole('textbox',{name:'Search nominees and categories'}).fill('unlikely-no-match');
    assert.equal(await page.getByText('No entries match these filters.').count(),1);
    await page.getByRole('combobox',{name:'Ceremony year',exact:true}).selectOption('2014');
    await page.getByRole('heading',{name:'GOTY 2014'}).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('year'),'2014');
    assert.ok(await page.locator('section[id] h3').count()>0,'Year switching resets filters');
    await page.getByRole('combobox',{name:'Jump to category'}).selectOption('best-narrative');
    assert.ok(await page.locator('#best-narrative').isVisible());
    report.push({width,total,winners,incomplete,overflow});await page.close();
  }
  assert.deepEqual(errors,[]);
  for(const method of ['GET','POST','PATCH']){const response=await fetch(`${base}/api/admin/awards`,{method});assert.equal(response.status,401);}
  await writeFile(`docs/awards-browser-${report[0].incomplete ? "report" : "fixture-report"}.json`,JSON.stringify({report,errors},null,2)+'\n');console.log(report);
} finally {await browser.close();}
