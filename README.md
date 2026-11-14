# RecallTag

**Unresolved safety warnings follow the item. Outdated handover approvals do not.**

A NEAR Open Innovation prototype for batch recalls, registered custody handovers, holder acknowledgements and attributed service records. Products are fictional. This is not regulatory clearance, product authentication, legal ownership evidence or proof of physical repair.

**Live demo:** https://eren-dotcom.github.io/recalltag/ — the browser-local simulator, hosted as-is. No wallet or contract is configured in this hosted build, exactly as the status table below describes.
**Repository:** https://github.com/Eren-dotcom/recalltag

## What works today

| Component | Status |
|---|---|
| Six-item local dashboard and guided demo | Working, browser-local simulation |
| Revision-aware local model | 19 tests pass |
| Rust NEAR contract | Compiled; 10 Rust tests pass |
| WASM artifact | `artifacts/recalltag.wasm`, checksum in `artifacts/SHA256SUMS` |
| Local NEAR Sandbox transactions | Passing deploy/init and complete flow, including rejected unauthorized/stale actions |
| Wallet Selector / MyNearWallet | Integrated; wallet-selection modal tested |
| Public testnet deployment | **Not done** |
| User wallet login/signing round trip | **Not done** |
| QR and unsigned local evidence export | Working; not chain attestations |

## Quick start

Requires Node 20+, npm and Python only if using an alternative static server (the app normally uses Vite).

```sh
npm ci
npm run dev
```

Open the displayed live URL. Do not double-click `index.html`: module dependencies need Vite. `npm run build` creates a static production bundle under `dist/`.

The UI has **two separate workspaces**:

1. Local registry: fictional data, role switcher, localStorage. No real authentication or transactions.
2. NEAR testnet workspace: real wallet and contract-call adapters. Configure a deployed contract before writing. Local dashboard records are not automatically uploaded or synchronized with this workspace.

## Local demonstration: do X, see Y

1. Select Manufacturer and issue a recall for VC-24-A. Three items become affected.
2. Select Alice; inspect BAT-003 and acknowledge. It stays unresolved.
3. Propose a custody handover to bob.testnet.
4. Select Bob, inspect and accept. Warnings persist; Bob has not inherited Alice's acknowledgement.
5. As Bob, try to record remediation. The local model rejects it.
6. Select Service center and record remediation. BAT-003 shows the attributed record; other affected items remain unresolved.
7. Issue a new recall. The previous repair does not resolve it.
8. Click **Run safety stress test** for isolated negative cases, including a recall arriving after recipient review.

Custody tracking is not authorization to sell or use recalled goods. Follow manufacturer and regulator instructions. The demo does not facilitate payments or listing sales.

## Tests

```sh
npm run check              # syntax and 19 JavaScript model tests
npx playwright install --with-deps chromium
# Leave npm run dev running in another terminal:
npm run test:browser       # main workflow and extended browser checks
node checks/enhancements.mjs  # QR, export checksum, wallet modal
```

Rust unit tests use a current stable Rust toolchain (verified with Rust 1.100.0):

```sh
cargo test --manifest-path contract/Cargo.toml --locked
```

Build the runtime-compatible artifact with the pinned release toolchain and Binaryen:

```sh
rustup toolchain install 1.86.0 --profile minimal --target wasm32-unknown-unknown
bash scripts/build-contract.sh
npm run test:sandbox
```

Sandbox tests create only ephemeral local accounts and do not require a public wallet, faucet funds or real tokens. The `near-workspaces` sandbox package may download its runtime binary. Linux runtime libraries may be needed depending on your OS. Build and test logs are in `checks/`.

**Why the explicit build script?** An initial ordinary WASM compilation succeeded but failed preparation in the sandbox. The tested artifact uses the pinned compiler, lockfile and WASM instruction lowering. Do not substitute an arbitrary build and assume runtime compatibility.

## Contract interface

Initialization: `new(issuer)` must be called by the contract account itself. Deploy and initialize atomically where possible. No private keys are stored in app configuration.

| Method | Authorization / effect |
|---|---|
| `create_batch(id, model, service)` | Configured issuer creates a batch and fixes its service account |
| `register_item(id, batch)` | Issuer registers an item initially held by the issuer |
| `issue_recall(id, batch, reason)` | Issuer appends a batch recall and increments safety revision |
| `acknowledge(item_id, recall_id)` | Current holder; scoped to custody epoch |
| `propose_transfer(item_id, to)` | Current holder nominates a recipient |
| `accept_transfer(item_id, expected_revision, expected_repair_count)` | Recipient; fails if reviewed safety/service state changed |
| `cancel_transfer(item_id)` | Current holder cancels pending handover |
| `record_remediation(item_id, recall_id, note)` | Batch service account; one attributed record per item/recall |
| `get_batch`, `get_item`, `get_recall` | Public views |
| `list_items`, `list_batches` | Public views, limit capped at 50 |

Writes charge measured additional storage and attempt to refund excess attached deposit. The frontend currently attaches 0.01 test NEAR to each write plus gas; production UX should estimate storage. Data is public. Description limits: 500 UTF-8 bytes in contract; IDs are 1–64 ASCII alphanumeric/hyphen/underscore bytes. Batch model is at most 100 bytes. Caps: 100 recalls per batch, 100 repairs and 500 acknowledgements per item. Hitting a cap rejects the action; production archival is not implemented.

## Public testnet setup

See `DEPLOYMENT.md`. You must create and control your own accounts, authorize deployment and wallet transactions, and keep secrets private. Copy `.env.example` to `.env.local`, set `VITE_RECALLTAG_CONTRACT` to the initialized testnet contract ID, then restart Vite.

## Research and submission preparation

- `research/STRATEGY.md`: evidence, sources, competitors, differentiation, priorities and 90-second demo.
- `THREAT_MODEL.md`: trust boundaries and remaining risks.
- `SUBMISSION.md`: factual draft and human-only release checklist.
- `REVIEW.md`: historical pre-contract review; current status is the table above.

No claim of exclusive novelty, customer adoption, certification, guaranteed safety or prize outcome is made.

## Dependencies and security status

Frontend: Vite, NEAR Wallet Selector, MyNearWallet, qrcode. Contract: near-sdk 5.17.2, near-sys pinned transitively by Cargo.lock. Testing: Playwright and near-workspaces; build: Binaryen. AI assistance was used for code and documentation.

Adding NEAR tooling introduced low-severity upstream dependency advisories. A tar override removed high/critical findings present in the sandbox tool dependency chain; the sandbox flow was rerun after the override. Re-run `npm audit` before release; no “zero vulnerabilities” claim is made for this version. Do not run `npm audit fix --force` blindly against wallet dependencies.

## Important limits

The physical-to-digital link is not solved by a QR. A copied tag can mislead users. Issuers can omit or misstate recalls. Service accounts can falsely claim repairs. Public account IDs reveal registered-custody relationships. Never store contact details or sensitive evidence onchain. Contract-account full-access keys may permit upgrades; this is not an absolute immutability guarantee. Authority revocation, recall closure/corrections, possession disputes, recovery, anti-counterfeit hardware and notifications are not implemented.

**This is an unaudited test prototype. Do not use it for real-world safety decisions.** License selection and public repository publication remain decisions for the project owner.

## Hackathon disclosure

Two-project disclosure (organizers' Q-015): this is one of two independent projects submitted by the same person to NEAR HACKATHON. The other is NEAR Intents X-Ray (https://github.com/Eren-dotcom/near-intents-xray), an evidence-first investment thesis on NEAR Intents (Investment Thesis track). The two projects are independent and share no code.
