#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# rustup toolchain install 1.86.0 --profile minimal --target wasm32-unknown-unknown
# npm ci  (provides pinned binaryen via package-lock.json)
RUSTFLAGS='-C target-feature=-bulk-memory,-reference-types,-multivalue,-sign-ext,-nontrapping-fptoint' cargo +1.86.0 build --manifest-path contract/Cargo.toml --locked --release --target wasm32-unknown-unknown
mkdir -p artifacts
node_modules/.bin/wasm-opt contract/target/wasm32-unknown-unknown/release/recalltag.wasm --signext-lowering --llvm-memory-copy-fill-lowering --llvm-nontrapping-fptoint-lowering --strip-debug --strip-producers -Oz -o artifacts/recalltag.wasm
sha256sum artifacts/recalltag.wasm > artifacts/SHA256SUMS
