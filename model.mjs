export const manufacturer = "volta.testnet",
  service = "repair.testnet";
export function seed() {
  return {
    schema: 2,
    recalls: [],
    events: [],
    items: Array.from({ length: 6 }, (_, i) => ({
      id: `BAT-00${i + 1}`,
      model: "VeloCell 500",
      batch: i < 3 ? "VC-24-A" : "VC-24-B",
      holder:
        i === 2 ? "alice.testnet" : i < 3 ? "maya.testnet" : "bob.testnet",
      pending: null,
      ownershipEpoch: 0,
      acks: [],
      repairs: [],
    })),
  };
}
export function affected(state, item) {
  return state.recalls.filter((r) => r.batch === item.batch);
}
export function unresolved(state, item) {
  return affected(state, item).filter(
    (r) => r.open && !item.repairs.some((p) => p.recallId === r.id),
  );
}
export function acknowledgement(item, recallId) {
  return item.acks.some(
    (a) =>
      a.recallId === recallId &&
      a.holder === item.holder &&
      a.epoch === item.ownershipEpoch,
  );
}
export function act(input, actor, type, args = {}) {
  const s = structuredClone(input);
  let item = s.items.find((i) => i.id === args.itemId),
    event;
  const require = (v, m) => {
    if (!v) throw Error(m);
  };
  if (type === "recall") {
    require(actor ===
      manufacturer, "Only the authorized manufacturer can issue a recall.");
    require(["VC-24-A", "VC-24-B"].includes(args.batch), "Unknown batch.");
    require(typeof args.reason === "string" &&
      args.reason.trim().length >=
        10, "Describe the issue in at least 10 characters.");
    require(args.reason.length <= 500, "Keep the issue under 500 characters.");
    const id = `RC-${String(s.recalls.length + 1).padStart(3, "0")}`;
    s.recalls.push({
      id,
      batch: args.batch,
      reason: args.reason.trim(),
      open: true,
      issuedBy: actor,
      at: Date.now(),
    });
    event = {
      kind: "Recall issued",
      batch: args.batch,
      recallId: id,
      detail: args.reason.trim(),
    };
  } else {
    require(item, "Item not found.");
    if (type === "ack") {
      const recall = affected(s, item).find((r) => r.id === args.recallId);
      require(recall && recall.open, "Open recall not found.");
      require(actor ===
        item.holder, "Only the current registered holder can acknowledge.");
      require(!acknowledgement(
        item,
        recall.id,
      ), "Already acknowledged by this holder.");
      item.acks.push({
        recallId: recall.id,
        holder: actor,
        epoch: item.ownershipEpoch,
      });
      event = {
        kind: "Warning acknowledged",
        detail: "Acknowledgement does not record a repair.",
        recallId: recall.id,
      };
    } else if (type === "propose") {
      require(actor ===
        item.holder, "Only the current holder can propose a transfer.");
      require(!item.pending, "A transfer is already pending.");
      require(typeof args.to === "string" &&
        args.to.length >= 2 &&
        args.to.length <= 64 &&
        /^([a-z0-9]+[-_.])*[a-z0-9]+$/.test(
          args.to,
        ), "Enter a valid-format NEAR account ID.");
      require(args.to !== actor, "Choose a different recipient.");
      item.pending = { from: actor, to: args.to };
      event = {
        kind: "Transfer proposed",
        detail: `To ${args.to}. Recall records remain attached.`,
      };
    } else if (type === "accept") {
      require(item.pending &&
        actor === item.pending.to, "Only the nominated recipient can accept.");
      require(item.pending.from === item.holder, "Transfer is stale.");
      require(args.expectedRevision ===
        affected(s, item)
          .length, "Safety state changed: review latest recall notices.");
      require(args.expectedRepairCount ===
        item.repairs.length, "Service state changed: review latest record.");
      const old = item.holder;
      item.holder = actor;
      item.ownershipEpoch++;
      item.pending = null;
      event = {
        kind: "Transfer accepted",
        detail: `${old} → ${actor}. Prior acknowledgements do not apply to the new holder.`,
      };
    } else if (type === "cancel") {
      require(item.pending &&
        actor ===
          item.holder, "Only the current holder can cancel a pending transfer.");
      item.pending = null;
      event = {
        kind: "Transfer cancelled",
        detail: "Registered holder unchanged.",
      };
    } else if (type === "repair") {
      require(actor ===
        service, "Only the authorized service center can record remediation.");
      const r = unresolved(s, item).find((r) => r.id === args.recallId);
      require(r, "Unresolved recall not found.");
      require(typeof args.note === "string" &&
        args.note.trim().length >=
          10, "Add a service note of at least 10 characters.");
      require(args.note.length <=
        500, "Keep the service note under 500 characters.");
      item.repairs.push({
        recallId: r.id,
        by: actor,
        note: args.note.trim(),
        at: Date.now(),
      });
      event = {
        kind: "Remediation recorded",
        detail: args.note.trim(),
        recallId: r.id,
      };
    } else throw Error("Unsupported action.");
    event.itemId = item.id;
    event.batch = item.batch;
  }
  s.events.push({ ...event, actor, at: Date.now(), id: s.events.length + 1 });
  return s;
}

// Structural validation is crash recovery, not protection against malicious local edits.
export function validState(s) {
  try {
    const text = (v) => typeof v === "string",
      account = (v) =>
        text(v) &&
        v.length >= 2 &&
        v.length <= 64 &&
        /^([a-z0-9]+[-_.])*[a-z0-9]+$/.test(v),
      time = (v) => Number.isFinite(v) && v >= 0;
    if (
      s?.schema !== 2 ||
      !Array.isArray(s.items) ||
      s.items.length !== 6 ||
      !Array.isArray(s.recalls) ||
      !Array.isArray(s.events)
    )
      return false;
    const ref = seed();
    if (
      !s.recalls.every(
        (r, i) =>
          r &&
          r.id === `RC-${String(i + 1).padStart(3, "0")}` &&
          ["VC-24-A", "VC-24-B"].includes(r.batch) &&
          text(r.reason) &&
          r.reason.length >= 10 &&
          r.reason.length <= 500 &&
          r.open === true &&
          r.issuedBy === manufacturer &&
          time(r.at),
      )
    )
      return false;
    if (
      !s.items.every(
        (it, i) =>
          it &&
          it.id === ref.items[i].id &&
          it.batch === ref.items[i].batch &&
          it.model === ref.items[i].model &&
          account(it.holder) &&
          Number.isSafeInteger(it.ownershipEpoch) &&
          it.ownershipEpoch >= 0 &&
          Array.isArray(it.acks) &&
          Array.isArray(it.repairs) &&
          (!it.pending ||
            (it.pending.from === it.holder &&
              account(it.pending.to) &&
              it.pending.to !== it.holder)) &&
          it.acks.every(
            (a) =>
              a &&
              account(a.holder) &&
              Number.isSafeInteger(a.epoch) &&
              a.epoch >= 0 &&
              a.epoch <= it.ownershipEpoch &&
              s.recalls.some(
                (r) => r.id === a.recallId && r.batch === it.batch,
              ),
          ) &&
          it.repairs.every(
            (p) =>
              p &&
              p.by === service &&
              text(p.note) &&
              p.note.length >= 10 &&
              p.note.length <= 500 &&
              time(p.at) &&
              s.recalls.some(
                (r) => r.id === p.recallId && r.batch === it.batch,
              ),
          ),
      )
    )
      return false;
    return s.events.every(
      (e, i) =>
        e &&
        e.id === i + 1 &&
        text(e.kind) &&
        text(e.detail) &&
        account(e.actor) &&
        time(e.at) &&
        ["VC-24-A", "VC-24-B"].includes(e.batch) &&
        (!e.itemId || s.items.some((it) => it.id === e.itemId)),
    );
  } catch {
    return false;
  }
}
export function restoreState(serialized) {
  try {
    const s = JSON.parse(serialized);
    return validState(s) ? s : seed();
  } catch {
    return seed();
  }
}
