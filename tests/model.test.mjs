import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  act,
  unresolved,
  acknowledgement,
  manufacturer,
  service,
} from "../model.mjs";
const recall = (s) =>
  act(s, manufacturer, "recall", {
    batch: "VC-24-A",
    reason: "Stop use: overheating risk during charging.",
  });
test("seed: six items, two batches, no safety certification inferred", () => {
  let s = seed();
  assert.equal(s.items.length, 6);
  assert.equal(new Set(s.items.map((i) => i.batch)).size, 2);
  assert.equal(s.recalls.length, 0);
});
test("only authorized manufacturer issues recalls", () => {
  assert.throws(
    () =>
      act(seed(), "alice.testnet", "recall", {
        batch: "VC-24-A",
        reason: "This must not be allowed.",
      }),
    /authorized manufacturer/,
  );
});
test("batch recall affects only matching items", () => {
  let s = recall(seed());
  assert.deepEqual(
    s.items.map((i) => unresolved(s, i).length),
    [1, 1, 1, 0, 0, 0],
  );
});
test("acknowledgement does not resolve a recall", () => {
  let s = recall(seed());
  s = act(s, "alice.testnet", "ack", { itemId: "BAT-003", recallId: "RC-001" });
  assert(acknowledgement(s.items[2], "RC-001"));
  assert.equal(unresolved(s, s.items[2]).length, 1);
});
test("only holder can acknowledge", () => {
  assert.throws(
    () =>
      act(recall(seed()), "bob.testnet", "ack", {
        itemId: "BAT-003",
        recallId: "RC-001",
      }),
    /current registered holder/,
  );
});
test("transfer requires nominated recipient and retains unresolved warning", () => {
  let s = recall(seed());
  s = act(s, "alice.testnet", "ack", { itemId: "BAT-003", recallId: "RC-001" });
  s = act(s, "alice.testnet", "propose", {
    itemId: "BAT-003",
    to: "bob.testnet",
  });
  assert.throws(
    () =>
      act(s, "outsider.testnet", "accept", {
        itemId: "BAT-003",
        expectedRevision: 1,
        expectedRepairCount: 0,
      }),
    /nominated/,
  );
  s = act(s, "bob.testnet", "accept", {
    itemId: "BAT-003",
    expectedRevision: 1,
    expectedRepairCount: 0,
  });
  assert.equal(s.items[2].holder, "bob.testnet");
  assert.equal(unresolved(s, s.items[2]).length, 1);
  assert.equal(acknowledgement(s.items[2], "RC-001"), false);
});
test("only service center can record remediation", () => {
  assert.throws(
    () =>
      act(recall(seed()), "alice.testnet", "repair", {
        itemId: "BAT-003",
        recallId: "RC-001",
        note: "I fixed my own battery.",
      }),
    /authorized service/,
  );
});
test("remediation applies only to selected item and recall", () => {
  let s = recall(seed());
  s = act(s, service, "repair", {
    itemId: "BAT-003",
    recallId: "RC-001",
    note: "Module replacement completed.",
  });
  assert.equal(unresolved(s, s.items[2]).length, 0);
  assert.equal(unresolved(s, s.items[0]).length, 1);
  s = recall(s);
  assert.equal(unresolved(s, s.items[2]).length, 1);
});
test("prior holder cannot act after accepted transfer", () => {
  let s = act(recall(seed()), "alice.testnet", "propose", {
    itemId: "BAT-003",
    to: "bob.testnet",
  });
  s = act(s, "bob.testnet", "accept", {
    itemId: "BAT-003",
    expectedRevision: 1,
    expectedRepairCount: 0,
  });
  assert.throws(() =>
    act(s, "alice.testnet", "ack", { itemId: "BAT-003", recallId: "RC-001" }),
  );
});
test("cancel transfer and reject duplicate or self proposals", () => {
  let s = seed();
  assert.throws(() =>
    act(s, "alice.testnet", "propose", {
      itemId: "BAT-003",
      to: "alice.testnet",
    }),
  );
  s = act(s, "alice.testnet", "propose", {
    itemId: "BAT-003",
    to: "bob.testnet",
  });
  assert.throws(() =>
    act(s, "alice.testnet", "propose", {
      itemId: "BAT-003",
      to: "maya.testnet",
    }),
  );
  s = act(s, "alice.testnet", "cancel", { itemId: "BAT-003" });
  assert.equal(s.items[2].pending, null);
});
test("rejected actions do not mutate original state", () => {
  let s = seed(),
    before = JSON.stringify(s);
  assert.throws(() =>
    act(s, "bob.testnet", "repair", {
      itemId: "BAT-003",
      recallId: "RC-001",
      note: "Fake service entry.",
    }),
  );
  assert.equal(JSON.stringify(s), before);
});

test("returning holder must acknowledge again for a new custody period", () => {
  let s = recall(seed());
  s = act(s, "alice.testnet", "ack", { itemId: "BAT-003", recallId: "RC-001" });
  for (const [from, to] of [
    ["alice.testnet", "bob.testnet"],
    ["bob.testnet", "alice.testnet"],
  ]) {
    s = act(s, from, "propose", { itemId: "BAT-003", to });
    s = act(s, to, "accept", {
      itemId: "BAT-003",
      expectedRevision: 1,
      expectedRepairCount: 0,
    });
  }
  assert.equal(acknowledgement(s.items[2], "RC-001"), false);
  s = act(s, "alice.testnet", "ack", { itemId: "BAT-003", recallId: "RC-001" });
  assert.equal(acknowledgement(s.items[2], "RC-001"), true);
});
test("duplicate acknowledgements and repairs are rejected", () => {
  let s = recall(seed());
  const a = { itemId: "BAT-003", recallId: "RC-001" };
  s = act(s, "alice.testnet", "ack", a);
  assert.throws(() => act(s, "alice.testnet", "ack", a), /Already/);
  s = act(s, service, "repair", {
    ...a,
    note: "Replacement module installed.",
  });
  assert.throws(
    () =>
      act(s, service, "repair", { ...a, note: "Duplicate replacement claim." }),
    /Unresolved recall/,
  );
});
test("new recall during a pending handover follows acceptance", () => {
  let s = act(seed(), "alice.testnet", "propose", {
    itemId: "BAT-003",
    to: "bob.testnet",
  });
  s = recall(s);
  s = act(s, "bob.testnet", "accept", {
    itemId: "BAT-003",
    expectedRevision: 1,
    expectedRepairCount: 0,
  });
  assert.equal(unresolved(s, s.items[2]).length, 1);
});
test("malformed text and invalid recipient inputs fail cleanly", () => {
  assert.throws(
    () =>
      act(seed(), manufacturer, "recall", { batch: "VC-24-A", reason: 123 }),
    /Describe/,
  );
  for (const to of ["Alice.testnet", "a", "a..testnet", "a@b", "-bob.testnet"])
    assert.throws(() =>
      act(seed(), "alice.testnet", "propose", { itemId: "BAT-003", to }),
    );
});
test("valid transitions preserve recoverable state", async () => {
  const { validState, restoreState } = await import("../model.mjs");
  let s = recall(seed());
  s = act(s, "alice.testnet", "ack", { itemId: "BAT-003", recallId: "RC-001" });
  s = act(s, service, "repair", {
    itemId: "BAT-003",
    recallId: "RC-001",
    note: "Replacement recorded at service center.",
  });
  assert(validState(s));
  assert.deepEqual(restoreState(JSON.stringify(s)), s);
});
test("corrupt and older saved data reset safely", async () => {
  const { restoreState } = await import("../model.mjs");
  for (const input of [
    "bad json",
    "null",
    JSON.stringify({ schema: 2, items: [{}], recalls: [], events: [] }),
    JSON.stringify({ ...seed(), schema: 1 }),
  ]) {
    assert.deepEqual(restoreState(input), seed());
  }
});
test("acceptance rejects a recall issued after the recipient preview", () => {
  let s = act(seed(), "alice.testnet", "propose", {
    itemId: "BAT-003",
    to: "bob.testnet",
  });
  s = recall(s);
  assert.throws(
    () =>
      act(s, "bob.testnet", "accept", {
        itemId: "BAT-003",
        expectedRevision: 0,
        expectedRepairCount: 0,
      }),
    /Safety state changed/,
  );
});
test("acceptance rejects remediation recorded after the recipient preview", () => {
  let s = act(recall(seed()), "alice.testnet", "propose", {
    itemId: "BAT-003",
    to: "bob.testnet",
  });
  s = act(s, service, "repair", {
    itemId: "BAT-003",
    recallId: "RC-001",
    note: "Replaced module after preview.",
  });
  assert.throws(
    () =>
      act(s, "bob.testnet", "accept", {
        itemId: "BAT-003",
        expectedRevision: 1,
        expectedRepairCount: 0,
      }),
    /Service state changed/,
  );
});
