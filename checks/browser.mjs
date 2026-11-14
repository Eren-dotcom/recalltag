import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
await page.goto("http://127.0.0.1:3002");
await page.waitForSelector("#rows tr");
assert.equal(await page.locator("#rows tr").count(), 6);
await page.screenshot({ path: "checks/desktop.png", fullPage: true });
await page.click("#issue");
await page.click("button[type=submit]");
await page.selectOption("#actor", "alice.testnet");
await page.locator('[data-item="BAT-003"]').click();
await page.click('[data-ack="RC-001"]');
await page.fill("#recipient", "bob.testnet");
await page.click("#proposeTransfer");
await page.keyboard.press("Escape");
await page.selectOption("#actor", "bob.testnet");
await page.locator('[data-item="BAT-003"]').click();
await page.click("#acceptTransfer");
assert.match(
  await page.locator("#dialog").innerText(),
  /Current holder has not acknowledged/,
);
assert.match(await page.locator("#dialog").innerText(), /Unresolved recall/);
await page.click('[data-repair="RC-001"]');
await page.click("button[type=submit]");
await page.waitForTimeout(50);
assert.match(
  await page.locator("#toast").innerText(),
  /Only the authorized service/,
);
await page.keyboard.press("Escape");
await page.selectOption("#actor", "repair.testnet");
await page.locator('[data-item="BAT-003"]').click();
await page.click('[data-repair="RC-001"]');
await page.click("button[type=submit]");
assert.match(await page.locator("#dialog").innerText(), /Remediation recorded/);
await page.keyboard.press("Escape");
await page.reload();
await page.waitForSelector("#rows tr");
assert.match(await page.locator("#rows").innerText(), /Remediation recorded/);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "checks/mobile.png", fullPage: true });
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  ),
  false,
);
assert.deepEqual(errors, []);
console.log(
  "PASS: full handover + unauthorized repair + authorized repair + persistence + mobile overflow + no page errors",
);
await browser.close();
