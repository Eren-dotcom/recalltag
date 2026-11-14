# RecallTag — code review and mock-run results

Reviewed and executed November 13, 2026.

## Scope
Reviewed the application files `index.html`, `app.mjs`, `model.mjs`, package configuration, README, model tests, and browser scripts. Ran syntax checks, all model tests, the main end-to-end browser flow, extended browser checks, and npm dependency audit. This is a prototype review, not an independent security audit or proof that every possible bug has been eliminated. Third-party dependency source was not audited line by line.

## Results

| Check | Result |
|---|---|
| JavaScript syntax: model and UI | Pass |
| Model unit tests | 17 passed, 0 failed |
| Main Chromium mock run | Pass |
| Extended browser checks | 12 reported groups passed |
| Uncaught browser errors in tested flows | None |
| Page and item-dialog sizing | Pass at 360, 390, 768, 1440 px |
| npm audit | 0 reported vulnerabilities at time of check |

## Mock-run sequence

1. Loaded six fictional batteries and two batches.
2. Manufacturer issued a batch-A recall.
3. Alice acknowledged BAT-003; its recall remained unresolved.
4. Alice proposed a transfer to Bob.
5. Bob accepted; unresolved status remained and Alice's acknowledgement did not count for Bob.
6. Bob attempted to record remediation; the local model rejected him.
7. The authorized service-center demo account recorded remediation successfully.
8. Reloaded and confirmed local persistence.
9. Checked mobile page sizing and verified no uncaught browser errors.

Additional checks covered search and empty results, holder filters, unauthorized recall issuance, escaped HTML in recall text, recall/activity navigation, a newly named recipient, direct item links, malformed JSON, structurally invalid stored records, blocked localStorage on startup, and detail-dialog sizing.

## Bugs fixed during review

### 1. Returning-holder acknowledgement reuse
Before: Alice could acknowledge, transfer to Bob, then receive the item back and incorrectly inherit her earlier acknowledgement.
Fix: acknowledgements now include an ownership-period counter. Each accepted handover increments it. Returning holders must acknowledge again. A regression test exercises the round trip.

### 2. Invalid saved-state crashes
Before: top-level array checks allowed malformed records to reach rendering code and fail.
Fix: added structural state validation and safe fallback to seeded data. Invalid JSON and old schema versions also reset. This is crash recovery, not protection against tampering with local storage. Previous schema-1 demo data is reset rather than migrated.

### 3. Unselectable custom recipient
Before: a valid-format recipient outside the preset account list could receive a proposal but could not be selected in the demo UI.
Fix: registered holders and nominated recipients are added to the account switcher. Browser test confirms a custom recipient can accept.

### 4. Narrow detail-dialog overflow
Extended testing exposed overflowing detail content at a tested viewport.
Fix: constrain detail grid children, allow long text/account IDs to wrap, and allow metadata rows to wrap. Re-tested page and dialog widths at four viewport sizes.

### 5. Non-string model input errors
Before: non-string reason/note input could throw a generic JavaScript type error.
Fix: explicit type checks give deliberate validation errors. Regression test added.

## Remaining gaps and limitations

- No NEAR contract, wallet authentication, onchain deployment, or RPC integration exists in RecallTag yet.
- The account switcher and local permission checks are simulation only. Users can edit browser state. Do not use for real safety decisions.
- Different browsers do not share records; item links open each browser's own local dataset.
- Recipient account syntax is checked, but account existence is not verified.
- Item/batch registration remains seeded; there is no real registration flow.
- Recall closure/correction, revoked service-center roles, dispute handling, production notifications, evidence uploads and QR generation remain deferred.
- A service record is an attributed claim, not proof of physical repair, authenticity, or legal ownership.
- npm audit results do not imply absence of vulnerabilities.
- Browser checks used automated Chromium, not a full Safari/Firefox, real-phone or assistive-technology test matrix.

## Reproduce

From `recalltag/`:

```sh
npm install
npx playwright install --with-deps chromium
npm run dev
```

With that server running, in another terminal:

```sh
npm run check
npm run test:browser
npm audit
```

Execution logs: `checks/model-results.txt`, `checks/browser-results.txt`, and `checks/dependency-audit.txt`.

## Verdict

**The reviewed local prototype passes the tests described above after the fixes. It is ready for another user demo, not production or real-world recall operations.** The next milestone is to implement the same permissions and state transitions in a tested NEAR contract, then replace local actions with wallet-signed calls.
