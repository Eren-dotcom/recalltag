# RecallTag submission preparation — DO NOT AUTO-SUBMIT

## Recommended primary track

Open Innovation (`open`). Current implementation is a custody/recall registry, not a NEP-171 NFT contract. Do not select extra tracks solely for visibility.

## One-line pitch

Unresolved safety warnings follow the item—and a new recall invalidates an outdated handover approval.

## Factual project-description draft

RecallTag explores what happens to safety warnings when physical items change hands. An authorized issuer publishes a batch recall; registered holders acknowledge it without clearing it, recipients accept custody against the safety revision they reviewed, and only the configured service account records remediation for an individual item and recall. A new recall between preview and acceptance causes the handover transaction to fail until the recipient reviews again.

The Rust NEAR contract has been compiled and exercised in a local NEAR Sandbox, with unit tests for permissions, custody epochs and stale approvals. The frontend includes a fictional six-battery simulator and a separate testnet wallet workspace. Public testnet deployment and a real wallet signing round trip are pending; update this status only after completion. QR links and local JSON exports are explicitly not authenticity certificates or chain proofs. RecallTag records attributed claims, not physical repair truth or permission to sell/use a recalled product.

## 90-second demo plan

1. State the problem in one sentence; show BAT-003's fictional registered holder.
2. Issue batch notice; show affected items.
3. Show recipient preview at one revision.
4. Issue another notice; demonstrate stale acceptance rejection from sandbox/testnet. Do not substitute a browser animation while claiming a real transaction.
5. Reload and accept; show warnings persist and acknowledgement is separate.
6. Show a holder's service-record attempt rejected, then authorized remediation.
7. Show test commands, transaction evidence (once public deployment is complete), and honest limits.

## X draft — owner must edit and publish

Built at NEAR HACKATHON: RecallTag.

A safety warning shouldn't disappear when an item changes hands. Our NEAR contract rejects a handover if a new recall arrived after the recipient reviewed it. Acknowledgement is not repair; service records remain attributed claims.

Demo and public code: add your actual links before posting.

@NEARProtocol #NEARHackathon

Attach the real demo video. Do not post this unfinished draft as-is.

## Required owner decisions

- Project name, lead name, email and team size.
- Mainnet prize-payout account controlled by the owner (not a testnet account).
- Actual public repository URL and chosen license.
- Actual public demo-post URL.
- Consent to the official contact notice.
- Full exact payload approval before any API submission.

## Before release

- Public testnet smoke test and hosting verified, or clearly documented local-only reproducible video path per official rules.
- README status matches what is actually deployed.
- No fake customer quotes, invented testnet transaction links, compliance badges, audit claims or guaranteed-prize language.
- Recheck https://nearhackathon.com/HACKATHON.md before submitting. Listed deadline: November 14, 2026, 23:59 UTC (November 15, 05:29 IST).
