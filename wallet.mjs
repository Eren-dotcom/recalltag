import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import "@near-wallet-selector/modal-ui/styles.css";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const contract = import.meta.env.VITE_RECALLTAG_CONTRACT || "";
let selector, account, loaded, loadedBatch, reviewed;
const $ = (id) => document.getElementById(id);
const panel = document.createElement("section");
panel.className = "card";
panel.style.marginTop = "25px";
panel.id = "nearPanel";
panel.innerHTML = `<div class="card-head"><div><div class="eyebrow">Separate from the local simulator</div><h2 style="margin-top:7px">NEAR testnet workspace</h2></div><button class="btn dark" id="walletConnect">Connect testnet wallet</button></div><div style="padding:22px"><p class="small muted" id="walletStatus">${contract ? "Configured contract: " + esc(contract) : "No contract configured. Connect a testnet wallet to get started; transactions require deployment first."}</p><div class="detail-grid"><div class="block"><h3>1 · Register products</h3><label class="field" for="chainBatch">Batch ID</label><input id="chainBatch" placeholder="VC-24-A" value="VC-24-A"><label class="field" for="chainModel">Model</label><input id="chainModel" value="Fictional VeloCell 500"><label class="field" for="chainService">Authorized service-center account</label><input id="chainService" placeholder="Your service testnet account"><div class="actions"><button class="btn" data-write="batch">Create batch</button></div><label class="field" for="chainItem">Item ID</label><input id="chainItem" value="BAT-001"><div class="actions"><button class="btn" data-write="register">Register item</button><button class="btn primary" id="loadChain">Load onchain item</button></div></div><div class="block"><h3>2 · Recall and custody actions</h3><label class="field" for="chainRecall">Recall ID</label><input id="chainRecall" value="RC-001"><label class="field" for="chainReason">Recall / service description</label><textarea id="chainReason" maxlength="500">Fictional overheating issue. Stop use and arrange authorized service.</textarea><label class="field" for="chainTo">Transfer recipient</label><input id="chainTo" placeholder="Recipient's testnet account"><div class="actions"><button class="btn" data-write="recall">Issue recall</button><button class="btn" data-write="ack">Acknowledge</button><button class="btn" data-write="propose">Propose custody transfer</button><button class="btn" data-write="accept">Accept reviewed handover</button><button class="btn" data-write="cancel">Cancel transfer</button><button class="btn" data-write="repair">Record remediation</button></div></div></div><div id="onchainSummary" class="notice" hidden></div><details><summary class="small muted" style="cursor:pointer">Inspect raw onchain item and batch</summary><pre id="chainData" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px"></pre></details><p class="small muted">Each write requests a 0.01 test NEAR storage deposit plus gas. The contract charges measured record growth and attempts to refund excess. Initialization and deployment are separate, owner-authorized steps. No real products, legal clearance, or proof of repair. Onchain account IDs and descriptions are public: never enter personal contact details.</p><button class="btn" id="walletDisconnect">Disconnect</button></div>`;
document.querySelector(".bottom-banner").before(panel);
function status(t) {
  $("walletStatus").textContent = t;
}
async function initialize() {
  if (selector) return;
  selector = await setupWalletSelector({
    network: "testnet",
    modules: [
      setupMyNearWallet({ walletUrl: "https://testnet.mynearwallet.com" }),
    ],
  });
  const update = (state) => {
    account = state.accounts.find((a) => a.active) || state.accounts[0];
    $("walletConnect").textContent = account
      ? account.accountId
      : "Connect testnet wallet";
    if (account)
      status(
        "Connected " +
          account.accountId +
          " · testnet. Local demo roles do not authorize onchain actions.",
      );
  };
  update(selector.store.getState());
  selector.store.observable.subscribe(update);
}
$("walletConnect").onclick = async () => {
  try {
    await initialize();
    setupModal(selector, { contractId: contract || "testnet" }).show();
  } catch (e) {
    status("Wallet error: " + e.message);
  }
};
async function view(method, args) {
  if (!contract)
    throw Error("Deploy and configure VITE_RECALLTAG_CONTRACT first.");
  const response = await fetch("https://rpc.testnet.near.org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "recalltag",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contract,
        method_name: method,
        args_base64: btoa(JSON.stringify(args)),
      },
    }),
  });
  if (!response.ok) throw Error("RPC HTTP " + response.status);
  const data = await response.json();
  if (data.error) throw Error(JSON.stringify(data.error));
  return JSON.parse(
    new TextDecoder().decode(new Uint8Array(data.result.result)),
  );
}
async function load() {
  const itemId = $("chainItem").value.trim();
  const it = await view("get_item", { id: itemId });
  if (!it) throw Error("Item not found.");
  const b = await view("get_batch", { id: it.batch });
  if (!b) throw Error("Batch not found.");
  const recalls = await Promise.all(
    b.recalls.map((id) => view("get_recall", { id })),
  );
  loaded = it;
  loadedBatch = b;
  reviewed = {
    item_id: it.id,
    expected_revision: b.revision,
    expected_repair_count: it.repairs.length,
  };
  const open = recalls.filter(
    (r) => !it.repairs.some((p) => p.recall_id === r.id),
  );
  $("chainData").textContent = JSON.stringify(
    { item: it, batch: b, recalls },
    null,
    2,
  );
  $("onchainSummary").hidden = false;
  $("onchainSummary").innerHTML =
    `<div><strong>${esc(it.id)} · ${open.length ? "Unresolved recall(s): " + open.length : "No unresolved recall recorded"}</strong><p>Holder: ${esc(it.holder)} · Intended recipient: ${esc(it.pending || "none")} · Reviewed batch revision ${b.revision}</p>${recalls.map((r) => `<p><strong>${esc(r.id)}</strong>: ${esc(r.reason)} · ${it.repairs.some((p) => p.recall_id === r.id) ? "Remediation recorded" : "Unresolved"}</p>`).join("")}<span class="small">A registered custody handover is not permission to sell or use a recalled product. Acceptance will fail if this safety revision changes.</span></div>`;
  status(
    "Loaded current onchain records. Review all warnings before accepting.",
  );
}
async function write(method, args) {
  if (!contract) throw Error("Contract deployment/configuration is required.");
  await initialize();
  if (!account) throw Error("Connect the account authorized for this action.");
  if (
    !confirm(
      "Authorize " +
        method +
        " on " +
        contract +
        "? This writes public data and attaches 0.01 test NEAR for storage.",
    )
  )
    return;
  const wallet = await selector.wallet();
  status("Waiting for wallet approval…");
  const result = await wallet.signAndSendTransaction({
    receiverId: contract,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: method,
          args,
          gas: "100000000000000",
          deposit: "10000000000000000000000",
        },
      },
    ],
  });
  const hash = result?.transaction?.hash;
  if (hash) {
    status(
      "Transaction returned: " +
        hash +
        " · refresh records to verify final state.",
    );
    const a = document.createElement("a");
    a.href = "https://testnet.nearblocks.io/txns/" + encodeURIComponent(hash);
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = " Inspect transaction ↗";
    $("walletStatus").append(a);
  } else
    status(
      "Wallet request returned. Inspect your wallet and reload the onchain item.",
    );
  loaded = null;
  reviewed = null;
}
$("loadChain").onclick = async () => {
  try {
    await load();
  } catch (e) {
    status("Read error: " + e.message);
  }
};
document.querySelectorAll("[data-write]").forEach(
  (btn) =>
    (btn.onclick = async () => {
      try {
        const item_id = $("chainItem").value.trim(),
          batch = $("chainBatch").value.trim(),
          id = $("chainRecall").value.trim(),
          reason = $("chainReason").value.trim();
        switch (btn.dataset.write) {
          case "batch":
            await write("create_batch", {
              id: batch,
              model: $("chainModel").value,
              service: $("chainService").value.trim(),
            });
            break;
          case "register":
            await write("register_item", { id: item_id, batch });
            break;
          case "recall":
            await write("issue_recall", { id, batch, reason });
            break;
          case "ack":
            await write("acknowledge", { item_id, recall_id: id });
            break;
          case "propose":
            await write("propose_transfer", {
              item_id,
              to: $("chainTo").value.trim(),
            });
            break;
          case "cancel":
            await write("cancel_transfer", { item_id });
            break;
          case "repair":
            await write("record_remediation", {
              item_id,
              recall_id: id,
              note: reason,
            });
            break;
          case "accept":
            if (!reviewed || reviewed.item_id !== item_id)
              throw Error(
                "Load the item and review its latest warnings first.",
              );
            await write("accept_transfer", { ...reviewed });
            break;
        }
      } catch (e) {
        status("Action failed: " + e.message);
      }
    }),
);
$("walletDisconnect").onclick = async () => {
  try {
    if (selector && account) await (await selector.wallet()).signOut();
    account = null;
    loaded = null;
    reviewed = null;
    $("chainData").textContent = "";
    $("onchainSummary").hidden = true;
    status("Disconnected.");
    $("walletConnect").textContent = "Connect testnet wallet";
  } catch (e) {
    status(e.message);
  }
};
if (!contract) {
  document.querySelectorAll("[data-write]").forEach((b) => (b.disabled = true));
  $("loadChain").disabled = true;
}
