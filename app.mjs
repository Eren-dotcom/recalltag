import {
  seed,
  act,
  affected,
  unresolved,
  acknowledgement,
  manufacturer,
  service,
  restoreState,
} from "./model.mjs";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let state;
try {
  state = restoreState(localStorage.getItem("recalltag-v1"));
} catch {
  state = seed();
}
let tab = "registry",
  query = "",
  filter = "all",
  selected = null,
  toastTimer,
  focusBefore;
const actor = () => $("actor").value;
function persist() {
  try {
    localStorage.setItem("recalltag-v1", JSON.stringify(state));
  } catch {
    toast("Browser storage unavailable. This session will not persist.", true);
  }
}
function toast(message, error = false) {
  $("toast").textContent = message;
  $("toast").className = "toast show" + (error ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").className = "toast"), 5500);
}
function execute(type, args, message) {
  try {
    state = act(state, actor(), type, args);
    persist();
    render();
    toast(message);
    return true;
  } catch (e) {
    toast(e.message, true);
    return false;
  }
}
function badge(item) {
  let n = unresolved(state, item).length;
  if (n)
    return `<span class="badge amber">● ${n === 1 ? "Unresolved recall" : n + " unresolved recalls"}</span>`;
  if (item.repairs.length)
    return '<span class="badge green">✓ Remediation recorded</span>';
  return '<span class="badge">No open recall recorded</span>';
}
function open(html, narrow = false) {
  focusBefore = document.activeElement;
  $("dialog").className = "dialog" + (narrow ? " narrow" : "");
  $("dialog").innerHTML = html;
  $("modal").classList.add("open");
  $("dialog").querySelector("button,input,select")?.focus();
  $("dialog")
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = close));
}
function close() {
  $("modal").classList.remove("open");
  selected = null;
  focusBefore?.focus();
}
function head(title, sub = "") {
  return `<div class="dialog-head"><div><div class="eyebrow">${sub}</div><h2 style="margin-top:5px">${title}</h2></div><button class="btn" data-close aria-label="Close dialog">✕</button></div>`;
}
function eventHTML(e) {
  return `<div class="event"><strong>${esc(e.kind)}</strong><p>${esc(e.detail || "")}</p><span class="small muted">${esc(e.actor)} · ${new Date(e.at).toLocaleString()}${e.itemId ? " · " + esc(e.itemId) : ""}</span></div>`;
}
function render() {
  const accounts = new Set([
    manufacturer,
    "alice.testnet",
    "bob.testnet",
    service,
    "maya.testnet",
    "outsider.testnet",
    ...state.items.flatMap((i) => [
      i.holder,
      ...(i.pending ? [i.pending.to] : []),
    ]),
  ]);
  for (const account of accounts) {
    if (![...$("actor").options].some((o) => o.value === account)) {
      const option = document.createElement("option");
      option.value = account;
      option.textContent = "Holder / recipient · " + account;
      $("actor").append(option);
    }
  }
  const bad = state.items.filter((i) => unresolved(state, i).length).length,
    transfers = state.items.filter((i) => i.pending).length;
  $("recallCount").textContent = state.recalls.filter((r) => r.open).length;
  $("stats").innerHTML = [
    ["Registered items", 6, "Across 2 fictional batches", "▤"],
    ["Items with unresolved recalls", bad, "Derived from batch notices", "◈"],
    [
      "Remediation records",
      state.items.reduce((a, i) => a + i.repairs.length, 0),
      "Recorded by the authorized center",
      "✓",
    ],
    ["Pending handovers", transfers, "Recipient acceptance required", "⇄"],
  ]
    .map(
      ([l, n, t, icon]) =>
        `<div class="stat"><span class="stat-icon">${icon}</span><label>${l}</label><div class="stat-num">${String(n).padStart(2, "0")}</div><div class="stat-note">${t}</div></div>`,
    )
    .join("");
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $("crumb").textContent = {
    registry: "Item registry",
    recalls: "Recall center",
    activity: "Activity log",
  }[tab];
  $("pageTitle").textContent = {
    registry: "Every item. Every handover.",
    recalls: "One notice. Every affected item.",
    activity: "A history that stays with the item.",
  }[tab];
  $("pageSub").textContent = {
    registry: "Keep safety warnings attached to the things that change hands.",
    recalls: "Issue batch-level warnings and track unresolved items.",
    activity: "Inspect who recorded each action in this local simulation.",
  }[tab];
  if (tab === "registry") {
    $("mainContent").innerHTML =
      `<div class="card"><div class="card-head"><h2>Item registry <span class="badge" style="margin-left:7px">6 items</span></h2><span class="small muted">VeloCell / demo collection</span></div><div class="toolbar"><input id="search" placeholder="⌕  Search item, batch, or holder…" aria-label="Search items" value="${esc(query)}"><select id="filter" aria-label="Filter items"><option value="all">All items</option><option value="unresolved">Unresolved recalls</option><option value="pending">Pending transfers</option><option value="mine">Held by demo account</option></select></div><div class="table-wrap"><table><thead><tr><th>ITEM / MODEL</th><th>BATCH</th><th>REGISTERED HOLDER</th><th>RECALL STATUS</th><th></th></tr></thead><tbody id="rows"></tbody></table></div><div class="table-foot"><span id="showing"></span><span>All records are simulated</span></div></div>`;
    $("filter").value = filter;
    $("filter").onchange = (e) => {
      filter = e.target.value;
      rows();
    };
    $("search").oninput = (e) => {
      query = e.target.value;
      rows();
    };
    rows();
  } else if (tab === "recalls") {
    $("mainContent").innerHTML =
      `<div class="card"><div class="card-head"><h2>Manufacturer notices</h2><span class="badge">${state.recalls.length} notices</span></div><div class="recall-list">${
        state.recalls.length
          ? state.recalls
              .slice()
              .reverse()
              .map((r) => {
                const items = state.items.filter((i) => i.batch === r.batch),
                  resolved = items.filter((i) =>
                    i.repairs.some((p) => p.recallId === r.id),
                  ).length;
                return `<div class="recall-entry"><div style="display:flex;justify-content:space-between;gap:10px"><h3>${esc(r.id)} · ${esc(r.batch)}</h3><span class="badge amber">Open notice</span></div><p class="muted" style="font-size:12px">${esc(r.reason)}</p><p class="small muted">Issued by ${esc(r.issuedBy)} · ${items.length} affected items · ${resolved} remediation records</p><div class="actions">${items.map((i) => `<button class="btn" data-item="${i.id}">${i.id} ↗</button>`).join("")}</div></div>`;
              })
              .join("")
          : '<div class="empty">No recalls issued yet.<br><br>Use the manufacturer demo account to issue a batch notice.</div>'
      }</div></div>`;
    bindItems();
  } else {
    $("mainContent").innerHTML =
      `<div class="card"><div class="card-head"><h2>Activity log</h2><span class="badge">${state.events.length} events</span></div><div class="audit-list">${state.events.length ? '<div class="timeline">' + state.events.slice().reverse().map(eventHTML).join("") + "</div>" : '<div class="empty">Your first action starts the story.<br>No blockchain transactions have occurred.</div>'}</div></div>`;
  }
}
function rows() {
  let list = state.items.filter(
    (i) =>
      [i.id, i.batch, i.holder, i.model]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "unresolved" && unresolved(state, i).length) ||
        (filter === "pending" && i.pending) ||
        (filter === "mine" && i.holder === actor())),
  );
  $("rows").innerHTML = list.length
    ? list
        .map(
          (i) =>
            `<tr><td><div class="item-name"><span class="battery">ϟ</span><div>${i.id}<div class="item-sub">${i.model}</div></div></div></td><td><span class="badge">${i.batch}</span></td><td>${esc(i.holder)}${i.pending ? '<div class="item-sub">⇄ Transfer awaiting acceptance</div>' : ""}</td><td>${badge(i)}</td><td><button class="text-btn" data-item="${i.id}">Inspect ↗</button></td></tr>`,
        )
        .join("")
    : '<tr><td colspan="5" class="empty">No items match these filters.</td></tr>';
  $("showing").textContent = `Showing ${list.length} of 6 registered items`;
  bindItems();
}
function bindItems() {
  document
    .querySelectorAll("[data-item]")
    .forEach((b) => (b.onclick = () => detail(b.dataset.item)));
}
function detail(id) {
  selected = id;
  const item = state.items.find((i) => i.id === id),
    recalls = affected(state, item),
    events = state.events.filter(
      (e) =>
        e.itemId === id ||
        (e.kind === "Recall issued" && e.batch === item.batch),
    );
  open(
    head(
      id + ' <span class="badge">' + item.model + "</span>",
      "Item safety record",
    ) +
      `<div class="dialog-body"><div class="detail-grid"><div><div class="block"><div class="topline">${badge(item)}</div><div class="kv"><span class="muted">Batch</span><strong>${item.batch}</strong></div><div class="kv"><span class="muted">Registered holder</span><strong>${esc(item.holder)}</strong></div><p class="small muted">Registration is not proof of authenticity, physical possession, or legal ownership.</p></div><div class="block"><h2>Safety notices</h2>${
        recalls.length
          ? recalls
              .map((r) => {
                let fixed = item.repairs.find((p) => p.recallId === r.id),
                  ack = acknowledgement(item, r.id);
                return `<div class="recall-box" style="${fixed ? "border-color:#4b9680;background:#eff8f3" : ""}"><h3>${esc(r.id)} · ${fixed ? "Remediation recorded" : "Unresolved recall"}</h3><p>${esc(r.reason)}</p><span class="badge ${ack ? "green" : ""}">${ack ? "Current holder acknowledged" : "Current holder has not acknowledged"}</span>${fixed ? `<p><strong>Service record:</strong> ${esc(fixed.note)}<br><span class="muted">Recorded by ${esc(fixed.by)}. Not independent physical verification.</span></p>` : ""}<div class="actions">${!ack ? `<button class="btn" data-ack="${r.id}">Acknowledge warning</button>` : ""}${!fixed ? `<button class="btn primary" data-repair="${r.id}">Record remediation</button>` : ""}</div></div>`;
              })
              .join("")
          : '<p class="muted small">No recall notice is recorded for this batch. This is not a safety certification.</p>'
      }</div><div class="block"><h2>Handover</h2>${item.pending ? `<p class="small muted">Proposed by ${esc(item.pending.from)} to <strong>${esc(item.pending.to)}</strong>.</p>${unresolved(state, item).length ? '<div class="recall-box"><strong>Unresolved warning will transfer with this item.</strong><p>Acceptance does not acknowledge or resolve the recall. This is custody tracking, not permission to sell or use a recalled item.</p></div>' : ""}<div class="actions"><button class="btn primary" id="acceptTransfer">Accept as recipient</button><button class="btn" id="cancelTransfer">Cancel as holder</button></div>` : `<p class="small muted">The recipient must accept. Safety history stays attached.</p><label class="field" for="recipient">Recipient account</label><input id="recipient" placeholder="bob.testnet" style="width:100%"><button class="btn primary" id="proposeTransfer" style="margin-top:12px">Propose handover →</button>`}<p class="small muted">Active demo account: ${esc(actor())}. Controls are tested against role permissions, even when visible to other roles.</p></div></div><div><div class="block"><div class="eyebrow">Item lookup link</div><p class="small muted">Share or open this item’s page. A link grants no permissions.</p><button class="btn" id="copyLink">Copy item link ↗</button></div><h2>Item timeline</h2><div class="timeline">${events.slice().reverse().map(eventHTML).join("")}<div class="event"><strong>Demo item registered</strong><p>${item.batch} · Fictional manufacturer data</p><span class="small muted">Initial registered holder from demo seed</span></div></div></div></div></div>`,
  );
  selected = id;
  $("copyLink").onclick = async () => {
    let u = new URL(location.href);
    u.hash = "item=" + id;
    try {
      await navigator.clipboard.writeText(u.href);
      toast("Item link copied.");
    } catch {
      prompt("Copy this item link:", u.href);
    }
  };
  document.querySelectorAll("[data-ack]").forEach(
    (b) =>
      (b.onclick = () => {
        if (
          execute(
            "ack",
            { itemId: id, recallId: b.dataset.ack },
            "Acknowledged. The recall remains unresolved until remediation is recorded.",
          )
        )
          detail(id);
      }),
  );
  document
    .querySelectorAll("[data-repair]")
    .forEach((b) => (b.onclick = () => repairForm(id, b.dataset.repair)));
  if ($("proposeTransfer"))
    $("proposeTransfer").onclick = () => {
      if (
        execute(
          "propose",
          { itemId: id, to: $("recipient").value.trim() },
          "Transfer proposed. Switch to the recipient account to accept.",
        )
      )
        detail(id);
    };
  if ($("acceptTransfer"))
    $("acceptTransfer").onclick = () => {
      if (
        !confirm(
          "Accept this registered handover with the safety notices shown? Unresolved recalls remain attached.",
        )
      )
        return;
      if (
        execute(
          "accept",
          {
            itemId: id,
            expectedRevision: recalls.length,
            expectedRepairCount: item.repairs.length,
          },
          "Handover accepted. The new holder has separate acknowledgement status.",
        )
      )
        detail(id);
    };
  if ($("cancelTransfer"))
    $("cancelTransfer").onclick = () => {
      if (execute("cancel", { itemId: id }, "Pending transfer cancelled."))
        detail(id);
    };
}
function issueForm() {
  open(
    head("Issue a batch recall", "Manufacturer action") +
      `<form class="dialog-body" id="recallForm"><div class="notice">Only volta.testnet is authorized in this local model. No real manufacturer is represented.</div><label class="field" for="batch">Affected batch</label><select id="batch" style="width:100%"><option>VC-24-A</option><option>VC-24-B</option></select><label class="field" for="reason">Issue and recommended action</label><textarea id="reason" maxlength="500" required minlength="10">Potential overheating during charging. Stop using the battery and contact the authorized service center.</textarea><p class="small muted">This notice applies to all 3 registered items in the selected batch. Existing notices are preserved.</p><button class="btn primary" type="submit" style="width:100%">Publish simulated recall</button></form>`,
    true,
  );
  $("recallForm").onsubmit = (e) => {
    e.preventDefault();
    if (
      execute(
        "recall",
        { batch: $("batch").value, reason: $("reason").value },
        "Recall issued. All registered items in the batch now show the notice.",
      )
    )
      close();
  };
}
function repairForm(id, recallId) {
  open(
    head("Record remediation", "Authorized service action") +
      `<form class="dialog-body" id="repairForm"><p class="muted small">${id} · ${recallId}<br>Only repair.testnet can record this claim. The prototype does not independently verify physical repairs.</p><label class="field" for="serviceNote">Remediation performed</label><textarea id="serviceNote" required minlength="10" maxlength="500">Replaced affected battery module and recorded the service inspection.</textarea><button class="btn primary" type="submit" style="width:100%;margin-top:18px">Record simulated remediation</button><button class="btn" id="backItem" type="button" style="margin-top:10px">Back to item</button></form>`,
    true,
  );
  $("backItem").onclick = () => detail(id);
  $("repairForm").onsubmit = (e) => {
    e.preventDefault();
    if (
      execute(
        "repair",
        { itemId: id, recallId, note: $("serviceNote").value },
        "Service claim recorded. Other unresolved recalls, if any, remain open.",
      )
    )
      detail(id);
  };
}
function story() {
  open(
    head("A warning that survives resale", "Guided demo · 5 steps") +
      `<div class="dialog-body"><p class="muted">Follow these actions using the demo account switcher at the top of the page.</p>${[
        ["Manufacturer · volta.testnet", "Issue a recall for VC-24-A."],
        [
          "Alice · alice.testnet",
          "Open BAT-003 and acknowledge the warning. It stays unresolved.",
        ],
        ["Alice · alice.testnet", "Propose a handover to bob.testnet."],
        [
          "Bob · bob.testnet",
          "Inspect the warning, then accept. Acknowledge it as the new holder.",
        ],
        [
          "Service center · repair.testnet",
          "Record remediation for BAT-003. Other items in the batch stay unresolved.",
        ],
      ]
        .map(
          ([a, t], i) =>
            `<div class="step"><span class="stepnum">${i + 1}</span><div><strong>${a}</strong><br><span class="muted">${t}</span></div></div>`,
        )
        .join(
          "",
        )}<p class="small muted">Also try issuing a recall as outsider.testnet or recording a repair as Alice. Both must be rejected.</p><button class="btn primary" id="storyBegin" style="width:100%;margin-top:15px">Switch to manufacturer & begin →</button></div>`,
    true,
  );
  $("storyBegin").onclick = () => {
    $("actor").value = manufacturer;
    close();
    if (!state.recalls.some((r) => r.batch === "VC-24-A")) issueForm();
    else detail("BAT-003");
  };
}
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      tab = b.dataset.tab;
      render();
    }),
);
$("issue").onclick = issueForm;
$("startStory").onclick = story;
$("actor").onchange = () => {
  const id = selected;
  render();
  if (id) detail(id);
};
$("reset").onclick = () => {
  if (
    confirm(
      "Reset all local items, recalls, transfers, and history? No blockchain data is involved.",
    )
  ) {
    state = seed();
    query = "";
    filter = "all";
    persist();
    close();
    render();
    toast("Local demo reset.");
  }
};
$("modal").onclick = (e) => {
  if (e.target === $("modal")) close();
};
document.addEventListener("keydown", (e) => {
  if (!$("modal").classList.contains("open")) return;
  if (e.key === "Escape") close();
  if (e.key === "Tab") {
    let els = [
        ...$("dialog").querySelectorAll(
          "button:not(:disabled),input,select,textarea",
        ),
      ],
      first = els[0],
      last = els.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
function hashRoute() {
  const id = new URLSearchParams(location.hash.slice(1)).get("item");
  if (state.items.some((i) => i.id === id)) detail(id);
}
window.addEventListener("hashchange", hashRoute);
render();
hashRoute();
