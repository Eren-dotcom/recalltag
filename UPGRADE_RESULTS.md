# RecallTag — upgrade results

## Bottom line
The entry now has a working NEAR contract demonstrated on a local blockchain, not just a simulated interface. This improves its technical credibility, but does not guarantee a prize or establish unique invention.

## Research-led changes
- Focused positioning: revision-aware recall handovers rather than a generic product passport.
- Updated the legal/safety framing: registered custody is not permission to sell or use a recalled product.
- Differentiated from transferable warranty funds and agricultural traceability; no unsupported “world first” claim.
- Prioritized reproducibility, authorization and a clear failed-action demo over adding AI or tokens.

See [the research and strategy](research/STRATEGY.md) for evidence, competitors, primary guidance, limitations and release priorities.

## Implemented and tested
| Component | Evidence |
|---|---|
| Local business rules | 19 JavaScript tests pass |
| NEAR contract rules | 10 Rust tests pass |
| Actual local chain execution | Sandbox deploy/init, registration, recall, handover, acknowledgement and remediation pass |
| Negative onchain cases | Unauthorized recall, stale review acceptance and holder-authored repair rejected |
| Browser experience | Core workflow and 12 extended check groups pass |
| Additional UI | QR generated; unsigned evidence checksum verified; safety lab tested; wallet picker opens |
| Production frontend | Build succeeds, with upstream/chunk warnings |

## Artifact
- File: `artifacts/recalltag.wasm`
- Size: 175,153 bytes
- SHA-256: `ce3355fefa7473062ce1c85cae1214a390b653bc2a26786570d8f1458b58b8f7`
- Built with the documented pinned compiler and WASM lowering; this artifact passed the sandbox.

## Current security/deployment boundaries
- **No public testnet deployment yet.** No user account was created and no public-network transaction was signed on the user's behalf.
- Wallet adapter and modal exist; an actual wallet login/redirect/signing round trip remains unverified.
- The local registry and NEAR workspace remain separate, clearly labeled views.
- Not audited, certified, regulatory-approved or appropriate for real safety decisions.
- Current npm audit: 16 low, 0 moderate, 0 high, 0 critical findings. Remaining low-severity wallet/test-tool dependency advisories are documented.

## What the owner must do next
1. Create and retain control of a NEAR testnet wallet, without sharing recovery material.
2. Deploy and initialize the artifact using an authorized contract account; follow `DEPLOYMENT.md`.
3. Configure `VITE_RECALLTAG_CONTRACT` and complete the real multi-account wallet smoke test.
4. Select a license, publish the repository and host the demo.
5. Record the complete mechanism and its failure cases; publish the required X post and confirm submission details.

The official listed deadline is November 14, 2026, 23:59 UTC (November 15, 05:29 IST). Recheck the live rules before submission.

## Recommended demo hook
> A new recall arrives after a recipient reviews an item. RecallTag rejects the outdated handover approval until they review again.

This is a stronger, demonstrable claim than “we put product records on a blockchain.”
