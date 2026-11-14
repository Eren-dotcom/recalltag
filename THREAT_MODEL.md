# RecallTag threat model

## Security claim being tested

Given the configured issuer/service identities and current contract code, unauthorized accounts cannot issue recalls or service claims, a recipient cannot accept using an outdated batch-recall/service revision, and a custody transfer does not erase recall records. This is an authorization/state-consistency claim—not a product-safety guarantee.

## Adversaries and controls

| Attempt | Implemented control | Evidence / limit |
|---|---|---|
| Outsider issues manufacturer notice | Issuer identity checked against transaction predecessor | Rust and sandbox negative tests |
| Holder records their own repair | Batch's configured service identity required | Rust, sandbox and browser/model tests |
| Recipient approves yesterday's view | Batch revision and repair-count match required at acceptance | Rust and sandbox stale-review rejection; local stress test |
| Alice's old acknowledgement survives Alice -> Bob -> Alice | Custody epoch increments; acknowledgement scoped to epoch | Rust and model regression tests |
| Repair for one recall clears another | Recall IDs stored per remediation; no whole-item safe flag | Model tests; contract stores individual IDs |
| Sender assigns recipient without consent | Proposal requires recipient acceptance | Contract and sandbox flow |
| Malformed IDs/descriptions consume excessive storage | Bounded inputs, collection record caps, charge measured storage growth | Contract checks; unit test for insufficient attached deposit |
| Historical records hidden by local browser | Onchain views independent of local simulator | Sandbox view assertions; public deployment pending |
| HTML injected in user description | Escaping in local UI and chain summaries; raw JSON uses textContent | Browser test for local recall payload |
| Forged local export presented as proof | Explicit UNSIGNED LOCAL disclaimer | Checksum confirms internal bytes only, not issuer authenticity |

## Trust that remains

- Issuer identity must be vetted outside this prototype; the configured account may lie or omit defects.
- Service center can falsely attest. No physical verification, hardware attestation or independent inspection exists.
- QR codes and item IDs can be copied. An NFT/registry entry would not solve physical authenticity by itself.
- The contract account may retain upgrade keys. Account administration and upgrades are trusted; no governance timelock or key revocation has been implemented.
- Wallet frontend and RPC may be compromised. Independent state verification helps but does not remove signing risks.
- Public holder accounts and relationships are visible. The app warns against personal contact information, but transaction data is public.
- Current data and authority configuration is intentionally append-only/fixed. Corrections, service-role revocation, recall closure, disputed repairs and lost-key recovery need separate audited designs.
- Custody acceptance does not legalize sale or use. No legal compliance engine exists.
- Record caps can eventually prevent additional entries; production needs an archival/pagination strategy beyond this bounded prototype.
- Storage overpayment refunds use asynchronous transfers. A disappearing account can cause a refund to fail; no pending-refund recovery ledger is implemented. There are no product-price payments or warranty funds.
- The collection map has no deletion path. Data and storage deposits are not reclaimed through an application-level cleanup API.

## Unchecked deployment risks

Real wallet redirect/signing, actual public testnet contract configuration, hosting origin behavior and a multi-user public-network smoke test remain owner-authorized release gates. Unit tests and a local sandbox are valuable but not a formal audit or a guarantee against every vulnerability.
