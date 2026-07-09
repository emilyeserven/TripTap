#!/usr/bin/env node
// Fast local verification: lint + typecheck + test only the packages touched since the
// merge-base with the default branch (plus any uncommitted changes). Mirrors emstack's
// `pnpm verify:changed` so iteration stays quick; CI still runs the full gate.
import { execSync } from "node:child_process";

const BASE = process.env.VERIFY_BASE ?? "origin/main";

function sh(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();
}

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
  });
}

let mergeBase = "HEAD";
try {
  mergeBase = sh(`git merge-base ${BASE} HEAD`);
}
catch {
  console.warn(`Could not resolve merge-base with ${BASE}; comparing against HEAD only.`);
}

const diff = sh(`git diff --name-only ${mergeBase} -- packages`) + "\n" + sh("git diff --name-only -- packages");
const changed = new Set(
  diff
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(file => file.split("/")[1]) // packages/<name>/...
    .filter(Boolean),
);

if (changed.size === 0) {
  console.log("No changed packages detected. Nothing to verify.");
  process.exit(0);
}

const filters = [...changed].map(name => `--filter=@sentence-bank/${name}`).join(" ");
console.log(`Verifying changed packages: ${[...changed].join(", ")}`);

run("pnpm --filter=@sentence-bank/types build");
run(`pnpm -r ${filters} run typecheck`);
run("pnpm lint");
run(`pnpm -r ${filters} run test`);
