// Run with an ephemeral Playwright package; no production dependency is added.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const search = process.env.PATH.split(path.delimiter)
  .filter((p) => p.endsWith(".bin"))
  .map((p) => path.dirname(p));
const resolvePackage = createRequire(import.meta.url);
const playwrightModule = await import(
  pathToFileURL(
    resolvePackage.resolve("playwright", { paths: [process.cwd(), ...search] }),
  ).href
);
const { chromium } = playwrightModule.default || playwrightModule;
const data = JSON.parse(
  readFileSync("data/relationships/semantic-after.json", "utf8"),
);
const base = process.env.RELATIONSHIP_TEST_URL || "http://localhost:3001";
const canonical = (title) =>
  data.canonical_games.find((c) => c.normalized_title === title);
const destination = (c) => {
  const l = data.game_identity_links
    .filter((x) => x.canonical_game_id === c.id)
    .sort((a, b) => a.game_id - b.game_id)[0];
  return l ? `/game/${l.game_id}` : `/canonical/${c.id}`;
};
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const screenshots = "docs/screenshots";
  mkdirSync(screenshots, { recursive: true });
  const report = [];
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    const cases = [
      [
        "kingdom come deliverance",
        ["Versions & Editions", "Sequels & Prequels", "Owned copies"],
      ],
      ["silent hill 2", ["Versions & Editions"]],
      ["doom ii", ["Sequels & Prequels"]],
      ["supraland", ["DLC & Expansions"]],
      ["ninja gaiden master collection", ["Related Games"]],
      ["f e a r", ["DLC & Expansions"]],
      ["stellar blade", ["Demos & Previews"]],
    ];
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [title, headings] of cases) {
        const c = canonical(title);
        assert.ok(c, title);
        await page.goto(base + destination(c), {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        const panel = page.locator('[aria-labelledby="relationships-heading"]');
        await panel.waitFor({ timeout: 60000 });
        for (const heading of headings)
          assert.equal(
            await panel
              .getByRole("heading", { name: heading, exact: true })
              .count(),
            1,
            `${title}: ${heading}`,
          );
        assert.equal(
          await panel
            .getByText("Loading identity and related games...")
            .count(),
          0,
        );
        const overflow = await panel.evaluate((el) => ({
          content: el.scrollWidth,
          box: el.clientWidth,
          outside: [...el.querySelectorAll("a")].some(
            (a) =>
              a.getBoundingClientRect().right >
              el.getBoundingClientRect().right + 1,
          ),
        }));
        assert.ok(
          overflow.content <= overflow.box + 1 && !overflow.outside,
          `${title} overflow at ${width}: ${JSON.stringify(overflow)}`,
        );
        if (title === "kingdom come deliverance") {
          await panel.scrollIntoViewIfNeeded();
          await page.waitForFunction(
            () =>
              [
                ...document.querySelectorAll(
                  '[aria-labelledby="relationships-heading"] img',
                ),
              ].every((img) => img.complete),
            {},
            { timeout: 10000 },
          ).catch(() => {}); // Slow external artwork must not fail layout/ownership checks.
          await panel.screenshot({
            path: `${screenshots}/game-relationships-${width}.png`,
          });
        }
        report.push({ title, width, pass: true });
      }
    }
    for (const igdb of [673, 880]) {
      const c = data.canonical_games.find((c) => c.igdb_id === igdb);
      await page.goto(base + destination(c), {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      const panel = page.locator('[aria-labelledby="relationships-heading"]');
      await panel.waitFor();
      assert.equal(
        await panel.getByRole("heading", { name: "Owned copies" }).count(),
        0,
      );
      assert.equal(
        await panel
          .getByRole("heading", { name: c.title, exact: true })
          .count(),
        1,
      );
    }
    assert.deepEqual(errors, []);
    writeFileSync(
      "docs/GAME_RELATIONSHIPS_BROWSER_QA.json",
      JSON.stringify(
        { pass: true, cases: report, page_errors: errors },
        null,
        2,
      ),
    );
    console.log(
      "PASS: 21 desktop/tablet/mobile renders, no panel overflow, historical ownership, screenshots",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
