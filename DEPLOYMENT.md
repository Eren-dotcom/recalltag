# RecallTag: public testnet handoff

## Current boundary

The WASM has executed successfully in a local NEAR Sandbox. It has NOT been deployed to public testnet. Wallet-selection UI has been tested; actual wallet authorization and redirect behavior still need the account owner to verify.

## 1. Create accounts privately

Use the official wallet resources linked from https://docs.near.org/ and choose a wallet that supports testnet. The app includes MyNearWallet at https://testnet.mynearwallet.com . Verify URLs independently before creating a wallet. Keep recovery material in your own secure storage, never in chat or this repository.

For the fullest demonstration, control separate testnet identities for:
- Contract deployment/account administration.
- Manufacturer/issuer.
- Recipient/holder.
- Service center.

Use the public IDs in the app; never provide the app with private keys. The contract deployer is not automatically the issuer unless initialized that way. Funds are testnet funds only; obtain them from a current official faucet route. A public testnet account is separate from the mainnet prize-payout account requested by the submission form.

## 2. Verify the artifact

From the project root:

```sh
sha256sum -c artifacts/SHA256SUMS
```

You can rebuild with `scripts/build-contract.sh` after installing its prerequisites, then rerun the sandbox. A changed checksum requires reviewing and testing the new artifact rather than claiming it is the previous one.

## 3. Deploy AND initialize

Use the current official NEAR CLI's interactive contract deployment flow (`near contract deploy`) or another trusted deployment UI. Select your actual contract account, the file `artifacts/recalltag.wasm`, and initialize in the deployment transaction with:

Method: `new`
Arguments: JSON object containing `issuer` set to your actual manufacturer testnet account ID.
Attached initialization deposit: 0 NEAR. The deploy account must already have enough test NEAR for code storage and fees.

Do not copy a fake account ID from examples. Do not deploy mainnet. Do not leave an uninitialized contract exposed: initialization must be executed by the contract account itself, as required by the code.

No public deployment command has been run by the assistant. You must review and authorize any signing request.

## 4. Configure the web app

Copy `.env.example` to `.env.local` and set `VITE_RECALLTAG_CONTRACT` to the actual contract account ID. It is public configuration, not a secret. Restart `npm run dev`. All onchain actions live in the separate NEAR testnet workspace below the local simulator.

## 5. Real wallet smoke test

1. Connect manufacturer account; create a batch and name your actual service-center account.
2. Register an item. Its registered holder starts as the manufacturer, preventing arbitrary initial assignment to another account.
3. Issue one batch recall.
4. Propose custody transfer to your recipient account.
5. Disconnect/switch wallet identity to the recipient. Load the item and review its public records.
6. Accept using the displayed revision. Then acknowledge independently.
7. Try remediation as recipient: expect contract rejection, not just a disabled button.
8. Switch to service-center account; record remediation.
9. Load and verify records from a different browser and an independent RPC/explorer.
10. Repeat with a new recall between preview and acceptance. The stale acceptance must fail; reload before retrying.

The contract charges measured record growth. The UI attaches 0.01 test NEAR per write; excess refund is attempted separately and can fail if the recipient account disappears. Never describe this deposit as a product price.

## 6. Record evidence

Save public contract ID, artifact checksum, transaction hashes, tested account roles (public IDs only) and a demo video. Confirm state after transactions instead of assuming that a wallet popup proves success. Wallet redirection can return without a result object; inspect the wallet and reload onchain records. Never label local simulator actions as explorer-verifiable transactions.

## 7. Release checklist

- Select a license.
- Make repository public only with the owner's approval.
- Host the built frontend; configure the contract for that deployment.
- Record and publish the owner's X demo post.
- Use official submission instructions; obtain explicit confirmation before submitting exact fields.
