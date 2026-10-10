import assert from "node:assert/strict";
import {writeFile} from "node:fs/promises";
import {chromium} from "playwright";
import {createAdminSessionValue} from "../../lib/adminAuth.ts";
const base = process.env.CONSTELLATIONS_PREVIEW_URL || "http://localhost:3101";
assert.ok(["localhost","127.0.0.1"].includes(new URL(base).hostname));
const browser = await chromium.launch({channel: "msedge",headless: true});
const context = await browser.newContext({viewport: {width: 1440,height: 1000}});
await context.addCookies([{name: "admin_auth",value: await createAdminSessionValue(),url: base}]);
const page = await context.newPage(), errors = [], checks = [];
page.on("pageerror",e => errors.push(e.message));
const route = name => page.locator("section.constellation-route").filter({has: page.getByRole("heading",{name,exact: true})});
const game = (name,title) => route(name).getByRole("button",{name: new RegExp(`^${title},`)});
const dump = async () => (await fetch("http://127.0.0.1:4402/fixture/routes")).json();
const list = (data,name) => data.find(r=>r.name===name).play_route_games.map(g=>Number(g.game_id));
async function reset(width=1440) {
  await fetch("http://127.0.0.1:4402/fixture/reset",{method: "POST"});
  await page.setViewportSize({width,height: 1000});
  await page.goto(`${base}/play-pipeline`);
  await page.getByRole("button",{name: "Drag to arrange Source",exact: true}).waitFor();
}
async function drag(source,target,point) {
  await source.scrollIntoViewIfNeeded(); const from=await source.boundingBox();
  await target.scrollIntoViewIfNeeded(); const to=await target.boundingBox();
  assert.ok(from && to);
  // Avoid native HTML drag-and-drop: dnd-kit activates from pointer movement.
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);
  await page.mouse.down();
  await page.mouse.move(from.x+from.width/2+12,from.y+from.height/2,{steps: 4});
  await page.mouse.move(to.x+(point?.x ?? to.width/2),to.y+(point?.y ?? to.height/2),{steps: 12});
  await page.waitForTimeout(100);
  await page.mouse.up();
}
async function saved() {await page.getByRole("status").filter({hasText: "Routes saved"}).waitFor();}
try {
  await reset();
  await drag(game("Source","Alpha"),game("Destination","Delta"));await saved();
  assert.deepEqual(list(await dump(),"Source"),[2,3]);assert.deepEqual(list(await dump(),"Destination"),[1,4]);
  assert.equal((await dump()).find(r=>r.name==="Destination").play_route_games[0].status,"completed");
  await page.reload(); await game("Destination","Alpha").waitFor();checks.push("pointer transfer inserts before target, preserves status and survives refresh");

  await reset();await drag(game("Source","Beta"),route("Empty").locator(".route-empty"));await saved();
  assert.deepEqual(list(await dump(),"Empty"),[2]);checks.push("pointer transfer to empty route");

  await reset();await page.locator(".routes-sidebar").getByRole("button",{name: /Source/}).click();
  await drag(game("Source","Gamma"),page.locator(".routes-sidebar").getByRole("button",{name: /Destination/}));await saved();
  assert.deepEqual(list(await dump(),"Destination"),[4,3]);checks.push("sidebar transfer while viewing one route");

  await reset();await drag(game("Source","Gamma"),game("Source","Alpha"));await saved();
  assert.deepEqual(list(await dump(),"Source"),[3,1,2]);checks.push("same-route reordering still works");

  await reset();await drag(page.getByRole("button",{name: "Drag to arrange Source",exact:true}),page.getByRole("button",{name: "Drag to arrange Destination",exact:true}));await saved();
  assert.deepEqual((await dump()).map(r=>r.name),["Destination","Source","Empty"]);checks.push("route reordering still works");

  await reset();await game("Source","Gamma").focus();await page.keyboard.press("Space");await page.waitForTimeout(150);await page.keyboard.press("ArrowRight");await page.waitForTimeout(150);await page.keyboard.press("Space");await saved();
  assert.deepEqual(list(await dump(),"Destination"),[3,4]);checks.push("keyboard cross-route transfer");

  await reset();await game("Source","Alpha").focus();await page.keyboard.press("Space");await page.waitForTimeout(150);await page.keyboard.press("ArrowRight");await page.waitForTimeout(150);await page.keyboard.press("ArrowRight");await page.waitForTimeout(150);await page.keyboard.press("Space");await saved();
  assert.deepEqual(list(await dump(),"Empty"),[1]);checks.push("keyboard transfer to empty route");

  await reset();const duplicateTarget=(await dump()).find(r=>r.name==="Destination");
  assert.equal((await context.request.post(`${base}/api/play-routes`,{data:{...duplicateTarget,action:"save",games:[{game_id:4,status:"upcoming"},{game_id:1,status:"upcoming"}]}})).status(),200);
  await page.reload();await game("Destination","Alpha").waitFor();
  await drag(game("Source","Alpha"),game("Destination","Delta"));
  await page.getByRole("alert").filter({hasText:"already in the destination"}).waitFor();
  assert.deepEqual(list(await dump(),"Source"),[1,2,3]);assert.deepEqual(list(await dump(),"Destination"),[4,1]);checks.push("shared game memberships remain distinct and duplicate transfer is blocked");

  await reset();await game("Source","Alpha").focus();await page.keyboard.press("Space");await page.keyboard.press("Escape");
  await drag(game("Source","Alpha"),page.locator(".constellations-header h1"));
  assert.deepEqual(list(await dump(),"Source"),[1,2,3]);checks.push("Escape and dropping outside targets leave membership unchanged");

  await reset();await page.route("**/api/play-routes",async handler => {
    if(handler.request().method()==="POST") return handler.fulfill({status:400,contentType:"application/json",body:JSON.stringify({error:"Fixture save failed"})});
    return handler.continue();
  });
  await drag(game("Source","Alpha"),game("Destination","Delta"));
  await page.getByRole("alert").filter({hasText: "Fixture save failed"}).waitFor();
  await game("Source","Alpha").waitFor();assert.deepEqual(list(await dump(),"Source"),[1,2,3]);
  await page.unroute("**/api/play-routes");checks.push("failed save restores visible membership");

  await reset();await page.route("**/api/play-routes",handler=>handler.request().method()==="GET" ? handler.fulfill({status:500,body:"{}",contentType:"application/json"}) : handler.continue());
  await drag(game("Source","Alpha"),game("Destination","Delta"));
  await page.getByRole("alert").filter({hasText:"Saved, but unable to reload"}).waitFor();
  assert.deepEqual(list(await dump(),"Destination"),[1,4]);
  assert.equal(await page.getByRole("button",{name:"Drag to arrange Source",exact:true}).isDisabled(),true);
  await page.unroute("**/api/play-routes");await page.reload();await game("Destination","Alpha").waitFor();checks.push("successful save with failed reload blocks edits and refresh recovers persisted transfer");

  await reset();const original=(await dump()).find(r=>r.name==="Source");
  const staleResponse=await context.request.post(`${base}/api/play-routes`,{data:{...original,action:"save",games:original.play_route_games.map(g=>({game_id:g.game_id,status:g.status}))}});
  assert.equal(staleResponse.status(),200);
  await drag(game("Source","Alpha"),game("Destination","Delta"));
  await page.getByRole("alert").filter({hasText: "another tab"}).waitFor();
  await game("Source","Alpha").waitFor();assert.deepEqual(list(await dump(),"Destination"),[4]);
  assert.equal(await page.getByRole("button",{name:"Drag to arrange Source",exact:true}).isDisabled(),true);checks.push("stale revision restores membership and blocks edits until refresh");

  await reset(390);await page.locator(".routes-sidebar").getByRole("button",{name:/Source/}).click();
  await drag(game("Source","Alpha"),page.locator(".routes-sidebar").getByRole("button",{name:/Empty/}));await saved();
  assert.deepEqual(list(await dump(),"Empty"),[1]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);checks.push("390px sidebar transfer without page overflow");

  const visitor=await browser.newContext();const response=await visitor.request.post(`${base}/api/play-routes`,{data:{action:"move"}});assert.equal(response.status(),401);await visitor.close();checks.push("write API requires admin session");
  assert.deepEqual(errors,[]);
  await writeFile("docs/constellations-drag-report.json",JSON.stringify({checks,pageErrors:errors,productionWrites:0},null,2)+"\n");
  console.log(JSON.stringify({checks,pageErrors:errors},null,2));
} catch(error) {console.log("Completed checks:",checks);await page.screenshot({path:"docs/screenshots/constellations-debug.png",fullPage:true});throw error;} finally {await browser.close();}
