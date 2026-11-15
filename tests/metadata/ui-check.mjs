// Run against a local dev server. All refresh writes are intercepted with fixtures.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";

const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/admin/me", route => route.fulfill({ json: { isAdmin: true } }));
    let refreshCalls = 0;
    await page.route("**/api/admin/metadata-refresh", async route => {
      const body = route.request().postDataJSON();
      if (body.action === "preview") return route.fulfill({ json: { ids: [1, 2], total: 2 } });
      refreshCalls++;
      await new Promise(resolve => setTimeout(resolve, 400));
      return route.fulfill({ json: { title: `Game ${body.id}`, results: [{ type: "metadata", status: "updated", message: "Updated summary" }], halt: false } });
    });
    await page.goto("http://localhost:3000/wishlist", { waitUntil: "domcontentloaded", timeout: 60000 });
    if (width < 1024) await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.locator("summary").filter({ hasText: "More" }).filter({ visible: true }).click();
    await page.getByRole("button", { name: "Refresh Metadata", exact: true }).filter({ visible: true }).click();
    const dialog = page.getByRole("dialog", { name: "Refresh Metadata" });
    await dialog.waitFor();
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await dialog.screenshot({ path: join(tmpdir(), `metadata-refresh-${width}.png`) });
    await dialog.getByRole("button", { name: "Preview games" }).click();
    await dialog.getByText("2 matching games. Ready to refresh.").waitFor();
    await dialog.getByRole("button", { name: "Start Refresh" }).click();
    await dialog.getByRole("button", { name: "Stop after current game" }).click();
    await dialog.getByText("Refresh stopped", { exact: true }).waitFor();
    assert.equal(refreshCalls, 1);
    await dialog.getByRole("button", { name: "Preview games" }).click();
    await dialog.getByRole("button", { name: "Start Refresh" }).click();
    await dialog.getByText("Refresh complete", { exact: true }).waitFor();
    assert.equal(refreshCalls, 3);
    await dialog.getByRole("button", { name: "Close refresh metadata" }).click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: More menu, dialog layout, preview, stop, complete, close`);
    await page.close();
  }
} finally { await browser.close(); }
