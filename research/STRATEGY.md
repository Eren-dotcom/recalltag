# RecallTag: research, differentiation, and stronger-entry strategy

## Executive decision

Continue with **Open Innovation**, but position RecallTag as a **revision-aware recall handover protocol**, not a novel NFT passport, regulatory compliance product, or guarantee of product safety.

> **A new safety notice invalidates an outdated handover approval. Unresolved warnings stay attached to the item, and acknowledgement never counts as repair.**

This is a concrete, testable mechanism. It is more defensible than “blockchain product passports are new.” No research can establish a guaranteed prize, and this review does not establish worldwide or hackathon-wide exclusivity.

## 1. Evidence and research boundaries

Research covered the official hackathon rules and Open Innovation prompt, selected competitor demo posts and specifications, the previously collected 882-record directory snapshot, fresh targeted directory queries, primary recall guidance, NEAR testing guidance, and a broader digital-product-passport landscape search. It did not audit every submitted repository or validate commercial vendors' deployed features. Directory-name searches cannot rule out products with non-descriptive names. Competitors can change their builds after this review.

Fresh directory results are archived in `directory-recheck.json`. Relevant source links are provided below. No customer interviews, willingness-to-pay study, pilot deployment, or real manufacturer endorsement has occurred. All products in RecallTag are fictional.

## 2. What the official rules actually support

The official rules say testnet-only projects are eligible, mandatory integrations are not required, and an appropriate custom contract on NEAR is sufficient. They require a public repository and a public demo post; reproducibility and feature verification are explicitly part of screening. Human judges decide the result. They do not provide enough information here to calculate winning odds or invent weighted scoring criteria. Source: [official HACKATHON.md](https://nearhackathon.com/HACKATHON.md).

The deadline listed is November 14, 2026, 23:59 UTC, equivalent to November 15, 05:29 IST. Recheck the live rules before submitting. Testnet deployment is valuable, but a reproducible local blockchain demonstration is stronger evidence than an untested public address.

Open Innovation explicitly welcomes new combinations of money, intelligence and ownership. It does not require adding an AI chatbot, an Intents swap or an NFT. The current registry contract is **not a NEP-171 NFT implementation**. Enter `open`; do not claim NFT standards support that does not exist. Source: [track prompt](https://raw.githubusercontent.com/nearai/near-hackathon-prompt-examples/main/tracks/13-open.md).

## 3. The real-world problem is credible—but must be framed carefully

European Commission recall guidance explicitly discusses the difficulty of reaching second-hand holders, recommends allowing product registration after resale or gifting, and encourages prior owners to notify new owners. This supports investigating continuity across handovers. It does **not** prove blockchain is necessary or that RecallTag improves real recall recovery rates. [1](https://webgate.ec.europa.eu/safety/consumers/consumers_safety_gate/effectiveRecalls/documents/EU_guide_on_the_Recall_process_from_A_to_Z_en.pdf)

CPSC guidance says recalled products must not be offered for sale in the US. Therefore “a buyer saw the warning and agreed” is not a lawful-resale guarantee. RecallTag's demo records **custody**, including potential service/return handovers, and explicitly does not authorize sale or use. Legal obligations vary; this project supplies no legal clearance. [1](https://www.cpsc.gov/Business--Manufacturing/Business-Education/ResaleThrift-Stores-Information-Center/Stop-Online-Sale-of-Recalled-Products)

Do not present all jurisdictions' recall rules as identical. Do not advertise GPSR compliance, certified-safe badges, or avoided injuries without evidence.

## 4. Competitor analysis

| Build | Verified source-level description | Overlap | Defensible distinction / uncertainty |
|---|---|---|---|
| Phylaxtag | Its specification describes an item NFT carrying an issuer-funded warranty and service history, transferable with the item | Strong physical-item lifecycle overlap | RecallTag focuses on batch notices, holder-period acknowledgement and stale-review rejection, not funded warranty claims. No recall workflow was identified in the specification reviewed; absence cannot be guaranteed across every future change. |
| AgroTrace Rural | Documentation describes Stellar hash anchoring for agricultural batch records; recalled status is discussed as a future smart-contract use | Batch traceability and future recall concept | Does not establish the same implemented ownership-aware handover/remediation mechanism. The reviewed app/documents should not be treated as proof about all unreleased work. |
| Lot Passport | Demo post describes USDC escrow released after inspection of goods | Physical goods and inspection records | Payment/inspection workflow, not recall continuity. Creator claims were not transaction-audited. |
| Recall Wallet Agent | Demo post describes an agent wallet with memory and payment guardrails | Name only | Not a physical-product recall system in the reviewed post. |
| Release Passport | Demo post describes software release rights and a bonded NFT/account | Passport naming, transferable rights | Software distribution, not product safety recalls. |

Sources: [Phylaxtag specification](https://github.com/kangmochi/Phylaxtag/blob/main/docs/SPEC.md), [AgroTrace design document](https://raw.githubusercontent.com/alucart2005/AgroTraceRural/main/docs/semana3/StellarContratos.md), [Lot Passport demo](https://x.com/navzuhdy/status/2120244076327157910), [Recall Wallet Agent demo](https://x.com/arc5ive_/status/2120288527258628330), [Release Passport demo](https://x.com/surthenort40906/status/2117717055579501036).

Outside the hackathon, digital product passports already address circular lifecycle information and product recall use cases. Kezzler's white paper explicitly includes product recall among DPP use cases. Therefore do not claim RecallTag invented digital passports, repair history or blockchain traceability. [1](https://kezzler.com/wp-content/uploads/2024/08/2026_Kezzler_white-paper_Digital-Product-Passport-.pdf)

## 5. The strongest differentiating mechanism

### Problem: a warning changes between preview and signature

A recipient loads an item at batch revision 0. The issuer publishes a recall at revision 1. A naive transfer method can still accept the recipient's old approval.

### RecallTag's rule

`accept_transfer(item_id, expected_revision, expected_repair_count)` checks both values against current contract state. If either changed, acceptance fails. The recipient must reload and review again.

The contract also scopes acknowledgement to the custody epoch. Alice -> Bob -> Alice does not silently revive Alice's prior acknowledgement. Repair records are scoped to a specific item and recall; a repair for recall 1 does not resolve recall 2.

These are not new cryptographic primitives. Their value is a precise, demonstrated recall workflow. The implementation is not a universal snapshot commitment: metadata upgrades, authority changes and future new fields would require expanding the reviewed-state binding.

## 6. Why NEAR rather than a database?

Honest answer: one manufacturer operating a trusted closed system could use a normal database, and often should. Blockchain does not make a dishonest manufacturer disclose defects or make a repair physically true.

NEAR is useful when an issuer, successive holders and independent service accounts need shared attributable state and independently executable rules. This contract derives identity from signed transaction predecessors, preserves records across app sessions, checks authorization and review revisions, and emits structured events. A user need not trust the browser's demo-role switcher to enforce those rules onchain.

Remaining trust: issuer identity onboarding, possession-to-item binding, service truthfulness, RPC availability, frontend integrity, and contract-account upgrade keys. Do not claim absolute immutability: a deploy account retaining full-access keys may upgrade its code.

## 7. Improvements implemented in this iteration

- Rust NEAR contract: batches, item registration, recalls, acknowledgements, two-party handovers, cancellation and remediation.
- Issuer and service authorization derived from onchain caller, not user-supplied roles.
- Revision-aware acceptance and fresh acknowledgement on every custody epoch.
- Measured storage charging with attempted excess refunds; bounded inputs and per-item record limits.
- Bounded view pagination and structured contract events.
- Successful WASM compilation and optimization, Rust unit tests and an actual local NEAR Sandbox transaction flow.
- Separate testnet wallet workspace for all contract methods; actions disabled until a deployed contract is configured.
- Browser-generated item QR, clearly marked as a local dataset link rather than an authenticity seal.
- Unsigned local evidence export with SHA-256 integrity checksum; explicitly not blockchain attestation.
- Isolated safety stress-test UI demonstrating rejected forged recalls, self-repairs and stale reviews.
- Fixed global CSS collisions that initially hid the wallet option.

## 8. Current evidence, not promises

At the end of this iteration:

- 19 JavaScript model tests pass.
- 10 Rust unit tests pass.
- Local NEAR Sandbox deploy/init/registration/recall/handover/acknowledgement/remediation flow passes, including negative permission and stale-review transactions.
- Browser core flow and 12 extended groups pass.
- QR export, JSON checksum and wallet-selection modal checks pass.
- Frontend production build succeeds with dependency/chunk warnings.

Public testnet deployment and a real wallet redirect/signing round trip have **not** been completed. Local demo and onchain workspace are intentionally separate; the dashboard is not a live indexer for arbitrary deployed records. Wallet adapters are integrated, not proven end to end with the user's account.

The first Rust WASM build failed sandbox runtime preparation. Pinning the release build toolchain and lowering unsupported WASM instructions fixed it; the packaged artifact is the one that subsequently passed the sandbox. This is why compilation alone is not sufficient evidence.

## 9. What to do next, ordered by likely value

### Submission blockers

1. User creates their own testnet wallet, retaining all secrets privately.
2. Deploy and initialize the tested artifact to an authorized testnet contract account; verify its hash/address.
3. Configure the app and run real wallet flows from issuer, recipient and service accounts. Capture transaction links.
4. Host a stable demo; publish the repository with reproducible setup, limitations and chosen license.
5. Record one complete demo and submit only after the user approves the exact submission information.

### High-value validation, not more features

Interview a repair shop and a second-hand buyer. Ask what identifiers survive resale, who can credibly register a service, whether a new wallet is acceptable, and what a recall alert must contain to lead to action. Record actual answers and changes; never invent testimonials. One small genuine usability test is better than an unsupported market-size slide.

### Defer

AI, memecoins, cross-chain swaps, warranty funds, native mobile apps, regulatory integrations and claims of standards compliance. Do not add payment risk without a compelling need.

## 10. Judge-facing 90-second demo

- 0–15 s: “A battery changes hands. Its unresolved warning must not disappear.” Show fictional batch and holder.
- 15–30 s: Issuer publishes a notice; three items are affected without three write operations.
- 30–45 s: Recipient reviews; a second notice arrives. Attempt acceptance using the old revision and show rejection. Reload and review.
- 45–60 s: Accept custody; show acknowledgement is separate and the warning persists.
- 60–75 s: Owner attempts a repair claim and is rejected. Authorized service records remediation for one recall only.
- 75–90 s: Show transaction evidence/test commands and remaining limits. Close: “Attributed records, not proof of physical repair; custody, not permission to sell.”

Use actual recorded failures from sandbox/testnet; do not imply a simulated dashboard animation was a wallet transaction.

## 11. Release gate

Before describing this as a finished hackathon build, require: reproducible tests; documented contract account and build hash; working wallet redirect; no silent mixing of mock and chain data; no “safe to use/sell” badge; no customer PII onchain; explicit demo-only labels for fictional batteries; public README explaining upgrade trust and record limits. The strongest entry is a narrow mechanism that works, not a broad set of unfinished promises.
