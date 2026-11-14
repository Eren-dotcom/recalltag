import QRCode from "qrcode";
const modal = document.getElementById("modal");
function download(name, data, type) {
  const u = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}
const observer = new MutationObserver(() => {
  const button = document.getElementById("copyLink");
  if (!button || document.getElementById("exportRecord")) return;
  const id = document
    .querySelector("#dialog h2")
    ?.textContent.match(/BAT-\d+/)?.[0];
  if (!id) return;
  const parent = button.parentNode,
    qrButton = document.createElement("button");
  qrButton.className = "btn";
  qrButton.textContent = "Show item QR";
  qrButton.style.marginTop = "10px";
  parent.append(qrButton);
  qrButton.onclick = async () => {
    const url = new URL(location.href);
    url.hash = "item=" + id;
    const img = document.createElement("img");
    img.alt = "Item lookup QR for " + id;
    img.width = 180;
    img.height = 180;
    img.src = await QRCode.toDataURL(url.href, { width: 240, margin: 2 });
    qrButton.replaceWith(img);
    const note = document.createElement("p");
    note.className = "small muted";
    note.textContent =
      "Local-demo link: opens this browser’s saved dataset. Not an authenticity seal.";
    parent.append(note);
  };
  const exp = document.createElement("button");
  exp.id = "exportRecord";
  exp.className = "btn";
  exp.style.marginTop = "10px";
  exp.textContent = "Export local evidence";
  parent.append(exp);
  exp.onclick = async () => {
    try {
      const state = JSON.parse(localStorage.getItem("recalltag-v1"));
      if (!state)
        throw Error(
          "Perform an action first so the local demo record is saved.",
        );
      const item = state.items.find((i) => i.id === id);
      const payload = {
        format: "recalltag-local-evidence-v1",
        item,
        recalls: state.recalls.filter((r) => r.batch === item.batch),
        events: state.events.filter(
          (e) =>
            e.itemId === id ||
            (e.kind === "Recall issued" && e.batch === item.batch),
        ),
        disclaimer:
          "UNSIGNED LOCAL SIMULATION. Not chain evidence or physical verification.",
      };
      const serialized = JSON.stringify(payload);
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(serialized),
      );
      const sha256 = [...new Uint8Array(digest)]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      download(
        id + "-local-evidence.json",
        JSON.stringify(
          {
            payload,
            sha256,
            hashEncoding: "SHA-256 of JSON.stringify(payload), UTF-8",
          },
          null,
          2,
        ),
        "application/json",
      );
    } catch (e) {
      alert(e.message);
    }
  };
});
observer.observe(modal, { childList: true, subtree: true });

// Isolated adversarial demonstration; never changes the user's local records.
const lab = document.createElement("div");
lab.className = "card rail-card";
lab.innerHTML =
  '<div class="eyebrow">Trust, then test</div><h2 style="margin-top:8px">Try to break the handover.</h2><p class="small muted">Watch the local rules reject a forged recall, a self-approved repair, and an outdated safety review.</p><button class="btn dark" id="runSafetyLab" style="width:100%">Run safety stress test →</button>';
document.querySelector(".rail").append(lab);
document.getElementById("runSafetyLab").onclick = async () => {
  const { seed, act, manufacturer } = await import("./model.mjs");
  const results = [];
  function rejects(label, fn, expected) {
    try {
      fn();
      results.push([label, false, "Unexpectedly accepted"]);
    } catch (e) {
      results.push([label, expected.test(e.message), e.message]);
    }
  }
  rejects(
    "Unauthorized manufacturer",
    () =>
      act(seed(), "outsider.testnet", "recall", {
        batch: "VC-24-A",
        reason: "Forged safety notice from outsider.",
      }),
    /authorized manufacturer/,
  );
  let s = act(seed(), manufacturer, "recall", {
    batch: "VC-24-A",
    reason: "Fictional issue: stop use pending authorized service.",
  });
  rejects(
    "Owner signs their own remediation",
    () =>
      act(s, "alice.testnet", "repair", {
        itemId: "BAT-003",
        recallId: "RC-001",
        note: "I claim to have repaired this myself.",
      }),
    /authorized service/,
  );
  s = act(s, "alice.testnet", "propose", {
    itemId: "BAT-003",
    to: "bob.testnet",
  });
  const reviewedRevision = 1;
  s = act(s, manufacturer, "recall", {
    batch: "VC-24-A",
    reason: "A second issue arrived after the recipient reviewed the item.",
  });
  rejects(
    "Recall arrives after recipient review",
    () =>
      act(s, "bob.testnet", "accept", {
        itemId: "BAT-003",
        expectedRevision: reviewedRevision,
        expectedRepairCount: 0,
      }),
    /Safety state changed/,
  );
  const d = document.getElementById("dialog");
  d.className = "dialog narrow";
  d.innerHTML =
    '<div class="dialog-head"><div><div class="eyebrow">Isolated local model · not chain transactions</div><h2 style="margin-top:8px">Safety stress-test results</h2></div><button class="btn" id="closeSafetyLab" aria-label="Close safety lab">✕</button></div><div class="dialog-body">' +
    results
      .map(
        ([label, pass, message]) =>
          '<div class="block"><span class="badge ' +
          (pass ? "green" : "red") +
          '">' +
          (pass ? "EXPECTED REJECTION" : "FAILED") +
          '</span><h3 style="margin-top:10px">' +
          label +
          '</h3><p class="small muted">' +
          message +
          "</p></div>",
      )
      .join("") +
    '<p class="small muted">These checks use temporary in-memory records. Rust unit tests and a separate NEAR Sandbox run cover corresponding contract behavior. No real-product safety is certified.</p></div>';
  modal.classList.add("open");
  document.getElementById("closeSafetyLab").onclick = () =>
    modal.classList.remove("open");
  document.getElementById("closeSafetyLab").focus();
};
