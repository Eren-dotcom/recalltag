import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:3002");
  await page.click("#issue");
  await page.click("button[type=submit]");
  await page.locator('[data-item="BAT-003"]').click();
  await page.getByRole("button", { name: "Show item QR" }).click();
  await page.waitForSelector('img[alt="Item lookup QR for BAT-003"]');
  assert.match(
    await page
      .locator('img[alt="Item lookup QR for BAT-003"]')
      .getAttribute("src"),
    /^data:image\/png;base64,/,
  );
  const pending = page.waitForEvent("download");
  await page.click("#exportRecord");
  const download = await pending;
  const path = await download.path();
  const evidence = JSON.parse(fs.readFileSync(path, "utf8"));
  assert.equal(
    evidence.sha256,
    createHash("sha256").update(JSON.stringify(evidence.payload)).digest("hex"),
  );
  assert.match(evidence.payload.disclaimer, /UNSIGNED LOCAL/);
  await page.keyboard.press("Escape");
  const beforeLab = await page.evaluate(() =>
    localStorage.getItem("recalltag-v1"),
  );
  await page.click("#runSafetyLab");
  await page.waitForSelector("#closeSafetyLab");
  assert.equal(await page.locator("#dialog .badge.green").count(), 3);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("recalltag-v1")),
    beforeLab,
  );
  await page.click("#closeSafetyLab");
  await page.click("#walletConnect");
  await page
    .getByText("MyNearWallet", { exact: false })
    .first()
    .waitFor({ timeout: 30000 });
  console.log(
    "PASS: QR rendered, local evidence SHA-256 verified, unsigned disclaimer present, 3 isolated safety checks pass without modifying saved state, wallet selection modal opens. No wallet login or signing performed.",
  );
} finally {
  await browser.close();
}
