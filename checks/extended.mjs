import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
let passed = [];
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  await p.goto("http://127.0.0.1:3002");
  await p.waitForSelector("#rows tr");
  await p.fill("#search", "BAT-003");
  assert.equal(await p.locator("#rows tr").count(), 1);
  await p.fill("#search", "nothing-matches");
  assert.match(await p.locator("#rows").innerText(), /No items match/);
  await p.fill("#search", "");
  passed.push("Search and empty-state rendering");
  await p.selectOption("#actor", "alice.testnet");
  await p.selectOption("#filter", "mine");
  assert.equal(await p.locator("#rows [data-item]").count(), 1);
  await p.selectOption("#filter", "all");
  passed.push("Holder filter");
  await p.selectOption("#actor", "outsider.testnet");
  await p.click("#issue");
  await p.click("button[type=submit]");
  assert.match(
    await p.locator("#toast").innerText(),
    /authorized manufacturer/,
  );
  await p.keyboard.press("Escape");
  passed.push("Unauthorized recall rejected in browser");
  await p.selectOption("#actor", "volta.testnet");
  await p.click("#issue");
  const payload =
    '<img src=x onerror="window.XSS_EXECUTED=true"> Fictional recall warning';
  await p.fill("#reason", payload);
  await p.click("button[type=submit]");
  await p.locator('[data-item="BAT-003"]').click();
  assert.equal(await p.locator("#dialog img").count(), 0);
  assert.equal(await p.evaluate(() => window.XSS_EXECUTED), undefined);
  await p.keyboard.press("Escape");
  passed.push("Recall text HTML escaped");
  await p.click('[data-tab="recalls"]');
  assert.match(await p.locator("#mainContent").innerText(), /RC-001/);
  await p.click('[data-tab="activity"]');
  assert.match(await p.locator("#mainContent").innerText(), /Recall issued/);
  await p.click('[data-tab="registry"]');
  passed.push("Recall center and activity navigation");
  await p.selectOption("#actor", "alice.testnet");
  await p.locator('[data-item="BAT-003"]').click();
  await p.fill("#recipient", "newholder.testnet");
  await p.click("#proposeTransfer");
  await p.keyboard.press("Escape");
  await p.selectOption("#actor", "newholder.testnet");
  await p.locator('[data-item="BAT-003"]').click();
  await p.click("#acceptTransfer");
  assert.match(await p.locator("#dialog").innerText(), /newholder.testnet/);
  await p.keyboard.press("Escape");
  passed.push("Custom recipient selectable and able to accept");
  await p.goto("http://127.0.0.1:3002/#item=BAT-003");
  await p.waitForSelector("#modal.open");
  assert.match(await p.locator("#dialog").innerText(), /BAT-003/);
  await p.keyboard.press("Escape");
  passed.push("Direct item link");
  for (const width of [360, 390, 768, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await p.locator('[data-item="BAT-003"]').click();
    assert.equal(
      await p.locator("#dialog").evaluate((e) => e.scrollWidth > e.clientWidth),
      false,
    );
    await p.keyboard.press("Escape");
  }
  passed.push("Page and detail dialog fit 360/390/768/1440px");
  await p.evaluate(() =>
    localStorage.setItem(
      "recalltag-v1",
      JSON.stringify({ schema: 2, items: [{}], recalls: [], events: [] }),
    ),
  );
  await p.goto("http://127.0.0.1:3002");
  await p.waitForSelector("#rows tr");
  assert.equal(await p.locator("#rows [data-item]").count(), 6);
  passed.push("Malformed saved data recovery");
  await p.evaluate(() => localStorage.setItem("recalltag-v1", "not-json"));
  await p.reload();
  await p.waitForSelector("#rows tr");
  assert.equal(await p.locator("#rows [data-item]").count(), 6);
  passed.push("Invalid JSON recovery");
  const noStorage = await browser.newContext();
  await noStorage.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("Storage blocked");
      },
    }),
  );
  const ns = await noStorage.newPage();
  await ns.goto("http://127.0.0.1:3002");
  await ns.waitForSelector("#rows tr");
  assert.equal(await ns.locator("#rows [data-item]").count(), 6);
  await noStorage.close();
  passed.push("App loads when localStorage is blocked");
  assert.deepEqual(errors, []);
  passed.push("No uncaught browser errors");
  console.log(passed.map((x) => "PASS: " + x).join("\n"));
} finally {
  await browser.close();
}
