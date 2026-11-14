import { Worker } from "near-workspaces";
import assert from "node:assert/strict";
import fs from "node:fs";
const worker = await Worker.init();
try {
  const root = worker.rootAccount;
  const registry = await root.createSubAccount("registry");
  const issuer = await root.createSubAccount("issuer");
  const bob = await root.createSubAccount("bob");
  const repair = await root.createSubAccount("repair");
  const outsider = await root.createSubAccount("outsider");
  await registry.deploy(fs.readFileSync("artifacts/recalltag.wasm"));
  await registry.call(registry, "new", { issuer: issuer.accountId });
  const opts = {
    attachedDeposit: "10000000000000000000000",
    gas: "100000000000000",
  };
  await issuer.call(
    registry,
    "create_batch",
    { id: "B1", model: "Fictional battery", service: repair.accountId },
    opts,
  );
  await issuer.call(registry, "register_item", { id: "I1", batch: "B1" }, opts);
  await assert.rejects(() =>
    outsider.call(
      registry,
      "issue_recall",
      { id: "BAD", batch: "B1", reason: "Unauthorized recall attempt" },
      opts,
    ),
  );
  await issuer.call(
    registry,
    "propose_transfer",
    { item_id: "I1", to: bob.accountId },
    opts,
  );
  await issuer.call(
    registry,
    "issue_recall",
    {
      id: "R1",
      batch: "B1",
      reason: "Stop use and arrange authorized service.",
    },
    opts,
  );
  await assert.rejects(() =>
    bob.call(
      registry,
      "accept_transfer",
      { item_id: "I1", expected_revision: 0, expected_repair_count: 0 },
      opts,
    ),
  );
  await bob.call(
    registry,
    "accept_transfer",
    { item_id: "I1", expected_revision: 1, expected_repair_count: 0 },
    opts,
  );
  await bob.call(
    registry,
    "acknowledge",
    { item_id: "I1", recall_id: "R1" },
    opts,
  );
  let item = await registry.view("get_item", { id: "I1" });
  assert.equal(item.holder, bob.accountId);
  assert.equal(item.repairs.length, 0);
  await assert.rejects(() =>
    bob.call(
      registry,
      "record_remediation",
      {
        item_id: "I1",
        recall_id: "R1",
        note: "Self repair must not be permitted.",
      },
      opts,
    ),
  );
  await repair.call(
    registry,
    "record_remediation",
    {
      item_id: "I1",
      recall_id: "R1",
      note: "Replaced affected module; service claim only.",
    },
    opts,
  );
  item = await registry.view("get_item", { id: "I1" });
  assert.equal(item.repairs.length, 1);
  console.log(
    "SANDBOX PASS: deploy/init, paid storage, registration, unauthorized issuer rejection, stale review rejection, transfer acceptance, acknowledgement, unauthorized repair rejection, remediation and persisted views.",
  );
} finally {
  await worker.tearDown();
}
